import { useState, type FormEvent } from 'react';
import type { Store } from '../types/store';

interface Props {
  onAdd: (store: Store) => void;
}

export default function StoreForm({ onAdd }: Props) {
  const [storeCode, setStoreCode] = useState('');
  const [primaryNumber, setPrimaryNumber] = useState('');
  const [backupNumber, setBackupNumber] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!storeCode.trim() || !primaryNumber.trim() || !backupNumber.trim()) {
      return;
    }

    onAdd({
      id: crypto.randomUUID(),
      storeCode: storeCode.trim().toUpperCase(),
      primaryNumber: primaryNumber.trim(),
      backupNumber: backupNumber.trim(),
    });

    setStoreCode('');
    setPrimaryNumber('');
    setBackupNumber('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">
        Input Data Store
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">
            Kode Store
          </span>
          <input
            type="text"
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            placeholder="Contoh: J843"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">
            Nomor Primary
          </span>
          <input
            type="text"
            value={primaryNumber}
            onChange={(e) => setPrimaryNumber(e.target.value)}
            placeholder="Nomor Primary"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-gray-700">
            Nomor Backup
          </span>
          <input
            type="text"
            value={backupNumber}
            onChange={(e) => setBackupNumber(e.target.value)}
            placeholder="Nomor Backup"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-red-500"
          />
        </label>
      </div>

      <button
        type="submit"
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Tambah Store
      </button>
    </form>
  );
}