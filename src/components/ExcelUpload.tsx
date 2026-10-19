import { useState, type ChangeEvent } from 'react';
import type { Store } from '../types/store';
import { importStores } from '../utils/excel';

interface Props {
  onImport: (stores: Store[]) => void;
}

export default function ExcelUpload({ onImport }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setError('');

    try {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('File harus berformat .xlsx');
      }

      const stores = await importStores(file);
      onImport(stores);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca file Excel'
      );
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-gray-900">
        Import Data Excel
      </h2>

      <label
        className={`flex items-center justify-center rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 ${
          loading
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        {loading ? 'Memproses file...' : 'Pilih File Excel (.xlsx)'}

        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          disabled={loading}
          className="hidden"
        />
      </label>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}