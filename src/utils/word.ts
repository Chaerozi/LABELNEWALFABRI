
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
  ImageRun,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
} from 'docx';

import type { Store } from '../types/store';

interface Label {
  title: string;
  storeCode: string;
  number: string;
}

interface ImageSize {
  width: number;
  height: number;
}

const SITE_NUMBER = '081113017039';

// Ukuran kertas (mm)
const PAGE_WIDTH = 205;
const PAGE_HEIGHT = 165;

// Ukuran label (mm)
const LABEL_WIDTH = 64;
const LABEL_HEIGHT = 32;

// Susunan label
const COLUMNS = 3;
const ROWS = 4;
const LABELS_PER_PAGE = COLUMNS * ROWS;

// Posisi awal dan jarak antarlabel (mm)
const MARGIN_LEFT = 2;
const MARGIN_TOP = 7;
const GAP_X = 4.5;
const GAP_Y = 6;

// Kalibrasi posisi cetak (mm)
const OFFSET_X = 0;
const OFFSET_Y = 0;

// Pembagian area logo dan teks
const LOGO_WIDTH = 22;
const TEXT_WIDTH = LABEL_WIDTH - LOGO_WIDTH;

// Batas ukuran logo (mm)
const LOGO_MAX_WIDTH = 22;
const LOGO_MAX_HEIGHT = 30;

// Pengaturan font
const FONT_NAME = 'Calibri';
const FONT_SIZE = 24; // 12 pt
const MIN_NUMBER_FONT_PT = 5;

// Konversi mm ke twip
const mm = (value: number): number =>
  Math.round((value * 1440) / 25.4);

// Konversi mm ke piksel pada 96 DPI
const mmToPx = (value: number): number =>
  (value * 96) / 25.4;

// Border tabel tanpa garis
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

// Membuat 4 label untuk setiap store
function createLabels(stores: Store[]): Label[] {
  return stores.flatMap((store) => [
    {
      title: 'SITE: MTM',
      storeCode: store.storeCode,
      number: SITE_NUMBER,
    },
    {
      title: 'Modem: Primary',
      storeCode: store.storeCode,
      number: store.primaryNumber,
    },
    {
      title: 'Modem: Backup',
      storeCode: store.storeCode,
      number: store.backupNumber,
    },
    {
      title: 'SITE: MTM',
      storeCode: store.storeCode,
      number: SITE_NUMBER,
    },
  ]);
}

// Membaca ukuran asli gambar logo
async function getImageSize(
  buffer: ArrayBuffer
): Promise<ImageSize> {
  const blob = new Blob([buffer], {
    type: 'image/png',
  });

  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();

      image.onerror = () => {
        reject(
          new Error('Gagal membaca ukuran logo Telkomsel.')
        );
      };

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

// Menghitung ukuran logo tanpa merusak rasio
function getLogoDimensions(
  imageSize: ImageSize
): ImageSize {
  const maxWidth = mmToPx(
    Math.min(LOGO_MAX_WIDTH, LOGO_WIDTH)
  );

  const maxHeight = mmToPx(
    Math.min(LOGO_MAX_HEIGHT, LABEL_HEIGHT)
  );

  const scale = Math.min(
    maxWidth / imageSize.width,
    maxHeight / imageSize.height
  );

  return {
    width: Math.round(imageSize.width * scale),
    height: Math.round(imageSize.height * scale),
  };
}

// Membuat paragraf teks utama
function createText(
  text: string,
  bold = false
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      before: 0,
      after: 0,
      line: 240,
      lineRule: 'auto',
    },
    children: [
      new TextRun({
        text,
        bold,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: '000000',
      }),
    ],
  });
}

// Paragraf kosong
function emptyParagraph(): Paragraph {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 0,
    },
    children: [],
  });
}

// Membuat sel tabel dengan ukuran tetap
// Properti noWrap dihapus agar kompatibel dengan docx
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

// Membuat sel logo
function createLogoCell(
  logo: ArrayBuffer,
  logoDimensions: ImageSize,
  label?: Label
): TableCell {
  if (!label) {
    return createCell(
      LOGO_WIDTH,
      [emptyParagraph()]
    );
  }

  return createCell(LOGO_WIDTH, [
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
            width: logoDimensions.width,
            height: logoDimensions.height,
          },
        }),
      ],
    }),
  ]);
}

// Mengukur lebar teks menggunakan Canvas
// Hasil dalam satuan mm
function measureTextWidth(
  text: string,
  fontPt: number
): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return text.length * fontPt * 0.18;
  }

  const fontPx = fontPt * (96 / 72);

  context.font = `${fontPx}px ${FONT_NAME}`;

  const widthPx = context.measureText(text).width;

  return (widthPx * 25.4) / 96;
}

// Menentukan ukuran font berdasarkan panjang nomor
function getNumberFontSize(number: string): number {
  const text = `No: ${number}`;

  // Ruang aman 4 mm untuk menghindari teks terpotong
  const availableWidth = TEXT_WIDTH - 4;

  // Mulai 12 pt, turun 0.5 pt jika belum muat
  for (
    let fontPt = FONT_SIZE / 2;
    fontPt >= MIN_NUMBER_FONT_PT;
    fontPt -= 0.5
  ) {
    const textWidth = measureTextWidth(
      text,
      fontPt
    );

    if (textWidth <= availableWidth) {
      // Ukuran font docx menggunakan half-point
      return Math.round(fontPt * 2);
    }
  }

  return MIN_NUMBER_FONT_PT * 2;
}

// Paragraf nomor dengan ukuran font otomatis
function createNumberText(number: string): Paragraph {
  const numberText = `No: ${number}`;

  const fontSize = getNumberFontSize(number);

  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      before: 0,
      after: 0,
      line: 240,
      lineRule: 'auto',
    },
    children: [
      new TextRun({
        text: numberText,
        font: FONT_NAME,
        size: fontSize,
        color: '000000',
      }),
    ],
  });
}

// Membuat informasi label
function createInfoCell(label?: Label): TableCell {
  if (!label) {
    return createCell(
      TEXT_WIDTH,
      [emptyParagraph()]
    );
  }

  return createCell(TEXT_WIDTH, [
    createText(label.title),
    createText(`STORE- ${label.storeCode}`, true),
    createText('SD-WAN - Alfamart'),
    createNumberText(label.number),
  ]);
}

// Sel kosong untuk jarak antarkolom
function createSpacerCell(width: number): TableCell {
  return createCell(
    width,
    [emptyParagraph()]
  );
}

// Membuat tabel 3 kolom x 4 baris
function createPageTable(
  labels: Label[],
  logo: ArrayBuffer,
  logoDimensions: ImageSize
): Table {
  const tableRows: TableRow[] = [];

  for (let row = 0; row < ROWS; row++) {
    const cells: TableCell[] = [];

    for (let col = 0; col < COLUMNS; col++) {
      // Setiap store mengisi satu kolom vertikal
      const index = col * ROWS + row;
      const label = labels[index];

      cells.push(
        createLogoCell(
          logo,
          logoDimensions,
          label
        )
      );

      cells.push(
        createInfoCell(label)
      );

      if (col < COLUMNS - 1) {
        cells.push(
          createSpacerCell(GAP_X)
        );
      }
    }

    tableRows.push(
      new TableRow({
        cantSplit: true,
        height: {
          value: mm(LABEL_HEIGHT),
          rule: HeightRule.EXACT,
        },
        children: cells,
      })
    );

    // Jarak vertikal antarbaris label
    if (row < ROWS - 1) {
      const spacerCells: TableCell[] = [];

      for (let col = 0; col < COLUMNS; col++) {
        spacerCells.push(
          createSpacerCell(LOGO_WIDTH)
        );

        spacerCells.push(
          createSpacerCell(TEXT_WIDTH)
        );

        if (col < COLUMNS - 1) {
          spacerCells.push(
            createSpacerCell(GAP_X)
          );
        }
      }

      tableRows.push(
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

  for (let col = 0; col < COLUMNS; col++) {
    columnWidths.push(mm(LOGO_WIDTH));
    columnWidths.push(mm(TEXT_WIDTH));

    if (col < COLUMNS - 1) {
      columnWidths.push(mm(GAP_X));
    }
  }

  return new Table({
    layout: TableLayoutType.FIXED,
    width: {
      size: mm(
        LABEL_WIDTH * COLUMNS +
        GAP_X * (COLUMNS - 1)
      ),
      type: WidthType.DXA,
    },
    columnWidths,
    borders,
    rows: tableRows,
  });
}

// Generate dokumen Word
export async function generateLabelsWord(
  stores: Store[]
): Promise<Blob> {
  if (stores.length === 0) {
    throw new Error('Belum ada data store.');
  }

  const response = await fetch('/Telkomsel.png');

  if (!response.ok) {
    throw new Error(
      'Logo Telkomsel.png tidak ditemukan di folder public.'
    );
  }

  const logo = await response.arrayBuffer();

  const imageSize = await getImageSize(logo);
  const logoDimensions = getLogoDimensions(imageSize);

  const labels = createLabels(stores);

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
            top: mm(MARGIN_TOP + OFFSET_Y),
            bottom: mm(5),
            left: mm(MARGIN_LEFT + OFFSET_X),
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
          logoDimensions
        ),
      ],
    });
  }

  const document = new Document({
    sections,
  });

  return Packer.toBlob(document);
}
