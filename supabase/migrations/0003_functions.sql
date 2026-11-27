-- Internal: write a progress row
create function put_progress(a lesson_assignments, act uuid, s activity_status) returns void
language sql security definer set search_path = public as $$
  insert into progress_records (teacher_id, student_id, assignment_id, activity_id, status, completed_at)
  values (a.teacher_id, a.student_id, a.id, act, s, case when s = 'completed' then now() end)
  on conflict (assignment_id, activity_id) do update
    set status = excluded.status, completed_at = excluded.completed_at, updated_at = now()
$$;
revoke execute on function put_progress from public, anon, authenticated;

-- Pupil changes an activity status. Reviewed work can only be completed by the teacher.
create function student_set_activity(p_student uuid, p_assignment uuid, p_activity uuid, p_status activity_status)
returns activity_status language plpgsql security definer set search_path = public as $$
declare a lesson_assignments; act activities; cur activity_status; s activity_status := p_status;
begin
  select * into a from lesson_assignments where id = p_assignment and student_id = p_student;
  if a.id is null or not is_class(a.teacher_id) or not student_active(p_student)
     or a.status <> 'published' or a.scheduled_date > app_today(a.teacher_id) then
    raise exception 'This lesson is not available';
  end if;
  select * into act from activities where id = p_activity and lesson_id = a.lesson_id;
  if act.id is null then raise exception 'Activity not found'; end if;
  if s = 'awaiting_review' then raise exception 'That status is set automatically'; end if;
  select status into cur from progress_records where assignment_id = a.id and activity_id = act.id;
  if act.requires_review and cur = 'completed' then raise exception 'Your teacher has already approved this'; end if;
  if s = 'completed' and act.requires_submission and not exists(
      select 1 from submissions where assignment_id = a.id and activity_id = act.id and status in ('submitted','approved')) then
    raise exception 'Submit your work first';
  end if;
  if s = 'completed' and act.requires_review then s := 'awaiting_review'; end if;
  perform put_progress(a, act.id, s);
  return s;
end $$;

create function student_start_challenge(p_student uuid, p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update challenge_assignments set status = 'in_progress'
  where id = p_id and student_id = p_student and status = 'not_started' and is_class(teacher_id) and student_active(student_id);
  if not found then raise exception 'This challenge cannot be started'; end if;
end $$;

-- Pupil submits work for an activity, challenge or project
create function student_submit(p_student uuid, p_type text, p_target uuid, p_assignment uuid,
  p_link text, p_file_path text, p_file_name text, p_comment text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; v_title text; new_id uuid; a lesson_assignments; ch challenge_assignments; act activities;
begin
  select teacher_id into t from students where id = p_student and is_active;
  if t is null or not is_class(t) then raise exception 'Not allowed'; end if;
  if p_file_path is not null and (p_file_path not like t || '/' || p_student || '/%'
     or not exists(select 1 from storage.objects where bucket_id = 'submissions' and name = p_file_path)) then
    raise exception 'The file was not uploaded correctly';
  end if;
  if p_type = 'activity' then
    select * into a from lesson_assignments where id = p_assignment and student_id = p_student
      and status = 'published' and scheduled_date <= app_today(t);
    select * into act from activities where id = p_target and lesson_id = a.lesson_id;
    if act.id is null then raise exception 'This activity is not available'; end if;
    v_title := act.title;
  elsif p_type = 'challenge' then
    select * into ch from challenge_assignments where id = p_target and student_id = p_student;
    if ch.id is null then raise exception 'This challenge is not available'; end if;
    if ch.status = 'completed' then raise exception 'This challenge is already approved'; end if;
    select title into v_title from challenges where id = ch.challenge_id;
  elsif p_type = 'project' then
    select p.title into v_title from projects p join project_assignments pa on pa.project_id = p.id
      where p.id = p_target and pa.student_id = p_student;
    if v_title is null then raise exception 'This project is not available'; end if;
  else raise exception 'Unknown type';
  end if;
  insert into submissions (teacher_id, student_id, assignment_id, activity_id, challenge_assignment_id, project_id,
    title, link_url, file_path, file_name, comment)
  values (t, p_student, case when p_type='activity' then p_assignment end, case when p_type='activity' then p_target end,
    case when p_type='challenge' then p_target end, case when p_type='project' then p_target end,
    v_title, nullif(p_link,''), p_file_path, p_file_name, coalesce(p_comment,''))
  returning id into new_id;
  if p_type = 'challenge' then update challenge_assignments set status = 'submitted' where id = p_target; end if;
  if p_type = 'activity' then
    if not exists(select 1 from progress_records where assignment_id = a.id and activity_id = act.id and status = 'completed') then
      perform put_progress(a, act.id, case when act.requires_review then 'awaiting_review'::activity_status else 'in_progress' end);
    end if;
  end if;
  return new_id;
exception when unique_violation then
  raise exception 'You already sent this. Wait for your teacher to review it.';
end $$;

create function review_submission(p_id uuid, p_status submission_status, p_feedback text)
returns void language plpgsql security definer set search_path = public as $$
declare s submissions; a lesson_assignments;
begin
  select * into s from submissions where id = p_id;
  if s.id is null or not is_teacher(s.teacher_id) then raise exception 'Not allowed'; end if;
  if p_status = 'submitted' then raise exception 'Choose a review result'; end if;
  update submissions set status = p_status, reviewed_at = now() where id = p_id;
  if nullif(trim(p_feedback),'') is not null then
    insert into teacher_feedback (teacher_id, student_id, body, submission_id, assignment_id, activity_id)
    values (s.teacher_id, s.student_id, trim(p_feedback), s.id, s.assignment_id, s.activity_id);
  end if;
  if s.activity_id is not null then
    select * into a from lesson_assignments where id = s.assignment_id;
    perform put_progress(a, s.activity_id, case when p_status = 'approved' then 'completed'::activity_status else 'in_progress' end);
  elsif s.challenge_assignment_id is not null then
    update challenge_assignments set
      status = case when p_status = 'approved' then 'completed'::challenge_status else 'in_progress' end,
      completed_at = case when p_status = 'approved' then now() end
    where id = s.challenge_assignment_id;
  end if;
end $$;

create function teacher_set_activity(p_assignment uuid, p_activity uuid, p_status activity_status)
returns void language plpgsql security definer set search_path = public as $$
declare a lesson_assignments;
begin
  select * into a from lesson_assignments where id = p_assignment;
  if a.id is null or not is_teacher(a.teacher_id)
     or not exists(select 1 from activities where id = p_activity and lesson_id = a.lesson_id) then
    raise exception 'Not allowed';
  end if;
  perform put_progress(a, p_activity, p_status);
end $$;

-- Attachments are replaced as a set
create function set_resources(p_col text, p_id uuid, p_items jsonb) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if p_col not in ('lesson_id','activity_id','challenge_id','project_id') then raise exception 'Bad target'; end if;
  execute format('delete from activity_resources where %I = $1', p_col) using p_id;
  execute format($q$ insert into activity_resources (%I, label, action, url, file_path, position)
    select $1, e->>'label', coalesce(e->>'action','open'), nullif(e->>'url',''), nullif(e->>'file_path',''), (o - 1)::int
    from jsonb_array_elements($2) with ordinality as x(e, o) $q$, p_col) using p_id, coalesce(p_items, '[]'::jsonb);
end $$;

-- Save a whole lesson in one transaction; existing activity ids (and their progress) are kept
create function save_lesson(p jsonb) returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid := nullif(p->>'id','')::uuid; item jsonb; ord bigint; act uuid; keep uuid[] := '{}';
begin
  if my_role() is distinct from 'teacher' then raise exception 'Not allowed'; end if;
  if v_id is null then
    insert into lessons (title) values (p->>'title') returning id into v_id;
  end if;
  update lessons set title = p->>'title', subject_id = nullif(p->>'subject_id','')::uuid,
    objectives = coalesce(p->>'objectives',''), introduction = coalesce(p->>'introduction',''),
    instructions = coalesce(p->>'instructions',''), materials = coalesce(p->>'materials',''),
    duration_minutes = coalesce((p->>'duration_minutes')::int, 45), expected_outcome = coalesce(p->>'expected_outcome',''),
    completion_criteria = coalesce(p->>'completion_criteria',''), is_template = coalesce((p->>'is_template')::boolean, false)
  where id = v_id;
  if not found then raise exception 'Lesson not found'; end if;
  insert into lesson_notes (lesson_id, notes) values (v_id, coalesce(p->>'notes',''))
    on conflict (lesson_id) do update set notes = excluded.notes;
  perform set_resources('lesson_id', v_id, p->'resources');
  for item, ord in select e, o from jsonb_array_elements(coalesce(p->'activities','[]')) with ordinality as x(e, o) loop
    act := nullif(item->>'id','')::uuid;
    if act is not null then
      update activities set position = (ord-1)::int where id = act and lesson_id = v_id;
      if not found then act := null; end if;
    end if;
    if act is null then
      insert into activities (lesson_id, title, position) values (v_id, item->>'title', (ord-1)::int) returning id into act;
    end if;
    update activities set title = item->>'title', description = coalesce(item->>'description',''),
      instructions = coalesce(item->>'instructions',''), estimated_minutes = coalesce((item->>'estimated_minutes')::int, 10),
      expected_result = coalesce(item->>'expected_result',''),
      requires_submission = coalesce((item->>'requires_submission')::boolean, false),
      requires_review = coalesce((item->>'requires_review')::boolean, false)
    where id = act;
    perform set_resources('activity_id', act, item->'resources');
    keep := keep || act;
  end loop;
  delete from activities where lesson_id = v_id and not (id = any(keep));
  return v_id;
end $$;

create function duplicate_lesson(p_id uuid, p_title text, p_template boolean) returns uuid
language plpgsql security invoker set search_path = public as $$
declare new_id uuid; a activities; new_act uuid;
begin
  insert into lessons (subject_id, title, objectives, introduction, instructions, materials, duration_minutes,
    expected_outcome, completion_criteria, is_template)
  select subject_id, coalesce(p_title, title || ' (copy)'), objectives, introduction, instructions, materials,
    duration_minutes, expected_outcome, completion_criteria, p_template from lessons where id = p_id
  returning id into new_id;
  if new_id is null then raise exception 'Lesson not found'; end if;
  insert into lesson_notes (lesson_id, notes) select new_id, notes from lesson_notes where lesson_id = p_id;
  insert into activity_resources (lesson_id, label, action, url, file_path, position)
    select new_id, label, action, url, file_path, position from activity_resources where lesson_id = p_id;
  for a in select * from activities where lesson_id = p_id order by position loop
    insert into activities (lesson_id, position, title, description, instructions, estimated_minutes, expected_result,
      requires_submission, requires_review)
    values (new_id, a.position, a.title, a.description, a.instructions, a.estimated_minutes, a.expected_result,
      a.requires_submission, a.requires_review) returning id into new_act;
    insert into activity_resources (activity_id, label, action, url, file_path, position)
      select new_act, label, action, url, file_path, position from activity_resources where activity_id = a.id;
  end loop;
  return new_id;
end $$;
