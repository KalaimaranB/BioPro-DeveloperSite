import Link from 'next/link';
import styles from './AnimatedHero.module.css';

export default function AnimatedHero() {
  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>
        BioPro Developer Portal
      </h1>
      
      <p className={styles.subtitle}>
        Build, manage, and distribute your BioPro plugins securely. Manage your cryptographic hashes and track your plugin versions all in one place.
      </p>

      <div className={styles.buttonGroup}>
        <Link href="/dashboard" className={styles.primaryButton}>
          Developer Dashboard
        </Link>
        <Link href="/modules" className={styles.secondaryButton}>
          Explore Registry
        </Link>
      </div>
    </div>
  );
}
