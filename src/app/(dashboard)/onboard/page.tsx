import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import KeyGeneratorWizard from '@/components/KeyGeneratorWizard/KeyGeneratorWizard';
import TrustChain from '@/components/TrustChain/TrustChain';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OnboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: developer, error: devError } = await supabase
    .from('developers')
    .select('public_key_hex, issuer_signature, issuer_name')
    .eq('id', user.id)
    .single();

  console.log(`[Onboard] Fetched developer for ${user.id}. Error: ${devError?.message || 'none'}.`);
  console.log(`[Onboard] Developer data:`, developer);

  async function submitSignatureAction(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const { data: { user: actionUser } } = await supabaseAction.auth.getUser();
    if (!actionUser) throw new Error('Unauthorized');

    const issuerName = formData.get('issuerName') as string;
    const issuerPubKey = formData.get('issuerPubKey') as string;
    const signature = formData.get('signature') as string;

    const { error } = await supabaseAction.from('developers').update({
      issuer_name: issuerName,
      issuer_public_key_hex: issuerPubKey,
      issuer_signature: signature
    }).eq('id', actionUser.id);

    if (error) throw new Error(error.message);
    revalidatePath('/onboard');
    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>PKI Keys</h1>
      {!developer?.public_key_hex ? (
        <KeyGeneratorWizard />
      ) : !developer?.issuer_signature ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ color: '#d97706', marginBottom: '1rem' }}>⚠ Keys Generated, Pending Trust</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Your keys have been generated, but you are not yet a trusted member of the BioPro network. 
            Please have your public key signed by the offline Root Authority or an existing trusted developer.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <strong>Your Public Key:</strong> {developer.public_key_hex}
          </div>

          <form action={submitSignatureAction} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3>Upload Signature</h3>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Issuer Name</label>
              <input type="text" name="issuerName" required placeholder="e.g. BioPro_Root_Authority" style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Issuer Public Key (Hex)</label>
              <input type="text" name="issuerPubKey" required placeholder="Hexadecimal string..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'white' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Issuer Signature (Hex)</label>
              <input type="text" name="signature" required placeholder="Hexadecimal string..." style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-strong)', color: 'white' }} />
            </div>
            <button type="submit" style={{ padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Verify & Complete Trust
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ color: 'var(--accent-success)', marginBottom: '1rem' }}>✓ Fully Trusted</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            You are a fully trusted node in the BioPro Trust Chain. You can now publish and sign modules.
          </p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <strong>Your Public Key:</strong> {developer.public_key_hex}
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <strong>Signed By:</strong> {developer.issuer_name}
          </div>

          <TrustChain startingPublicKey={developer.public_key_hex} />
        </div>
      )}
    </div>
  );
}
