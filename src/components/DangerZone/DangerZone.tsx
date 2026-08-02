'use client';

import { useState } from 'react';

interface DangerZoneProps {
  moduleName: string;
  revokeAction: () => Promise<void>;
}

export default function DangerZone({ moduleName, revokeAction }: DangerZoneProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isMatch = inputValue === moduleName;

  const handleRevoke = async () => {
    if (!isMatch) return;
    setIsLoading(true);
    setError('');
    try {
      await revokeAction();
    } catch (e: any) {
      setError(e.message || "Failed to revoke module");
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid rgba(248,81,73,0.4)', borderRadius: '8px', padding: '1.5rem', background: 'rgba(248,81,73,0.05)' }}>
      <h3 style={{ color: '#f85149', marginBottom: '1rem', fontSize: '1.25rem' }}>Danger Zone</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Revoking a module is permanent. It will instantly remove this module and all its versions from the BioPro registry, breaking any client currently relying on it.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
          Type <strong>{moduleName}</strong> to confirm
        </label>
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={moduleName}
          style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(248,81,73,0.4)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
        />
        {error && <div style={{ color: '#f85149', fontSize: '0.875rem' }}>{error}</div>}
        <button 
          onClick={handleRevoke}
          disabled={!isMatch || isLoading}
          style={{ 
            background: isMatch ? '#f85149' : 'rgba(248,81,73,0.2)', 
            color: isMatch ? 'white' : 'rgba(255,255,255,0.5)', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            border: 'none', 
            fontWeight: 'bold', 
            cursor: isMatch ? 'pointer' : 'not-allowed',
            marginTop: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          {isLoading ? 'Revoking...' : 'I understand the consequences, revoke this module'}
        </button>
      </div>
    </div>
  );
}
