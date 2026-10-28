
import { useState } from 'react';
import {
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SpreadsheetPasteProps<T> {
  title: string;
  columns: string[];
  onImport: (rows: T[]) => void;
  mapRow: (values: string[], index: number) => T;
}

function splitRow(row: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      if (quoted && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export default function SpreadsheetPaste<T>({
  title,
  columns,
  onImport,
  mapRow,
}: SpreadsheetPasteProps<T>) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = () => {
    setError('');
    setSuccess('');

    try {
      const lines = text
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter((line) => line.trim());

      if (!lines.length) {
        throw new Error('Paste data terlebih dahulu.');
      }

      const delimiter = lines[0].includes('\t')
        ? '\t'
        : lines[0].includes(';')
          ? ';'
          : ',';

      const rows = lines.map((line) =>
        splitRow(line, delimiter)
      );

      const normalize = (value: string) =>
        value.toLowerCase().replace(/[\s_-]/g, '');

      const expected = columns.map(normalize);
      const first = rows[0].map(normalize);

      const hasHeader = expected.every((name) =>
        first.includes(name)
      );

      const dataRows = hasHeader ? rows.slice(1) : rows;

      if (!dataRows.length) {
        throw new Error('Tidak ada data untuk diimpor.');
      }

      const result = dataRows.map((row, index) => {
        const values = hasHeader
          ? expected.map((name) => {
              const columnIndex = first.indexOf(name);
              return row[columnIndex] ?? '';
            })
          : row;

        if (values.length < columns.length) {
          throw new Error(
            `Baris ${index + (hasHeader ? 2 : 1)} memiliki kolom yang kurang.`
          );
        }

        return mapRow(values, index);
      });

      onImport(result);
      setText('');
      setSuccess(`${result.length} data berhasil diimpor.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal import data.'
      );
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste size={18} className="text-emerald-700" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Copy data dari Excel atau Google Sheets, lalu paste di sini.
        </p>
      </div>

      <div className="space-y-3 p-5">
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
            setSuccess('');
          }}
          rows={6}
          spellCheck={false}
          placeholder={columns.join('\t')}
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Kolom: {columns.join(' · ')}
          </p>

          <button
            type="button"
            disabled={!text.trim()}
            onClick={handleImport}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
          >
            <ClipboardPaste size={16} />
            Import Data
          </button>
        </div>

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </p>
        )}

        {success && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={16} />
            {success}
          </p>
        )}
      </div>
    </section>
  );
}
