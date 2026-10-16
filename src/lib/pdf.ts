import 'server-only';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';
import type { ResumeData, ResumeTemplate } from '@/types/resume';
import { descriptionToBullets } from '@/lib/resume-utils';

/**
 * Real server-side PDF generation with pdf-lib.
 * Produces clean, single-column, selectable-text (ATS-parseable) documents.
 * No UI chrome, no images — just professionally typeset resume content.
 */

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface Theme {
  nameSize: number;
  titleSize: number;
  headSize: number;
  entrySize: number;
  bodySize: number;
  metaSize: number;
  lineHeightFactor: number;
  accent: RGB;
  ruleColor: RGB;
  centerHeader: boolean;
  serif: boolean;
}

const THEMES: Record<ResumeTemplate, Theme> = {
  modern: {
    nameSize: 26, titleSize: 11.5, headSize: 10.5, entrySize: 10.5, bodySize: 9.5, metaSize: 9,
    lineHeightFactor: 1.38,
    accent: rgb(0.1, 0.1, 0.12), ruleColor: rgb(0.1, 0.1, 0.12), centerHeader: true, serif: false,
  },
  professional: {
    nameSize: 23, titleSize: 11, headSize: 11, entrySize: 10.5, bodySize: 10, metaSize: 9,
    lineHeightFactor: 1.42,
    accent: rgb(0.1, 0.1, 0.12), ruleColor: rgb(0.25, 0.25, 0.28), centerHeader: false, serif: true,
  },
  minimal: {
    nameSize: 20, titleSize: 10.5, headSize: 9.5, entrySize: 10, bodySize: 9.5, metaSize: 9,
    lineHeightFactor: 1.5,
    accent: rgb(0.1, 0.1, 0.1), ruleColor: rgb(0.85, 0.85, 0.85), centerHeader: false, serif: false,
  },
};

const CHAR_MAP: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u201B\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u2033]/g, '"'],
  [/[\u2013\u2014\u2015]/g, '-'],
  [/\u2026/g, '...'],
  [/[\u00A0\u2007\u202F\u2009]/g, ' '],
  [/\u20B9/g, 'Rs.'],
  [/\u20AC/g, 'EUR '],
  [/\u00A3/g, 'GBP '],
];

function sanitizeLine(input: string): string {
  let s = input;
  for (const [re, rep] of CHAR_MAP) s = s.replace(re, rep);
  // strip anything outside Latin-1/WinAnsi (emoji, CJK, etc.) — keeps PDF encoding safe
  return s.replace(/[^\x20-\x7E\u00A0-\u00FF\u2022]/g, '').trimEnd();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      if (font.widthOfTextAtSize(w, size) > maxWidth) {
        let chunk = '';
        for (const ch of w) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        cur = chunk;
      } else cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class ResumePdfBuilder {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private y = 0;
  private body!: PDFFont;
  private bold!: PDFFont;
  private italic!: PDFFont;
  private theme: Theme;
  private data: ResumeData;

  private constructor(template: ResumeTemplate, data: ResumeData) {
    this.theme = THEMES[template] ?? THEMES.modern;
    this.data = data;
  }

  static async generate(template: ResumeTemplate, data: ResumeData): Promise<Uint8Array> {
    const b = new ResumePdfBuilder(template, data);
    b.doc = await PDFDocument.create();
    const t = b.theme;
    b.body = await b.doc.embedFont(t.serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
    b.bold = await b.doc.embedFont(t.serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
    b.italic = await b.doc.embedFont(t.serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique);
    b.doc.setTitle(sanitizeLine(`${data.personal.fullName || 'Resume'} - Resume`) || 'Resume');
    b.doc.setCreator('Resume Recreate Agent AI');
    b.doc.setProducer('Resume Recreate Agent AI');
    b.addPage();
    b.render();
    return b.doc.save();
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - MARGIN;
  }

  private ensure(height: number) {
    if (this.y - height < MARGIN + 16) this.addPage();
  }

  private draw(text: string, x: number, size: number, font: PDFFont, color: RGB) {
    this.page.drawText(text, { x, y: this.y, size, font, color });
  }

  private paragraph(
    text: string,
    opts?: { font?: PDFFont; size?: number; color?: RGB; x?: number; width?: number; indent?: number; lineGap?: number },
  ): void {
    const t = this.theme;
    const font = opts?.font ?? this.body;
    const size = opts?.size ?? t.bodySize;
    const color = opts?.color ?? rgb(0.13, 0.13, 0.15);
    const x = opts?.x ?? MARGIN;
    const indent = opts?.indent ?? 0;
    const width = opts?.width ?? CONTENT_W - indent;
    const lh = size * t.lineHeightFactor + (opts?.lineGap ?? 0);
    for (const line of wrapText(sanitizeLine(text), font, size, width)) {
      this.ensure(lh);
      this.draw(line, x + indent, size, font, color);
      this.y -= lh;
    }
  }

  private sectionHeader(title: string) {
    const t = this.theme;
    const label = sanitizeLine(title).toUpperCase();
    this.ensure(34);
    this.y -= 8;
    this.draw(label, MARGIN, t.headSize, this.bold, t.accent);
    this.y -= t.headSize + 5;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: t.ruleColor === THEMES.minimal.ruleColor ? 0.6 : 1,
      color: t.ruleColor,
    });
    this.y -= 8;
  }

  /** Bold left text + right-aligned meta on the same baseline. */
  private entryHeader(left: string, right: string, subLeft?: string) {
    const t = this.theme;
    const rightClean = sanitizeLine(right);
    const rightW = rightClean ? this.body.widthOfTextAtSize(rightClean, t.metaSize) : 0;
    const avail = CONTENT_W - rightW - 14;
    const leftLines = wrapText(sanitizeLine(left), this.bold, t.entrySize, Math.max(avail, CONTENT_W * 0.5));
    this.ensure(t.entrySize * t.lineHeightFactor);
    if (leftLines.length) {
      this.draw(leftLines[0], MARGIN, t.entrySize, this.bold, rgb(0.1, 0.1, 0.12));
      if (rightClean) this.draw(rightClean, PAGE_W - MARGIN - rightW, t.metaSize, this.body, rgb(0.42, 0.44, 0.48));
      this.y -= t.entrySize * t.lineHeightFactor;
      for (let i = 1; i < leftLines.length; i++) {
        this.ensure(t.entrySize * t.lineHeightFactor);
        this.draw(leftLines[i], MARGIN, t.entrySize, this.bold, rgb(0.1, 0.1, 0.12));
        this.y -= t.entrySize * t.lineHeightFactor;
      }
    } else if (rightClean) {
      this.draw(rightClean, PAGE_W - MARGIN - rightW, t.metaSize, this.body, rgb(0.42, 0.44, 0.48));
      this.y -= t.entrySize * t.lineHeightFactor;
    }
    if (subLeft && subLeft.trim()) {
      this.paragraph(subLeft, { size: t.metaSize, color: rgb(0.36, 0.38, 0.42), lineGap: 1 });
    }
  }

  private bulletList(description: string) {
    const t = this.theme;
    const bullets = descriptionToBullets(description);
    for (const b of bullets) {
      const lines = wrapText(sanitizeLine(b), this.body, t.bodySize, CONTENT_W - 14);
      if (!lines.length) continue;
      this.ensure(lines.length * t.bodySize * t.lineHeightFactor);
      const firstY = this.y;
      this.page.drawText('\u2022', { x: MARGIN + 2, y: firstY, size: t.bodySize, font: this.body, color: t.accent });
      this.draw(lines[0], MARGIN + 14, t.bodySize, this.body, rgb(0.18, 0.18, 0.2));
      this.y -= t.bodySize * t.lineHeightFactor;
      for (let i = 1; i < lines.length; i++) {
        this.ensure(t.bodySize * t.lineHeightFactor);
        this.draw(lines[i], MARGIN + 14, t.bodySize, this.body, rgb(0.18, 0.18, 0.2));
        this.y -= t.bodySize * t.lineHeightFactor;
      }
    }
  }

  private skillsSection() {
    const t = this.theme;
    const s = this.data.skills;
    const groups: [string, string[]][] = [
      ['Languages:', s.languages],
      ['Frameworks:', s.frameworks],
      ['Databases:', s.databases],
      ['Tools:', s.tools],
      ['Cloud:', s.cloud],
      ['Soft Skills:', s.soft],
    ].filter(([, items]) => items.length > 0) as [string, string[]][];

    for (const [label, items] of groups) {
      const labelClean = sanitizeLine(label);
      const itemsStr = sanitizeLine(items.join(', '));
      const labelW = this.bold.widthOfTextAtSize(labelClean, t.bodySize) + 4;
      const restLines = wrapText(itemsStr, this.body, t.bodySize, CONTENT_W - labelW);
      if (!restLines.length) continue;
      this.ensure(restLines.length * t.bodySize * t.lineHeightFactor);
      this.draw(labelClean, MARGIN, t.bodySize, this.bold, rgb(0.1, 0.1, 0.12));
      this.draw(restLines[0], MARGIN + labelW, t.bodySize, this.body, rgb(0.18, 0.18, 0.2));
      this.y -= t.bodySize * t.lineHeightFactor;
      for (let i = 1; i < restLines.length; i++) {
        this.ensure(t.bodySize * t.lineHeightFactor);
        this.draw(restLines[i], MARGIN + labelW, t.bodySize, this.body, rgb(0.18, 0.18, 0.2));
        this.y -= t.bodySize * t.lineHeightFactor;
      }
    }
  }

  private render() {
    const d = this.data;
    const t = this.theme;
    const p = d.personal;

    // ── Header ──
    const name = sanitizeLine(p.fullName) || 'Your Name';
    const nameSize = t.nameSize;
    const nameW = this.bold.widthOfTextAtSize(name, nameSize);
    this.ensure(nameSize * 1.2);
    this.draw(name, t.centerHeader ? (PAGE_W - nameW) / 2 : MARGIN, nameSize, this.bold, rgb(0.06, 0.07, 0.09));
    this.y -= nameSize * 1.15;

    if (p.professionalTitle.trim()) {
      const title = sanitizeLine(p.professionalTitle);
      const w = this.body.widthOfTextAtSize(title, t.titleSize);
      this.ensure(t.titleSize * 1.4);
      this.draw(title, t.centerHeader ? (PAGE_W - w) / 2 : MARGIN, t.titleSize, this.body, t.accent);
      this.y -= t.titleSize * 1.35;
    } else {
      this.y -= 2;
    }

    const contacts = [p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio]
      .map((c) => sanitizeLine(c))
      .filter(Boolean);
    if (contacts.length) {
      this.paragraph(contacts.join('  |  '), { size: t.metaSize, color: rgb(0.3, 0.32, 0.36), lineGap: 3 });
    }
    this.y -= 2;

    // ── Sections ──
    const hasBody = (s: string) => s.trim().length > 0;

    if (hasBody(d.summary)) {
      this.sectionHeader('Professional Summary');
      this.paragraph(d.summary);
    } else if (hasBody(d.objective)) {
      this.sectionHeader('Career Objective');
      this.paragraph(d.objective);
    }

    const skillsAny = Object.values(d.skills ?? {}).some((a) => Array.isArray(a) && a.length);
    if (skillsAny) {
      this.sectionHeader('Skills');
      this.skillsSection();
    }

    if (d.experience.length) {
      this.sectionHeader('Experience');
      for (const e of d.experience) {
        if (!e.jobTitle.trim() && !e.company.trim()) continue;
        this.entryHeader(
          [e.jobTitle, e.company].filter(Boolean).join(' — '),
          [e.startDate, e.endDate].filter(Boolean).join(' - '),
          e.location,
        );
        if (hasBody(e.description)) this.bulletList(e.description);
        this.y -= 5;
      }
    }

    if (d.internships.length) {
      this.sectionHeader('Internships');
      for (const e of d.internships) {
        if (!e.title.trim() && !e.company.trim()) continue;
        this.entryHeader(
          [e.title, e.company].filter(Boolean).join(' — '),
          e.duration,
          e.location,
        );
        if (e.technologies.trim()) this.paragraph(`Technologies: ${e.technologies}`, { size: t.metaSize, color: rgb(0.36, 0.38, 0.42) });
        if (hasBody(e.description)) this.bulletList(e.description);
        this.y -= 5;
      }
    }

    if (d.projects.length) {
      this.sectionHeader('Projects');
      for (const e of d.projects) {
        if (!e.name.trim()) continue;
        const links = [e.githubUrl, e.liveUrl].map((l) => sanitizeLine(l)).filter(Boolean).join(' | ');
        this.entryHeader(e.name, links, e.role ? `Role: ${e.role}` : '');
        if (e.technologies.trim()) this.paragraph(`Technologies: ${e.technologies}`, { size: t.metaSize, color: rgb(0.36, 0.38, 0.42) });
        if (hasBody(e.description)) this.bulletList(e.description);
        this.y -= 5;
      }
    }

    if (d.education.length) {
      this.sectionHeader('Education');
      for (const e of d.education) {
        if (!e.degree.trim() && !e.institution.trim()) continue;
        const score = e.score.trim() ? ` — ${e.score.trim()}` : '';
        this.entryHeader(
          [e.degree, e.institution].filter(Boolean).join(' — '),
          [e.startYear, e.endYear].filter(Boolean).join(' - '),
          [e.location, score ? `${e.score}` : ''].filter(Boolean).join(' • '),
        );
        this.y -= 4;
      }
    }

    if (d.certifications.length) {
      this.sectionHeader('Certifications');
      for (const c of d.certifications) {
        if (!c.name.trim()) continue;
        const cred = c.credentialUrl.trim();
        this.entryHeader(
          [c.name, c.organization].filter(Boolean).join(' — '),
          c.date,
        );
        if (cred) this.paragraph(cred, { size: t.metaSize, color: rgb(0.36, 0.38, 0.42) });
        this.y -= 3;
      }
    }

    if (d.achievements.length) {
      this.sectionHeader('Achievements');
      for (const a of d.achievements) {
        if (!a.title.trim()) continue;
        this.bulletList([a.title + (a.description ? ` — ${a.description}` : '')].join('\n'));
      }
    }

    if (d.languages.length) {
      this.sectionHeader('Languages');
      this.paragraph(d.languages.map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`).join('  •  '));
    }
  }
}

export async function generateResumePdf(template: ResumeTemplate, data: ResumeData): Promise<Uint8Array> {
  return ResumePdfBuilder.generate(template, data);
}

export function pdfFileName(data: ResumeData): string {
  const base = sanitizeLine(data.personal.fullName || 'Resume').replace(/\s+/g, '_');
  return `${base}_Resume.pdf`;
}
