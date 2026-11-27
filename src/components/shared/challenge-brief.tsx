import { Card } from "@/components/ui/card";
import { Detail, Rich } from "./bits";
import { ResourceLinks } from "./resource-links";
import type { Challenge, Resource } from "@/lib/types";

export function ChallengeBrief({ c, resources }: { c: Challenge; resources: Resource[] }) {
  return (
    <Card className="space-y-4">
      <Detail label="What this is about">{c.description}</Detail>
      <Detail label="Learning objective">{c.objective}</Detail>
      <section className="rounded-xl border border-brand/15 bg-brand-soft/50 p-4" aria-labelledby="challenge-instructions">
        <h3 id="challenge-instructions" className="mb-2 font-semibold">Your instructions</h3>
        {c.instructions ? <Rich html={c.instructions} /> : <p className="text-sm text-muted">Your teacher hasn’t added specific instructions. Use the goal and submission details below to guide your work.</p>}
      </section>
      <Detail label="What you need">{c.required_resources}</Detail>
      <Detail label="Expected outcome">{c.expected_outcome}</Detail>
      <Detail label="What to submit">{c.submission_requirements}</Detail>
      <ResourceLinks items={resources} />
    </Card>
  );
}
