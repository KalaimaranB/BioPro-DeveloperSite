'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    const supabase = createClient();
    
    // In production, we'll want to dynamically grab the current origin
    // For now, assume localhost or vercel URL from env.
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Developer Login</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Authenticate with GitHub to access the BioPro Developer Portal and manage your PKI trust anchors.
        </p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'var(--bg-light)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {isLoading ? 'Connecting...' : 'Login with GitHub'}
        </button>
      </div>
    </div>
  );
}
