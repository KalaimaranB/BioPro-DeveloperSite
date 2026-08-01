# Supabase Architecture & Implementation Guide (BioPro PKI)

This document outlines the exact schema, edge functions, and security policies required in Supabase to support the BioPro Developer Portal. It integrates GitHub OAuth alongside the complex **BioPro Public Key Infrastructure (PKI)**, including recursive Trust Chains and Sub-Authorities.

## 1. Database Schema

Execute the following SQL in the Supabase SQL Editor to bootstrap your tables.

### `authorities` (Sub-Authorities)
Stores public keys of trusted institutions/organizations (e.g., UBC, BioPro Web Portal). These are the "Sub-Authorities".
Note: The *True BioPro Core Root Authority* private key should remain completely offline and air-gapped, only used to periodically sign the central registry of these Sub-Authorities.
```sql
CREATE TABLE authorities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  authority_name TEXT UNIQUE NOT NULL, -- e.g., 'UBC_Bioinformatics', 'BioPro_Portal_Default'
  public_key_hex TEXT NOT NULL,
  encrypted_private_key TEXT, -- Only present if the portal manages this authority directly
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `developers` (Web of Trust)
Stores profiles and trust anchors for authenticated developers. Because BioPro supports recursive trust chains, a developer can be signed by an Authority *or* by another Developer!
```sql
CREATE TABLE developers (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  github_username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  public_key_hex TEXT, -- Ed25519 Public Key generated during onboarding
  encrypted_private_key TEXT, -- Encrypted using a user-provided passphrase
  
  -- The Web of Trust: Who vouched for this developer?
  issuer_name TEXT, -- The name of the Authority OR Developer who signed this key
  issuer_public_key_hex TEXT,
  issuer_signature TEXT, -- Signature of the public_key_hex by the issuer
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `modules`
Represents a BioPro plugin registered by a developer.
```sql
CREATE TABLE modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID REFERENCES developers(id) ON DELETE CASCADE NOT NULL,
  namespace TEXT NOT NULL,
  plugin_name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(namespace, plugin_name)
);
```

### `module_versions`
Tracks specific releases of a module, including the critical SHA-256 hash. Supports **multiple versions** simultaneously to accommodate users on older versions of the BioPro Core.
```sql
CREATE TABLE module_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE NOT NULL,
  version_tag TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,
  download_url TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, version_tag)
);
```

---

## 2. Row Level Security (RLS) Policies

Security is critical. Enable RLS on all tables to prevent malicious hash tampering or unauthorized code signing.

```sql
-- Enable RLS
ALTER TABLE authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_versions ENABLE ROW LEVEL SECURITY;

-- Authorities: Publicly readable for the registry, strictly NO public write access.
CREATE POLICY "Authorities are viewable by everyone." ON authorities FOR SELECT USING (true);

-- Developers: Public read, only owner can update
CREATE POLICY "Public profiles are viewable by everyone." ON developers FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON developers FOR UPDATE USING (auth.uid() = id);

-- Modules: Public read, only owner can insert/update/delete
CREATE POLICY "Modules are viewable by everyone." ON modules FOR SELECT USING (true);
CREATE POLICY "Users can insert their own modules." ON modules FOR INSERT WITH CHECK (auth.uid() = developer_id);
CREATE POLICY "Users can update their own modules." ON modules FOR UPDATE USING (auth.uid() = developer_id);
CREATE POLICY "Users can delete their own modules." ON modules FOR DELETE USING (auth.uid() = developer_id);

-- Module Versions: Public read, only module owner can insert/update/delete
CREATE POLICY "Module versions are viewable by everyone." ON module_versions FOR SELECT USING (true);
CREATE POLICY "Users can insert versions for their modules." ON module_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM modules WHERE id = module_id AND developer_id = auth.uid())
);
CREATE POLICY "Users can update versions for their modules." ON module_versions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM modules WHERE id = module_id AND developer_id = auth.uid())
);
```

---

## 3. Database Triggers

### Auto-Create Developer Profile
When a user signs up via GitHub OAuth, automatically create a row in the `developers` table.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.developers (id, github_username, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 4. Supabase Edge Functions

### `onboard-developer`
**Purpose**: Generates the developer's keypair. If the user was invited by another developer, that developer acts as the issuer. Otherwise, the default "BioPro Portal Sub-Authority" signs them.
- **Action**: Generates Ed25519 keypair. Encrypts the private key. Signs the public key with the Issuer's private key.

### `sign-plugin-release`
**Purpose**: Allows a developer to officially sign a new plugin version (`security.json`) directly through the portal, generating the `signature.bin` and the recursive `trust_chain.json`.
- **Action**: The developer provides their passphrase and the `security.json` payload. The Edge Function decrypts their private key, signs the payload, and dynamically constructs the multi-level `trust_chain.json` by tracing the `issuer` lineage back up to an Authority.

### `GET /api/v1/plugins/registry` (Next.js Route Handler / Edge Function)
**Purpose**: Replaces the legacy `BioPro-Distribution` GitHub repository entirely. Dynamically queries the `modules` and `module_versions` tables and returns the exact JSON schema that the BioPro Core client expects.
- **Action**: When the BioPro Core hits this endpoint, it instantly receives the latest, globally available signed hashes without waiting for static CI/CD pipelines.

### `verify-github-release`
**Purpose**: Verifies that a GitHub tag actually exists and the download URL is valid before accepting a new `module_version`.

### `GET /api/v1/authorities/registry` (Next.js Route Handler / Edge Function)
**Purpose**: Serves the `authorities.json` endpoint that the BioPro Core fetches. 
*Note: This JSON output must be signed by the offline True BioPro Root Authority. This endpoint simply hosts the pre-signed JSON payload uploaded by the Root Admins to the Supabase Storage bucket.*

---

## 5. Storage (Required)

You must create a public storage bucket to host the offline-signed authorities registry.
1. Create a public storage bucket named `registries`.
2. Apply an RLS policy allowing ONLY authenticated admins to `INSERT` and `UPDATE` files.
3. The Admin will upload `authorities.json` to this bucket after signing it offline.

## 6. Storage (Optional)

If you wish to allow developers to upload custom plugin icons (rather than fetching them from GitHub):
1. Create a public storage bucket named `plugin_icons`.
2. Apply an RLS policy allowing authenticated users to `INSERT` and `UPDATE` files where the file path contains their `developer_id`.
