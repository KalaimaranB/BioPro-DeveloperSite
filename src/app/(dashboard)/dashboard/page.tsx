import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ModuleCard from '@/components/ModuleCard/ModuleCard';

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify PKI Onboarding
  const { data: developer } = await supabase
    .from('developers')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!developer?.public_key_hex || !developer?.issuer_signature) {
    redirect('/onboard');
  }

  // Fetch their modules
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('developer_id', user.id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Welcome, @{developer.github_username}</h1>
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
            {modules.map((mod) => (
              <ModuleCard 
                key={mod.id}
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
