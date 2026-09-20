'use client';

import { cn } from '@/lib/utils';
import type { ResumeData, ResumeTemplate } from '@/types/resume';
import { hasAnyContent } from './templates/shared';
import { ModernTemplate } from './templates/modern-template';
import { ProfessionalTemplate } from './templates/professional-template';
import { MinimalTemplate } from './templates/minimal-template';
import { FileText } from 'lucide-react';

/**
 * Live A4-style resume preview. Pure render — driven entirely by ResumeData,
 * so every edit updates it instantly.
 */
export function ResumePreview({
  data,
  template,
  className,
}: {
  data: ResumeData;
  template: ResumeTemplate;
  className?: string;
}) {
  const Template = template === 'professional' ? ProfessionalTemplate : template === 'minimal' ? MinimalTemplate : ModernTemplate;

  if (!hasAnyContent(data)) {
    return (
      <div
        className={cn(
          'flex aspect-[210/297] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 p-8 text-center',
          className,
        )}
      >
        <FileText className="h-10 w-10 text-neutral-300" />
        <p className="max-w-[240px] text-sm text-neutral-400">
          Your live resume preview will appear here as you fill in the editor.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-neutral-200', className)}>
      <div className="min-h-[calc(100%)]">
        <Template data={data} />
      </div>
    </div>
  );
}
