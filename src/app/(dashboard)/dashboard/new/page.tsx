import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import RegisterModuleForm from '@/components/RegisterModuleForm/RegisterModuleForm';
import { revalidatePath } from 'next/cache';

export default async function NewModulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: developer } = await supabase
    .from('developers')
    .select('public_key_hex, issuer_signature')
    .eq('id', user.id)
    .single();

  if (!developer?.public_key_hex || !developer?.issuer_signature) {
    redirect('/onboard');
  }

  async function createModuleAction(formData: FormData) {
    'use server';
    
    const supabaseAction = await createClient();
    const { data: { user: actionUser } } = await supabaseAction.auth.getUser();
    
    if (!actionUser) throw new Error('Unauthorized');

    const pluginName = formData.get('pluginName') as string;
    const description = formData.get('description') as string;
    const repositoryUrl = formData.get('repositoryUrl') as string;

    const { data: actionDeveloper } = await supabaseAction
      .from('developers')
      .select('github_username')
      .eq('id', actionUser.id)
      .single();

    const namespace = actionDeveloper?.github_username || 'unknown';

    const { data: newModule, error } = await supabaseAction
      .from('modules')
      .insert({
        developer_id: actionUser.id,
        namespace,
        plugin_name: pluginName,
        description,
        repository_url: repositoryUrl
      }).select().single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('A module with this name already exists in your namespace.');
      }
      throw new Error(error.message);
    }

    const { error: collabError } = await supabaseAction
      .from('module_collaborators')
      .insert({
        module_id: newModule.id,
        developer_id: actionUser.id,
        role: 'owner'
      });

    if (collabError) {
      throw new Error('Failed to assign module ownership: ' + collabError.message);
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
  }

  return (
    <div>
      <a href="/dashboard" style={{ display: 'inline-block', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        ← Back to Dashboard
      </a>
      <RegisterModuleForm action={createModuleAction} />
    </div>
  );
}
