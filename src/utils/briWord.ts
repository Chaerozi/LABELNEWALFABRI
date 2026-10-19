
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeightRule,
  VerticalAlign,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
  ImageRun,
} from 'docx';

import type { BriLabel } from '../types/bri';

// ==========================================
// KERTAS TOM & JERRY NO. 103
// ==========================================

const PAGE_WIDTH = 205;
const PAGE_HEIGHT = 165;

const COLS = 3;
const ROWS = 4;
const LABELS_PER_PAGE = COLS * ROWS;

const LABEL_WIDTH = 64;
const LABEL_HEIGHT = 32;

const START_X = 2;
const START_Y = 7;

const GAP_X = 4.5;
const GAP_Y = 6;

const OFFSET_X = 0;
const OFFSET_Y = 0;

// ==========================================
// TAMPILAN LABEL
// ==========================================

const HELPDESK = '081113017039';

const LOGO_AREA_WIDTH = 22;
const TEXT_WIDTH = LABEL_WIDTH - LOGO_AREA_WIDTH;

const FONT_NAME = 'Calibri Light';

const MAIN_FONT_SIZE = 20; // 10 pt
const DETAIL_FONT_SIZE = 16; // 8 pt

const BLACK = '000000';
const GRAY = '696969';

// Ruang aman agar Word tidak wrap ulang
const TEXT_SAFE_WIDTH = TEXT_WIDTH - 5;

// ==========================================
// KONVERSI UKURAN
// ==========================================

const mm = (value: number): number =>
  Math.round((value * 1440) / 25.4);

const mmToPx = (value: number): number =>
  (value * 96) / 25.4;

// ==========================================
// BORDER
// ==========================================

const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};

const borders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};

// ==========================================
// HELPER PARAGRAF
// ==========================================

function emptyParagraph(): Paragraph {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 0,
    },
    children: [],
  });
}

function createParagraph(
  text: string,
  bold: boolean,
  size: number,
  color: string
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      before: 0,
      after: 0,
      line: 200,
      lineRule: 'auto',
    },
    children: [
      new TextRun({
        text,
        font: FONT_NAME,
        bold,
        size,
        color,
      }),
    ],
  });
}

function createCell(
  width: number,
  children: Paragraph[]
): TableCell {
  return new TableCell({
    width: {
      size: mm(width),
      type: WidthType.DXA,
    },
    borders,
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    children,
  });
}

// ==========================================
// UKUR LEBAR TEKS
// ==========================================

function measureTextWidth(
  text: string,
  fontPt: number,
  bold = false
): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return text.length * fontPt * 0.2;
  }

  const fontPx = fontPt * (96 / 72);

  ctx.font =
    `${bold ? 'bold ' : ''}${fontPx}px "${FONT_NAME}"`;

  return (ctx.measureText(text).width * 25.4) / 96;
}

// ==========================================
// FIT FONT SATU BARIS
// ==========================================

function fitFontSize(
  text: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  bold = false
): number {
  for (
    let size = preferredSize;
    size >= minSize;
    size -= 1
  ) {
    if (
      measureTextWidth(text, size / 2, bold) <=
      maxWidth
    ) {
      return size;
    }
  }

  throw new Error(
    `Teks terlalu panjang untuk label: ${text}`
  );
}

// ==========================================
// FORMAT SITE MAKSIMAL 3 BARIS
// ==========================================

interface FormattedSite {
  lines: string[];
  fontSize: number;
}

function formatSiteText(
  site: string
): FormattedSite {
  const siteName = site.trim();

  if (!siteName) {
    throw new Error('Nama Site tidak boleh kosong.');
  }

  const fullText = `Site: ${siteName}`;

  // Cari pemotongan terbaik berdasarkan tanda
  // hubung, spasi, dan underscore.
  const breakPositions: number[] = [];

  for (let i = 1; i < fullText.length; i++) {
    const prev = fullText[i - 1];

    if (
      prev === '-' ||
      prev === '_' ||
      prev === ' '
    ) {
      breakPositions.push(i);
    }
  }

  // Fallback: semua posisi karakter jika
  // pemotongan pada separator tidak cukup.
  const allPositions = Array.from(
    { length: fullText.length - 1 },
    (_, index) => index + 1
  );

  function findLayout(
    fontPt: number,
    positions: number[]
  ): string[] | null {
    const fits = (line: string) =>
      measureTextWidth(line, fontPt, true) <=
      TEXT_SAFE_WIDTH;

    const candidates: string[][] = [];

    if (fits(fullText)) {
      return [fullText];
    }

    // Dua baris
    for (const i of positions) {
      const first = fullText.slice(0, i).trimEnd();
      const second = fullText.slice(i).trimStart();

      if (
        first.startsWith('Site: ') &&
        first.length > 'Site: '.length &&
        second.length >= 2 &&
        fits(first) &&
        fits(second)
      ) {
        candidates.push([first, second]);
      }
    }

    // Tiga baris
    for (const i of positions) {
      for (const j of positions) {
        if (j <= i) continue;

        const first = fullText.slice(0, i).trimEnd();
        const second = fullText.slice(i, j).trim();
        const third = fullText.slice(j).trimStart();

        if (
          first.startsWith('Site: ') &&
          first.length > 'Site: '.length &&
          second.length >= 2 &&
          third.length >= 2 &&
          fits(first) &&
          fits(second) &&
          fits(third)
        ) {
          candidates.push([
            first,
            second,
            third,
          ]);
        }
      }
    }

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      // Pilih pembagian dengan lebar baris
      // paling seimbang.
      const score = (lines: string[]) => {
        const widths = lines.map((line) =>
          measureTextWidth(line, fontPt, true)
        );

        return (
          Math.max(...widths) -
          Math.min(...widths)
        );
      };

      return score(a) - score(b);
    });

    return candidates[0];
  }

  // Prioritaskan font 10 pt dan pemotongan
  // pada tanda hubung.
  for (
    let fontPt = 10;
    fontPt >= 6;
    fontPt -= 0.5
  ) {
    const preferred = findLayout(
      fontPt,
      breakPositions
    );

    if (preferred) {
      return {
        lines: preferred,
        fontSize: Math.round(fontPt * 2),
      };
    }

    const fallback = findLayout(
      fontPt,
      allPositions
    );

    if (fallback) {
      return {
        lines: fallback,
        fontSize: Math.round(fontPt * 2),
      };
    }
  }

  throw new Error(
    `Nama Site terlalu panjang untuk label: ${site}`
  );
}

// ==========================================
// LOAD LOGO
// ==========================================

async function loadLogo(): Promise<ArrayBuffer> {
  const response = await fetch('/Telkomsel.png');

  if (!response.ok) {
    throw new Error(
      'Logo Telkomsel tidak ditemukan.'
    );
  }

  return response.arrayBuffer();
}

async function getImageSize(
  buffer: ArrayBuffer
): Promise<{
  width: number;
  height: number;
}> {
  const blob = new Blob([buffer], {
    type: 'image/png',
  });

  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(
        new Error('Gagal membaca logo.')
      );
      image.src = url;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ==========================================
// LOGO CELL
// ==========================================

function createLogoCell(
  logo: ArrayBuffer,
  logoWidth: number,
  logoHeight: number,
  item?: BriLabel
): TableCell {
  if (!item) {
    return createCell(
      LOGO_AREA_WIDTH,
      [emptyParagraph()]
    );
  }

  return createCell(LOGO_AREA_WIDTH, [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 0,
        after: 0,
      },
      children: [
        new ImageRun({
          data: logo,
          type: 'png',
          transformation: {
            width: logoWidth,
            height: logoHeight,
          },
        }),
      ],
    }),
  ]);
}

// ==========================================
// INFO CELL
// ==========================================

function createInfoCell(
  item?: BriLabel
): TableCell {
  if (!item) {
    return createCell(
      TEXT_WIDTH,
      [emptyParagraph()]
    );
  }

  const servicesText =
    `Services : ${item.services}`;

  const noIotText =
    `No IOT: ${item.noIot}`;

  const helpdeskText =
    `Helpdesk: ${HELPDESK}`;

  const servicesSize = fitFontSize(
    servicesText,
    TEXT_SAFE_WIDTH,
    MAIN_FONT_SIZE,
    14,
    true
  );

  const site = formatSiteText(item.site);

  const noIotSize = fitFontSize(
    noIotText,
    TEXT_SAFE_WIDTH,
    DETAIL_FONT_SIZE,
    12
  );

  const helpdeskSize = fitFontSize(
    helpdeskText,
    TEXT_SAFE_WIDTH,
    DETAIL_FONT_SIZE,
    12
  );

  return createCell(TEXT_WIDTH, [
    createParagraph(
      servicesText,
      true,
      servicesSize,
      BLACK
    ),

    ...site.lines.map((line) =>
      createParagraph(
        line,
        true,
        site.fontSize,
        BLACK
      )
    ),

    createParagraph(
      noIotText,
      false,
      noIotSize,
      GRAY
    ),

    createParagraph(
      helpdeskText,
      false,
      helpdeskSize,
      GRAY
    ),
  ]);
}

// ==========================================
// SPACER CELL
// ==========================================

function createSpacerCell(
  width: number
): TableCell {
  return createCell(
    width,
    [emptyParagraph()]
  );
}

// ==========================================
// TABLE LABEL
// ==========================================

function createPageTable(
  labels: BriLabel[],
  logo: ArrayBuffer,
  logoWidth: number,
  logoHeight: number
): Table {
  const rows: TableRow[] = [];

  for (let row = 0; row < ROWS; row++) {
    const cells: TableCell[] = [];

    for (let col = 0; col < COLS; col++) {
      const index = col * ROWS + row;
      const item = labels[index];

      cells.push(
        createLogoCell(
          logo,
          logoWidth,
          logoHeight,
          item
        )
      );

      cells.push(
        createInfoCell(item)
      );

      if (col < COLS - 1) {
        cells.push(
          createSpacerCell(GAP_X)
        );
      }
    }

    rows.push(
      new TableRow({
        cantSplit: true,
        height: {
          value: mm(LABEL_HEIGHT),
          rule: HeightRule.EXACT,
        },
        children: cells,
      })
    );

    if (row < ROWS - 1) {
      const spacerCells: TableCell[] = [];

      for (let col = 0; col < COLS; col++) {
        spacerCells.push(
          createSpacerCell(LOGO_AREA_WIDTH)
        );

        spacerCells.push(
          createSpacerCell(TEXT_WIDTH)
        );

        if (col < COLS - 1) {
          spacerCells.push(
            createSpacerCell(GAP_X)
          );
        }
      }

      rows.push(
        new TableRow({
          cantSplit: true,
          height: {
            value: mm(GAP_Y),
            rule: HeightRule.EXACT,
          },
          children: spacerCells,
        })
      );
    }
  }

  const columnWidths: number[] = [];

  for (let col = 0; col < COLS; col++) {
    columnWidths.push(
      mm(LOGO_AREA_WIDTH)
    );

    columnWidths.push(
      mm(TEXT_WIDTH)
    );

    if (col < COLS - 1) {
      columnWidths.push(
        mm(GAP_X)
      );
    }
  }

  return new Table({
    layout: TableLayoutType.FIXED,
    width: {
      size: mm(
        LABEL_WIDTH * COLS +
        GAP_X * (COLS - 1)
      ),
      type: WidthType.DXA,
    },
    columnWidths,
    borders,
    rows,
  });
}

// ==========================================
// GENERATE WORD BRI
// ==========================================

export async function generateBriWord(
  items: BriLabel[]
): Promise<Blob> {
  if (!items.length) {
    throw new Error('Belum ada data BRI.');
  }

  const logo = await loadLogo();
  const imageSize = await getImageSize(logo);

  // Logo besar, tetap proporsional
  const maxLogoWidth = mmToPx(21);
  const maxLogoHeight = mmToPx(30);

  const scale = Math.min(
    maxLogoWidth / imageSize.width,
    maxLogoHeight / imageSize.height
  );

  const logoWidth = Math.round(
    imageSize.width * scale
  );

  const logoHeight = Math.round(
    imageSize.height * scale
  );

  // Duplikasi setiap data, dua label berurutan
  const labels = items.flatMap(
    (item) => [item, item]
  );

  const sections = [];

  for (
    let start = 0;
    start < labels.length;
    start += LABELS_PER_PAGE
  ) {
    const pageLabels = labels.slice(
      start,
      start + LABELS_PER_PAGE
    );

    sections.push({
      properties: {
        page: {
          size: {
            width: mm(PAGE_WIDTH),
            height: mm(PAGE_HEIGHT),
          },
          margin: {
            top: mm(START_Y + OFFSET_Y),
            bottom: mm(5),
            left: mm(START_X + OFFSET_X),
            right: mm(2),
            header: 0,
            footer: 0,
          },
        },
      },
      children: [
        createPageTable(
          pageLabels,
          logo,
          logoWidth,
          logoHeight
        ),
      ],
    });
  }

  const document = new Document({
    sections,
  });

  return Packer.toBlob(document);
}
