import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // The authorities.json is stored in the 'registries' bucket.
  const { data, error } = await supabase
    .storage
    .from('registries')
    .download('authorities_signed.json');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch authorities registry.' }, { status: 404 });
  }

  const jsonText = await data.text();
  const parsedJson = JSON.parse(jsonText);

  return NextResponse.json(parsedJson);
}
