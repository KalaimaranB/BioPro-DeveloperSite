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



  // If no public key is found, and they are not currently ON the onboard page, redirect them.
  // Note: We'll handle the strict redirection logic carefully to avoid infinite loops.
  // We'll trust the individual pages to enforce this or do it here with a small check:
  
  // This layout wraps the dashboard, so we can render it. 
  // We'll let the onboard page be a sibling in the router group but we need to know the current path.
  // Since layouts can't easily read current path in Server Components (without headers workaround),
  // we'll just render children, but we'll add the check in the specific pages.
  // Actually, wait: layout.tsx applies to everything in (dashboard). 
  // If we redirect to /onboard from here, and /onboard uses this layout, it's an infinite loop.
  // So we'll skip the redirect here and put it in /dashboard/page.tsx, OR we use middleware.
  // For simplicity, we'll let the layout render, and the dashboard page will do the redirect.

  return (
    <>
      <Header />
      <div className="container" style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
        <aside style={{ width: '250px', flexShrink: 0 }}>
          <div className="glass-panel" style={{ padding: '1rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Menu</h3>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <a href="/dashboard" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>Overview</a>
              </li>
              <li>
                <a href="/dashboard/new" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>Register Module</a>
              </li>
              <li>
                <a href="/onboard" style={{ display: 'block', padding: '0.5rem', borderRadius: '4px', color: 'var(--text-primary)' }}>PKI Keys</a>
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
