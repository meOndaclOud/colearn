-- Helpers (security definer so policies don't recurse)
create function my_role() returns app_role language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;
create function my_teacher() returns uuid language sql stable security definer set search_path = public as
$$ select teacher_id from profiles where id = auth.uid() $$;
create function is_teacher(t uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'teacher' and id = t) $$;
create function is_class(t uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'class' and teacher_id = t) $$;
create function app_today(t uuid) returns date language sql stable security definer set search_path = public as
$$ select (now() at time zone coalesce((select timezone from profiles where id = t), 'UTC'))::date $$;
create function student_active(s uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from students where id = s and is_active) $$;
-- Is this lesson visible to the class login?
create function lesson_released(l uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from lesson_assignments a join students s on s.id = a.student_id and s.is_active
   where a.lesson_id = l and a.status = 'published' and a.scheduled_date <= app_today(a.teacher_id) and is_class(a.teacher_id)) $$;
create function challenge_released(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from challenge_assignments a join students s on s.id = a.student_id and s.is_active
   where a.challenge_id = c and is_class(a.teacher_id)) $$;
create function project_released(p uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from project_assignments a join students s on s.id = a.student_id and s.is_active
   where a.project_id = p and is_class(a.teacher_id)) $$;

-- Roles come only from app_metadata, which users cannot edit themselves
create function handle_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r text := new.raw_app_meta_data->>'role';
begin
  if r in ('teacher','class') then
    insert into profiles (id, role, teacher_id, full_name, username, is_demo, timezone)
    values (new.id, r::app_role,
      case when r = 'teacher' then new.id else (new.raw_app_meta_data->>'teacher_id')::uuid end,
      coalesce(new.raw_app_meta_data->>'full_name',''), new.raw_app_meta_data->>'username',
      coalesce((new.raw_app_meta_data->>'is_demo')::boolean, false),
      coalesce(new.raw_app_meta_data->>'timezone','Asia/Yangon'))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user after insert or update of raw_app_meta_data on auth.users
  for each row execute function handle_auth_user();

do $$ declare t text; begin
  foreach t in array array['profiles','students','student_notes','subjects','student_subjects','lessons','lesson_notes',
    'activities','lesson_assignments','challenges','challenge_assignments','projects','project_assignments',
    'resource_library','activity_resources','progress_records','progress_history','submissions','teacher_feedback'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
  -- teacher owns everything in their workspace
  foreach t in array array['students','student_notes','subjects','student_subjects','lessons','lesson_notes','activities',
    'lesson_assignments','challenges','challenge_assignments','projects','project_assignments','resource_library',
    'activity_resources','progress_records','progress_history','submissions','teacher_feedback'] loop
    execute format('create policy teacher_all on %I for all to authenticated using (is_teacher(teacher_id)) with check (is_teacher(teacher_id))', t);
  end loop;
end $$;

-- Attachments and submissions must also point at the teacher's own rows
create policy own_parents on activity_resources as restrictive for all to authenticated using (true) with check (
  (lesson_id is null or exists(select 1 from lessons x where x.id = lesson_id and x.teacher_id = activity_resources.teacher_id)) and
  (activity_id is null or exists(select 1 from activities x where x.id = activity_id and x.teacher_id = activity_resources.teacher_id)) and
  (challenge_id is null or exists(select 1 from challenges x where x.id = challenge_id and x.teacher_id = activity_resources.teacher_id)) and
  (project_id is null or exists(select 1 from projects x where x.id = project_id and x.teacher_id = activity_resources.teacher_id)));
create policy own_subject on lessons as restrictive for all to authenticated using (true) with check (
  subject_id is null or exists(select 1 from subjects s where s.id = subject_id and s.teacher_id = lessons.teacher_id));

create policy read_profile on profiles for select to authenticated using (id = auth.uid() or id = my_teacher() or is_teacher(teacher_id));
create policy teacher_update_self on profiles for update to authenticated
  using (id = auth.uid() and role = 'teacher') with check (id = auth.uid() and role = 'teacher' and teacher_id = auth.uid());
revoke update on profiles from authenticated;
grant update (full_name, timezone) on profiles to authenticated;

-- class login: read only
create policy class_read on students for select to authenticated using (is_class(teacher_id) and is_active);
create policy class_read on subjects for select to authenticated using (is_class(teacher_id));
create policy class_read on student_subjects for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on lesson_assignments for select to authenticated
  using (is_class(teacher_id) and status = 'published' and scheduled_date <= app_today(teacher_id) and student_active(student_id));
create policy class_read on lessons for select to authenticated using (lesson_released(id));
create policy class_read on activities for select to authenticated using (lesson_released(lesson_id));
create policy class_read on challenge_assignments for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on challenges for select to authenticated using (challenge_released(id));
create policy class_read on project_assignments for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on projects for select to authenticated using (project_released(id));
create policy class_read on activity_resources for select to authenticated using (
  (lesson_id is not null and lesson_released(lesson_id)) or
  (activity_id is not null and exists(select 1 from activities a where a.id = activity_id)) or
  (challenge_id is not null and challenge_released(challenge_id)) or
  (project_id is not null and project_released(project_id)));
create policy class_read on progress_records for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on progress_history for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on submissions for select to authenticated using (is_class(teacher_id) and student_active(student_id));
create policy class_read on teacher_feedback for select to authenticated
  using (is_class(teacher_id) and student_active(student_id) and kind <> 'observation');

-- history is written automatically
create function log_progress() returns trigger language plpgsql security definer set search_path = public as $$
declare label text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  if tg_table_name = 'progress_records' then
    select title into label from activities where id = new.activity_id;
  else
    if tg_op = 'INSERT' then return new; end if;
    select title into label from challenges where id = new.challenge_id;
  end if;
  insert into progress_history (teacher_id, student_id, title, status, by_teacher)
  values (new.teacher_id, new.student_id, label, new.status::text, is_teacher(new.teacher_id));
  return new;
end $$;
create trigger progress_log after insert or update on progress_records for each row execute function log_progress();
create trigger challenge_log after insert or update on challenge_assignments for each row execute function log_progress();

create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger touch before update on students for each row execute function touch_updated();
create trigger touch before update on lessons for each row execute function touch_updated();
