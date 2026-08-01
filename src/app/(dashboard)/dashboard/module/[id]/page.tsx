import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export default async function ModuleSettingsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify ownership
  const { data: collab } = await supabase
    .from('module_collaborators')
    .select('role, modules(*)')
    .eq('module_id', params.id)
    .eq('developer_id', user.id)
    .single();

  if (!collab || collab.role !== 'owner') {
    return <div style={{ padding: '2rem' }}>You do not have permission to manage this module.</div>;
  }

  const module = collab.modules as any;

  // Fetch all collaborators
  const { data: allCollabs } = await supabase
    .from('module_collaborators')
    .select('role, developers(github_username)')
    .eq('module_id', params.id);

  async function addCollaborator(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const githubUsername = formData.get('githubUsername') as string;
    const role = formData.get('role') as string;

    // Find developer by github_username
    const { data: dev } = await supabaseAction
      .from('developers')
      .select('id')
      .eq('github_username', githubUsername)
      .single();

    if (!dev) {
      throw new Error(`User @${githubUsername} has not joined BioPro Developer Portal yet.`);
    }

    await supabaseAction
      .from('module_collaborators')
      .insert({
        module_id: params.id,
        developer_id: dev.id,
        role: role
      });

    revalidatePath(`/dashboard/module/${params.id}`);
  }

  return (
    <div>
      <a href="/dashboard" style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        ← Back to Dashboard
      </a>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>{module.plugin_name} Settings</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Manage who can publish updates to this module.
        </p>

        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Current Collaborators</h3>
        <ul style={{ marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
          {allCollabs?.map((c: any, i) => (
            <li key={i} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>@{c.developers.github_username}</span>
              <span style={{ color: 'var(--text-muted)' }}>{c.role}</span>
            </li>
          ))}
        </ul>

        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Add Collaborator</h3>
        <form action={addCollaborator} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input 
              name="githubUsername" 
              placeholder="GitHub Username" 
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
          <div>
            <select 
              name="role" 
              required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            >
              <option value="maintainer">Maintainer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button type="submit" style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
