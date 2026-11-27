-- Lesson lifecycle belongs to the assignment, independently of its activities.
alter table lesson_assignments
  add column started_at timestamptz,
  add column completed_at timestamptz,
  add column progress_status text not null default 'not_started'
    check (progress_status in ('not_started', 'in_progress', 'completed'));

-- Preserve lifecycle data for activity progress that predates this migration.
update lesson_assignments la
set started_at = coalesce(la.started_at, p.first_activity),
    completed_at = case
      when p.total > 0 and p.completed = p.total then coalesce(la.completed_at, p.last_completion)
      else la.completed_at
    end,
    progress_status = case
      when p.total > 0 and p.completed = p.total then 'completed'
      when p.first_activity is not null then 'in_progress'
      else 'not_started'
    end
from (
  select a.id,
    min(pr.updated_at) as first_activity,
    max(pr.completed_at) filter (where pr.status = 'completed') as last_completion,
    count(act.id)::int as total,
    count(act.id) filter (where pr.status = 'completed')::int as completed
  from lesson_assignments a
  join activities act on act.lesson_id = a.lesson_id
  left join progress_records pr on pr.assignment_id = a.id and pr.activity_id = act.id
  group by a.id
) p
where la.id = p.id;

create or replace function student_start_lesson(p_student uuid, p_assignment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a lesson_assignments;
begin
  select * into a from lesson_assignments
  where id = p_assignment and student_id = p_student;
  if a.id is null or not is_class(a.teacher_id) or not student_active(p_student)
     or a.status <> 'published' or a.scheduled_date > app_today(a.teacher_id) then
    raise exception 'This lesson is not available';
  end if;
  if a.started_at is null then
    insert into progress_history (teacher_id, student_id, title, status, by_teacher)
    select a.teacher_id, a.student_id, l.title, 'lesson_started', false
    from lessons l where l.id = a.lesson_id;
  end if;
  update lesson_assignments
  set started_at = coalesce(started_at, now()),
      progress_status = case when progress_status = 'completed' then 'completed' else 'in_progress' end
  where id = a.id;
end $$;

-- Activity completion is reflected at the lesson level only when there is at
-- least one activity and every activity has been completed or teacher-approved.
create function sync_lesson_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare a lesson_assignments; lesson_title text; activity_total int; completed_total int;
begin
  select * into a from lesson_assignments where id = coalesce(new.assignment_id, old.assignment_id);
  if a.id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select count(act.id)::int,
    count(act.id) filter (where pr.status = 'completed')::int
  into activity_total, completed_total
  from activities act
  left join progress_records pr on pr.assignment_id = a.id and pr.activity_id = act.id
  where act.lesson_id = a.lesson_id;

  if activity_total > 0 and activity_total = completed_total then
    if a.completed_at is null then
      update lesson_assignments
      set started_at = coalesce(started_at, now()), completed_at = now(), progress_status = 'completed'
      where id = a.id;
      select title into lesson_title from lessons where id = a.lesson_id;
      insert into progress_history (teacher_id, student_id, title, status, by_teacher)
      values (a.teacher_id, a.student_id, lesson_title, 'lesson_completed', is_teacher(a.teacher_id));
    end if;
  else
    update lesson_assignments set completed_at = null,
      progress_status = case when started_at is not null or tg_op <> 'DELETE' then 'in_progress' else 'not_started' end,
      started_at = case when tg_op = 'DELETE' then started_at else coalesce(started_at, now()) end
    where id = a.id;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

create trigger sync_lesson_progress after insert or update or delete on progress_records
for each row execute function sync_lesson_progress();

drop view assignment_progress;
create view assignment_progress with (security_invoker = true) as
select la.id as assignment_id, la.teacher_id, la.student_id, la.lesson_id, la.scheduled_date,
  la.status as publish_status, la.progress_status as lesson_status, la.started_at, la.completed_at,
  l.title, l.subject_id, l.duration_minutes,
  count(a.id)::int as total,
  count(a.id) filter (where p.status = 'completed')::int as completed,
  count(a.id) filter (where p.status in ('in_progress','awaiting_review'))::int as in_progress,
  max(p.updated_at) as last_activity
from lesson_assignments la
join lessons l on l.id = la.lesson_id
left join activities a on a.lesson_id = la.lesson_id
left join progress_records p on p.assignment_id = la.id and p.activity_id = a.id
group by la.id, l.id;

grant select on assignment_progress to authenticated, service_role;
revoke execute on function student_start_lesson(uuid, uuid) from public, anon;
grant execute on function student_start_lesson(uuid, uuid) to authenticated, service_role;

-- PostgREST caches function signatures; reload after installing this RPC.
notify pgrst, 'reload schema';
