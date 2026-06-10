-- ============================================================
-- 0027: DELETE policy on invitations
-- ============================================================
-- The invitations table was created with INSERT + UPDATE policies
-- only. Postgres RLS rejects DELETE without an explicit policy, but
-- the rejection is silent — supabase-js returns no error and 0
-- affected rows. So the 'מחיקה' button in the UI appeared to do
-- nothing.
-- ============================================================

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete on public.invitations
  for delete using (
    public.is_app_admin()
    or invited_by = auth.uid()
  );

notify pgrst, 'reload schema';
