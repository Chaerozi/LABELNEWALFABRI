
import { jsPDF } from 'jspdf';
import type { Store } from '../types/store';

interface Label {
  title: string;
  storeCode: string;
  number: string;
}

const SITE_NUMBER = '081113017039';

// Ukuran kertas (mm)
const PAGE_WIDTH = 205;
const PAGE_HEIGHT = 165;

// Ukuran label (mm)
const LABEL_WIDTH = 64;
const LABEL_HEIGHT = 32;

// Susunan: 3 kolom x 4 baris
const COLS = 3;
const ROWS = 4;

// Posisi awal label
const START_X = 2;
const START_Y = 7;

// Jarak antarlabel
const GAP_X = 4.5;
const GAP_Y = 6;

// Kalibrasi posisi cetak (mm)
const OFFSET_X = 0;
const OFFSET_Y = 0;

// Pengaturan logo
const LOGO_AREA_WIDTH = 24;
const MAX_LOGO_WIDTH = 24;

const MAX_LOGO_HEIGHT = 32;

// Pengaturan teks
const TEXT_OFFSET_X = 23;
const FONT_SIZE = 12;
const LINE_HEIGHT = 5.5;

function createStoreLabels(store: Store): Label[] {
  return [
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
  ];
}

// Membaca logo Telkomsel
async function loadLogo(): Promise<string> {
  const response = await fetch('/Telkomsel.png');

  if (!response.ok) {
    throw new Error(
      'Logo Telkomsel.png tidak ditemukan di folder public.'
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

// Menghitung ukuran logo tanpa merusak proporsi
function getLogoSize(pdf: jsPDF, logo: string) {
  const properties = pdf.getImageProperties(logo);

  const scale = Math.min(
    MAX_LOGO_WIDTH / properties.width,
    MAX_LOGO_HEIGHT / properties.height
  );

  return {
    width: properties.width * scale,
    height: properties.height * scale,
  };
}

// Menggambar satu label
function drawLabel(
  pdf: jsPDF,
  logo: string,
  label: Label,
  x: number,
  y: number,
  logoSize: { width: number; height: number }
) {
  // Posisi logo di tengah area kiri
  const logoX =
    x + (LOGO_AREA_WIDTH - logoSize.width) / 2;

  const logoY =
    y + (LABEL_HEIGHT - logoSize.height) / 2;

  pdf.addImage(
    logo,
    'PNG',
    logoX,
    logoY,
    logoSize.width,
    logoSize.height
  );

  // Posisi teks
  const textX = x + TEXT_OFFSET_X;

  // Tinggi keseluruhan empat baris teks
  const textBlockHeight = LINE_HEIGHT * 3;

  // Posisi awal teks agar berada di tengah label
  const firstBaseline =
    y + LABEL_HEIGHT / 2 - textBlockHeight / 2 + 1.5;

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(FONT_SIZE);

  // Baris 1: SITE / Modem
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    label.title,
    textX,
    firstBaseline
  );

  // Baris 2: Store
  pdf.setFont('helvetica', 'bold');
  pdf.text(
    `STORE- ${label.storeCode}`,
    textX,
    firstBaseline + LINE_HEIGHT
  );

  // Baris 3: SD-WAN
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    'SD-WAN - Alfamart',
    textX,
    firstBaseline + LINE_HEIGHT * 2
  );

  // Baris 4: Nomor
  const numberText = `No: ${label.number}`;

  // Perkecil font jika nomor terlalu panjang
  const availableWidth =
    LABEL_WIDTH - TEXT_OFFSET_X - 1;

let numberFontSize = FONT_SIZE;

pdf.setFontSize(numberFontSize);

while (
  pdf.getTextWidth(numberText) > availableWidth &&
  numberFontSize > 9
) {
  numberFontSize -= 0.5;
  pdf.setFontSize(numberFontSize);
}

pdf.text(
  numberText,
  textX,
  firstBaseline + LINE_HEIGHT * 3
);
}

// Generate PDF
export async function generateLabelsPDF(
  stores: Store[]
): Promise<Blob> {
  if (stores.length === 0) {
    throw new Error('Belum ada data store.');
  }

  const logo = await loadLogo();

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    compress: true,
  });

  const logoSize = getLogoSize(pdf, logo);

  stores.forEach((store, storeIndex) => {
    // Tambah halaman setiap 3 store
    if (
      storeIndex > 0 &&
      storeIndex % COLS === 0
    ) {
      pdf.addPage(
        [PAGE_WIDTH, PAGE_HEIGHT],
        'landscape'
      );
    }

    // Kolom store: 0, 1, 2
    const col = storeIndex % COLS;

    // Empat label per store
    const labels = createStoreLabels(store);

    labels.forEach((label, row) => {
      if (row >= ROWS) return;

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
        label,
        x,
        y,
        logoSize
      );
    });
  });

  // PDF untuk preview, download, dan print
  return pdf.output('blob');
}
