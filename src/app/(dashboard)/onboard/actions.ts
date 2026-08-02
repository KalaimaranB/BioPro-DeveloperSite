'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDeveloperKeysAction(publicKeyHex: string, encryptedPrivateKeyHex: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) throw new Error("Unauthorized");

  const { error } = await supabase.from('developers').upsert({
    id: user.id,
    github_username: user.user_metadata?.user_name || user.email?.split('@')[0] || 'unknown',
    github_id: String(user.user_metadata?.provider_id || user.id),
    public_key_hex: publicKeyHex,
    encrypted_private_key: encryptedPrivateKeyHex
  }, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }

  // CRITICAL: This clears the Next.js aggressive Router Cache so the redirect works correctly
  revalidatePath('/onboard');
  revalidatePath('/dashboard');
}
