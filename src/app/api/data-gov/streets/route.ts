import { NextResponse, type NextRequest } from 'next/server';
import {
  DG_STREETS_RESOURCE,
  DG_STREETS_CITY_FIELD,
  DG_STREETS_NAME_FIELD,
  cleanName,
  dgQuery,
} from '@/lib/data-gov';

// GET /api/data-gov/streets?city=<city>
//   Returns ALL streets in the given city.
//
// Why we don't use CKAN's `filters` for exact match: the streets dataset
// stores city names with trailing whitespace (e.g. "תל אביב - יפו ")
// while the cities dataset stores the clean form ("תל אביב - יפו").
// Filter exact-match would miss everything.
//
// Strategy:
//   1. Use `q=<city>` for a coarse full-text filter (cuts the working
//      set from ~63K rows to a few thousand).
//   2. Client-side, match by `שם_ישוב.trim() === city.trim()` so
//      whitespace quirks don't break the lookup.
export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city')?.trim() ?? '';
  if (!city) return NextResponse.json({ results: [] });

  try {
    const json = await dgQuery({
      resource_id: DG_STREETS_RESOURCE,
      q: city,
      limit: '10000', // generous — Tel Aviv has ~2K, q-filter narrows the rest
    });
    const records: any[] = json?.result?.records ?? [];

    const cityKey = city.replace(/\s+/g, ' ').trim();
    const set = new Set<string>();
    for (const r of records) {
      const recCity = String(r[DG_STREETS_CITY_FIELD] ?? '').replace(/\s+/g, ' ').trim();
      if (recCity !== cityKey) continue;
      const name = cleanName(r[DG_STREETS_NAME_FIELD]);
      if (name) set.add(name);
    }
    const results = Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message }, { status: 200 });
  }
}
