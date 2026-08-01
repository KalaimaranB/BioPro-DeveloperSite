import Link from 'next/link';
import styles from './Header.module.css';
import { createClient } from '@/utils/supabase/server';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          <Link href="/dashboard" className={styles.primaryButton}>
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className={styles.button}>
            Log In
          </Link>
        )}
      </nav>
    </header>
  );
}
