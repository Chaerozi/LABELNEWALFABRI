
import { useRef, useState, type ChangeEvent } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';

interface BriCsvRow {
  services: string;
  site: string;
  noIot: string;
}

interface Props {
  onImport: (rows: BriCsvRow[]) => void;
  disabled?: boolean;
}

function splitCsvLine(
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

function parseCsv(text: string): BriCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    throw new Error('File CSV kosong.');
  }

  const firstLine = lines[0];

  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';')
      ? ';'
      : ',';

  const rows = lines.map((line) =>
    splitCsvLine(line, delimiter)
  );

  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[\s_-]/g, '');

  const header = rows[0].map(normalize);

  const hasHeader =
    header.includes('services') &&
    header.includes('site') &&
    header.includes('noiot');

  const servicesIndex = hasHeader
    ? header.indexOf('services')
    : 0;

  const siteIndex = hasHeader
    ? header.indexOf('site')
    : 1;

  const noIotIndex = hasHeader
    ? header.indexOf('noiot')
    : 2;

  const dataRows = hasHeader
    ? rows.slice(1)
    : rows;

  if (!dataRows.length) {
    throw new Error('Tidak ada data BRI dalam CSV.');
  }

  return dataRows.map((row, index) => {
    const services = row[servicesIndex]?.trim() ?? '';
    const site = row[siteIndex]?.trim() ?? '';
    const noIot = row[noIotIndex]?.trim() ?? '';

    if (!services || !site || !noIot) {
      const lineNumber = index + (hasHeader ? 2 : 1);

      throw new Error(
        `Data CSV baris ${lineNumber} belum lengkap.`
      );
    }

    return {
      services,
      site,
      noIot,
    };
  });
}

export default function BriCsvUpload({
  onImport,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isDisabled = disabled || loading;

  const handleFile = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file || isDisabled) return;

    setError('');
    setSuccess('');
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Gunakan file dengan format .csv.');
      event.target.value = '';
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      onImport(rows);

      setSuccess(
        `${rows.length} data BRI berhasil ditambahkan.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca file CSV.'
      );
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const reset = () => {
    setFileName('');
    setError('');
    setSuccess('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Upload CSV
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Import data BRI menggunakan file CSV.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={isDisabled}
          className="hidden"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <FileSpreadsheet
              size={18}
              className="shrink-0 text-slate-400"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700">
                {fileName || 'Belum ada file dipilih'}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                Format .csv
              </p>
            </div>

            {fileName && !loading && (
              <button
                type="button"
                onClick={reset}
                aria-label="Bersihkan file"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isDisabled}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}

            {loading ? 'Memproses...' : 'Pilih File'}
          </button>
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle size={15} />
            {error}
          </p>
        )}

        {success && (
          <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
            <CheckCircle2 size={15} />
            {success}
          </p>
        )}
      </div>
    </section>
  );
}
