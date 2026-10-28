
export async function svgToPng(
  path: string,
  width = 800,
  height = 400
): Promise<string> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Asset tidak ditemukan: ${path}`);
  }

  const svg = await response.text();
  const blob = new Blob([svg], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(
        new Error(`Gagal membaca SVG: ${path}`)
      );
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas tidak tersedia.');
    }

    // Latar putih memastikan QR Code mudah dipindai.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const ratio = Math.min(
      width / image.width,
      height / image.height
    );

    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;

    ctx.drawImage(
      image,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function dataUrlToUint8Array(
  dataUrl: string
): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
