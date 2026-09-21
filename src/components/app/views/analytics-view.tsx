'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { apiFetch } from '@/lib/client/api';
import { navigate } from '@/lib/client/navigation';
import { Float3D, Rise3D } from '@/components/app/three-d/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AnalyticsData } from '@/types/ai-tools';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  History,
  LayoutDashboard,
  ListChecks,
  MailOpen,
  Minus,
  RefreshCw,
  ScanSearch,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants & helpers ─────────────────────────────────────────────────────

const GLASS = 'border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl';

const TOOLTIP_STYLE = {
  background: '#0a0e1f',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#e2e8f0',
} as const;

const AXIS_TICK = { fill: '#64748b', fontSize: 12 } as const;

const STATUS_COLORS: Record<string, string> = {
  Applied: '#22d3ee',
  Shortlisted: '#8b5cf6',
  Interview: '#f59e0b',
  Selected: '#34d399',
  Rejected: '#fb7185',
};

const TOTAL_CARDS = [
  { key: 'resumes', label: 'Resumes', icon: FileText, tone: 'bg-violet-500/15 text-violet-300' },
  { key: 'versions', label: 'Versions', icon: History, tone: 'bg-fuchsia-500/15 text-fuchsia-300' },
  { key: 'analyses', label: 'AI Analyses', icon: ScanSearch, tone: 'bg-cyan-500/15 text-cyan-300' },
  { key: 'applications', label: 'Applications', icon: BriefcaseBusiness, tone: 'bg-blue-500/15 text-blue-300' },
  { key: 'coverLetters', label: 'Cover Letters', icon: MailOpen, tone: 'bg-purple-500/15 text-purple-300' },
] as const;

const fmtDay = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtMonth = (month: string): string => {
  const d = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(d.getTime()) ? month : d.toLocaleDateString('en-US', { month: 'short' });
};

const LegendText = (value: React.ReactNode): React.ReactNode => (
  <span className="text-xs text-slate-400">{value}</span>
);

// ─── Main view ───────────────────────────────────────────────────────────────

export function AnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const analytics = await apiFetch<AnalyticsData>('/api/analytics');
      setData(analytics);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = !!data && data.totals.resumes + data.totals.versions + data.totals.analyses + data.totals.applications + data.totals.coverLetters === 0;

  const scoreData = data?.scoreHistory.map((h) => ({ label: fmtDay(h.date), score: h.score })) ?? [];
  const activityData = data?.activityByMonth.map((m) => ({ month: fmtMonth(m.month), analyses: m.analyses, resumes: m.resumes })) ?? [];
  const pieData = data?.applicationsByStatus.filter((s) => s.count > 0) ?? [];
  const totalApplications = pieData.reduce((sum, s) => sum + s.count, 0);
  const maxSkill = data && data.skillsByCategory.length > 0 ? Math.max(...data.skillsByCategory.map((s) => s.count)) : 0;

  const first = data?.scoreChange.first ?? null;
  const latest = data?.scoreChange.latest ?? null;
  const delta = data?.scoreChange.delta ?? null;
  const Trend = delta != null && delta > 0 ? TrendingUp : delta != null && delta < 0 ? TrendingDown : Minus;

  return (
    <AppShell active="analytics">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Resume Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">Your ATS scores, activity and pipeline — measured over time.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Card key={i} className={cn('h-24 animate-pulse', GLASS)} />
            ))}
          </div>
          <Card className={cn('h-80 animate-pulse', GLASS)} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cn('h-80 animate-pulse', GLASS)} />
            <Card className={cn('h-80 animate-pulse', GLASS)} />
          </div>
        </div>
      ) : error ? (
        <Card className={cn(GLASS, 'border-red-400/20')}>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]" onClick={load}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : isEmpty ? (
        <Card className={cn('border-dashed border-white/[0.12]', GLASS)}>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <Float3D duration={5}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]">
                <BarChart3 className="h-7 w-7" aria-hidden />
              </span>
            </Float3D>
            <div>
              <p className="font-semibold text-slate-100">No analytics yet.</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Create a resume or run an AI analysis — your scores and activity will show up here.
              </p>
            </div>
            <Button
              onClick={() => navigate('dashboard')}
              className="min-h-[44px] bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden /> Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-4">
          {/* Totals row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {TOTAL_CARDS.map((card, i) => (
              <Rise3D key={card.key} delay={i * 0.05} className="h-full">
                <Card className={cn('h-full', GLASS)}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', card.tone)}>
                      <card.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-bold leading-none text-white">{data.totals[card.key]}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{card.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Rise3D>
            ))}
          </div>

          {/* ATS score history */}
          <Rise3D delay={0.1}>
            <Card className={GLASS}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base text-slate-100">ATS Score History</CardTitle>
                    <CardDescription className="mt-1 text-slate-500">AI-estimated ATS scores across your analyses.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {first != null && latest != null && delta != null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-1.5 border-white/10 text-xs font-semibold',
                          delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400',
                        )}
                      >
                        <Trend className="h-3.5 w-3.5" aria-hidden />
                        {first} → {latest} ({delta > 0 ? `+${delta}` : delta} pts)
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1.5 border-white/10 text-xs font-medium text-slate-300">
                      <ListChecks className="h-3.5 w-3.5 text-cyan-400" aria-hidden /> Resume completion {data.completion}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {scoreData.length === 0 ? (
                  <p className="flex h-[260px] items-center justify-center text-sm text-slate-500">
                    Run the AI Resume Analyzer to start building your score history.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={scoreData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="atsStroke" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                        <linearGradient id="atsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} minTickGap={28} />
                      <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={42} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        labelStyle={{ color: '#94a3b8' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.15)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        name="ATS score"
                        stroke="url(#atsStroke)"
                        strokeWidth={2.5}
                        fill="url(#atsFill)"
                        dot={{ r: 2.5, fill: '#d946ef', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#f0abfc', stroke: 'rgba(255,255,255,0.2)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Rise3D>

          {/* Monthly activity + applications donut */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Rise3D delay={0.14} className="h-full">
              <Card className={cn('h-full', GLASS)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">Monthly Activity</CardTitle>
                  <CardDescription className="text-slate-500">AI analyses and resumes created per month.</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityData.length === 0 ? (
                    <p className="flex h-[260px] items-center justify-center text-sm text-slate-500">No activity recorded yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={activityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={42} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ color: '#e2e8f0' }}
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        />
                        <Legend formatter={LegendText} iconType="circle" iconSize={8} />
                        <Bar dataKey="analyses" name="AI analyses" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="resumes" name="Resumes" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Rise3D>

            <Rise3D delay={0.18} className="h-full">
              <Card className={cn('h-full', GLASS)}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base text-slate-100">Applications by Status</CardTitle>
                      <CardDescription className="text-slate-500">Your tracked pipeline at a glance.</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-white/10 text-xs font-medium text-slate-300">
                      {totalApplications} total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <p className="flex h-[260px] items-center justify-center text-sm text-slate-500">
                      Track applications in the Application Tracker to see this chart.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          labelStyle={{ color: '#94a3b8' }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend formatter={LegendText} iconType="circle" iconSize={8} />
                        <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={58} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                          {pieData.map((entry) => (
                            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#8b5cf6'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Rise3D>
          </div>

          {/* Skills by category */}
          <Rise3D delay={0.22}>
            <Card className={GLASS}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-slate-100">Skills by Category</CardTitle>
                <CardDescription className="text-slate-500">Skills found across your resumes, grouped by category.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.skillsByCategory.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">Add skills to your resumes to see the breakdown.</p>
                ) : (
                  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.skillsByCategory.map((skill) => (
                      <div key={skill.category}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-medium text-slate-300" title={skill.category}>
                            {skill.category}
                          </span>
                          <span className="text-xs text-slate-500">{skill.count}</span>
                        </div>
                        <Progress
                          value={maxSkill > 0 ? (skill.count / maxSkill) * 100 : 0}
                          className="h-2 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-fuchsia-500"
                          aria-label={`${skill.category}: ${skill.count} skills`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Rise3D>
        </div>
      ) : null}
    </AppShell>
  );
}
