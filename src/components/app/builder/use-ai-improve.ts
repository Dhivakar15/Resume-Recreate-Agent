'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/api';

export type AiImproveKind = 'summary' | 'objective' | 'experience' | 'internship' | 'project' | 'achievement';

export interface AiReview {
  id: string;
  original: string;
  improved: string;
}

/**
 * Shared "Improve with AI" flow: calls the API for one field/entry,
 * then exposes the original + improved text for an accept/reject review dialog.
 * Nothing is applied until the user accepts.
 */
export function useAiImprove() {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [review, setReview] = useState<AiReview | null>(null);

  const run = async (id: string, kind: AiImproveKind, text: string, targetRole?: string, context?: string) => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error('Write at least a sentence first — the AI improves your own content, it does not invent it.');
      return;
    }
    setLoadingId(id);
    try {
      const { text: improved } = await apiFetch<{ text: string }>('/api/ai/improve', {
        method: 'POST',
        json: { kind, text, targetRole, context },
      });
      setReview({ id, original: text, improved });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  const close = () => setReview(null);

  return { loadingId, review, run, close };
}
