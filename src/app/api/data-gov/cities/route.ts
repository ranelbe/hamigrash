import { NextResponse, type NextRequest } from 'next/server';
import { DG_CITIES_RESOURCE, DG_CITIES_FIELD_NAME, cleanName, dgQuery } from '@/lib/data-gov';

// Major Israeli cities (by population, top 20) — surfaced at the top of
// the dropdown because that's what the overwhelming majority of users
// will pick. Anything not in this list still appears below, sorted alpha.
// Spellings match data.gov.il exactly (the dataset uses these forms).
const MAJOR_CITIES = [
  'ירושלים',
  'תל אביב - יפו',
  'חיפה',
  'ראשון לציון',
  'פתח תקווה',
  'אשדוד',
  'נתניה',
  'באר שבע',
  'בני ברק',
  'חולון',
  'רמת גן',
  'אשקלון',
  'רחובות',
  'בת ים',
  'בית שמש',
  'הרצליה',
  'כפר סבא',
  'חדרה',
  'מודיעין-מכבים-רעות',
  'נצרת',
];

// GET /api/data-gov/cities
//   Returns the FULL list of Israeli settlements (~1,306) with the major
//   cities at the top. Caller filters locally — CKAN's `q` full-text
//   doesn't handle Hebrew partial matches reliably.
export async function GET(_req: NextRequest) {
  try {
    const json = await dgQuery({
      resource_id: DG_CITIES_RESOURCE,
      limit: '2000', // dataset is ~1,306 rows — fits in one page
    });
    const records: any[] = json?.result?.records ?? [];

    const set = new Set<string>();
    for (const r of records) {
      const name = cleanName(r[DG_CITIES_FIELD_NAME]);
      if (name) set.add(name);
    }

    // Major cities first (preserving their hand-curated order), then the
    // rest alphabetically. Dedupe by Set semantics.
    const major = MAJOR_CITIES.filter(c => set.has(c));
    const rest  = Array.from(set)
      .filter(c => !MAJOR_CITIES.includes(c))
      .sort((a, b) => a.localeCompare(b, 'he'));
    return NextResponse.json({ results: [...major, ...rest] });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message }, { status: 200 });
  }
}
