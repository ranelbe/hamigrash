// data.gov.il CKAN integration. The portal serves Israeli open data via
// CKAN's `datastore_search` endpoint, which doesn't allow cross-origin
// browser requests — hence the API routes that wrap this server-side.
//
// Resource IDs are documented at https://data.gov.il/dataset
// and very rarely change. If they do, update here and redeploy.

export const DG_BASE = 'https://data.gov.il/api/3/action/datastore_search';

// "ישובים" — official list of Israeli localities.
export const DG_CITIES_RESOURCE   = '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
export const DG_CITIES_FIELD_NAME = 'שם_ישוב';

// "רחובות" — official list of streets per locality.
export const DG_STREETS_RESOURCE     = '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';
export const DG_STREETS_CITY_FIELD   = 'שם_ישוב';
export const DG_STREETS_NAME_FIELD   = 'שם_רחוב';

// Internal helper — CKAN's datastore_search supports either `q=` for
// full-text search across all fields, or `filters={"field":"value"}`
// for exact-match.
export async function dgQuery(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${DG_BASE}?${qs}`, {
    // Cache for 24h per unique query — data.gov.il is slow and the
    // dataset moves at glacial pace.
    next: { revalidate: 86400 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`data.gov.il ${res.status}`);
  return res.json();
}

// Normalise the Hebrew names data.gov.il returns: trim and collapse
// any internal double-spaces. Some rows have trailing spaces.
export function cleanName(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}
