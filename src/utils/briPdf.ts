
import { jsPDF } from 'jspdf';
import type { BriLabel } from '../types/bri';

// ==========================================
// UKURAN KERTAS TOM & JERRY NO. 103
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

// Kalibrasi posisi cetak
const OFFSET_X = 0;
const OFFSET_Y = 0;

// ==========================================
// PENGATURAN LABEL
// ==========================================

const HELPDESK = '081113017039';

const LOGO_AREA_WIDTH = 22;
const TEXT_PADDING = 1;

const TEXT_WIDTH =
  LABEL_WIDTH - LOGO_AREA_WIDTH - TEXT_PADDING - 1;

const TEXT_SAFE_WIDTH = TEXT_WIDTH - 2;

// ==========================================
// PENGATURAN FONT
// ==========================================

const FONT_NAME = 'helvetica';

const MAIN_FONT_SIZE = 10;
const DETAIL_FONT_SIZE = 8;

const MIN_MAIN_FONT_SIZE = 6;
const MIN_DETAIL_FONT_SIZE = 6;

const BLACK = [0, 0, 0] as const;
const GRAY = [105, 105, 105] as const;

// ==========================================
// KONVERSI UKURAN
// ==========================================

const ptToMm = (pt: number): number =>
  (pt * 25.4) / 72;

// ==========================================
// LOAD LOGO TELKOMSEL
// ==========================================

async function loadLogo(): Promise<string> {
  const response = await fetch('/Telkomsel.png');

  if (!response.ok) {
    throw new Error(
      'Logo Telkomsel tidak ditemukan di folder public.'
    );
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca logo Telkomsel.'));
    };

    reader.readAsDataURL(blob);
  });
}

// ==========================================
// SET FONT DAN WARNA
// ==========================================

function setFont(
  pdf: jsPDF,
  size: number,
  bold = false,
  color: 'black' | 'gray' = 'black'
): void {
  pdf.setFont(
    FONT_NAME,
    bold ? 'bold' : 'normal'
  );

  pdf.setFontSize(size);

  const rgb = color === 'gray' ? GRAY : BLACK;

  pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
}

// ==========================================
// CEK LEBAR TEKS
// ==========================================

function getTextWidth(
  pdf: jsPDF,
  text: string,
  fontSize: number,
  bold = false
): number {
  setFont(pdf, fontSize, bold);

  return pdf.getTextWidth(text);
}

// ==========================================
// FIT FONT SATU BARIS
// ==========================================

function fitFontSize(
  pdf: jsPDF,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  bold = false
): number {
  for (
    let size = preferredSize;
    size >= minSize;
    size -= 0.5
  ) {
    if (
      getTextWidth(pdf, text, size, bold) <=
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
  pdf: jsPDF,
  site: string,
  maxWidth: number
): FormattedSite {
  const siteName = site.trim();

  if (!siteName) {
    throw new Error('Nama Site tidak boleh kosong.');
  }

  const fullText = `Site: ${siteName}`;

  // Posisi pemisahan berdasarkan tanda
  // hubung, underscore, atau spasi.
  const breakPositions: number[] = [];

  for (let i = 1; i < fullText.length; i++) {
    const previous = fullText[i - 1];

    if (
      previous === '-' ||
      previous === '_' ||
      previous === ' '
    ) {
      breakPositions.push(i);
    }
  }

  // Fallback jika tidak ada pemisah yang cocok
  const allPositions = Array.from(
    { length: fullText.length - 1 },
    (_, index) => index + 1
  );

  function findLayout(
    fontSize: number,
    positions: number[]
  ): string[] | null {
    const fits = (text: string) =>
      getTextWidth(
        pdf,
        text,
        fontSize,
        true
      ) <= maxWidth;

    if (fits(fullText)) {
      return [fullText];
    }

    const candidates: string[][] = [];

    // Dua baris
    for (const i of positions) {
      const first =
        fullText.slice(0, i).trimEnd();

      const second =
        fullText.slice(i).trimStart();

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

        const first =
          fullText.slice(0, i).trimEnd();

        const second =
          fullText.slice(i, j).trim();

        const third =
          fullText.slice(j).trimStart();

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

      // Utamakan panjang baris seimbang
      const score = (lines: string[]) => {
        const widths = lines.map((line) =>
          getTextWidth(
            pdf,
            line,
            fontSize,
            true
          )
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

  for (
    let fontSize = MAIN_FONT_SIZE;
    fontSize >= MIN_MAIN_FONT_SIZE;
    fontSize -= 0.5
  ) {
    // Prioritaskan pemisahan pada tanda hubung
    const preferred = findLayout(
      fontSize,
      breakPositions
    );

    if (preferred) {
      return {
        lines: preferred,
        fontSize,
      };
    }

    const fallback = findLayout(
      fontSize,
      allPositions
    );

    if (fallback) {
      return {
        lines: fallback,
        fontSize,
      };
    }
  }

  throw new Error(
    `Nama Site terlalu panjang untuk label: ${site}`
  );
}

// ==========================================
// GAMBAR SATU LABEL
// ==========================================

function drawLabel(
  pdf: jsPDF,
  logo: string,
  item: BriLabel,
  x: number,
  y: number
): void {
  // ----------------------------------------
  // LOGO TELKOMSEL
  // ----------------------------------------

  const image = pdf.getImageProperties(logo);

  const maxLogoWidth = 21;
  const maxLogoHeight = 30;

  const scale = Math.min(
    maxLogoWidth / image.width,
    maxLogoHeight / image.height
  );

  const logoWidth = image.width * scale;
  const logoHeight = image.height * scale;

  const logoX =
    x + (LOGO_AREA_WIDTH - logoWidth) / 2;

  const logoY =
    y + (LABEL_HEIGHT - logoHeight) / 2;

  pdf.addImage(
    logo,
    'PNG',
    logoX,
    logoY,
    logoWidth,
    logoHeight
  );

  // ----------------------------------------
  // AREA TEKS
  // ----------------------------------------

  const textX =
    x + LOGO_AREA_WIDTH + TEXT_PADDING;

  const servicesText =
    `Services : ${item.services}`;

  const noIotText =
    `No IOT: ${item.noIot}`;

  const helpdeskText =
    `Helpdesk: ${HELPDESK}`;

  // ----------------------------------------
  // HITUNG FONT
  // ----------------------------------------

  const servicesFontSize = fitFontSize(
    pdf,
    servicesText,
    TEXT_SAFE_WIDTH,
    MAIN_FONT_SIZE,
    MIN_MAIN_FONT_SIZE,
    true
  );

  const site = formatSiteText(
    pdf,
    item.site,
    TEXT_SAFE_WIDTH
  );

  const noIotFontSize = fitFontSize(
    pdf,
    noIotText,
    TEXT_SAFE_WIDTH,
    DETAIL_FONT_SIZE,
    MIN_DETAIL_FONT_SIZE
  );

  const helpdeskFontSize = fitFontSize(
    pdf,
    helpdeskText,
    TEXT_SAFE_WIDTH,
    DETAIL_FONT_SIZE,
    MIN_DETAIL_FONT_SIZE
  );

  // ----------------------------------------
  // HITUNG TINGGI TEKS
  // ----------------------------------------

  const servicesLineHeight =
    ptToMm(servicesFontSize) * 1.15;

  const siteLineHeight =
    ptToMm(site.fontSize) * 1.15;

  const detailLineHeight =
    ptToMm(DETAIL_FONT_SIZE) * 1.25;

  const contentHeight =
    servicesLineHeight +
    site.lines.length * siteLineHeight +
    detailLineHeight * 2 +
    1.5;

  // Teks dibuat rata tengah vertikal
  let currentY =
    y + (LABEL_HEIGHT - contentHeight) / 2 +
    ptToMm(servicesFontSize) * 0.85;

  // ----------------------------------------
  // SERVICES
  // ----------------------------------------

  setFont(
    pdf,
    servicesFontSize,
    true,
    'black'
  );

  pdf.text(
    servicesText,
    textX,
    currentY
  );

  currentY += servicesLineHeight;

  // ----------------------------------------
  // SITE
  // ----------------------------------------

  setFont(
    pdf,
    site.fontSize,
    true,
    'black'
  );

  site.lines.forEach((line) => {
    pdf.text(
      line,
      textX,
      currentY
    );

    currentY += siteLineHeight;
  });

  // ----------------------------------------
  // NO IOT
  // ----------------------------------------

  currentY += 0.5;

  setFont(
    pdf,
    noIotFontSize,
    false,
    'gray'
  );

  pdf.text(
    noIotText,
    textX,
    currentY
  );

  // ----------------------------------------
  // HELPDESK
  // ----------------------------------------

  currentY += detailLineHeight;

  setFont(
    pdf,
    helpdeskFontSize,
    false,
    'gray'
  );

  pdf.text(
    helpdeskText,
    textX,
    currentY
  );
}

// ==========================================
// GENERATE PDF BRI
// ==========================================

export async function generateBriPDF(
  items: BriLabel[]
): Promise<Blob> {
  if (!items.length) {
    throw new Error('Belum ada data BRI.');
  }

  const logo = await loadLogo();

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    compress: true,
  });

  // Setiap Site dicetak 2 kali
  const labels = items.flatMap(
    (item) => [item, item]
  );

  labels.forEach((item, index) => {
    if (
      index > 0 &&
      index % LABELS_PER_PAGE === 0
    ) {
      pdf.addPage(
        [PAGE_WIDTH, PAGE_HEIGHT],
        'landscape'
      );
    }

    const indexOnPage =
      index % LABELS_PER_PAGE;

    // Isi per kolom, dari atas ke bawah
    const col = Math.floor(
      indexOnPage / ROWS
    );

    const row =
      indexOnPage % ROWS;

    const x =
      START_X +
      col * (LABEL_WIDTH + GAP_X) +
      OFFSET_X;

    const y =
      START_Y +
      row * (LABEL_HEIGHT + GAP_Y) +
      OFFSET_Y;

    drawLabel(
      pdf,
      logo,
      item,
      x,
      y
    );
  });

  return pdf.output('blob');
}
