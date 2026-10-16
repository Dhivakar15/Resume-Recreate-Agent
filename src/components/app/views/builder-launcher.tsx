'use client';

import { useEffect } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { useResumesStore, type ResumeSummary } from '@/stores/resumes-store';
import { navigate } from '@/lib/client/navigation';
import { NewResumeDialog } from '@/components/app/new-resume-dialog';
import { Rise3D, Float3D } from '@/components/app/three-d/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FilePlus2, Pencil, FolderOpen, Clock } from 'lucide-react';
import { useState } from 'react';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Builder launcher — shown at #/builder without a resume id.
 * Lets the user pick which resume to open in the AI Resume Builder.
 */
export function BuilderLauncherView() {
  const { resumes, loading, loaded, fetch } = useResumesStore();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetch(!loaded);
  }, []);

  const open = (r: ResumeSummary) => navigate('builder', r.id);

  return (
    <AppShell active="builder">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <FilePlus2 className="h-6 w-6 text-violet-300" aria-hidden /> AI Resume Builder
          </h1>
          <p className="mt-1 text-sm text-slate-400">Pick a resume to open in the builder, or start a new one.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)] hover:from-violet-500 hover:to-fuchsia-500"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden /> Create New Resume
        </Button>
      </div>

      {loading && !loaded ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-40 animate-pulse border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card className="border border-dashed border-white/[0.12] bg-white/[0.03]">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <Float3D duration={5}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]">
                <FolderOpen className="h-7 w-7" aria-hidden />
              </span>
            </Float3D>
            <div>
              <p className="font-semibold text-slate-100">No resumes yet.</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Create your first resume to open it in the AI Builder.
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden /> Create Your First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r, i) => (
            <Rise3D key={r.id} delay={Math.min(i, 8) * 0.04} className="h-full">
              <Card className="flex h-full flex-col border-white/[0.07] bg-white/[0.03] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-violet-400/25 hover:shadow-[0_8px_40px_-12px_rgba(139,92,246,0.35)]">
                <CardHeader className="pb-3">
                  <CardTitle className="truncate text-base text-slate-100" title={r.title}>
                    {r.title}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" aria-hidden /> Updated {timeAgo(r.updatedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-wrap items-center gap-2">
                  {r.targetRole ? (
                    <Badge variant="secondary" className="border-transparent bg-violet-500/15 text-violet-200">
                      {r.targetRole}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-white/10 text-slate-400">
                      No target role
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    className="ml-auto min-h-[36px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                    onClick={() => open(r)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Open builder
                  </Button>
                </CardContent>
              </Card>
            </Rise3D>
          ))}
        </div>
      )}

      <NewResumeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppShell>
  );
}
