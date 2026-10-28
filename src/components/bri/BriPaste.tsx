
import { useState } from 'react';
import {
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import type { BriLabel } from '../../types/bri';

interface Props {
  onImport: (items: BriLabel[]) => void;
  disabled?: boolean;
}

function splitDelimitedRow(
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

function parseBriPaste(text: string): BriLabel[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (!lines.length) {
    throw new Error('Paste data terlebih dahulu.');
  }

  const firstLine = lines[0];

  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';')
      ? ';'
      : ',';

  const rows = lines.map((line) =>
    splitDelimitedRow(line, delimiter)
  );

  const normalize = (value: string) =>
    value.toLowerCase().replace(/[\s_-]/g, '');

  const header = rows[0].map(normalize);

  const hasHeader =
    header.includes('services') &&
    header.includes('site') &&
    (header.includes('noiot') ||
      header.includes('nomoriot'));

  const servicesIndex = hasHeader
    ? header.indexOf('services')
    : 0;

  const siteIndex = hasHeader
    ? header.indexOf('site')
    : 1;

  const noIotIndex = hasHeader
    ? header.findIndex((value) =>
        ['noiot', 'nomoriot'].includes(value)
      )
    : 2;

  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (!dataRows.length) {
    throw new Error('Tidak ada data Site BRI.');
  }

  return dataRows.map((row, index) => {
    const services = row[servicesIndex]?.trim() ?? '';
    const site = row[siteIndex]?.trim() ?? '';
    const noIot = row[noIotIndex]?.trim() ?? '';

    if (!services || !site || !noIot) {
      throw new Error(
        `Data baris ${index + (hasHeader ? 2 : 1)} belum lengkap.`
      );
    }

    return {
      id: crypto.randomUUID(),
      services,
      site,
      noIot,
    };
  });
}

export default function BriPaste({
  onImport,
  disabled = false,
}: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = () => {
    setError('');
    setSuccess('');

    try {
      const result = parseBriPaste(text);

      onImport(result);

      setText('');
      setSuccess(
        `${result.length} Site BRI berhasil diimpor.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal membaca data BRI.'
      );
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ClipboardPaste
            size={18}
            className="text-[#d9232e]"
          />

          <h3 className="text-sm font-semibold">
            Paste Data BRI
          </h3>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Copy kolom Services, Site, dan No IoT dari
          Excel atau Google Sheets.
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
          disabled={disabled}
          spellCheck={false}
          placeholder={
            'Services\tSite\tNo IoT\n' +
            'SD-WAN\tBRI UNIT 001\t081234567890\n' +
            'SD-WAN\tBRI UNIT 002\t081234567891'
          }
          className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 outline-none focus:border-[#d9232e] focus:ring-2 focus:ring-red-100 disabled:opacity-50"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Mendukung data dengan atau tanpa header.
          </p>

          <button
            type="button"
            onClick={handleImport}
            disabled={!text.trim() || disabled}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d9232e] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#bd1e28] disabled:opacity-40"
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
