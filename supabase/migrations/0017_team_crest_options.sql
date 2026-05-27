-- ============================================================
-- HaMigrash — 0017: team crest customization
-- crest_shape: which silhouette the auto-generated badge uses
-- crest_text_color: explicit text colour for initials (else auto-contrast)
-- ============================================================

alter table public.teams
  add column if not exists crest_shape text not null default 'hexagon'
    check (crest_shape in ('hexagon', 'shield', 'circle', 'square', 'diamond', 'pentagon')),
  add column if not exists crest_text_color text;
