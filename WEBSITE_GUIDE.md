# Website Architecture & Next Steps Guide (BioPro PKI)

This document outlines the required components, routing structure, and data flows for the Next.js frontend of the BioPro Developer Portal. It is specifically tailored to support the cryptographic onboarding and trust delegation model of BioPro, while retaining detailed technical architecture for data-fetching and OAuth.

## 1. App Router Structure (Directory Map)

The project will follow standard Next.js App Router conventions with grouped layouts to separate public marketing pages from authenticated dashboard pages and PKI tooling.

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx            # Landing page (already scaffolded)
│   │   ├── layout.tsx          # Public layout (Header/Footer)
│   │   └── modules/
│   │       ├── page.tsx        # Public registry gallery
│   │       └── [id]/page.tsx   # Public details (shows all active versions)
│   ├── (auth)/
│   │   ├── login/page.tsx      # GitHub OAuth login button page
│   │   └── auth/callback/route.ts # Supabase OAuth PKCE callback handler
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Authenticated layout (Sidebar, Auth Check)
│   │   ├── onboard/page.tsx    # PKI Onboarding (Key Generation)
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Developer's modules overview
│   │   │   ├── new/page.tsx    # Form to register a new module
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Manage specific module settings
│   │   │       └── releases/   # Manage/Sign new version hashes (Supports multiple versions)
│   ├── api/
│   │   └── v1/
│   │       ├── plugins/registry/route.ts      # GET: Serves the dynamic JSON module registry
│   │       └── authorities/registry/route.ts  # GET: Serves the offline-signed authorities JSON
```

---

## 2. Key UI Components Needed

Build these as modular React Server/Client Components in `src/components/`.

### Public Components
- `Header.tsx`: Navigation bar with "Login via GitHub" or "Go to Dashboard".
- `ModuleCard.tsx`: A glassmorphic card displaying a plugin's name, author, and description.
- `AnimatedHero.tsx`: For the landing page, using subtle CSS micro-animations to draw attention.

### PKI Onboarding Components (Client Components)
- `KeyGeneratorWizard.tsx`: A secure client-side wizard where developers choose a strong passphrase. This triggers the Supabase Edge Function to generate their Ed25519 keypair and securely store the encrypted private key.

### Dashboard Components (Client Components `"use client"`)
- `DashboardSidebar.tsx`: Navigation links for managing modules and profile settings.
- `RegisterModuleForm.tsx`: Form to input namespace, plugin name, and GitHub repo URL.
- `VersionHistoryTable.tsx`: Displays all published versions of a plugin. Crucial for developers tracking which legacy hashes are still active for older Core users.
- `PluginSignerModal.tsx`: The interface for signing a new release. Developers provide their decryption passphrase and their `security.json`. The modal communicates with the `sign-plugin-release` Edge Function to generate the `signature.bin` and `trust_chain.json`. Must validate inputs before submitting to Supabase.

---

## 3. Cryptographic Onboarding Flow & GitHub OAuth

To participate in the BioPro Trust Chain, developers must go through a secure onboarding process before they can publish modules:

1. **OAuth Login Action**: User clicks "Login with GitHub" on `/login`. Use `@supabase/ssr` browser client to trigger `supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: '.../auth/callback' } })`.
2. **Callback Handler (`auth/callback/route.ts`)**: Exchanges the auth code for a session and redirects the user to `/dashboard`.
3. **PKI Check**: The `(dashboard)/layout.tsx` Server Component checks for a valid session using the Supabase server client. It then checks the `developers` table. If `public_key_hex` is missing, the user is redirected to `/onboard`.
4. **Key Generation**: In `/onboard`, the developer provides a memorable but secure passphrase. The portal's Edge Function generates their Ed25519 keypair, encrypts the private key with the passphrase, and signs their public key using the Portal Authority Key.
5. **Trust Delegation Established**: The developer is now a recognized node in the BioPro Trust Chain and is redirected to `/dashboard`.

---

## 4. Multi-Version Publishing Flow

BioPro explicitly supports multiple simultaneous versions to ensure backwards compatibility for users who haven't updated their Core application.

1. **Upload / Hash Input**: When publishing a new release, developers do not overwrite the old one. They add a new `version_tag` (e.g., `v1.2.0`).
2. **Signing**: The developer inputs their passphrase. The backend decrypts their private key into memory, signs the new `security.json` ledger, and returns the cryptographic blobs.
3. **Co-Signer Support**: If the plugin requires multiple authors to sign (Signing RBAC), the UI will show the version as "Pending Signatures" until all required developers have authenticated and signed the release.
4. **Instant Registry Availability**: Once signed, the version is inserted into `module_versions`. Because the `api/v1/plugins/registry` endpoint queries this table dynamically, the new release is instantly available to all BioPro Core users worldwide without needing any static GitHub repo pushes.

---

## 5. Server Actions vs. API Routes

Leverage **Next.js Server Actions** instead of traditional API routes for database mutations. This keeps the codebase clean and secure.

Example Server Action (`src/app/actions/moduleActions.ts`):
```typescript
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createModule(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error("Unauthorized")

  const pluginName = formData.get('pluginName')
  const repoUrl = formData.get('repoUrl')

  const { error } = await supabase
    .from('modules')
    .insert({ developer_id: user.id, plugin_name: pluginName, repository_url: repoUrl })

  if (error) throw new Error(error.message)
  
  // Revalidate the dashboard so the new module appears instantly
  revalidatePath('/dashboard')
}
```

---

## 6. Styling Guidelines

- **Vanilla CSS Exclusively**: Keep Tailwind uninstalled.
- **CSS Modules**: For component-specific styles (e.g., `ModuleCard.module.css` or `PluginSignerModal.module.css`), use CSS Modules to prevent class name collisions.
- **Global Variables**: Use the variables defined in `globals.css` (e.g., `var(--glass-bg)`, `var(--accent-primary)`) to ensure the dark-mode glassmorphic theme remains perfectly consistent across the site.
