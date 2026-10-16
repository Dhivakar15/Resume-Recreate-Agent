'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingButton } from '@/components/app/loading-button';
import { SkillsSuggestDialog } from '@/components/app/skills-suggest-dialog';
import { Field } from '@/components/app/builder/entry-fields';
import { apiFetch } from '@/lib/client/api';
import { SKILL_CATEGORIES, type ResumeData, type SkillsData } from '@/types/resume';
import { Sparkles, X } from 'lucide-react';

interface StepProps {
  data: ResumeData;
  update: (patch: Partial<ResumeData>) => void;
  targetRole?: string;
  context?: string;
}

type Suggestions = {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  cloud: string[];
  soft: string[];
  note: string;
};

export function StepSkills({ data, update, targetRole, context }: StepProps) {
  const [input, setInput] = useState<Record<string, string>>({});
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  const skills = data.skills;

  const addSkill = (cat: keyof SkillsData, raw: string) => {
    const values = raw
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v && !skills[cat].some((s) => s.toLowerCase() === v.toLowerCase()))
      .slice(0, 12);
    if (!values.length) return;
    update({ skills: { ...skills, [cat]: [...skills[cat], ...values] } });
    setInput((prev) => ({ ...prev, [cat]: '' }));
  };

  const removeSkill = (cat: keyof SkillsData, skill: string) =>
    update({ skills: { ...skills, [cat]: skills[cat].filter((s) => s !== skill) } });

  const suggest = async () => {
    setSuggestLoading(true);
    setSuggestions(null);
    setSuggestOpen(true);
    try {
      const { suggestions: s } = await apiFetch<{ suggestions: Suggestions }>('/api/ai/suggest-skills', {
        method: 'POST',
        json: { targetRole, context },
      });
      setSuggestions(s);
    } catch (e) {
      toast.error((e as Error).message);
      setSuggestOpen(false);
    } finally {
      setSuggestLoading(false);
    }
  };

  const addSelected = (selected: SkillsData) => {
    const merged: SkillsData = { ...skills };
    for (const cat of SKILL_CATEGORIES) {
      const existing = new Set(merged[cat.key].map((s) => s.toLowerCase()));
      merged[cat.key] = [...merged[cat.key], ...selected[cat.key].filter((s) => !existing.has(s.toLowerCase()))];
    }
    update({ skills: merged });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Add skills one at a time or paste comma-separated lists.</p>
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          className="min-h-[36px] text-teal-700 dark:text-teal-300"
          loading={suggestLoading}
          loadingText="Suggesting…"
          onClick={suggest}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> Suggest Skills with AI
        </LoadingButton>
      </div>

      {SKILL_CATEGORIES.map((cat) => (
        <Field key={cat.key} label={cat.label} htmlFor={`skill-${cat.key}`}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id={`skill-${cat.key}`}
                value={input[cat.key] ?? ''}
                onChange={(e) => setInput((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(cat.key, input[cat.key] ?? '');
                  }
                }}
                placeholder={cat.placeholder}
              />
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] shrink-0"
                onClick={() => addSkill(cat.key, input[cat.key] ?? '')}
                disabled={!(input[cat.key] ?? '').trim()}
              >
                Add
              </Button>
            </div>
            {skills[cat.key].length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills[cat.key].map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(cat.key, s)}
                      aria-label={`Remove ${s}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-muted"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Field>
      ))}

      <SkillsSuggestDialog
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        suggestions={suggestions}
        loading={suggestLoading}
        existing={skills}
        onAdd={addSelected}
      />
    </div>
  );
}
