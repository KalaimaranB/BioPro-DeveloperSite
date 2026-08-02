'use client';

import { useState } from 'react';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"])
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

interface TrustSignerProps {
  targetDeveloperId: string;
  targetPublicKeyHex: string;
  targetGithubUsername: string;
  encryptedPrivateKeyHex: string;
  onApprove: (targetDeveloperId: string, targetPublicKeyHex: string, trustLevel: string, issuerSignatureHex: string) => Promise<void>;
}

export default function TrustSigner({ 
  targetDeveloperId, 
  targetPublicKeyHex, 
  targetGithubUsername, 
  encryptedPrivateKeyHex, 
  onApprove 
}: TrustSignerProps) {
  const [passphrase, setPassphrase] = useState('');
  const [trustLevel, setTrustLevel] = useState('leaf');
  const [error, setError] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async () => {
    if (!passphrase) {
      setError('Passphrase is required');
      return;
    }

    setIsSigning(true);
    setError('');
    
    try {
      // 1. Decrypt private key
      const payload = fromHex(encryptedPrivateKeyHex);
      const salt = payload.slice(0, 16);
      const iv = payload.slice(16, 28);
      const ciphertext = payload.slice(28);
      
      const aesKey = await deriveKey(passphrase, salt);
      let privateKeyBuffer;
      try {
        privateKeyBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
      } catch (err) {
        throw new Error("Invalid passphrase");
      }
      const privateKey = new Uint8Array(privateKeyBuffer);

      // 2. Sign the target public key mathematically
      const messageBytes = new TextEncoder().encode(targetPublicKeyHex);
      const signatureBytes = await ed.signAsync(messageBytes, privateKey);
      const signatureHex = toHex(signatureBytes);

      // 3. Clear private key from memory and submit
      privateKey.fill(0);
      setPassphrase('');
      
      await onApprove(targetDeveloperId, targetPublicKeyHex, trustLevel, signatureHex);
      
    } catch (err: any) {
      setError(err.message || 'Signing failed');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>@{targetGithubUsername}</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            PK: {targetPublicKeyHex.substring(0, 16)}...
          </p>
        </div>
        <select 
          value={trustLevel} 
          onChange={(e) => setTrustLevel(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-color)' }}
        >
          <option value="leaf">Leaf (Non-Delegating)</option>
          <option value="node">Node (Delegating)</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input 
          type="password" 
          placeholder="Enter Passphrase to Sign" 
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          style={{ flex: 1, padding: '0.75rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-color)' }}
        />
        <button 
          onClick={handleSign}
          disabled={isSigning}
          style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '4px', 
            border: 'none', 
            fontWeight: 'bold', 
            cursor: isSigning ? 'not-allowed' : 'pointer',
            opacity: isSigning ? 0.7 : 1
          }}
        >
          {isSigning ? 'Signing...' : 'Approve & Sign'}
        </button>
      </div>
      {error && <p style={{ color: '#f85149', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>{error}</p>}
    </div>
  );
}
