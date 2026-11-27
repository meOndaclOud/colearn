export const CATEGORIES = ["Scratch Projects","JavaScript Challenges","Tinkercad 3D Design","Creative Thinking","Problem Solving","Typing Practice","Digital Skills","Research Activities"];
export const LEARNING_CATEGORIES = ["Scratch", "CS First", "Code.org", "Tinkercad", "JavaScript", "Python", "Electronics", "Snap-on", "Website Development", "AI"] as const;
export const RESOURCE_KINDS = ["google_doc","drive_folder","pdf","worksheet","video","template","website","image"] as const;
export const KIND_LABEL: Record<string, string> = { google_doc: "Google Doc", drive_folder: "Drive folder", pdf: "PDF", worksheet: "Worksheet", video: "Video tutorial", template: "Project template", website: "Website", image: "Image" };
export const ACTION_LABEL: Record<string, string> = { open: "Open Learning Material", start: "Start Activity", watch: "Watch Tutorial", doc: "Open Google Doc", download: "Download Worksheet", submit: "Submit Your Work" };
export const COLORS: Record<string, string> = { indigo: "bg-indigo-100 text-indigo-700", sky: "bg-sky-100 text-sky-700", teal: "bg-teal-100 text-teal-700", violet: "bg-violet-100 text-violet-700", amber: "bg-amber-100 text-amber-800", rose: "bg-rose-100 text-rose-700" };
export const STATUS: Record<string, { label: string; tone: "grey" | "blue" | "amber" | "teal" | "red" }> = {
  not_started: { label: "Not started", tone: "grey" }, in_progress: { label: "In progress", tone: "blue" },
  awaiting_review: { label: "Waiting for review", tone: "amber" }, completed: { label: "Completed", tone: "teal" },
  submitted: { label: "Submitted", tone: "amber" }, approved: { label: "Approved", tone: "teal" },
  needs_revision: { label: "Needs revision", tone: "red" }, resubmit: { label: "Please resubmit", tone: "red" },
  draft: { label: "Draft", tone: "grey" }, published: { label: "Published", tone: "teal" },
};
export const MAX_FILE = 25 * 1024 * 1024;
