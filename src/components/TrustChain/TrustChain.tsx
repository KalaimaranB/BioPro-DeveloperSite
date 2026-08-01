import { createClient } from '@/utils/supabase/server';
import styles from './TrustChain.module.css';

interface TrustNode {
  github_username: string;
  public_key_hex: string;
  issuer_public_key_hex: string | null;
}

export default async function TrustChain({ startingPublicKey }: { startingPublicKey: string }) {
  const supabase = await createClient();
  const chain: TrustNode[] = [];
  
  let currentKey = startingPublicKey;
  let safetyLimit = 10;
  
  while (currentKey && safetyLimit > 0) {
    const { data } = await supabase
      .from('developers')
      .select('github_username, public_key_hex, issuer_public_key_hex')
      .eq('public_key_hex', currentKey)
      .single();
      
    if (!data) break;
    chain.push(data);
    
    // Break if self-signed (Root) or no issuer
    if (!data.issuer_public_key_hex || data.issuer_public_key_hex === data.public_key_hex) {
      break;
    }
    
    currentKey = data.issuer_public_key_hex;
    safetyLimit--;
  }

  return (
    <div className={styles.trustChainContainer}>
      <h3 className={styles.title}>Trust Anchor Chain</h3>
      <div className={styles.chain}>
        {chain.map((node, index) => (
          <div key={node.public_key_hex} className={styles.nodeWrapper}>
            <div className={`${styles.node} ${index === chain.length - 1 ? styles.rootNode : ''}`}>
              <div className={styles.username}>@{node.github_username}</div>
              <div className={styles.key}>{node.public_key_hex.substring(0, 16)}...</div>
              {index === chain.length - 1 && <div className={styles.badge}>Root Authority</div>}
              {index === 0 && <div className={styles.badgeUser}>You</div>}
            </div>
            {index < chain.length - 1 && (
              <div className={styles.arrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <polyline points="5 12 12 4 19 12"></polyline>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
