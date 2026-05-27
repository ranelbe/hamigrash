import { NextResponse, type NextRequest } from 'next/server';
import { DG_CITIES_RESOURCE, DG_CITIES_FIELD_NAME, cleanName, dgQuery } from '@/lib/data-gov';

// GET /api/data-gov/cities?q=ת   →   { results: string[] }
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 1) return NextResponse.json({ results: [] });

  try {
    const json = await dgQuery({
      resource_id: DG_CITIES_RESOURCE,
      q,
      limit: '15',
    });
    const records: any[] = json?.result?.records ?? [];
    // Deduplicate (CKAN sometimes returns variant rows) and sort.
    const set = new Set<string>();
    for (const r of records) {
      const name = cleanName(r[DG_CITIES_FIELD_NAME]);
      if (name) set.add(name);
    }
    const results = Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message }, { status: 200 });
  }
}
