import Link from 'next/link';
import styles from './Header.module.css';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const handleLogout = async () => {
    'use server';
    const supabaseAction = await createClient();
    await supabaseAction.auth.signOut();
    redirect('/login');
  };

  let trustLevel = 'leaf';
  if (user) {
    const { data: developer } = await supabase
      .from('developers')
      .select('trust_level')
      .eq('id', user.id)
      .single();
    if (developer?.trust_level) {
      trustLevel = developer.trust_level;
    }
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        BioPro <span>Developer</span>
      </Link>
      
      <nav className={styles.nav}>
        <Link href="/modules" className={styles.link}>
          Registry
        </Link>
        <a href="https://github.com/KalaimaranB/BioPro" className={styles.link} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        
        {user ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/dashboard" className={styles.link}>
              Dashboard
            </Link>
            {(trustLevel === 'root' || trustLevel === 'node') && (
              <Link href="/trust-network" className={styles.link} style={{ color: '#ff9800' }}>
                Trust Network
              </Link>
            )}
            <Link href="/onboard" className={styles.primaryButton}>
              PKI Keys
            </Link>
            <form action={handleLogout}>
              <button type="submit" className={styles.button}>
                Log Out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/login" className={styles.button}>
            Log In
          </Link>
        )}
      </nav>
    </header>
  );
}
