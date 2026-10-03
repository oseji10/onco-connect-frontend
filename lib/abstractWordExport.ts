// lib/abstractWordExport.ts
//
// Builds the "abstract book" Word document, sectioned like the Rankings page:
//
//   Cover + contents
//   1. Overall Top 30 (Oral)            – by overall rank
//   2. Sub-theme Top 5 (Oral)           – grouped by sub-theme, by rank in sub-theme
//   3. Poster Presentations (>= 2.5)    – by score, highest first
//
// Each abstract is on its own page, laid out like the printed sample:
// reference, bold title, authors, numbered affiliations, then
// Background / Methods / Results ...
//
// Sections, sub-themes and abstract titles are real Word headings, so they
// show up in Word's Navigation Pane (View > Navigation Pane) for quick jumping.
//
// Runs in the browser. `docx` is imported dynamically so it only loads when
// the admin clicks the button.   npm install docx

export interface ExportAuthor {
  name: string;
  affiliation?: string | null;
}

export interface ExportAbstract {
  id: number;
  reference: string;
  title: string;
  body: string;
  averageScore?: number | null;
  authors?: ExportAuthor[];
}

export interface ExportRow {
  rank?: number;
  subTheme?: string;
  subThemeRank?: number;
  abstract: ExportAbstract;
}

export interface ExportBuckets {
  top30: ExportRow[];
  subThemeTop5: ExportRow[];
  posters: ExportRow[];
  // `pending` (below 2.5, undecided) is deliberately not part of the book.
}

export interface ExportOptions {
  /** Maps a sub-theme value to its display label. */
  subThemeLabel?: (value?: string) => string;
  /** Sub-theme values in the order they should appear. */
  subThemeOrder?: string[];
  /** Cover page title. */
  title?: string;
  /** Small "Overall rank #3 · Score 4.52" line above each reference. */
  showRankTag?: boolean;
  /** Keep the "-R1" revision suffix on references (default: strip it, so ICW2026-0112-R1 prints as ICW2026-0112). */
  keepRevisionSuffix?: boolean;
  filename?: string;
}

const FONT = "Arial";
const BODY_SIZE = 20;    // half-points -> 10 pt
const HEADING_SIZE = 21; // 10.5 pt
const TITLE_SIZE = 22;   // 11 pt
const COLOR_BODY = "1F2937";
const COLOR_MUTED = "6B7280";
const COLOR_BRAND = "047857";

// ─── Body parsing ────────────────────────────────────────────────────────
// Turns the stored abstract text into [heading, paragraph, heading, ...].
// A heading is a line that is just "Background" / "Methods:" etc., or
// "Results: text follows here" (heading + the start of its paragraph).

const SECTION_HEADING =
  /^\s*(background|introduction|objectives?|aims?|methods?|methodology|results?|findings|discussion|conclusions?|recommendations?|keywords?)\s*(?::|$)\s*(.*)$/i;

type BodyBlock = { kind: "heading" | "paragraph"; text: string };

export function parseAbstractBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    buffer = [];
  };

  for (const raw of (body ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const match = line.match(SECTION_HEADING);
    if (match) {
      flush();
      const word = match[1];
      blocks.push({
        kind: "heading",
        text: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      });
      if (match[2]) buffer.push(match[2]);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}

// ─── Authors / affiliations ──────────────────────────────────────────────

function buildAuthorInfo(authors: ExportAuthor[]) {
  const affiliations: string[] = [];
  const lookup = new Map<string, number>(); // lowercase affiliation -> number

  const people = authors
    .filter((a) => a.name && a.name.trim())
    .map((a) => {
      const aff = (a.affiliation ?? "").trim();
      let n: number | null = null;
      if (aff) {
        const key = aff.toLowerCase();
        if (!lookup.has(key)) {
          affiliations.push(aff);
          lookup.set(key, affiliations.length);
        }
        n = lookup.get(key)!;
      }
      return { name: a.name.trim(), n };
    });

  return { people, affiliations, showNumbers: affiliations.length > 1 };
}

// ─── Section assembly ────────────────────────────────────────────────────

interface BookEntry {
  row: ExportRow;
  tag: string;
  groupHeading?: string; // set on the first abstract of a sub-theme group
}

interface BookSection {
  title: string;
  description: string;
  entries: BookEntry[];
}

function scoreText(score?: number | null) {
  return score == null ? "" : ` · Score ${score.toFixed(2)}`;
}

function buildSections(buckets: ExportBuckets, opts: ExportOptions): BookSection[] {
  const label = opts.subThemeLabel ?? ((v?: string) => v ?? "Other");
  const seen = new Set<number>(); // an abstract is printed once: first section wins

  const claim = (rows: ExportRow[]) =>
    rows.filter((r) => {
      if (seen.has(r.abstract.id)) return false;
      seen.add(r.abstract.id);
      return true;
    });

  // 1) Overall top 30 – by overall rank
  const top30 = claim([...buckets.top30].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9)));

  // 2) Sub-theme top 5 – grouped by sub-theme, by rank inside it
  const subRows = claim(buckets.subThemeTop5);
  const groups = new Map<string, ExportRow[]>();
  for (const r of subRows) {
    const key = r.subTheme ?? "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const order = opts.subThemeOrder ?? [];
  const keys = [...groups.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
  });
  const subEntries: BookEntry[] = [];
  for (const key of keys) {
    const rows = groups.get(key)!.sort((a, b) => (a.subThemeRank ?? 1e9) - (b.subThemeRank ?? 1e9));
    rows.forEach((row, i) =>
      subEntries.push({
        row,
        groupHeading: i === 0 ? `Sub-theme: ${label(key)}` : undefined,
        tag: `Rank #${row.subThemeRank ?? i + 1} in ${label(key)}${scoreText(row.abstract.averageScore)}`,
      })
    );
  }

  // 3) Posters – highest score first
  const posters = claim(
    [...buckets.posters].sort((a, b) => (b.abstract.averageScore ?? -1) - (a.abstract.averageScore ?? -1))
  );

  const sections: BookSection[] = [
    {
      title: "Overall Top 30",
      description: "Oral presentations · ranked by average score",
      entries: top30.map((row) => ({
        row,
        tag: `Overall rank${row.rank ? ` #${row.rank}` : ""}${scoreText(row.abstract.averageScore)}`,
      })),
    },
    {
      title: "Sub-theme Top 5",
      description: "Oral presentations · top 5 abstracts in each sub-theme",
      entries: subEntries,
    },
    {
      title: "Poster Presentations",
      description: "Accepted as posters · average score 2.5 and above",
      entries: posters.map((row) => ({
        row,
        tag: `Poster${scoreText(row.abstract.averageScore)}`,
      })),
    },
  ];

  return sections.filter((s) => s.entries.length > 0);
}

// ─── Public API ──────────────────────────────────────────────────────────

/** Builds the .docx and returns it as a Blob (no download side effects). */
export async function buildAbstractBookBlob(
  buckets: ExportBuckets,
  opts: ExportOptions = {}
): Promise<{ blob: Blob; count: number }> {
  const {
    Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber, HeadingLevel, BorderStyle, LineRuleType,
  } = await import("docx");

  const sections = buildSections(buckets, opts);
  const count = sections.reduce((n, s) => n + s.entries.length, 0);
  const showTag = opts.showRankTag ?? true;

  type P = InstanceType<typeof Paragraph>;
  type R = InstanceType<typeof TextRun>;
  const children: P[] = [];

  const run = (text: string, extra: Record<string, unknown> = {}): R =>
    new TextRun({ text, font: FONT, size: BODY_SIZE, color: COLOR_BODY, ...extra });

  // ── Cover + contents ──
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 3200, after: 200 },
      children: [run(opts.title ?? "Abstract Book", { bold: true, size: 64, color: COLOR_BRAND })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 900 },
      children: [run(`${count} abstract${count === 1 ? "" : "s"}`, { size: 24, color: COLOR_MUTED })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [run("Contents", { bold: true, size: 26 })],
    })
  );
  sections.forEach((s, i) => {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          run(`${i + 1}. ${s.title}`, { size: 24 }),
          run(`   (${s.entries.length})`, { size: 24, color: COLOR_MUTED }),
        ],
      })
    );
  });

  // ── Sections ──
  sections.forEach((section, sIndex) => {
    // Divider page. An empty fixed-height paragraph pushes the title down the
    // page (more reliable than space-before at the top of a page).
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { line: 4800, lineRule: LineRuleType.EXACT },
        children: [],
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [run(`${sIndex + 1}. ${section.title}`, { bold: true, size: 52, color: COLOR_BRAND })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [run(section.description, { size: 24, color: COLOR_MUTED })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run(`${section.entries.length} abstract${section.entries.length === 1 ? "" : "s"}`, {
            size: 24,
            color: COLOR_MUTED,
          }),
        ],
      })
    );

    section.entries.forEach((entry) => {
      const abs = entry.row.abstract;
      let pageBreakPending = true; // first paragraph of every abstract starts a new page

      // Sub-theme heading on the first abstract of each group
      if (entry.groupHeading) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            pageBreakBefore: true,
            spacing: { after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BRAND, space: 4 } },
            children: [run(entry.groupHeading, { bold: true, size: 26, color: COLOR_BRAND })],
          })
        );
        pageBreakPending = false;
      }

      // Small rank/score tag
      if (showTag) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            pageBreakBefore: pageBreakPending,
            spacing: { after: 80 },
            children: [run(entry.tag, { size: 16, color: COLOR_MUTED })],
          })
        );
        pageBreakPending = false;
      }

      // Reference ("ICW 005")
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          pageBreakBefore: pageBreakPending,
          spacing: { after: 160 },
          children: [
            run(opts.keepRevisionSuffix ? abs.reference : abs.reference.replace(/-R\d+$/i, ""), {
              bold: true,
              size: TITLE_SIZE,
            }),
          ],
        })
      );

      // Title (outline level 3 so it appears in Word's Navigation Pane)
      children.push(
        new Paragraph({
          style: "AbstractTitle",
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [run(abs.title, { bold: true, size: TITLE_SIZE })],
        })
      );

      // Authors (superscript numbers only when there is more than one affiliation)
      const { people, affiliations, showNumbers } = buildAuthorInfo(abs.authors ?? []);

      if (people.length) {
        const runs: R[] = [];
        people.forEach((p, i) => {
          runs.push(run(p.name));
          if (showNumbers && p.n) runs.push(run(String(p.n), { superScript: true }));
          if (i < people.length - 1) runs.push(run(", "));
        });
        children.push(new Paragraph({ spacing: { after: 200 }, children: runs }));
      }

      // Numbered affiliations: "1. Medcancer Initiative Rwanda"
      affiliations.forEach((aff, i) => {
        children.push(
          new Paragraph({
            spacing: { after: i === affiliations.length - 1 ? 280 : 60 },
            children: [run(`${i + 1}. ${aff}`)],
          })
        );
      });

      // Body: bold section headings + justified paragraphs
      for (const block of parseAbstractBody(abs.body)) {
        if (block.kind === "heading") {
          children.push(
            new Paragraph({
              keepNext: true,
              spacing: { before: 220, after: 80 },
              children: [run(block.text, { bold: true, size: HEADING_SIZE })],
            })
          );
        } else {
          children.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 120, line: 288 },
              children: [run(block.text)],
            })
          );
        }
      }
    });
  });

  const doc = new Document({
    creator: "ICW Abstract System",
    title: opts.title ?? "Abstract Book",
    styles: {
      default: { document: { run: { font: FONT, size: BODY_SIZE } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 52, bold: true, color: COLOR_BRAND },
          paragraph: { outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: 26, bold: true, color: COLOR_BRAND },
          paragraph: { outlineLevel: 1 },
        },
        {
          id: "AbstractTitle",
          name: "Abstract Title",
          basedOn: "Normal",
          next: "Normal",
          run: { font: FONT, size: TITLE_SIZE, bold: true, color: COLOR_BODY },
          paragraph: { outlineLevel: 2 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR_MUTED })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return { blob, count };
}

/** Builds the document and triggers the browser download. Returns how many abstracts were included. */
export async function downloadAbstractBook(buckets: ExportBuckets, opts: ExportOptions = {}): Promise<number> {
  const { blob, count } = await buildAbstractBookBlob(buckets, opts);
  if (count === 0) return 0;

  const name = opts.filename ?? `abstract-book-${new Date().toISOString().slice(0, 10)}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return count;
}