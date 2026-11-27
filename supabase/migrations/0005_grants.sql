-- Explicit Data API privileges, so setup does not depend on project defaults. RLS still decides which rows.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
revoke all on all tables in schema public from anon;
revoke update on profiles from authenticated;
grant update (full_name, timezone) on profiles to authenticated;
revoke execute on function put_progress from public, anon, authenticated;
