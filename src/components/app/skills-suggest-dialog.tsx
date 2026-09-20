'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingButton } from '@/components/app/loading-button';
import { SKILL_CATEGORIES, type SkillsData } from '@/types/resume';

export interface SkillSuggestions {
  languages: string[];
  frameworks: string[];
  databases: string[];
  tools: string[];
  cloud: string[];
  soft: string[];
  note: string;
}

/**
 * AI-suggested skills, grouped by category with per-skill checkboxes.
 * The user explicitly chooses what to add — nothing is added silently.
 */
export function SkillsSuggestDialog({
  open,
  onOpenChange,
  suggestions,
  loading,
  existing,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: SkillSuggestions | null;
  loading: boolean;
  existing: SkillsData;
  onAdd: (selected: SkillsData) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const key = (cat: string, skill: string) => `${cat}::${skill}`;

  const toggle = (cat: string, skill: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(cat, skill);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const addSelected = () => {
    if (!suggestions) return;
    const result: SkillsData = { languages: [], frameworks: [], databases: [], tools: [], cloud: [], soft: [] };
    let count = 0;
    for (const cat of SKILL_CATEGORIES) {
      const items = suggestions[cat.key] ?? [];
      for (const item of items) {
        if (selected.has(key(cat.key, item))) {
          result[cat.key].push(item);
          count += 1;
        }
      }
    }
    if (count === 0) {
      toast.info('Select at least one skill to add.');
      return;
    }
    onAdd(result);
    onOpenChange(false);
    toast.success(`Added ${count} skill${count > 1 ? 's' : ''} to your resume.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Suggested Skills</DialogTitle>
          <DialogDescription>
            {loading
              ? 'Analyzing your resume and target role…'
              : suggestions?.note || 'Based on your resume content and target role. Pick the ones that genuinely apply to you.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" aria-hidden />
            Suggesting skills…
          </div>
        ) : suggestions ? (
          <ScrollArea className="max-h-80 pr-3">
            <div className="space-y-4">
              {SKILL_CATEGORIES.map((cat) => {
                const items = (suggestions[cat.key] ?? []).filter(
                  (s) => !existing[cat.key].some((e) => e.toLowerCase() === s.toLowerCase()),
                );
                if (!items.length) return null;
                return (
                  <div key={cat.key}>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</Label>
                    <div className="mt-2 grid grid-cols-1 gap-1.5">
                      {items.map((item) => (
                        <label
                          key={item}
                          className="flex min-h-[36px] cursor-pointer items-center gap-2.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selected.has(key(cat.key, item))}
                            onCheckedChange={() => toggle(cat.key, item)}
                            aria-label={`Add ${item}`}
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {SKILL_CATEGORIES.every(
                (cat) =>
                  (suggestions[cat.key] ?? []).filter(
                    (s) => !existing[cat.key].some((e) => e.toLowerCase() === s.toLowerCase()),
                  ).length === 0,
              ) && (
                <p className="text-sm text-muted-foreground">
                  No additional skill suggestions — you already cover the key skills for this role.
                </p>
              )}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={false} onClick={addSelected} disabled={!suggestions || loading}>
            Add selected
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
