'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, EntryCard, AddEntryButton } from '@/components/app/builder/entry-fields';
import { useAiImprove } from '@/components/app/builder/use-ai-improve';
import { AiReviewDialog } from '@/components/app/ai-review-dialog';
import { LoadingButton } from '@/components/app/loading-button';
import { LANGUAGE_LEVELS, type ResumeData } from '@/types/resume';
import { Sparkles } from 'lucide-react';

interface StepProps {
  data: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  targetRole?: string;
  context?: string;
}

// ─── Step 8: Certifications ──────────────────────────────────────────────────

export function StepCertifications({ data, update }: StepProps) {
  const entries = data.certifications;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ certifications: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      certifications: [
        ...entries,
        { id: crypto.randomUUID(), name: '', organization: '', date: '', credentialUrl: '' },
      ],
    });

  const remove = (id: string) => update({ certifications: entries.filter((e) => e.id !== id) });

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No certifications added yet. Include online courses and professional certifications.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard key={e.id} title="Certification" index={i} onRemove={() => remove(e.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Certification Name" htmlFor={`ct-name-${e.id}`} className="sm:col-span-2">
              <Input id={`ct-name-${e.id}`} value={e.name} onChange={(ev) => setEntry(e.id, { name: ev.target.value })} placeholder="e.g. AWS Certified Cloud Practitioner" maxLength={160} />
            </Field>
            <Field label="Issuing Organization" htmlFor={`ct-org-${e.id}`}>
              <Input id={`ct-org-${e.id}`} value={e.organization} onChange={(ev) => setEntry(e.id, { organization: ev.target.value })} placeholder="e.g. Amazon Web Services" maxLength={160} />
            </Field>
            <Field label="Date" htmlFor={`ct-date-${e.id}`}>
              <Input id={`ct-date-${e.id}`} value={e.date} onChange={(ev) => setEntry(e.id, { date: ev.target.value })} placeholder="e.g. Mar 2024" maxLength={40} />
            </Field>
            <Field label="Credential URL (optional)" htmlFor={`ct-url-${e.id}`} className="sm:col-span-2">
              <Input id={`ct-url-${e.id}`} value={e.credentialUrl} onChange={(ev) => setEntry(e.id, { credentialUrl: ev.target.value })} placeholder="https://…" />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Certification" onClick={add} maxed={entries.length >= 20} />
    </div>
  );
}

// ─── Step 9: Achievements ────────────────────────────────────────────────────

export function StepAchievements({ data, update, targetRole, context }: StepProps) {
  const ai = useAiImprove();
  const entries = data.achievements;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ achievements: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      achievements: [...entries, { id: crypto.randomUUID(), title: '', description: '' }],
    });

  const remove = (id: string) => update({ achievements: entries.filter((e) => e.id !== id) });

  const accept = () => {
    if (!ai.review) return;
    setEntry(ai.review.id, { title: ai.review.improved.split('\n')[0] ?? ai.review.improved, description: '' });
    ai.close();
  };

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No achievements added yet. Hackathons, awards and rankings work well here.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard
          key={e.id}
          title="Achievement"
          index={i}
          onRemove={() => remove(e.id)}
          actions={
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-[36px] text-teal-700 dark:text-teal-300"
              loading={ai.loadingId === e.id}
              loadingText="Improving…"
              onClick={() => ai.run(e.id, 'achievement', [e.title, e.description].filter(Boolean).join(' — '), targetRole, context)}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Improve
            </LoadingButton>
          }
        >
          <div className="grid gap-3">
            <Field label="Achievement" htmlFor={`ac-title-${e.id}`}>
              <Input id={`ac-title-${e.id}`} value={e.title} onChange={(ev) => setEntry(e.id, { title: ev.target.value })} placeholder="e.g. Winner, Smart India Hackathon (Internal Round)" maxLength={160} />
            </Field>
            <Field label="Description (optional)" htmlFor={`ac-desc-${e.id}`}>
              <Input id={`ac-desc-${e.id}`} value={e.description} onChange={(ev) => setEntry(e.id, { description: ev.target.value })} placeholder="Short context for this achievement" maxLength={1000} />
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Achievement" onClick={add} maxed={entries.length >= 20} />

      <AiReviewDialog
        open={!!ai.review}
        onOpenChange={(o) => !o && ai.close()}
        title="AI-improved Achievement"
        original={ai.review?.original ?? ''}
        improved={ai.review?.improved ?? ''}
        onAccept={accept}
      />
    </div>
  );
}

// ─── Step 10: Languages ──────────────────────────────────────────────────────

export function StepLanguages({ data, update }: StepProps) {
  const entries = data.languages;

  const setEntry = (id: string, patch: Partial<(typeof entries)[number]>) =>
    update({ languages: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const add = () =>
    update({
      languages: [...entries, { id: crypto.randomUUID(), language: '', proficiency: 'Professional' }],
    });

  const remove = (id: string) => update({ languages: entries.filter((e) => e.id !== id) });

  return (
    <div className="space-y-4">
      {entries.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No languages added yet. Add the languages you speak and your proficiency.
        </p>
      )}
      {entries.map((e, i) => (
        <EntryCard key={e.id} title="Language" index={i} onRemove={() => remove(e.id)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Language" htmlFor={`lg-name-${e.id}`}>
              <Input id={`lg-name-${e.id}`} value={e.language} onChange={(ev) => setEntry(e.id, { language: ev.target.value })} placeholder="e.g. English" maxLength={60} />
            </Field>
            <Field label="Proficiency" htmlFor={`lg-prof-${e.id}`}>
              <Select value={e.proficiency || undefined} onValueChange={(v) => setEntry(e.id, { proficiency: v })}>
                <SelectTrigger id={`lg-prof-${e.id}`} className="min-h-[44px] w-full">
                  <SelectValue placeholder="Select proficiency" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </EntryCard>
      ))}
      <AddEntryButton label="Add Language" onClick={add} maxed={entries.length >= 15} />
    </div>
  );
}
