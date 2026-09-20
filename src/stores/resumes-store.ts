'use client';

import { create } from 'zustand';
import { apiFetch } from '@/lib/client/api';
import type { ResumeData, ResumeTemplate } from '@/types/resume';

export interface ResumeSummary {
  id: string;
  title: string;
  targetRole: string | null;
  template: ResumeTemplate;
  createdAt: string;
  updatedAt: string;
  _count: { versions: number; analyses: number };
}

export interface NewResumePayload {
  title: string;
  targetRole?: string;
  template?: ResumeTemplate;
  data?: ResumeData;
}

interface ResumesState {
  resumes: ResumeSummary[];
  loading: boolean;
  loaded: boolean;
  fetch: (force?: boolean) => Promise<void>;
  create: (payload: NewResumePayload) => Promise<ResumeSummary>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
}

export const useResumesStore = create<ResumesState>((set, get) => ({
  resumes: [],
  loading: false,
  loaded: false,
  fetch: async (force = false) => {
    if (get().loading || (get().loaded && !force)) return;
    set({ loading: true });
    try {
      const { resumes } = await apiFetch<{ resumes: ResumeSummary[] }>('/api/resumes');
      set({ resumes, loaded: true });
    } finally {
      set({ loading: false });
    }
  },
  create: async (payload) => {
    const { resume } = await apiFetch<{ resume: ResumeSummary }>('/api/resumes', {
      method: 'POST',
      json: payload,
    });
    set((s) => ({ resumes: [resume, ...s.resumes] }));
    return resume;
  },
  remove: async (id) => {
    await apiFetch(`/api/resumes/${id}`, { method: 'DELETE' });
    set((s) => ({ resumes: s.resumes.filter((r) => r.id !== id) }));
  },
  duplicate: async (id) => {
    const { resume } = await apiFetch<{ resume: ResumeSummary }>(`/api/resumes/${id}/duplicate`, { method: 'POST' });
    set((s) => ({ resumes: [resume, ...s.resumes] }));
  },
  rename: async (id, title) => {
    const { resume } = await apiFetch<{ resume: ResumeSummary }>(`/api/resumes/${id}`, {
      method: 'PUT',
      json: { title },
    });
    set((s) => ({ resumes: s.resumes.map((r) => (r.id === id ? { ...r, ...resume } : r)) }));
  },
}));
