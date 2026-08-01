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

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>PKI Keys</h1>
      {developer?.public_key_hex ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ color: 'var(--accent-success)', marginBottom: '1rem' }}>✓ Keys Generated</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            You have successfully generated your Ed25519 keypair and joined the BioPro Trust Chain.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <strong>Public Key:</strong> {developer.public_key_hex}
          </div>
        </div>
      ) : (
        <KeyGeneratorWizard />
      )}
    </div>
  );
}
