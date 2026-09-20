import 'server-only';
import type { ResumeData, ResumeTemplate } from '@/types/resume';
import { descriptionToBullets } from '@/lib/resume-utils';

/** Escapes LaTeX special characters in user content. */
function esc(input: string): string {
  return input
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, "''")
    .replace(/[\u2013\u2014]/g, '--')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '');
}

function clean(input: string): string {
  return esc(input.trim());
}

function bullets(description: string): string {
  const items = descriptionToBullets(description).map((b) => `  \\item ${clean(b)}`);
  return items.length ? `\\begin{itemize}[noitemsep,topsep=2pt]\n${items.join('\n')}\n\\end{itemize}` : '';
}

/**
 * Generates a clean, compileable, ATS-friendly LaTeX resume (article class).
 * Uses only standard packages available in any TeX distribution (TeX Live, MiKTeX, Overleaf).
 */
export function generateLatex(data: ResumeData, template: ResumeTemplate = 'modern'): string {
  const p = data.personal;
  const accent = template === 'professional' ? '' : '% accent for section titles\n\\definecolor{accent}{RGB}{10,90,86}';

  const contactItems = [p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio]
    .map((c) => c.trim())
    .filter(Boolean);

  const contactLine = contactItems
    .map((c) => {
      if (/^https?:\/\//i.test(c)) return `\\href{${clean(c)}}{${clean(c.replace(/^https?:\/\/(www\.)?/i, ''))}}`;
      if (/@/.test(c) && !c.includes(' ')) return `\\href{mailto:${clean(c)}}{${clean(c)}}`;
      return clean(c);
    })
    .join(' ~|~ ');

  const sections: string[] = [];

  if (data.summary.trim()) {
    sections.push(`\\section{Professional Summary}\n${clean(data.summary)}`);
  } else if (data.objective.trim()) {
    sections.push(`\\section{Career Objective}\n${clean(data.objective)}`);
  }

  const s = data.skills;
  const skillLines: string[] = [];
  const groups: [string, string[]][] = [
    ['\\textbf{Languages:}', s.languages],
    ['\\textbf{Frameworks:}', s.frameworks],
    ['\\textbf{Databases:}', s.databases],
    ['\\textbf{Tools:}', s.tools],
    ['\\textbf{Cloud:}', s.cloud],
    ['\\textbf{Soft Skills:}', s.soft],
  ];
  for (const [label, items] of groups) {
    if (items.length) skillLines.push(`${label} ${clean(items.join(', '))}\\\\`);
  }
  if (skillLines.length) {
    sections.push(`\\section{Skills}\n${skillLines.join('\n')}`);
  }

  if (data.experience.length) {
    const entries = data.experience
      .filter((e) => e.jobTitle.trim() || e.company.trim())
      .map((e) => {
        const head = clean([e.jobTitle, e.company].filter(Boolean).join(' --- '));
        const loc = e.location.trim() ? ` \\textbf{|} ${clean(e.location)}` : '';
        const dates = [e.startDate, e.endDate].filter(Boolean).map(clean).join(' -- ');
        return `\\textbf{${head}}${loc} \\hfill ${dates}\n${bullets(e.description)}`;
      });
    if (entries.length) sections.push(`\\section{Experience}\n${entries.join('\n\\vspace{4pt}\n')}`);
  }

  if (data.internships.length) {
    const entries = data.internships
      .filter((e) => e.title.trim() || e.company.trim())
      .map((e) => {
        const head = clean([e.title, e.company].filter(Boolean).join(' --- '));
        const loc = e.location.trim() ? ` \\textbf{|} ${clean(e.location)}` : '';
        const tech = e.technologies.trim() ? `\n\\textit{Technologies:} ${clean(e.technologies)}` : '';
        return `\\textbf{${head}}${loc} \\hfill ${clean(e.duration)}${tech}\n${bullets(e.description)}`;
      });
    if (entries.length) sections.push(`\\section{Internships}\n${entries.join('\n\\vspace{4pt}\n')}`);
  }

  if (data.projects.length) {
    const entries = data.projects
      .filter((e) => e.name.trim())
      .map((e) => {
        const links = [e.githubUrl, e.liveUrl].filter(Boolean).map((l) => `\\href{${clean(l)}}{\\underline{${clean(l.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 40))}}}`);
        const linkPart = links.length ? ` \\hfill ${links.join(' ~|~ ')}` : '';
        const role = e.role.trim() ? `\n\\textit{Role:} ${clean(e.role)}` : '';
        const tech = e.technologies.trim() ? `\n\\textit{Technologies:} ${clean(e.technologies)}` : '';
        return `\\textbf{${clean(e.name)}}${linkPart}${role}${tech}\n${bullets(e.description)}`;
      });
    if (entries.length) sections.push(`\\section{Projects}\n${entries.join('\n\\vspace{4pt}\n')}`);
  }

  if (data.education.length) {
    const entries = data.education
      .filter((e) => e.degree.trim() || e.institution.trim())
      .map((e) => {
        const head = clean([e.degree, e.institution].filter(Boolean).join(' --- '));
        const loc = e.location.trim() ? ` \\textbf{|} ${clean(e.location)}` : '';
        const dates = [e.startYear, e.endYear].filter(Boolean).map(clean).join(' -- ');
        const score = e.score.trim() ? `\n\\textit{CGPA/Percentage:} ${clean(e.score)}` : '';
        return `\\textbf{${head}}${loc} \\hfill ${dates}${score}`;
      });
    if (entries.length) sections.push(`\\section{Education}\n${entries.join('\n\\vspace{4pt}\n')}`);
  }

  if (data.certifications.length) {
    const entries = data.certifications
      .filter((c) => c.name.trim())
      .map((c) => {
        const name = c.credentialUrl.trim()
          ? `\\href{${clean(c.credentialUrl)}}{\\textbf{${clean(c.name)}}}`
          : `\\textbf{${clean(c.name)}}`;
        const org = c.organization.trim() ? ` --- ${clean(c.organization)}` : '';
        const date = c.date.trim() ? ` \\hfill ${clean(c.date)}` : '';
        return `${name}${org}${date}`;
      });
    if (entries.length) sections.push(`\\section{Certifications}\n\\begin{itemize}[noitemsep,topsep=2pt]\n${entries.map((e) => `  \\item ${e}`).join('\n')}\n\\end{itemize}`);
  }

  if (data.achievements.length) {
    const entries = data.achievements
      .filter((a) => a.title.trim())
      .map((a) => `  \\item \\textbf{${clean(a.title)}}${a.description.trim() ? ` --- ${clean(a.description)}` : ''}`);
    if (entries.length) sections.push(`\\section{Achievements}\n\\begin{itemize}[noitemsep,topsep=2pt]\n${entries.join('\n')}\n\\end{itemize}`);
  }

  if (data.languages.length) {
    const line = data.languages
      .map((l) => `${clean(l.language)}${l.proficiency.trim() ? ` (${clean(l.proficiency)})` : ''}`)
      .join(' ~|~ ');
    sections.push(`\\section{Languages}\n${line}`);
  }

  const name = clean(p.fullName) || 'Your Name';
  const title = p.professionalTitle.trim() ? `\\vspace{2pt}\\\\ \\large ${clean(p.professionalTitle)}` : '';

  return `% Resume generated by Resume Recreate Agent AI
% Compile with pdflatex or use Overleaf. ATS-friendly single-column layout.
\\documentclass[10pt,a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[${template === 'minimal' ? 'margin=0.9in' : 'margin=0.6in'}]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}
${accent}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
${template === 'professional' ? "\\usepackage{times}" : "\\usepackage[sfdefault,light]{FiraSans}"}
\\titleformat{\\section}{\\large\\bfseries${template === 'professional' ? '' : '\\color{accent}'}}{}{0em}{}[\\vspace{-6pt}\\rule{\\textwidth}{0.5pt}]
\\titlespacing{\\section}{0pt}{10pt}{6pt}

\\begin{document}

\\begin{center}
  {\\Huge \\textbf{${name}}}${title}\\\\[6pt]
  {\\small ${contactLine || ''}}
\\end{center}
\\vspace{-4pt}

${sections.join('\n\n')}

\\end{document}
`;
}

export function latexFileName(data: ResumeData): string {
  const base = (data.personal.fullName || 'resume').replace(/[^a-zA-Z0-9]+/g, '_');
  return `${base}_resume.tex`;
}
