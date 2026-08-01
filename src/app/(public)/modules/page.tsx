import { createClient } from '@/utils/supabase/server';
import ModuleCard from '@/components/ModuleCard/ModuleCard';
import Header from '@/components/Header/Header';

export default async function PublicRegistryPage() {
  const supabase = await createClient();

  // Fetch all modules
  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <Header />
      <main className="container" style={{ padding: '4rem 2rem' }}>
        <h1 style={{ marginBottom: '1rem', fontSize: '2.5rem' }}>BioPro Registry</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
          Browse all official and community-submitted cryptographic plugins.
        </p>

        {!modules || modules.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No modules found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {modules.map((mod: any) => (
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
      </main>
    </>
  );
}
