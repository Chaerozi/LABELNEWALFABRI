
import { useState } from 'react';
import {
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface AlfamartPasteRow {
  store: string;
  modemPrimary: string;
  modemBackup: string;
}

interface Props {
  onImport: (rows: AlfamartPasteRow[]) => void;
  disabled?: boolean;
}

// ==========================================
// PARSE CSV / EXCEL / GOOGLE SHEETS
// ==========================================

function splitRow(
  line: string,
  delimiter: string
): string[] {
  const result: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      result.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  result.push(value.trim());

  return result;
}

function parseAlfamartData(
  text: string
): AlfamartPasteRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (!lines.length) {
    throw new Error('Paste data terlebih dahulu.');
  }

  // Deteksi pemisah otomatis
  const firstLine = lines[0];

  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';')
      ? ';'
      : ',';

  const rows = lines.map((line) =>
    splitRow(line, delimiter)
  );

  // Normalisasi nama kolom
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[\s_-]/g, '');

  const header = rows[0].map(normalize);

  // Header bersifat opsional
  const hasHeader =
    header.includes('store') &&
    header.includes('modemprimary') &&
    header.includes('modembackup');

  const getIndex = (
    field: string,
    fallback: number
  ) =>
    hasHeader
      ? header.indexOf(field)
      : fallback;

  const storeIndex = getIndex('store', 0);
  const primaryIndex = getIndex('modemprimary', 1);
  const backupIndex = getIndex('modembackup', 2);

  const dataRows = hasHeader
    ? rows.slice(1)
    : rows;

  if (!dataRows.length) {
    throw new Error(
      'Tidak ada data Store untuk diimpor.'
    );
  }

  return dataRows.map((row, index) => {
    const store =
      row[storeIndex]?.trim() ?? '';

    const modemPrimary =
      row[primaryIndex]?.trim() ?? '';

    const modemBackup =
      row[backupIndex]?.trim() ?? '';

    const lineNumber =
      index + (hasHeader ? 2 : 1);

    if (
      !store ||
      !modemPrimary ||
      !modemBackup
    ) {
      throw new Error(
        `Data baris ${lineNumber} belum lengkap. ` +
        'Pastikan Store, Modem Primary, dan Modem Backup terisi.'
      );
    }

    return {
      store,
      modemPrimary,
      modemBackup,
    };
  });
}

// ==========================================
// COMPONENT
// ==========================================

export default function AlfamartPaste({
  onImport,
  disabled = false,
}: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = () => {
    if (disabled) return;

    setError('');
    setSuccess('');

    try {
      const rows = parseAlfamartData(text);

      onImport(rows);

      setText('');

      setSuccess(
        `${rows.length} Store Alfamart berhasil diimpor.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca data Alfamart.'
      );
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* HEADER */}

      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste
            size={18}
            className="text-orange-600"
          />

          <h3 className="text-sm font-semibold">
            Paste Data Alfamart
          </h3>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Copy data Store dari Excel, Google Sheets,
          atau CSV, lalu paste di bawah.
        </p>
      </div>

      {/* CONTENT */}

      <div className="space-y-3 p-5">
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
            setSuccess('');
          }}
          rows={7}
          disabled={disabled}
          spellCheck={false}
          placeholder={
            'Store;Modem Primary;Modem Backup\n' +
            'R924;85140161120;8962119757138962192\n' +
            '2SB5;85140161121;8962119757138962200\n' +
            'PC61;85140161105;8962119757138962218'
          }
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Kolom: Store · Modem Primary · Modem Backup
          </p>

          <button
            type="button"
            onClick={handleImport}
            disabled={!text.trim() || disabled}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClipboardPaste size={16} />
            Import Data
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{success}</span>
          </div>
        )}
      </div>
    </section>
  );
}
