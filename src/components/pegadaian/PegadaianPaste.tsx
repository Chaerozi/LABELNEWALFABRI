
import { useState } from 'react';
import {
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import type { PegadaianLabel } from '../../types/pegadaian';

interface Props {
  onImport: (items: PegadaianLabel[]) => void;
}

function parseRows(text: string): PegadaianLabel[] {
  const rows = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((row) => row.trim());

  if (!rows.length) {
    throw new Error('Paste data Google Sheets terlebih dahulu.');
  }

  // Google Sheets menggunakan TAB saat copy beberapa kolom.
  const delimiter = rows[0].includes('\t')
    ? '\t'
    : rows[0].includes(';')
      ? ';'
      : ',';

  const columns = rows.map((row) =>
    row.split(delimiter).map((cell) => cell.trim())
  );

  const normalize = (value: string) =>
    value.toLowerCase().replace(/[\s_-]/g, '');

  const firstRow = columns[0].map(normalize);

  const hasHeader =
    firstRow.includes('kanwil') &&
    firstRow.includes('unit');

  const indexOf = (aliases: string[], fallback: number) => {
    if (!hasHeader) return fallback;

    const index = firstRow.findIndex((name) =>
      aliases.includes(name)
    );

    if (index < 0) {
      throw new Error(
        `Kolom ${aliases[0]} tidak ditemukan.`
      );
    }

    return index;
  };

  const kanwilIndex = indexOf(['kanwil'], 0);
  const unitIndex = indexOf(['unit'], 1);
  const ipIndex = indexOf(['iplan'], 2);
  const simIndex = indexOf(
    ['nosimcard', 'simcard', 'nomorsimcard'],
    3
  );

  const dataRows = hasHeader ? columns.slice(1) : columns;

  if (!dataRows.length) {
    throw new Error('Belum ada baris data untuk diimpor.');
  }

  return dataRows.map((cells, index) => {
    const kanwil = cells[kanwilIndex]?.trim() ?? '';
    const unit = cells[unitIndex]?.trim() ?? '';
    const ipLan = cells[ipIndex]?.trim() ?? '';
    const noSimcard = cells[simIndex]?.trim() ?? '';

    if (!kanwil || !unit || !ipLan || !noSimcard) {
      throw new Error(
        `Baris ${index + (hasHeader ? 2 : 1)} tidak lengkap.`
      );
    }

    return {
      id: crypto.randomUUID(),
      kanwil,
      unit,
      ipLan,
      noSimcard,
    };
  });
}

export default function PegadaianPaste({
  onImport,
}: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    if (loading) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const items = parseRows(text);

      onImport(items);

      setMessage(
        `${items.length} data Pegadaian berhasil ditambahkan.`
      );

      setText('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca data.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste
            size={19}
            className="text-emerald-700"
          />
          <h3 className="text-sm font-semibold text-slate-900">
            Paste Data Google Sheets
          </h3>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Copy kolom KANWIL, UNIT, IP LAN, No SIMCARD,
          lalu paste di bawah.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
            setMessage('');
          }}
          rows={6}
          spellCheck={false}
          placeholder={
            'KANWIL\tUNIT\tIP LAN\tNo SIMCARD\n' +
            'JAKARTA\tUNIT 001\t10.31.87.1\t081234567890\n' +
            'BANDUNG\tUNIT 002\t10.31.87.2\t081234567891'
          }
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Mendukung data dengan atau tanpa header.
          </p>

          <button
            type="button"
            onClick={handleImport}
            disabled={!text.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ClipboardPaste size={16} />
            )}
            Import Data
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}
      </div>
    </section>
  );
}
