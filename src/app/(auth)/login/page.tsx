'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

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

        {error && (
          <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 500 }}>
            Login Failed: {decodeURIComponent(error)}
          </div>
        )}
        
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
