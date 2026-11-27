-- Private buckets. Object paths start with the teacher's id.
insert into storage.buckets (id, name, public, file_size_limit) values
  ('resources','resources', false, 26214400),
  ('submissions','submissions', false, 26214400),
  ('avatars','avatars', false, 2097152)
on conflict (id) do nothing;

create policy teacher_files on storage.objects for all to authenticated
  using (bucket_id in ('resources','submissions','avatars') and public.is_teacher(((storage.foldername(name))[1])::uuid))
  with check (bucket_id in ('resources','submissions','avatars') and public.is_teacher(((storage.foldername(name))[1])::uuid));

-- The class can only read attachments that appear on something it can see
create policy class_read_resources on storage.objects for select to authenticated
  using (bucket_id = 'resources' and public.is_class(((storage.foldername(name))[1])::uuid)
    and exists(select 1 from public.activity_resources r where r.file_path = storage.objects.name));
create policy class_read_avatars on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_class(((storage.foldername(name))[1])::uuid));
create policy class_read_submissions on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and public.is_class(((storage.foldername(name))[1])::uuid));
-- Upload only: teacher/student/target/date/file. No overwrite, no delete.
create policy class_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.is_class(((storage.foldername(name))[1])::uuid)
    and exists(select 1 from public.students s where s.id::text = (storage.foldername(name))[2]));
