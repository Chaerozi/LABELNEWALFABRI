import ExcelJS from 'exceljs';
import type { Store } from '../types/store';

function getCellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    if ('text' in value) return String(value.text ?? '');
    if ('result' in value) return String(value.result ?? '');
    if ('richText' in value) {
      return value.richText.map((item) => item.text).join('');
    }
    return '';
  }

  return String(value);
}

export async function importStores(file: File): Promise<Store[]> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();

  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Sheet Excel tidak ditemukan.');
  }

  const stores: Store[] = [];

  worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
    if (rowNumber === 1) return;

    const storeCode = getCellValue(row.getCell(1).value).trim();
    const primaryNumber = getCellValue(row.getCell(2).value).trim();
    const backupNumber = getCellValue(row.getCell(3).value).trim();

    if (!storeCode && !primaryNumber && !backupNumber) return;

    if (!storeCode || !primaryNumber || !backupNumber) {
      throw new Error(`Data tidak lengkap pada baris ${rowNumber}`);
    }

    stores.push({
      id: crypto.randomUUID(),
      storeCode: storeCode.toUpperCase(),
      primaryNumber,
      backupNumber,
    });
  });

  if (stores.length === 0) {
    throw new Error('Tidak ada data store yang ditemukan.');
  }

  return stores;
}