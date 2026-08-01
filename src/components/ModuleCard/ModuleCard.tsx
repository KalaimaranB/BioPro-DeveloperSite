import styles from './ModuleCard.module.css';

interface ModuleCardProps {
  id?: string;
  namespace: string;
  pluginName: string;
  description: string | null;
  repositoryUrl: string;
  isVerified: boolean;
}

export default function ModuleCard({
  id,
  namespace,
  pluginName,
  description,
  repositoryUrl,
  isVerified
}: ModuleCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.namespace}>@{namespace}</span>
          <h3 className={styles.title}>{pluginName}</h3>
        </div>
      </div>
      
      <p className={styles.description}>
        {description || 'No description provided.'}
      </p>

      <div className={styles.footer}>
        {isVerified ? (
          <div className={styles.verifiedBadge}>
            ✓ Verified
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Unverified
          </div>
        )}
        
        {id && (
          <a href={`/dashboard/module/${id}`} className={styles.repoLink} style={{ marginRight: '1rem', color: 'var(--text-secondary)' }}>
            Settings
          </a>
        )}
        <a 
          href={repositoryUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.repoLink}
        >
          GitHub ↗
        </a>
      </div>
    </div>
  );
}
