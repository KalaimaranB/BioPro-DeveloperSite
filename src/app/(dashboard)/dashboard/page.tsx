import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ModuleCard from '@/components/ModuleCard/ModuleCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify PKI Onboarding
  const { data: developer, error: devError } = await supabase
    .from('developers')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log(`[Dashboard] Fetched developer for ${user.id}. Error: ${devError?.message || 'none'}.`);
  console.log(`[Dashboard] Developer data:`, developer);

  if (devError) {
    throw new Error(`Database Error when fetching your profile: ${devError.message}. (Are your RLS policies correctly configured?)`);
  }

  if (!developer?.public_key_hex || !developer?.issuer_signature) {
    console.log(`[Dashboard] Redirecting to /onboard. Missing key: ${!developer?.public_key_hex}, Missing signature: ${!developer?.issuer_signature}`);
    redirect('/onboard');
  }

  // Fetch their modules
  const { data: collaboratorRows } = await supabase
    .from('module_collaborators')
    .select('module_id, modules(*)')
    .eq('developer_id', user.id);

  const modules = collaboratorRows?.map((row: any) => row.modules) || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>Welcome, @{developer.github_username}</h1>
          {developer.trust_level && (
            <span style={{ 
              background: developer.trust_level === 'root' ? 'rgba(255, 152, 0, 0.2)' : developer.trust_level === 'node' ? 'rgba(88, 166, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: developer.trust_level === 'root' ? '#ff9800' : developer.trust_level === 'node' ? '#58a6ff' : 'var(--text-secondary)',
              padding: '0.25rem 0.75rem',
              borderRadius: '16px',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `1px solid ${developer.trust_level === 'root' ? 'rgba(255, 152, 0, 0.5)' : developer.trust_level === 'node' ? 'rgba(88, 166, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
              textTransform: 'uppercase'
            }}>
              {developer.trust_level}
            </span>
          )}
        </div>
        <a 
          href="/dashboard/new" 
          style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600'
          }}
        >
          + New Module
        </a>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Your Modules</h2>
        
        {!modules || modules.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You haven&apos;t registered any modules yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {modules.map((mod: any) => (
              <ModuleCard 
                key={mod.id}
                id={mod.id}
                namespace={mod.namespace}
                pluginName={mod.plugin_name}
                description={mod.description}
                repositoryUrl={mod.repository_url}
                isVerified={mod.is_verified}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
