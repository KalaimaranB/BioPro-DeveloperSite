'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { syncDeveloperProfile } from './actions';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // If Supabase/GitHub returned an explicit error in the URL
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    if (errorParam) {
      router.push(`/login?error=${encodeURIComponent(errorDesc || errorParam)}`);
      return;
    }

    const nextUrl = searchParams.get('next') ?? '/dashboard';
    const supabase = createClient();

    // The createBrowserClient automatically parses ?code= or #access_token= from the URL on instantiation!
    // We just wait for the session to be firmly established in the background.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        // Sometimes it takes a few milliseconds for onAuthStateChange to fire after the hash is parsed.
        // We fallback to a listener.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession) {
            try {
              await syncDeveloperProfile();
              router.push(nextUrl);
              router.refresh();
            } catch (err: any) {
              router.push(`/login?error=${encodeURIComponent(err.message || 'SyncFailed')}`);
            }
          }
        });

        // Timeout fallback if no session is established
        setTimeout(() => {
          subscription.unsubscribe();
          // If still no session, redirect to login, else try to sync
          supabase.auth.getSession().then(({ data: { session: checkSession } }) => {
            if (!checkSession) {
              router.push(`/login?error=${encodeURIComponent('No Session Established')}`);
            } else {
               syncDeveloperProfile().then(() => {
                 router.push(nextUrl);
                 router.refresh();
               }).catch((err: any) => {
                 router.push(`/login?error=${encodeURIComponent(err.message || 'SyncFailed')}`);
               });
            }
          });
        }, 3000);

      } else {
        // Session already exists from parsing the URL
        syncDeveloperProfile().then(() => {
          router.push(nextUrl);
          router.refresh();
        }).catch((err: any) => {
          router.push(`/login?error=${encodeURIComponent(err.message || 'SyncFailed')}`);
        });
      }
    });
  }, [router, searchParams]);

  if (errorMsg) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{errorMsg}</div>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Authenticating...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please wait while we establish your secure session.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
