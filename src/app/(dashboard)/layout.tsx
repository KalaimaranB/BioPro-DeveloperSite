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
      <div className="container" style={{ padding: '2rem' }}>
        <main>
          {children}
        </main>
      </div>
    </>
  );
}
