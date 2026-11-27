# CoLearn — architecture and plan

## Architecture
Next.js (App Router, TypeScript) on Vercel + Supabase (Postgres, Auth, Storage).

- Pages are server components that read through the signed-in user's Supabase session, so Row Level Security (RLS) applies to every query.
- Writes go through server actions validated with Zod. Student writes go only through Postgres functions that check what is allowed.
- Files upload straight from the browser to private Storage buckets (storage policies apply) and are opened through short-lived signed links.
- The service-role key is used only on the server, to create the class login, and by setup scripts.

## Sign-in model
| Who | How | Can do |
|---|---|---|
| Teacher | Own email/username + password | Everything in their own workspace |
| Class | One shared username + password, then "pick your name" (no PIN) | Read published, date-reached work of students in that class; update progress; submit work |

**Known limit (chosen deliberately):** pupils sharing one login can open each other's work by picking another name. The database cannot tell them apart. It still guarantees that the class login cannot read teacher notes, drafts, future lessons or another teacher's data, and cannot edit teaching content or approve work. Per-pupil privacy would need a PIN or individual accounts.

## Database
| Table | Purpose |
|---|---|
| profiles | Auth users: role (teacher or class), timezone |
| students, student_notes | Pupil records; private notes kept apart |
| subjects, student_subjects | Subjects per teacher and per pupil |
| lessons, lesson_notes, activities | Reusable lesson content and ordered activities |
| lesson_assignments | Lesson + student + date + draft/published |
| activity_resources | Links and files on lessons, activities, challenges, projects |
| progress_records, progress_history | Current status per activity, and every change |
| challenges, challenge_assignments | Extra work with deadlines |
| projects, project_assignments | Project briefs and who has them |
| submissions | Many per target: file and/or link, review status |
| teacher_feedback | Feedback, private observations, achievements |
| resource_library | Reusable materials |

All keys are UUIDs; every row carries `teacher_id`; RLS is on for every table.
A lesson is visible to the class only when published **and** its date has arrived in the teacher's timezone.

## Folder structure
    src/app/(routes)      login, teacher/*, student/*, api/files
    src/actions           server actions, one file per domain
    src/components/ui     shadcn-style primitives (Radix + Tailwind)
    src/components        feature components by domain
    src/lib               Supabase clients, auth guards, dates, validation
    supabase/migrations   schema, RLS, functions, storage
    scripts               create a teacher, load/remove demo data
    tests                 permission and end-to-end tests

## Plan
1. Foundation: project, design system, database, sign-in and roles
2. Teacher: students, lesson planner, calendar, challenges, library
3. Student: today dashboard, lessons, submissions
4. Progress: reviews, feedback, reports, history
5. Refine and test: responsive layouts, loading and empty states, permission tests

Demo data lives in its own teacher workspace, separate from real data by the same RLS rules.
