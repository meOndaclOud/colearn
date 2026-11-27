-- CoLearn schema
create type app_role as enum ('teacher','class');
create type publish_status as enum ('draft','published');
create type activity_status as enum ('not_started','in_progress','awaiting_review','completed');
create type challenge_status as enum ('not_started','in_progress','submitted','completed');
create type submission_status as enum ('submitted','approved','needs_revision','resubmit');
create type feedback_kind as enum ('feedback','observation','achievement');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null,
  teacher_id uuid not null references profiles(id) on delete cascade,
  full_name text not null default '',
  username text,
  timezone text not null default 'Asia/Yangon',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_class_login_per_teacher on profiles(teacher_id) where role = 'class';

create table students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  full_name text not null,
  username text not null,
  avatar_color text not null default 'indigo',
  avatar_path text,
  age int check (age between 3 and 100),
  grade text,
  interests text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, username),
  unique (id, teacher_id)
);
create table student_notes (
  student_id uuid primary key,
  teacher_id uuid not null default auth.uid(),
  notes text not null default '',
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade
);
create table subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  name text not null,
  color text not null default 'indigo',
  unique (teacher_id, name),
  unique (id, teacher_id)
);
create table student_subjects (
  student_id uuid not null,
  subject_id uuid not null,
  teacher_id uuid not null default auth.uid(),
  primary key (student_id, subject_id),
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade,
  foreign key (subject_id, teacher_id) references subjects(id, teacher_id) on delete cascade
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  objectives text not null default '',
  introduction text not null default '',
  instructions text not null default '',
  materials text not null default '',
  duration_minutes int not null default 45 check (duration_minutes between 0 and 1440),
  expected_outcome text not null default '',
  completion_criteria text not null default '',
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);
create table lesson_notes (
  lesson_id uuid primary key,
  teacher_id uuid not null default auth.uid(),
  notes text not null default '',
  foreign key (lesson_id, teacher_id) references lessons(id, teacher_id) on delete cascade
);
create table activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  lesson_id uuid not null,
  position int not null default 0,
  title text not null,
  description text not null default '',
  instructions text not null default '',
  estimated_minutes int not null default 10 check (estimated_minutes between 0 and 1440),
  expected_result text not null default '',
  requires_submission boolean not null default false,
  requires_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, teacher_id),
  foreign key (lesson_id, teacher_id) references lessons(id, teacher_id) on delete cascade
);
create table lesson_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  lesson_id uuid not null,
  student_id uuid not null,
  scheduled_date date not null,
  status publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (lesson_id, student_id, scheduled_date),
  unique (id, teacher_id),
  foreign key (lesson_id, teacher_id) references lessons(id, teacher_id) on delete cascade,
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null,
  category text not null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner','intermediate','advanced')),
  description text not null default '',
  objective text not null default '',
  instructions text not null default '',
  required_resources text not null default '',
  expected_outcome text not null default '',
  submission_requirements text not null default '',
  created_at timestamptz not null default now(),
  unique (id, teacher_id)
);
create table challenge_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  challenge_id uuid not null,
  student_id uuid not null,
  deadline date,
  status challenge_status not null default 'not_started',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (challenge_id, student_id),
  unique (id, teacher_id),
  foreign key (challenge_id, teacher_id) references challenges(id, teacher_id) on delete cascade,
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  due_date date,
  created_at timestamptz not null default now(),
  unique (id, teacher_id)
);
create table project_assignments (
  project_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (project_id, student_id),
  foreign key (project_id, teacher_id) references projects(id, teacher_id) on delete cascade,
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade
);

create table resource_library (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  title text not null,
  kind text not null default 'website',
  url text check (url is null or url ~* '^https?://'),
  file_path text,
  category text not null default 'General',
  tags text[] not null default '{}',
  description text not null default '',
  created_at timestamptz not null default now(),
  check (url is not null or file_path is not null)
);

-- A link or file attached to exactly one lesson, activity, challenge or project
create table activity_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  label text not null,
  action text not null default 'open' check (action in ('open','start','watch','doc','download','submit')),
  url text check (url is null or url ~* '^https?://'),
  file_path text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(lesson_id, activity_id, challenge_id, project_id) = 1),
  check (url is not null or file_path is not null)
);

create table progress_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  student_id uuid not null,
  assignment_id uuid not null,
  activity_id uuid not null,
  status activity_status not null default 'not_started',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, activity_id),
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade,
  foreign key (assignment_id, teacher_id) references lesson_assignments(id, teacher_id) on delete cascade,
  foreign key (activity_id, teacher_id) references activities(id, teacher_id) on delete cascade
);
create table progress_history (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  title text not null,
  status text not null,
  by_teacher boolean not null,
  created_at timestamptz not null default now()
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid not null,
  assignment_id uuid references lesson_assignments(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  challenge_assignment_id uuid references challenge_assignments(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  link_url text check (link_url is null or link_url ~* '^https?://'),
  file_path text,
  file_name text,
  comment text not null default '',
  status submission_status not null default 'submitted',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade,
  check (num_nonnulls(activity_id, challenge_assignment_id, project_id) = 1),
  check ((activity_id is null) = (assignment_id is null)),
  check (link_url is not null or file_path is not null)
);
-- one submission may wait for review per target (stops double submits)
create unique index one_pending_submission on submissions
  (student_id, coalesce(assignment_id, '00000000-0000-0000-0000-000000000000'::uuid),
   coalesce(activity_id, challenge_assignment_id, project_id)) where status = 'submitted';

create table teacher_feedback (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid(),
  student_id uuid not null,
  kind feedback_kind not null default 'feedback',
  body text not null,
  assignment_id uuid references lesson_assignments(id) on delete cascade,
  activity_id uuid references activities(id) on delete cascade,
  submission_id uuid references submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  foreign key (student_id, teacher_id) references students(id, teacher_id) on delete cascade
);

create index on students (teacher_id, is_active);
create index on lessons (teacher_id, is_template, updated_at desc);
create index on activities (lesson_id, position);
create index on lesson_assignments (teacher_id, scheduled_date);
create index on lesson_assignments (student_id, scheduled_date);
create index on challenge_assignments (student_id);
create index on activity_resources (lesson_id);
create index on activity_resources (activity_id);
create index on activity_resources (challenge_id);
create index on activity_resources (project_id);
create index on activity_resources (file_path);
create index on progress_records (student_id, updated_at desc);
create index on progress_history (student_id, created_at desc);
create index on submissions (teacher_id, created_at desc);
create index on submissions (student_id, created_at desc);
create index on teacher_feedback (student_id, created_at desc);
create index on resource_library (teacher_id, category);

-- Progress per lesson assignment, computed from real rows (respects RLS)
create view assignment_progress with (security_invoker = true) as
select la.id as assignment_id, la.teacher_id, la.student_id, la.lesson_id, la.scheduled_date, la.status as publish_status,
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
