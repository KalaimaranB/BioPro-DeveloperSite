'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import * as ed from '@noble/ed25519';
// Configure noble to use webcrypto for sha512 (required in Node.js)
import { sha512 } from '@noble/hashes/sha512';
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

export async function approveDeveloper(
  targetDeveloperId: string, 
  targetPublicKeyHex: string,
  trustLevel: string, 
  issuerSignatureHex: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the issuer (current user)
  const { data: issuer } = await supabase
    .from('developers')
    .select('public_key_hex, trust_level')
    .eq('id', user.id)
    .single();

  if (!issuer) throw new Error("Issuer not found");
  if (issuer.trust_level !== 'root' && issuer.trust_level !== 'node') {
    throw new Error("You do not have permission to issue trust");
  }

  // Verify the cryptographic signature mathematically
  // The signed message is the target's public key hex (to prevent replay attacks on other keys)
  const messageBytes = new TextEncoder().encode(targetPublicKeyHex);
  const isValid = await ed.verifyAsync(
    fromHex(issuerSignatureHex), 
    messageBytes, 
    fromHex(issuer.public_key_hex)
  );

  if (!isValid) throw new Error("Invalid cryptographic signature");

  // Update target developer in DB
  const { error } = await supabase
    .from('developers')
    .update({
      issuer_public_key_hex: issuer.public_key_hex,
      issuer_signature: issuerSignatureHex,
      trust_level: trustLevel
    })
    .eq('id', targetDeveloperId);

  if (error) throw new Error(error.message);

  revalidatePath('/trust-network');
}
