'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/app/loading-button';
import { AiReviewDialog } from '@/components/app/ai-review-dialog';
import { Field, EntryCard, AddEntryButton } from '@/components/app/builder/entry-fields';
import { useAiImprove } from '@/components/app/builder/use-ai-improve';
import type { ResumeData } from '@/types/resume';
import { Sparkles } from 'lucide-react';

interface StepProps {
  data: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  targetRole?: string;
  context?: string;
}

// ─── Step 1: Personal Information ────────────────────────────────────────────

export function StepPersonal({ data, update }: StepProps) {
  const p = data.personal;
  const set = (key: keyof typeof p) => (e: React.ChangeEvent<HTMLInputElement>) =>
    update({ personal: { ...p, [key]: e.target.value } });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Full Name" htmlFor="pi-name" className="sm:col-span-2">
        <Input id="pi-name" value={p.fullName} onChange={set('fullName')} placeholder="e.g. Priya Patel" maxLength={80} />
      </Field>
      <Field label="Professional Title" htmlFor="pi-title" className="sm:col-span-2" hint="Shown under your name, e.g. “Full Stack Developer”">
        <Input id="pi-title" value={p.professionalTitle} onChange={set('professionalTitle')} placeholder="e.g. Software Developer" maxLength={100} />
      </Field>
      <Field label="Email" htmlFor="pi-email">
        <Input id="pi-email" type="email" value={p.email} onChange={set('email')} placeholder="you@example.com" />
      </Field>
      <Field label="Phone" htmlFor="pi-phone">
        <Input id="pi-phone" value={p.phone} onChange={set('phone')} placeholder="+91 90000 00000" maxLength={30} />
      </Field>
      <Field label="Location" htmlFor="pi-location">
        <Input id="pi-location" value={p.location} onChange={set('location')} placeholder="City, Country" maxLength={100} />
      </Field>
      <Field label="LinkedIn" htmlFor="pi-linkedin">
        <Input id="pi-linkedin" value={p.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/…" />
      </Field>
      <Field label="GitHub" htmlFor="pi-github">
        <Input id="pi-github" value={p.github} onChange={set('github')} placeholder="https://github.com/…" />
      </Field>
      <Field label="Portfolio" htmlFor="pi-portfolio" className="sm:col-span-2">
        <Input id="pi-portfolio" value={p.portfolio} onChange={set('portfolio')} placeholder="https://yourportfolio.com" />
      </Field>
    </div>
  );
}

// ─── Step 2: Professional Summary ────────────────────────────────────────────

export function StepSummary({ data, update, targetRole, context }: StepProps) {
  const ai = useAiImprove();

  const accept = () => {
    if (!ai.review) return;
    if (ai.review.id === 'summary') update({ summary: ai.review.improved });
    else update({ objective: ai.review.improved });
    ai.close();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="pi-objective" className="text-sm font-medium">
            Career Objective <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <LoadingButton
            type="button"
            size="sm"
            variant="outline"
            className="min-h-[36px] text-teal-700 dark:text-teal-300"
            loading={ai.loadingId === 'objective'}
            loadingText="Improving…"
            onClick={() => ai.run('objective', 'objective', data.objective, targetRole, context)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve with AI
          </LoadingButton>
        </div>
        <Textarea
          id="pi-objective"
          rows={3}
          value={data.objective}
          onChange={(e) => update({ objective: e.target.value })}
          placeholder="What direction are you heading in and what do you bring?"
          maxLength={2000}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="pi-summary" className="text-sm font-medium">
            Professional Summary
          </label>
          <LoadingButton
            type="button"
            size="sm"
            variant="outline"
            className="min-h-[36px] text-teal-700 dark:text-teal-300"
            loading={ai.loadingId === 'summary'}
            loadingText="Improving…"
            onClick={() => ai.run('summary', 'summary', data.summary, targetRole, context)}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve with AI
          </LoadingButton>
        </div>
        <Textarea
          id="pi-summary"
          rows={5}
          value={data.summary}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="2-4 sentences: who you are, your stack/domain, and one concrete strength or outcome."
          maxLength={3000}
        />
        <p className="text-xs text-muted-foreground">
          The AI rewrites YOUR content professionally — it never invents experience.
        </p>
      </div>

      <AiReviewDialog
        open={!!ai.review}
        onOpenChange={(o) => !o && ai.close()}
        title={ai.review?.id === 'objective' ? 'AI-improved Career Objective' : 'AI-improved Professional Summary'}
        original={ai.review?.original ?? ''}
        improved={ai.review?.improved ?? ''}
        onAccept={accept}
      />
    </div>
  );
}

// ─── Step 3: Education ───────────────────────────────────────────────────────

export function StepEducation({ data, update }: StepProps) {
  const entries = data.education;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ education: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      education: [
        ...entries,
        { id: crypto.randomUUID(), degree: '', institution: '', location: '', startYear: '', endYear: '', score: '' },
      ],
    });

  const remove = (id: string) => update({ education: entries.filter((e) => e.id !== id) });

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No education added yet. Add your most recent degree first.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard key={e.id} title="Education" index={i} onRemove={() => remove(e.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Degree" htmlFor={`ed-degree-${e.id}`} className="sm:col-span-2">
              <Input id={`ed-degree-${e.id}`} value={e.degree} onChange={(ev) => setEntry(e.id, { degree: ev.target.value })} placeholder="e.g. B.Tech in Computer Science" maxLength={120} />
            </Field>
            <Field label="Institution" htmlFor={`ed-inst-${e.id}`} className="sm:col-span-2">
              <Input id={`ed-inst-${e.id}`} value={e.institution} onChange={(ev) => setEntry(e.id, { institution: ev.target.value })} placeholder="College / University name" maxLength={160} />
            </Field>
            <Field label="Location" htmlFor={`ed-loc-${e.id}`}>
              <Input id={`ed-loc-${e.id}`} value={e.location} onChange={(ev) => setEntry(e.id, { location: ev.target.value })} placeholder="City, Country" maxLength={100} />
            </Field>
            <Field label="CGPA / Percentage" htmlFor={`ed-score-${e.id}`}>
              <Input id={`ed-score-${e.id}`} value={e.score} onChange={(ev) => setEntry(e.id, { score: ev.target.value })} placeholder="e.g. CGPA: 8.5/10 or 88%" maxLength={20} />
            </Field>
            <Field label="Start Year" htmlFor={`ed-start-${e.id}`}>
              <Input id={`ed-start-${e.id}`} value={e.startYear} onChange={(ev) => setEntry(e.id, { startYear: ev.target.value })} placeholder="2021" maxLength={10} />
            </Field>
            <Field label="End Year" htmlFor={`ed-end-${e.id}`}>
              <Input id={`ed-end-${e.id}`} value={e.endYear} onChange={(ev) => setEntry(e.id, { endYear: ev.target.value })} placeholder="2025" maxLength={10} />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Education" onClick={add} maxed={entries.length >= 15} />
    </div>
  );
}
