'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import styles from './KeyGeneratorWizard.module.css';

export default function KeyGeneratorWizard() {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 12) {
      setError('Passphrase must be at least 12 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setIsGenerating(true);
    const supabase = createClient();

    try {
      // Call the Edge Function to generate the keys
      const { error: funcError } = await supabase.functions.invoke('onboard-developer', {
        body: { passphrase },
      });

      if (funcError) throw new Error(funcError.message);
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate keypair.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.wizard}>
      <h2 className={styles.title}>Initialize Your Trust Anchor</h2>
      <p className={styles.description}>
        To participate in the BioPro Trust Chain, you must generate an Ed25519 keypair. 
        Your private key will be encrypted with the passphrase you provide below before being stored.
      </p>

      {success ? (
        <div className={styles.success}>
          Keys generated successfully! You are now part of the BioPro Web of Trust. Redirecting...
        </div>
      ) : (
        <form onSubmit={handleGenerate}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="passphrase">
              Encryption Passphrase
            </label>
            <input
              type="password"
              id="passphrase"
              className={styles.input}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Min 12 characters"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="confirmPassphrase">
              Confirm Passphrase
            </label>
            <input
              type="password"
              id="confirmPassphrase"
              className={styles.input}
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm your passphrase"
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.button}
            disabled={isGenerating || !passphrase || !confirmPassphrase}
          >
            {isGenerating ? 'Generating Keys...' : 'Generate Keypair'}
          </button>

          {error && <div className={styles.error}>{error}</div>}
        </form>
      )}
    </div>
  );
}
