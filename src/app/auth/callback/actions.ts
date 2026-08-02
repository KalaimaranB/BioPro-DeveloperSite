'use server';

import { createClient } from '@/utils/supabase/server';

export async function syncDeveloperProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("No active session found");
  }

  const { error } = await supabase.from('developers').upsert({
    id: user.id,
    github_username: user.user_metadata?.user_name || user.email?.split('@')[0] || 'unknown',
    github_id: String(user.user_metadata?.provider_id || user.id)
  }, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}
