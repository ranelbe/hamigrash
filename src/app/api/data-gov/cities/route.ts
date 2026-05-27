import { NextResponse, type NextRequest } from 'next/server';
import { DG_CITIES_RESOURCE, DG_CITIES_FIELD_NAME, cleanName, dgQuery } from '@/lib/data-gov';

// GET /api/data-gov/cities[?q=…]
//   q omitted → first 30 cities alphabetically (so the dropdown isn't empty
//                on focus before any typing).
//   q present → CKAN full-text search; up to 20 matches.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  try {
    const params: Record<string, string> = {
      resource_id: DG_CITIES_RESOURCE,
      limit: q ? '20' : '30',
    };
    if (q) params.q = q;
    const json = await dgQuery(params);
    const records: any[] = json?.result?.records ?? [];

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
