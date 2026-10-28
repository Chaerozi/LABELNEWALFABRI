
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardPaste,
  Download,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FileText,
  Layers3,
  Loader2,
  PencilLine,
  Printer,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';

import BriLogo from '../assets/BRI.png';
import BriForm from '../components/bri/BriForm';
import BriPaste from '../components/bri/BriPaste';
import BriCsvUpload from '../components/bri/BriCsvUpload';

import type { BriLabel } from '../types/bri';
import { generateBriPDF } from '../utils/briPdf';
import { generateBriWord } from '../utils/briWord';

interface BriLabelGeneratorProps {
  onBack: () => void;
}

interface BriCsvRow {
  services: string;
  site: string;
  noIot: string;
}

type InputMode = 'manual' | 'csv' | 'paste';
type PreviewType = 'pdf' | 'word' | null;

const inputModes = [
  { id: 'manual', label: 'Input Manual', icon: PencilLine },
  { id: 'csv', label: 'Upload CSV', icon: FileSpreadsheet },
  { id: 'paste', label: 'Copy-Paste', icon: ClipboardPaste },
] as const;

export default function BriLabelGenerator({
  onBack,
}: BriLabelGeneratorProps) {
  const [items, setItems] = useState<BriLabel[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // Popup konfirmasi hapus semua
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  // Preview
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordUrl, setWordUrl] = useState<string | null>(null);
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const [previewType, setPreviewType] = useState<PreviewType>(null);

  // Loading
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [previewingWord, setPreviewingWord] = useState(false);
  const [wordPreviewError, setWordPreviewError] = useState('');

  // References
  const pdfUrlRef = useRef<string | null>(null);
  const wordUrlRef = useRef<string | null>(null);
  const printUrlsRef = useRef<string[]>([]);
  const wordPreviewRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLElement>(null);

  const isLoading = loadingPdf || loadingWord || loadingPrint;

  // BRI: 2 label per Site
  const totalLabels = items.length * 2;
  const totalPages = Math.ceil(totalLabels / 12);

  // Pencarian
  const filteredItems = items.filter((item) => {
    const keyword = search.trim().toLowerCase();

    return (
      item.services.toLowerCase().includes(keyword) ||
      item.site.toLowerCase().includes(keyword) ||
      item.noIot.toLowerCase().includes(keyword)
    );
  });

  // Bersihkan PDF
  const clearPdf = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }

    setPdfUrl(null);
  };

  // Bersihkan Word
  const clearWord = () => {
    if (wordUrlRef.current) {
      URL.revokeObjectURL(wordUrlRef.current);
      wordUrlRef.current = null;
    }

    setWordUrl(null);
    setWordBlob(null);
    setWordPreviewError('');
    setPreviewingWord(false);
  };

  // Bersihkan seluruh hasil generate
  const clearGeneratedFiles = () => {
    clearPdf();
    clearWord();
    setPreviewType(null);
  };

  // Cleanup URL saat komponen ditutup
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }

      if (wordUrlRef.current) {
        URL.revokeObjectURL(wordUrlRef.current);
      }

      printUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Popup: Escape, fokus, dan scroll lock
  useEffect(() => {
    if (!showDeleteModal) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement as HTMLElement | null;

    document.body.style.overflow = 'hidden';
    cancelDeleteRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDeleteModal(false);
        return;
      }

      if (event.key === 'Tab') {
        const modal = document.getElementById('bri-delete-modal');

        const buttons = modal?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)'
        );

        if (!buttons?.length) return;

        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [showDeleteModal]);

  // Scroll otomatis ke preview
  useEffect(() => {
    if (!previewType) return;

    const timer = window.setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [previewType]);

  // Render preview Word
  useEffect(() => {
    if (
      previewType !== 'word' ||
      !wordBlob ||
      !wordPreviewRef.current
    ) {
      return;
    }

    let cancelled = false;
    const container = wordPreviewRef.current;

    container.innerHTML = '';
    setPreviewingWord(true);
    setWordPreviewError('');

    const renderWord = async () => {
      try {
        const buffer = await wordBlob.arrayBuffer();

        if (cancelled) return;

        await renderAsync(buffer, container, undefined, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Preview Word gagal:', error);
          setWordPreviewError(
            'Preview Word gagal ditampilkan. File Word tetap dapat diunduh.'
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewingWord(false);
        }
      }
    };

    void renderWord();

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [previewType, wordBlob]);

  // Tambah Site manual
  const addItem = (item: BriLabel) => {
    if (isLoading) return;

    clearGeneratedFiles();
    setItems((prev) => [...prev, item]);
    setNotice(`Site ${item.site} berhasil ditambahkan.`);
  };

  // Import Copy-Paste
  const importItems = (newItems: BriLabel[]) => {
    if (!newItems.length || isLoading) return;

    clearGeneratedFiles();
    setItems((prev) => [...prev, ...newItems]);
    setNotice(`${newItems.length} Site berhasil diimpor.`);
  };

  // Import CSV
  const importBriCsv = (rows: BriCsvRow[]) => {
    if (!rows.length || isLoading) return;

    const newItems: BriLabel[] = rows.map((row, index) => ({
      id: `${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,
      services: row.services,
      site: row.site,
      noIot: row.noIot,
    }));

    clearGeneratedFiles();
    setItems((prev) => [...prev, ...newItems]);
    setNotice(
      `${newItems.length} Site berhasil diimpor dari CSV.`
    );
  };

  // Hapus satu Site
  const removeItem = (id: string) => {
    if (isLoading) return;

    clearGeneratedFiles();
    setItems((prev) => prev.filter((item) => item.id !== id));
    setNotice('Site berhasil dihapus.');
  };

  // Buka popup Hapus Semua
  const openDeleteModal = () => {
    if (isLoading || !items.length) return;

    setShowDeleteModal(true);
  };

  // Konfirmasi Hapus Semua
  const clearAllItems = () => {
    if (isLoading || !items.length) return;

    clearGeneratedFiles();
    setItems([]);
    setSearch('');
    setNotice('Semua data Site BRI berhasil dihapus.');
    setShowDeleteModal(false);
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    if (!items.length || isLoading) return;

    setLoadingPdf(true);
    setNotice('');

    try {
      const blob = await generateBriPDF(items);

      if (!blob) {
        throw new Error('PDF BRI gagal dibuat.');
      }

      const url = URL.createObjectURL(blob);

      clearGeneratedFiles();
      pdfUrlRef.current = url;
      setPdfUrl(url);
      setPreviewType('pdf');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal membuat PDF BRI.'
      );
    } finally {
      setLoadingPdf(false);
    }
  };

  // Generate Word
  const handleGenerateWord = async () => {
    if (!items.length || isLoading) return;

    setLoadingWord(true);
    setNotice('');

    try {
      const blob = await generateBriWord(items);

      if (!blob) {
        throw new Error('Word BRI gagal dibuat.');
      }

      const url = URL.createObjectURL(blob);

      clearGeneratedFiles();
      wordUrlRef.current = url;
      setWordUrl(url);
      setWordBlob(blob);
      setPreviewType('word');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal membuat Word BRI.'
      );
    } finally {
      setLoadingWord(false);
    }
  };

  // Print Label BRI
  const handlePrintBri = async () => {
    if (!items.length || isLoading) return;

    const printTab = window.open('', '_blank');

    if (!printTab) {
      alert('Izinkan pop-up untuk membuka dokumen cetak.');
      return;
    }

    printTab.document.title = 'Print Label BRI';
    printTab.document.body.textContent =
      'Menyiapkan label BRI...';

    setLoadingPrint(true);

    try {
      let url = pdfUrlRef.current;

      if (!url) {
        const blob = await generateBriPDF(items);
        url = URL.createObjectURL(blob);
        printUrlsRef.current.push(url);
      }

      if (!printTab.closed) {
        printTab.location.replace(url);
      }
    } catch (error) {
      if (!printTab.closed) {
        printTab.close();
      }

      alert(
        error instanceof Error
          ? error.message
          : 'Gagal menyiapkan label BRI.'
      );
    } finally {
      setLoadingPrint(false);
    }
  };

  // Download Word
  const handleDownloadWord = () => {
    if (!wordUrl) return;

    const link = document.createElement('a');

    link.href = wordUrl;
    link.download = 'Label-BRI-Telkomsel.docx';

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Tutup preview
  const closePreview = () => {
    clearGeneratedFiles();
  };

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white px-2">
              <img
                src={BriLogo}
                alt="Logo BRI"
                className="max-h-9 w-full object-contain"
              />
            </div>

            <div className="min-w-0 border-l border-slate-200 pl-3">
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                BRI Label Generator
              </h1>

              <p className="mt-0.5 text-[11px] text-slate-500">
                SD-WAN Label Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={13} />
            Kembali
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        {/* TITLE */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Cetak Label BRI
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Kelola data Site BRI dan buat label siap cetak dalam
            format PDF atau Word.
          </p>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
              <Building2 size={14} />
              <span className="text-[11px] sm:text-xs">
                Total Site
              </span>
            </div>

            <p className="text-xl font-semibold tabular-nums sm:text-2xl">
              {items.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
              <Layers3 size={14} />
              <span className="text-[11px] sm:text-xs">
                Total Label
              </span>
            </div>

            <p className="text-xl font-semibold tabular-nums sm:text-2xl">
              {totalLabels}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
              <FileText size={14} />
              <span className="text-[11px] sm:text-xs">
                Lembar
              </span>
            </div>

            <p className="text-xl font-semibold tabular-nums sm:text-2xl">
              {totalPages}
            </p>
          </div>
        </div>

        {/* INPUT DATA */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold">
              Tambah Data Site
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Pilih metode input sesuai kebutuhan.
            </p>
          </div>

          <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
            <div
              role="tablist"
              aria-label="Metode input Site BRI"
              className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
            >
              {inputModes.map((mode) => {
                const Icon = mode.icon;
                const active = inputMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setInputMode(mode.id)}
                    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors sm:text-xs ${
                      active
                        ? 'bg-white text-[#00529c] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4">
            <div
              style={{
                display:
                  inputMode === 'manual' ? 'block' : 'none',
              }}
            >
              <BriForm onAdd={addItem} />
            </div>

            <div
              style={{
                display: inputMode === 'csv' ? 'block' : 'none',
              }}
            >
              <BriCsvUpload
                onImport={importBriCsv}
                disabled={isLoading}
              />
            </div>

            <div
              style={{
                display:
                  inputMode === 'paste' ? 'block' : 'none',
              }}
            >
              <BriPaste
                onImport={importItems}
                disabled={isLoading}
              />
            </div>
          </div>
        </section>

        {/* NOTIFIKASI */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={15}
                className="shrink-0 text-blue-700"
              />

              <span className="text-xs text-blue-800">
                {notice}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Tutup notifikasi"
              className="text-blue-700 hover:text-blue-900"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* DAFTAR SITE */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">
                Daftar Site
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {items.length} Site tersimpan untuk pembuatan label.
              </p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={isLoading}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={13} />
                Hapus Semua
              </button>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="relative max-w-sm">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Cari Services, Site, atau No IoT..."
                  aria-label="Cari Site BRI"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <Building2
                  size={21}
                  className="text-slate-400"
                />
              </div>

              <p className="mt-3 text-sm font-medium">
                Belum ada data Site
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tambahkan Site menggunakan metode input di atas.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-9 text-center">
              <p className="text-sm font-medium">
                Site tidak ditemukan
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Coba gunakan kata kunci lain.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">
                      No.
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      Services
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      Site
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      No IoT
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {items.findIndex(
                          (row) => row.id === item.id
                        ) + 1}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold">
                        {item.services}
                      </td>

                      <td className="max-w-[360px] break-words px-4 py-3 text-xs text-slate-700">
                        {item.site}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.noIot}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          title={`Hapus ${item.site}`}
                          aria-label={`Hapus ${item.site}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              Menampilkan {filteredItems.length} dari{' '}
              {items.length} Site.
            </div>
          )}
        </section>

        {/* GENERATE */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                Generate & Cetak Label
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {items.length > 0
                  ? `${totalLabels} label dari ${items.length} Site siap diproses.`
                  : 'Tambahkan data Site untuk mengaktifkan tombol.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={!items.length || isLoading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#00529c] px-3 text-xs font-medium text-white hover:bg-[#003f7a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPdf ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <FileDown size={14} />
                )}

                {loadingPdf
                  ? 'Memproses...'
                  : 'Generate PDF'}
              </button>

              <button
                type="button"
                onClick={handleGenerateWord}
                disabled={!items.length || isLoading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingWord ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <FileText size={14} />
                )}

                {loadingWord
                  ? 'Memproses...'
                  : 'Generate Word'}
              </button>

              <button
                type="button"
                onClick={handlePrintBri}
                disabled={!items.length || isLoading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPrint ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <Printer size={14} />
                )}

                {loadingPrint
                  ? 'Menyiapkan...'
                  : 'Print Label'}
              </button>
            </div>
          </div>
        </section>

        {/* PREVIEW PDF */}
        {previewType === 'pdf' && pdfUrl && (
          <section
            ref={previewSectionRef}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-600"
                />

                <h3 className="text-sm font-semibold">
                  Preview PDF BRI
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintBri}
                  disabled={isLoading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  <Printer size={13} />
                  Print
                </button>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium hover:bg-slate-50"
                >
                  <ExternalLink size={13} />
                  Buka PDF
                </a>

                <a
                  href={pdfUrl}
                  download="Label-BRI-Telkomsel.pdf"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#00529c] px-2.5 text-xs font-medium text-white hover:bg-[#003f7a]"
                >
                  <Download size={13} />
                  Download
                </a>

                <button
                  type="button"
                  onClick={closePreview}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium hover:bg-slate-50"
                >
                  <X size={13} />
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <iframe
                src={pdfUrl}
                title="Preview Label BRI PDF"
                className="h-[580px] w-full rounded-md border border-slate-200"
              />

              <p className="mt-2 text-xs text-slate-500">
                Kertas 205 × 165 mm · Skala 100% · Tanpa Fit to Page.
              </p>
            </div>
          </section>
        )}

        {/* PREVIEW WORD */}
        {previewType === 'word' && wordBlob && (
          <section
            ref={previewSectionRef}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={16}
                  className="text-emerald-600"
                />

                <h3 className="text-sm font-semibold">
                  Preview Word BRI
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Download size={13} />
                  Download Word
                </button>

                <button
                  type="button"
                  onClick={closePreview}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-medium hover:bg-slate-50"
                >
                  <X size={13} />
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {previewingWord && (
                <p className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Memuat preview Word...
                </p>
              )}

              {wordPreviewError && (
                <p className="mb-2 text-xs text-red-600">
                  {wordPreviewError}
                </p>
              )}

              <div className="max-h-[650px] overflow-auto rounded-md border border-slate-200 bg-slate-100 p-3">
                <div
                  ref={wordPreviewRef}
                  className="min-w-max"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Tampilan Word di browser dapat sedikit berbeda
                dari Microsoft Word.
              </p>
            </div>
          </section>
        )}

        <footer className="pb-2 text-center text-[11px] text-slate-400">
          SD-WAN Label Generator · BRI
        </footer>
      </div>

      {/* POPUP KONFIRMASI HAPUS SEMUA */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDeleteModal(false);
            }
          }}
        >
          <div
            id="bri-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bri-delete-title"
            aria-describedby="bri-delete-description"
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <Trash2
                    size={22}
                    className="text-red-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteModal(false)
                  }
                  aria-label="Tutup popup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <h2
                id="bri-delete-title"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                Hapus Semua Data?
              </h2>

              <p
                id="bri-delete-description"
                className="mt-2 text-sm leading-6 text-slate-500"
              >
                Anda akan menghapus seluruh{' '}
                <span className="font-semibold text-slate-900">
                  {items.length} data Site BRI
                </span>
                . Pastikan data tersebut sudah tidak diperlukan.
              </p>

              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-3">
                <TriangleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-xs leading-5 text-red-700">
                  Tindakan ini tidak dapat dibatalkan.
                  Seluruh data Site yang dimasukkan akan
                  dihapus dari daftar.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={clearAllItems}
                disabled={isLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={15} />
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
