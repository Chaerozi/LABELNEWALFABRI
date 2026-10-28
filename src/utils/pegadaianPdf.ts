
import { jsPDF } from 'jspdf';

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
// GENERATE PDF PEGADAIAN
// TOM & JERRY NO. 103
// ==========================================

export async function generatePegadaianPDF(
  items: PegadaianLabel[]
): Promise<Blob> {
  if (items.length === 0) {
    throw new Error(
      'Tambahkan data Unit Pegadaian terlebih dahulu.'
    );
  }

  // ========================================
  // KONFIGURASI KERTAS
  // ========================================

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAPER_W, PAPER_H],
    compress: true,
    precision: 12,
  });

  // ========================================
  // GENERATE SETIAP LABEL
  // ========================================

  for (
    let index = 0;
    index < items.length;
    index++
  ) {
    // Membuat halaman baru setiap 12 label
    if (
      index > 0 &&
      index % PER_PAGE === 0
    ) {
      pdf.addPage(
        [PAPER_W, PAPER_H],
        'landscape'
      );
    }

    const item = items[index];

    // Posisi label pada halaman
    const position = index % PER_PAGE;

    // Pengisian dari atas ke bawah
    // kemudian berpindah ke kolom berikutnya
    const col = Math.floor(position / ROWS);
    const row = position % ROWS;

    // ======================================
    // KOORDINAT LABEL
    // ======================================

    const x =
      START_X +
      col * (LABEL_W + GAP_X);

    const y =
      START_Y +
      row * (LABEL_H + GAP_Y);

    // ======================================
    // RENDER GAMBAR LABEL
    // ======================================

    // Mengambil desain label dari Canvas.
    // Renderer ini juga digunakan Word.
    const imageData =
      await renderPegadaianLabel(item);

    // ======================================
    // MEMASUKKAN GAMBAR KE PDF
    // ======================================

    // Gunakan parameter langsung agar
    // kompatibel dengan jsPDF dan TypeScript.
    pdf.addImage(
      imageData,
      'PNG',
      x,
      y,
      LABEL_W,
      LABEL_H,
      undefined,
      'FAST'
    );
  }

  // ========================================
  // RETURN PDF
  // ========================================

  return pdf.output('blob');
}
