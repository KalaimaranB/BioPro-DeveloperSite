import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import Header from '@/components/Header/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: developer } = await supabase
    .from('developers')
    .select('public_key_hex, issuer_signature')
    .eq('id', user.id)
    .single();

  const isTrusted = !!(developer?.public_key_hex && developer?.issuer_signature);

  return (
    <>
      <Header />
      <div className="container" style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
        <aside style={{ width: '250px', flexShrink: 0 }}>
          <div className="glass-panel" style={{ padding: '1rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Menu</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {isTrusted ? (
                <>
                  <li>
                    <a href="/dashboard" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>Overview</a>
                  </li>
                  <li>
                    <a href="/dashboard/new" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>Register Module</a>
                  </li>
                </>
              ) : null}
              <li>
                <a href="/onboard" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>
                  {isTrusted ? 'PKI Keys' : 'PKI Keys (Setup Required)'}
                </a>
              </li>
            </ul>
          </div>
        </aside>
        <main style={{ flexGrow: 1 }}>
          {children}
        </main>
      </div>
    </>
  );
}
