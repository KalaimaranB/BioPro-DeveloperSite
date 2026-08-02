'use client';

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
ed.hashes.sha512 = sha512;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveDeveloperKeysAction } from '@/app/(dashboard)/onboard/actions';
import styles from './KeyGeneratorWizard.module.css';

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"])
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as any, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    try {
      // 1. Generate new Ed25519 Keypair (32 bytes of secure randomness)
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      const publicKey = await ed.getPublicKeyAsync(privateKey);
      const publicKeyHex = toHex(publicKey);

      // 2. Encrypt Private Key (AES-GCM)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const aesKey = await deriveKey(passphrase, salt);
      
      const encryptedContent = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as any },
        aesKey,
        privateKey
      );
      
      // Pack salt + iv + ciphertext into a single hex string for storage
      const payload = new Uint8Array(salt.length + iv.length + encryptedContent.byteLength);
      payload.set(salt, 0);
      payload.set(iv, salt.length);
      payload.set(new Uint8Array(encryptedContent), salt.length + iv.length);
      const encryptedPrivateKeyHex = toHex(payload);

      // 3. Save to database using Server Action (This clears Next.js Router Cache!)
      await saveDeveloperKeysAction(publicKeyHex, encryptedPrivateKeyHex);

      
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
