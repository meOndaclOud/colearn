-- A lesson with no activities is still one piece of assigned work. Surface
-- that unit through the same progress view without inventing progress rows.
create or replace view assignment_progress with (security_invoker = true) as
select la.id as assignment_id, la.teacher_id, la.student_id, la.lesson_id, la.scheduled_date,
  la.status as publish_status, la.progress_status as lesson_status, la.started_at, la.completed_at,
  l.title, l.subject_id, l.duration_minutes,
  case when count(a.id) = 0 then 1 else count(a.id)::int end as total,
  case when count(a.id) = 0 then case when la.progress_status = 'completed' then 1 else 0 end
    else count(a.id) filter (where p.status = 'completed')::int end as completed,
  case when count(a.id) = 0 then case when la.progress_status = 'in_progress' then 1 else 0 end
    else count(a.id) filter (where p.status in ('in_progress','awaiting_review'))::int end as in_progress,
  coalesce(max(p.updated_at), la.completed_at, la.started_at) as last_activity,
  count(a.id)::int as activity_total
from lesson_assignments la
join lessons l on l.id = la.lesson_id
left join activities a on a.lesson_id = la.lesson_id
left join progress_records p on p.assignment_id = la.id and p.activity_id = a.id
group by la.id, l.id;
grant select on assignment_progress to authenticated, service_role;

-- Complete an instruction-only lesson on the assignment row. For lessons with
-- activities, reuse the existing activity RPC so submission/review checks and
-- unique progress records remain unchanged. The function is transactional.
create or replace function student_complete_lesson(p_student uuid, p_assignment uuid)
returns text language plpgsql security definer set search_path = public as $$
declare a lesson_assignments; act record; activity_total int; result_status text; lesson_title text;
begin
  perform student_start_lesson(p_student, p_assignment);
  select * into a from lesson_assignments
  where id = p_assignment and student_id = p_student
  for update;
  if a.id is null then raise exception 'This lesson is not available'; end if;

  select count(*)::int into activity_total from activities where lesson_id = a.lesson_id;
  if activity_total = 0 then
    if a.progress_status <> 'completed' then
      update lesson_assignments
      set progress_status = 'completed', completed_at = coalesce(completed_at, now())
      where id = a.id;
      select title into lesson_title from lessons where id = a.lesson_id;
      insert into progress_history (teacher_id, student_id, title, status, by_teacher)
      values (a.teacher_id, a.student_id, lesson_title, 'lesson_completed', false);
    end if;
    return 'completed';
  end if;

  for act in
    select activities.id, progress_records.status
    from activities
    left join progress_records on progress_records.assignment_id = p_assignment
      and progress_records.activity_id = activities.id
    where activities.lesson_id = a.lesson_id
    order by activities.position
  loop
    -- Approved and awaiting-review tasks already have their correct state.
    if act.status is distinct from 'completed'::activity_status
       and act.status is distinct from 'awaiting_review'::activity_status then
      perform student_set_activity(p_student, p_assignment, act.id, 'completed'::activity_status);
    end if;
  end loop;
  select progress_status into result_status from lesson_assignments where id = a.id;
  return result_status;
end $$;
revoke execute on function student_complete_lesson(uuid, uuid) from public, anon;
grant execute on function student_complete_lesson(uuid, uuid) to authenticated, service_role;

-- Refresh PostgREST's view/RPC metadata after the migration commits.
notify pgrst, 'reload schema';
