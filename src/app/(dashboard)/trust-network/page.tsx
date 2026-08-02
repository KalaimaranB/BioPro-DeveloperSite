import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import TrustSigner from '@/components/TrustSigner/TrustSigner';
import { approveDeveloper } from './actions';

export default async function TrustNetworkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify the current user is a node or root
  const { data: currentUser } = await supabase
    .from('developers')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!currentUser) redirect('/login');
  if (currentUser.trust_level !== 'root' && currentUser.trust_level !== 'node') {
    return (
      <div className="container" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2>Unauthorized</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
          You do not have the required trust level (Node or Root) to access the Trust Network.
        </p>
      </div>
    );
  }

  // Fetch pending developers (no issuer signature)
  const { data: pendingDevs } = await supabase
    .from('developers')
    .select('id, github_username, public_key_hex')
    .is('issuer_signature', null)
    .not('public_key_hex', 'is', null)
    .neq('id', user.id);

  // Fetch approved developers
  const { data: approvedDevs } = await supabase
    .from('developers')
    .select('id, github_username, public_key_hex, trust_level, issuer_public_key_hex')
    .not('issuer_signature', 'is', null)
    .neq('id', user.id)
    .order('trust_level', { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Trust Network</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Cryptographically sign and approve new developers. As a {currentUser.trust_level}, you have the authority to delegate trust.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#ff9800' }}>Pending Approvals</h2>
        {pendingDevs && pendingDevs.length > 0 ? (
          <div>
            {pendingDevs.map(dev => (
              <TrustSigner 
                key={dev.id}
                targetDeveloperId={dev.id}
                targetPublicKeyHex={dev.public_key_hex}
                targetGithubUsername={dev.github_username}
                encryptedPrivateKeyHex={currentUser.encrypted_private_key}
                onApprove={approveDeveloper}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No developers are currently waiting for approval.</p>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Network Members</h2>
        {approvedDevs && approvedDevs.length > 0 ? (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Developer</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Trust Level</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Issuer PK</th>
                </tr>
              </thead>
              <tbody>
                {approvedDevs.map((dev: any) => (
                  <tr key={dev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>@{dev.github_username}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                      <span style={{ 
                        background: dev.trust_level === 'node' || dev.trust_level === 'root' ? 'rgba(88,166,255,0.1)' : 'rgba(255,255,255,0.05)', 
                        color: dev.trust_level === 'node' || dev.trust_level === 'root' ? '#58a6ff' : 'var(--text-secondary)',
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '12px', 
                        fontSize: '0.875rem',
                        border: dev.trust_level === 'node' || dev.trust_level === 'root' ? '1px solid rgba(88,166,255,0.3)' : '1px solid transparent'
                      }}>
                        {dev.trust_level}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {dev.issuer_public_key_hex?.substring(0, 16)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No other approved developers found.</p>
        )}
      </div>
    </div>
  );
}
