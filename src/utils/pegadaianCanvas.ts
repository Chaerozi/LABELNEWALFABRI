
import type { PegadaianLabel } from '../types/pegadaian';

// ==========================================
// KONFIGURASI STIKER TOM & JERRY NO. 103
// ==========================================

export const LABEL_W = 64;
export const LABEL_H = 32;

export const PAPER_W = 205;
export const PAPER_H = 165;

export const START_X = 2;
export const START_Y = 7;

export const GAP_X = 4.5;
export const GAP_Y = 6;

export const ROWS = 4;
export const PER_PAGE = 12;

const SCALE = 16;

const BATCH = 'Batch-2';
const NMS_1 = '02131928273';
const NMS_2 = '0213919297';

// ==========================================
// ASSET LOADER
// ==========================================

const assetCache = new Map<
  string,
  Promise<HTMLImageElement>
>();

function loadAsset(
  path: string
): Promise<HTMLImageElement> {
  const cached = assetCache.get(path);

  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        if (
          image.naturalWidth <= 0 ||
          image.naturalHeight <= 0
        ) {
          assetCache.delete(path);
          reject(
            new Error(`Ukuran asset tidak valid: ${path}`)
          );
          return;
        }

        resolve(image);
      };

      image.onerror = () => {
        assetCache.delete(path);
        reject(
          new Error(`Gagal memuat asset: ${path}`)
        );
      };

      image.src = path;
    }
  );

  assetCache.set(path, promise);

  return promise;
}

// ==========================================
// DRAW IMAGE PROPORSIONAL
// ==========================================

function drawContained(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const imageRatio =
    image.naturalWidth / image.naturalHeight;

  const boxRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

// ==========================================
// POTONG RUANG KOSONG LOGO OTOMATIS
// ==========================================

function cropTransparentLogo(
  image: HTMLImageElement
): HTMLCanvasElement {
  const source = document.createElement('canvas');

  // Resolusi cukup tinggi untuk membaca batas logo.
  const maxDimension = 1800;
  const ratio = Math.min(
    1,
    maxDimension /
      Math.max(image.naturalWidth, image.naturalHeight)
  );

  source.width = Math.max(
    1,
    Math.round(image.naturalWidth * ratio)
  );

  source.height = Math.max(
    1,
    Math.round(image.naturalHeight * ratio)
  );

  const sourceCtx = source.getContext('2d', {
    willReadFrequently: true,
  });

  if (!sourceCtx) {
    throw new Error('Gagal memproses logo Pegadaian.');
  }

  sourceCtx.clearRect(
    0,
    0,
    source.width,
    source.height
  );

  sourceCtx.drawImage(
    image,
    0,
    0,
    source.width,
    source.height
  );

  const imageData = sourceCtx.getImageData(
    0,
    0,
    source.width,
    source.height
  );

  const pixels = imageData.data;

  let minX = source.width;
  let minY = source.height;
  let maxX = -1;
  let maxY = -1;

  // Deteksi pixel tidak transparan.
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const index = (y * source.width + x) * 4;
      const alpha = pixels[index + 3];

      if (alpha > 15) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Jika tidak ada pixel terdeteksi,
  // gunakan gambar asli.
  if (maxX < minX || maxY < minY) {
    return source;
  }

  const padding = 3;

  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(
    source.width,
    maxX + padding + 1
  );
  const bottom = Math.min(
    source.height,
    maxY + padding + 1
  );

  const cropped = document.createElement('canvas');

  cropped.width = right - left;
  cropped.height = bottom - top;

  const croppedCtx = cropped.getContext('2d');

  if (!croppedCtx) {
    throw new Error('Gagal memotong logo Pegadaian.');
  }

  croppedCtx.drawImage(
    source,
    left,
    top,
    cropped.width,
    cropped.height,
    0,
    0,
    cropped.width,
    cropped.height
  );

  return cropped;
}

// ==========================================
// AUTO FIT FONT
// ==========================================

function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  weight = 700
): number {
  let fontSize = preferredSize;

  while (fontSize > minSize) {
    ctx.font =
      `${weight} ${fontSize}px Arial, sans-serif`;

    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }

    fontSize -= 0.1;
  }

  return Math.max(fontSize, minSize);
}

// ==========================================
// DRAW TEXT
// ==========================================

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  preferredSize = 2.45,
  minSize = 1.55
): void {
  const fontSize = fitFont(
    ctx,
    text,
    maxWidth,
    preferredSize,
    minSize
  );

  ctx.fillStyle = '#111111';
  ctx.textAlign = 'left';
  ctx.font =
    `700 ${fontSize}px Arial, sans-serif`;

  ctx.fillText(
    text,
    x,
    y,
    maxWidth
  );
}

// ==========================================
// RENDER LABEL PEGADAIAN
// ==========================================

export async function renderPegadaianLabel(
  item: PegadaianLabel
): Promise<string> {
  const [logo, qr] = await Promise.all([
    loadAsset('/Pegadaian.svg'),
    loadAsset('/QR_Pegadaian.svg'),
  ]);

  const canvas = document.createElement('canvas');

  canvas.width = LABEL_W * SCALE;
  canvas.height = LABEL_H * SCALE;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error(
      'Gagal membuat canvas label Pegadaian.'
    );
  }

  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textBaseline = 'alphabetic';

  // ========================================
  // 1. LOGO PEGADAIAN
  // ========================================

  const croppedLogo = cropTransparentLogo(logo);

  // Posisi kiri atas, sesuai referensi.
  // Logo diperbesar tanpa mengubah rasio.
  const logoX = 3;
  const logoY = 0.7;
  const logoW = 34;
  const logoH = 6;

  const logoRatio =
    croppedLogo.width / croppedLogo.height;

  let drawLogoW = logoW;
  let drawLogoH = logoH;

  if (logoRatio > logoW / logoH) {
    drawLogoH = logoW / logoRatio;
  } else {
    drawLogoW = logoH * logoRatio;
  }

  ctx.drawImage(
    croppedLogo,
    logoX,
    logoY + (logoH - drawLogoH) / 2,
    drawLogoW,
    drawLogoH
  );

  // ========================================
  // 2. BATCH
  // ========================================

  ctx.fillStyle = '#111111';
  ctx.font = '700 2.5px Arial, sans-serif';
  ctx.textAlign = 'center';

  ctx.fillText(
    BATCH,
    53.5,
    8.3
  );

  // ========================================
  // 3. INFORMASI UTAMA
  // ========================================

  const fields: Array<{
    label: string;
    value: string;
  }> = [
    { label: 'KANWIL', value: item.kanwil },
    { label: 'UNIT', value: item.unit },
    { label: 'IP LAN', value: item.ipLan },
    { label: 'No SIMCARD', value: item.noSimcard },
    { label: 'WA NMS', value: NMS_1 },
  ];

  const labelX = 3;
  const colonX = 20.5;
  const valueX = 22.3;

  const firstY = 9.2;
  const lineGap = 3.25;
  const valueMaxWidth = 21.4;

  fields.forEach((field, index) => {
    const y = firstY + index * lineGap;

    drawText(
      ctx,
      field.label,
      labelX,
      y,
      17,
      2.45,
      2.1
    );

    drawText(
      ctx,
      ':',
      colonX,
      y,
      1.2,
      2.45,
      2.45
    );

    drawText(
      ctx,
      String(field.value ?? ''),
      valueX,
      y,
      valueMaxWidth,
      2.45,
      1.55
    );
  });

  // ========================================
  // 4. WA NMS KEDUA
  // ========================================

  drawText(
    ctx,
    NMS_2,
    valueX,
    firstY + 5 * lineGap,
    valueMaxWidth,
    2.45,
    2.1
  );

  // ========================================
  // 5. QR CODE
  // ========================================

  const qrX = 45.4;
  const qrY = 10.2;
  const qrSize = 16.8;

  ctx.fillStyle = '#ffffff';

  ctx.fillRect(
    qrX - 0.4,
    qrY - 0.4,
    qrSize + 0.8,
    qrSize + 0.8
  );

  ctx.imageSmoothingEnabled = false;

  drawContained(
    ctx,
    qr,
    qrX,
    qrY,
    qrSize,
    qrSize
  );

  ctx.imageSmoothingEnabled = true;

  // ========================================
  // 6. KETERANGAN BAWAH
  // ========================================

  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.font =
    'italic 1.7px Arial, sans-serif';

  ctx.fillText(
    'jika mengalami kendala koneksi jaringan dapat',
    LABEL_W / 2,
    28.9,
    59
  );

  ctx.fillText(
    'hubungi kontak nomor wa nms / scan barcode diatas',
    LABEL_W / 2,
    30.8,
    59
  );

  // ========================================
  // 7. RETURN PNG
  // ========================================

  return canvas.toDataURL('image/png');
}
