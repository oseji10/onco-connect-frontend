// lib/abstractWordExport.ts
//
// Builds the "abstract book" Word document: one abstract per page, laid out
// like the printed sample (reference, bold title, authors, numbered
// affiliations, then Background / Methods / Results ...).
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
  authors?: ExportAuthor[];
}

export interface ExportBuckets {
  top30: { abstract: ExportAbstract }[];
  subThemeTop5: { abstract: ExportAbstract }[];
  posters: { abstract: ExportAbstract }[];
  // `pending` (below 2.5, undecided) is deliberately not part of the book.
}

const FONT = "Arial";
const BODY_SIZE = 20;    // half-points  -> 10 pt
const HEADING_SIZE = 21; // 10.5 pt
const TITLE_SIZE = 22;   // 11 pt
const COLOR_BODY = "1F2937";
const COLOR_MUTED = "6B7280";

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

function dedupe(buckets: ExportBuckets): ExportAbstract[] {
  const seen = new Set<number>();
  const out: ExportAbstract[] = [];
  for (const row of [...buckets.top30, ...buckets.subThemeTop5, ...buckets.posters]) {
    if (seen.has(row.abstract.id)) continue;
    seen.add(row.abstract.id);
    out.push(row.abstract);
  }
  return out;
}

// ─── Public API ──────────────────────────────────────────────────────────

/** Builds the .docx and returns it as a Blob (no download side effects). */
export async function buildAbstractBookBlob(buckets: ExportBuckets): Promise<{ blob: Blob; count: number }> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber } = await import("docx");

  const abstracts = dedupe(buckets);
  const children: InstanceType<typeof Paragraph>[] = [];

  abstracts.forEach((abs, index) => {
    // Reference ("ICW 005"), centred and bold. Each abstract starts a new page.
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        pageBreakBefore: index > 0,
        spacing: { after: 160 },
        children: [new TextRun({ text: abs.reference, bold: true, font: FONT, size: TITLE_SIZE, color: COLOR_BODY })],
      })
    );

    // Title
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: abs.title, bold: true, font: FONT, size: TITLE_SIZE, color: COLOR_BODY })],
      })
    );

    // Authors (superscript numbers only when there is more than one affiliation)
    const { people, affiliations, showNumbers } = buildAuthorInfo(abs.authors ?? []);

    if (people.length) {
      const runs: InstanceType<typeof TextRun>[] = [];
      people.forEach((p, i) => {
        runs.push(new TextRun({ text: p.name, font: FONT, size: BODY_SIZE, color: COLOR_BODY }));
        if (showNumbers && p.n) {
          runs.push(new TextRun({ text: String(p.n), superScript: true, font: FONT, size: BODY_SIZE, color: COLOR_BODY }));
        }
        if (i < people.length - 1) {
          runs.push(new TextRun({ text: ", ", font: FONT, size: BODY_SIZE, color: COLOR_BODY }));
        }
      });
      children.push(new Paragraph({ spacing: { after: 200 }, children: runs }));
    }

    // Numbered affiliations: "1. Medcancer Initiative Rwanda"
    affiliations.forEach((aff, i) => {
      children.push(
        new Paragraph({
          spacing: { after: i === affiliations.length - 1 ? 280 : 60 },
          children: [new TextRun({ text: `${i + 1}. ${aff}`, font: FONT, size: BODY_SIZE, color: COLOR_BODY })],
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
            children: [new TextRun({ text: block.text, bold: true, font: FONT, size: HEADING_SIZE, color: COLOR_BODY })],
          })
        );
      } else {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120, line: 288 },
            children: [new TextRun({ text: block.text, font: FONT, size: BODY_SIZE, color: COLOR_BODY })],
          })
        );
      }
    }
  });

  const doc = new Document({
    creator: "ICW Abstract System",
    title: "Abstract Book",
    styles: { default: { document: { run: { font: FONT, size: BODY_SIZE } } } },
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
  return { blob, count: abstracts.length };
}

/** Builds the document and triggers the browser download. Returns how many abstracts were included. */
export async function downloadAbstractBook(buckets: ExportBuckets, filename?: string): Promise<number> {
  const { blob, count } = await buildAbstractBookBlob(buckets);
  if (count === 0) return 0;

  const name = filename ?? `abstract-book-${new Date().toISOString().slice(0, 10)}.docx`;
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