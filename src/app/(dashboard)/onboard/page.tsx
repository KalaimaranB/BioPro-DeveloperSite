import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import KeyGeneratorWizard from '@/components/KeyGeneratorWizard/KeyGeneratorWizard';

export default async function OnboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: developer } = await supabase
    .from('developers')
    .select('public_key_hex')
    .eq('id', user.id)
    .single();

  // If they already have a key, they don't need to be here
  if (developer?.public_key_hex) {
    redirect('/dashboard');
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>PKI Onboarding</h1>
      <KeyGeneratorWizard />
    </div>
  );
}
