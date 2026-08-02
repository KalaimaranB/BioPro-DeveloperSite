import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && sessionData?.user) {
      const user = sessionData.user;
      
      // Ensure a row exists in the developers table
      try {
        await supabase.from('developers').upsert({
          id: user.id,
          github_username: user.user_metadata?.user_name || user.email?.split('@')[0] || 'unknown',
          github_id: String(user.user_metadata?.provider_id || user.id)
        }, { onConflict: 'id' }).throwOnError(); // Explicitly throw on error to catch it
      } catch (err: any) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || 'DatabaseError')}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } else if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || 'ExchangeFailed')}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=NoCodeProvided`);
}
