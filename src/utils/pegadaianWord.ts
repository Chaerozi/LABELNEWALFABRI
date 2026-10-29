
import {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  HeightRule,
  WidthType,
  TableLayoutType,
  VerticalAlign,
  AlignmentType,
} from 'docx';

import type { PegadaianLabel } from '../types/pegadaian';

import {
  renderPegadaianLabel,
  LABEL_W,
  LABEL_H,
  PAPER_W,
  PAPER_H,
  START_X,
  START_Y,
  GAP_X,
  GAP_Y,
  ROWS,
  PER_PAGE,
} from './pegadaianCanvas';

// ==========================================
// KONVERSI UKURAN
// ==========================================

const toTwips = (mm: number): number =>
  Math.round((mm * 1440) / 25.4);

const toPixels = (mm: number): number =>
  Math.round((mm * 96) / 25.4);

// ==========================================
// PENGATURAN LABEL
// ==========================================

// Ukuran gambar label.
// Tidak diubah agar desain tetap sama.
const IMAGE_W = 62;
const IMAGE_H = 31;

// ==========================================
// KALIBRASI CETAK WORD
// ==========================================

// Baris pertama sudah sesuai, jadi START_Y
// tetap mengikuti pegadaianCanvas.ts.
//
// Masalah: baris 2, 3, dan 4 semakin naik.
//
// Tambahkan jarak antarbaris sebesar 0.5 mm.
// Ini merupakan nilai awal kalibrasi.
//
// Jika masih naik, coba 0.7 atau 1.0.
// Jika terlalu turun, coba 0.3 atau 0.2.

const ROW_OFFSET_MM = 0.5;

// Jarak antarbaris setelah kalibrasi.
const CALIBRATED_GAP_Y = GAP_Y + ROW_OFFSET_MM;

// ==========================================
// BORDER
// ==========================================

const noBorders = {
  top: {
    style: BorderStyle.NONE,
  },
  bottom: {
    style: BorderStyle.NONE,
  },
  left: {
    style: BorderStyle.NONE,
  },
  right: {
    style: BorderStyle.NONE,
  },
};

// ==========================================
// KONVERSI PNG KE BYTES
// ==========================================

function dataUrlToBytes(
  dataUrl: string
): Uint8Array {
  const base64 = dataUrl.split(',')[1];

  if (!base64) {
    throw new Error('Data gambar tidak valid.');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

// ==========================================
// MEMBUAT CELL
// ==========================================

function makeCell(
  widthMm: number,
  imageData?: Uint8Array
): TableCell {
  const paragraph = imageData
    ? new Paragraph({
        alignment: AlignmentType.CENTER,

        spacing: {
          before: 0,
          after: 0,
          line: 240,
        },

        children: [
          new ImageRun({
            type: 'png',
            data: imageData,

            transformation: {
              width: toPixels(IMAGE_W),
              height: toPixels(IMAGE_H),
            },
          }),
        ],
      })
    : new Paragraph({
        spacing: {
          before: 0,
          after: 0,
          line: 1,
        },

        children: [],
      });

  return new TableCell({
    width: {
      size: toTwips(widthMm),
      type: WidthType.DXA,
    },

    borders: noBorders,

    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },

    verticalAlign: VerticalAlign.CENTER,

    children: [paragraph],
  });
}

// ==========================================
// MEMBUAT BARIS LABEL
// ==========================================

function createLabelRow(
  row: number,
  images: Array<Uint8Array | undefined>
): TableRow {
  const cells: TableCell[] = [];

  for (let col = 0; col < 3; col++) {
    // Urutan pengisian vertikal per kolom.
    const index = col * ROWS + row;

    cells.push(
      makeCell(LABEL_W, images[index])
    );

    if (col < 2) {
      cells.push(
        makeCell(GAP_X)
      );
    }
  }

  return new TableRow({
    cantSplit: true,

    height: {
      value: toTwips(LABEL_H),
      rule: HeightRule.EXACT,
    },

    children: cells,
  });
}

// ==========================================
// MEMBUAT BARIS JARAK
// ==========================================

function createSpacingRow(): TableRow {
  return new TableRow({
    cantSplit: true,

    height: {
      value: toTwips(CALIBRATED_GAP_Y),
      rule: HeightRule.EXACT,
    },

    children: [
      makeCell(LABEL_W),
      makeCell(GAP_X),
      makeCell(LABEL_W),
      makeCell(GAP_X),
      makeCell(LABEL_W),
    ],
  });
}

// ==========================================
// MEMBUAT TABEL 3 KOLOM × 4 BARIS
// ==========================================

function createTable(
  images: Array<Uint8Array | undefined>
): Table {
  const rows: TableRow[] = [];

  for (let row = 0; row < ROWS; row++) {
    // Baris label.
    rows.push(
      createLabelRow(row, images)
    );

    // Tambahkan jarak hanya setelah baris label.
    // Tidak menambah jarak sebelum baris pertama.
    if (row < ROWS - 1) {
      rows.push(
        createSpacingRow()
      );
    }
  }

  return new Table({
    layout: TableLayoutType.FIXED,

    width: {
      size: toTwips(
        LABEL_W * 3 + GAP_X * 2
      ),
      type: WidthType.DXA,
    },

    columnWidths: [
      toTwips(LABEL_W),
      toTwips(GAP_X),
      toTwips(LABEL_W),
      toTwips(GAP_X),
      toTwips(LABEL_W),
    ],

    borders: noBorders,

    rows,
  });
}

// ==========================================
// GENERATE WORD
// ==========================================

export async function generatePegadaianWord(
  items: PegadaianLabel[]
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error(
      'Tambahkan data Unit Pegadaian terlebih dahulu.'
    );
  }

  const sections = [];

  for (
    let start = 0;
    start < items.length;
    start += PER_PAGE
  ) {
    const pageItems = items.slice(
      start,
      start + PER_PAGE
    );

    const images: Array<
      Uint8Array | undefined
    > = [];

    // Render seluruh label menjadi PNG.
    for (const item of pageItems) {
      const dataUrl =
        await renderPegadaianLabel(item);

      images.push(
        dataUrlToBytes(dataUrl)
      );
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: toTwips(PAPER_W),
            height: toTwips(PAPER_H),
          },

          margin: {
            // Posisi baris pertama tetap.
            top: toTwips(START_Y),

            bottom: toTwips(4),

            left: toTwips(START_X),

            right: toTwips(4),

            header: 0,
            footer: 0,
          },
        },
      },

      children: [
        createTable(images),
      ],
    });
  }

  const document = new Document({
    sections,
  });

  return Packer.toBlob(document);
}
