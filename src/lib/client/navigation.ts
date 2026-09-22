'use client';

export type ViewName =
  | 'landing'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'resumes'
  | 'builder'
  | 'analyzer'
  | 'rewriter'
  | 'templates'
  | 'versions'
  | 'jobmatch'
  | 'coverletter'
  | 'skillgap'
  | 'career'
  | 'projectgen'
  | 'linkedin'
  | 'interview'
  | 'mockinterview'
  | 'tracker'
  | 'analytics'
  | 'settings';

export interface AppRoute {
  view: ViewName;
  id?: string;
}

const VIEWS: ViewName[] = [
  'landing',
  'login',
  'register',
  'dashboard',
  'resumes',
  'builder',
  'analyzer',
  'rewriter',
  'templates',
  'versions',
  'jobmatch',
  'coverletter',
  'skillgap',
  'career',
  'projectgen',
  'linkedin',
  'interview',
  'mockinterview',
  'tracker',
  'analytics',
  'settings',
];

const PUBLIC_VIEWS: ViewName[] = ['landing', 'login', 'register'];

export const PROTECTED_VIEWS: ViewName[] = VIEWS.filter((view) => !PUBLIC_VIEWS.includes(view));

export function parseHash(): AppRoute {
  if (typeof window === 'undefined') return { view: 'landing' };
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [head, id] = raw.split('/');
  const view = (VIEWS as string[]).includes(head) ? (head as ViewName) : 'landing';
  return { view, id: id || undefined };
}

export function navigate(view: ViewName, id?: string) {
  const hash = id ? `#/${view}/${id}` : `#/${view}`;
  if (typeof window !== 'undefined') {
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  }
}
