import { z } from "zod";

const text = (max = 20000) => z.string().max(max).default("");
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const link = z.url({ protocol: /^https?$/, error: "Links must start with http:// or https://" });

export const resourceSchema = z.object({
  label: z.string().trim().min(1, "Every resource needs a name.").max(200),
  action: z.enum(["open","start","watch","doc","download","submit"]),
  url: link.nullable().or(z.literal("").transform(() => null)),
  file_path: z.string().max(500).nullable(),
}).refine((r) => r.url || r.file_path, "Every resource needs a link or a file.");

export const studentSchema = z.object({
  id: z.guid().optional(),
  full_name: z.string().trim().min(2, "Enter the student's full name.").max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{2,30}$/, "Username: 2–30 letters, numbers, dot, dash or underscore."),
  avatar_color: z.string().max(20),
  avatar_path: z.string().max(500).nullable(),
  age: optInt(3, 100),
  grade: z.string().max(60).nullable(),
  interests: z.array(z.string().trim().min(1).max(60)).max(20),
  subject_ids: z.array(z.guid()),
  notes: text(5000),
});

export const activitySchema = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(1, "Every activity needs a title.").max(200),
  description: text(2000), instructions: text(), expected_result: text(2000),
  estimated_minutes: z.number({ error: "Enter the activity time in minutes." }).int().min(0).max(1440),
  requires_submission: z.boolean(), requires_review: z.boolean(),
  resources: z.array(resourceSchema).max(20),
});

export const lessonSchema = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(2, "Give the lesson a title.").max(200),
  subject_id: z.string().nullable(),
  objectives: text(4000), introduction: text(), instructions: text(), materials: text(4000),
  duration_minutes: z.number({ error: "Enter the lesson time in minutes." }).int().min(0).max(1440),
  expected_outcome: text(4000), completion_criteria: text(4000), notes: text(8000),
  is_template: z.boolean(),
  resources: z.array(resourceSchema).max(30),
  activities: z.array(activitySchema).max(30),
});

export const challengeSchema = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(2, "Give the challenge a title.").max(200),
  category: z.string().trim().min(1, "Choose a category.").max(80),
  difficulty: z.enum(["beginner","intermediate","advanced"]),
  description: text(4000), objective: text(4000), instructions: text(), required_resources: text(4000),
  expected_outcome: text(4000), submission_requirements: text(4000),
  resources: z.array(resourceSchema).max(20),
});

export const projectSchema = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(2, "Give the project a title.").max(200),
  instructions: text(), due_date: z.iso.date().nullable(),
  student_ids: z.array(z.guid()).min(1, "Choose at least one student."),
  resources: z.array(resourceSchema).max(20),
});

export const librarySchema = z.object({
  id: z.guid().optional(),
  title: z.string().trim().min(2, "Give the resource a title.").max(200),
  kind: z.string().max(40), category: z.string().trim().max(80).transform((v) => v || "General"),
  url: link.nullable().or(z.literal("").transform(() => null)), file_path: z.string().max(500).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20), description: text(2000),
}).refine((r) => r.url || r.file_path, "Add a link or upload a file.");
