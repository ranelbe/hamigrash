import { NextResponse, type NextRequest } from 'next/server';
import {
  DG_STREETS_RESOURCE,
  DG_STREETS_CITY_FIELD,
  DG_STREETS_NAME_FIELD,
  cleanName,
  dgQuery,
} from '@/lib/data-gov';

// GET /api/data-gov/streets?city=<city>[&q=<query>]
//   city required (the dataset is huge — 63K rows — never query without it).
//   q omitted → first 50 streets in the city, alphabetically.
//   q present → CKAN full-text restricted to that city.
export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city')?.trim() ?? '';
  const q    = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!city) return NextResponse.json({ results: [] });

  try {
    const params: Record<string, string> = {
      resource_id: DG_STREETS_RESOURCE,
      filters: JSON.stringify({ [DG_STREETS_CITY_FIELD]: city }),
      limit: '100',
    };
    if (q) params.q = q;
    const json = await dgQuery(params);
    const records: any[] = json?.result?.records ?? [];

    const set = new Set<string>();
    for (const r of records) {
      const name = cleanName(r[DG_STREETS_NAME_FIELD]);
      if (!name) continue;
      // CKAN's `q` is full-text — also matches the city name. Filter
      // client-side so the user only sees streets that actually match.
      if (q && !name.includes(q)) continue;
      set.add(name);
    }
    const results = Array.from(set).sort((a, b) => a.localeCompare(b, 'he')).slice(0, 30);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message }, { status: 200 });
  }
}
