# CoLearn

A learning platform for a teacher with students who each follow their own plan.
Next.js (App Router, TypeScript, Tailwind) and Supabase (Postgres, Auth, Storage).

## Set up (about 15 minutes)
Needs Node 20.11 or newer and a free [Supabase](https://supabase.com) account.

1. **Create a Supabase project.**
2. **Create the database.** In the SQL Editor run each file in `supabase/migrations/` once, in order (0001 to 0005).
   With the Supabase CLI instead: `supabase init`, `supabase link`, `supabase db push`.
3. **Turn off public sign-ups:** Authentication, then the sign-up settings, disable "Allow new users to sign up". Keep the Email provider on.
4. **Add keys:** copy `.env.example` to `.env.local` and fill in the three values from the project's API settings.
   The service-role (secret) key must stay private.
5. **Install and create your account:**

       npm install
       npm run create-teacher -- yourname "Your Name" Asia/Yangon
       npm run dev

6. Open http://localhost:3000, sign in, then go to **Settings** and create the **class login**.
7. Add students, create a lesson, schedule it.

## Deploy to Vercel
Push this folder to a Git repository, import it in Vercel, add the same three environment variables, and deploy.

## Demo data
    npm run seed:demo                # prints the demo logins
    npm run seed:demo -- --remove    # deletes the demo workspace
The demo is a separate teacher workspace (`demo-teacher`, `demo-class`) and is invisible to your own account.
Set `DEMO_PASSWORD` to choose the password, `DEMO_TIMEZONE` to change the timezone.

## Tests
    npm run typecheck
    DEMO_PASSWORD=... npm run test:security   # after seed:demo; use a test project, it writes data

## How it behaves
- A lesson shows to students when it is **Published** and its date has arrived in the teacher's timezone.
- Editing a lesson changes it for everyone it is assigned to. Duplicate it first for a different version.
- Activities marked "I approve before it counts as completed" show as waiting until you approve them.
- Uploads are limited to 25 MB per file (profile photos 2 MB) and are stored privately.

## Know before using with real students
- **The class login is shared and has no PIN.** Anyone who has it can pick any name and see or submit that student's work.
  It cannot see teacher notes, drafts or future lessons, or change lessons or approve work.
  Share it only with your class and change it when someone leaves.
- Teacher accounts are created by script; there is no public registration or "forgot password" email.
  Reset a password from the Supabase dashboard.
- Deleting a student removes their submitted files. Deleting lessons, challenges, projects or library items
  leaves their uploaded files in Storage.
- The shadcn-style components in `src/components/ui` are written in this repository (Radix + Tailwind).

See `docs/ARCHITECTURE.md` for the design and database.
