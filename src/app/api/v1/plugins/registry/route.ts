import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Fetch all modules and their versions
  const { data: modules, error } = await supabase
    .from('modules')
    .select(`
      namespace,
      plugin_name,
      description,
      repository_url,
      is_verified,
      module_versions (
        version_tag,
        sha256_hash,
        download_url,
        published_at
      )
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Restructure the data to match the expected format for BioPro Core
  // Usually this is grouped by namespace or plugin_name.
  // For simplicity, we just return the array of modules with their versions.
  return NextResponse.json({ plugins: modules });
}
