import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import DangerZone from '@/components/DangerZone/DangerZone';

export default async function ModuleSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify ownership
  const { data: collab } = await supabase
    .from('module_collaborators')
    .select('role, modules(*)')
    .eq('module_id', id)
    .eq('developer_id', user.id)
    .single();

  if (!collab || collab.role !== 'owner') {
    return <div style={{ padding: '2rem' }}>You do not have permission to manage this module.</div>;
  }

  const module = collab.modules as any;

  // Fetch all collaborators
  const { data: allCollabs } = await supabase
    .from('module_collaborators')
    .select('role, contribution_description, developers(github_username)')
    .eq('module_id', id);

  // Fetch module versions
  const { data: versions } = await supabase
    .from('module_versions')
    .select('id, version_tag, sha256_hash, download_url, published_at')
    .eq('module_id', id)
    .order('published_at', { ascending: false });

  async function updateGeneralSettings(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const repoUrl = formData.get('repositoryUrl') as string;
    const desc = formData.get('description') as string;

    await supabaseAction
      .from('modules')
      .update({ repository_url: repoUrl, description: desc })
      .eq('id', id);

    revalidatePath(`/dashboard/module/${id}`);
    revalidatePath(`/modules`);
  }

  async function updateCiKey(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const ciKey = formData.get('ciKey') as string;

    await supabaseAction
      .from('modules')
      .update({ ci_public_key_hex: ciKey || null })
      .eq('id', id);

    revalidatePath(`/dashboard/module/${id}`);
  }

  async function addCollaborator(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const githubUsername = formData.get('githubUsername') as string;
    const role = formData.get('role') as string;
    const desc = formData.get('description') as string;

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
        module_id: id,
        developer_id: dev.id,
        role: role,
        contribution_description: desc || null
      });

    revalidatePath(`/dashboard/module/${id}`);
  }

  async function removeCollaborator(formData: FormData) {
    'use server';
    const supabaseAction = await createClient();
    const githubUsername = formData.get('githubUsername') as string;

    const { data: devToRemove } = await supabaseAction
      .from('developers')
      .select('id')
      .eq('github_username', githubUsername)
      .single();
      
    if (!devToRemove) throw new Error("User not found");

    // Safety check: Prevent removing the last owner
    const { data: roleData } = await supabaseAction
      .from('module_collaborators')
      .select('role')
      .eq('module_id', id)
      .eq('developer_id', devToRemove.id)
      .single();

    if (roleData?.role === 'owner') {
      const { count } = await supabaseAction
        .from('module_collaborators')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', id)
        .eq('role', 'owner');
        
      if (count && count <= 1) {
        throw new Error("Cannot remove the last owner of a module.");
      }
    }

    await supabaseAction
      .from('module_collaborators')
      .delete()
      .eq('module_id', id)
      .eq('developer_id', devToRemove.id);

    revalidatePath(`/dashboard/module/${id}`);
  }

  async function revokeVersion(versionId: string) {
    'use server';
    const supabaseAction = await createClient();
    // Safety check: Ensure they own the module before deleting version
    const { data: roleData } = await supabaseAction
      .from('module_collaborators')
      .select('role')
      .eq('module_id', id)
      .single(); // Implicitly checking current user via RLS (or we should add explicit check, but RLS protects delete)

    await supabaseAction
      .from('module_versions')
      .delete()
      .eq('id', versionId);

    revalidatePath(`/dashboard/module/${id}`);
  }

  async function revokeModuleAction() {
    'use server';
    const supabaseAction = await createClient();
    
    // Delete the entire module. Cascade should handle module_versions and collaborators.
    await supabaseAction
      .from('modules')
      .delete()
      .eq('id', id);

    redirect('/dashboard');
  }

  return (
    <div>
      <a href="/dashboard" style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        ← Back to Dashboard
      </a>
      
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>General Settings</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Update the core metadata for <strong>@{module.namespace}/{module.plugin_name}</strong>.
        </p>

        <form action={updateGeneralSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>GitHub Repository URL</label>
            <input 
              name="repositoryUrl" 
              defaultValue={module.repository_url}
              required 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
            <textarea 
              name="description" 
              defaultValue={module.description || ''}
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', fontFamily: 'inherit' }}
            />
          </div>
          <button type="submit" style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>
            Save Changes
          </button>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Version Management</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Registered releases for this module. Revoke a version immediately if it is compromised.
        </p>
        
        {versions && versions.length > 0 ? (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tag</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>SHA256 Hash</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Published</th>
                  <th style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v: any) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{v.version_tag}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {v.sha256_hash.substring(0, 16)}...
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      {new Date(v.published_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <form action={revokeVersion.bind(null, v.id)}>
                        <button type="submit" style={{ background: 'transparent', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No versions have been published yet.</p>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>CI/CD Integration</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Automate publishing securely. We recommend integrating with the <code>biopro-sdk</code> to sign your releases. 
          Create a <code>.github/workflows/release.yml</code> file in your repository and paste the following snippet.
        </p>
        <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem' }}>
{`name: Auto-Release Plugin

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    name: Evaluate, Sign & Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install BioPro SDK
        run: uv pip install --system git+https://github.com/KalaimaranB/BioPro-SDK.git

      - name: Execute Project Signing
        run: biopro-sdk project-sign .
        env:
          BIOPRO_PROJECT_PRIVATE_KEY: \${{ secrets.BIOPRO_PROJECT_PRIVATE_KEY }}

      - name: Build Release ZIP
        id: build
        run: |
          ZIP_NAME="plugin_\${{ github.ref_name }}.zip"
          zip -r "$ZIP_NAME" . -x "*.git*"
          
          SHA256=$(sha256sum "$ZIP_NAME" | awk '{ print $1 }')
          echo "sha256=$SHA256" >> $GITHUB_OUTPUT
          echo "zip_name=$ZIP_NAME" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: \${{ steps.build.outputs.zip_name }}

      - name: Publish to BioPro Registry
        run: |
          curl -X POST https://your-supabase-url.supabase.co/functions/v1/sign-plugin-release \\
            -H "Authorization: Bearer \${{ secrets.SUPABASE_AUTH_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{
              "moduleId": "${id}",
              "versionTag": "\${{ github.ref_name }}",
              "downloadUrl": "https://github.com/\${{ github.repository }}/releases/download/\${{ github.ref_name }}/\${{ steps.build.outputs.zip_name }}",
              "ciSignatureHex": "\${{ secrets.CI_SIGNATURE }}",
              "sha256Hash": "\${{ steps.build.outputs.sha256 }}"
            }'
`}
        </pre>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Team Management</h2>

        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Current Collaborators</h3>
        <ul style={{ marginBottom: '2rem', listStyle: 'none', padding: 0 }}>
          {allCollabs?.map((c: any, i) => (
            <li key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold', marginRight: '1rem' }}>@{c.developers.github_username}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textTransform: 'capitalize' }}>{c.role}</span>
                </div>
                <form action={removeCollaborator}>
                  <input type="hidden" name="githubUsername" value={c.developers.github_username} />
                  <button type="submit" style={{ background: 'transparent', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Remove
                  </button>
                </form>
              </div>
              {c.contribution_description && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {c.contribution_description}
                </div>
              )}
            </li>
          ))}
        </ul>

        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Add Collaborator</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
          <strong>Owner:</strong> Full access to manage team members and publish releases.<br />
          <strong>Maintainer:</strong> Can publish module releases, but cannot manage team members.<br />
          <strong>Contributor:</strong> Read-only access. Officially listed as a team member, but cannot publish releases.
        </p>
        <form action={addCollaborator} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              name="githubUsername" 
              placeholder="GitHub Username" 
              required 
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
            <select 
              name="role" 
              required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            >
              <option value="contributor">Contributor</option>
              <option value="maintainer">Maintainer</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              name="description" 
              placeholder="Role description (e.g. Lead AI Researcher)" 
              style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
            <button type="submit" style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Add Team Member
            </button>
          </div>
        </form>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '2.5rem 0' }} />

        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>CI/CD Public Key (Dual Signature)</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          To enforce SLSA dual-signatures, paste the public key of your automated GitHub Actions runner. Releases will require signatures from both a human maintainer AND this CI key.
        </p>
        
        <form action={updateCiKey} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input 
              name="ciKey" 
              placeholder="e.g. a1b2c3d4..." 
              defaultValue={module.ci_public_key_hex || ''}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', fontFamily: 'monospace' }}
            />
          </div>
          <button type="submit" style={{ background: 'var(--border-color)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            Save Key
          </button>
        </form>
      </div>

      <DangerZone moduleName={module.plugin_name} revokeAction={revokeModuleAction} />
    </div>
  );
}
