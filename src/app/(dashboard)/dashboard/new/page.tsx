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

    const namespace = formData.get('namespace') as string;
    const pluginName = formData.get('pluginName') as string;
    const description = formData.get('description') as string;
    const repositoryUrl = formData.get('repositoryUrl') as string;

    const { error } = await supabaseAction
      .from('modules')
      .insert({
        developer_id: actionUser.id,
        namespace,
        plugin_name: pluginName,
        description,
        repository_url: repositoryUrl
      });

    if (error) {
      if (error.code === '23505') {
        throw new Error('A module with this namespace and name already exists.');
      }
      throw new Error(error.message);
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
