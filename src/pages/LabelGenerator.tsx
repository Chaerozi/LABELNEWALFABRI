
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

import {
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
  Store as StoreIcon,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';

import AlfaLogo from '../assets/Alfa.svg';

import StoreForm from '../components/StoreForm';
import AlfamartPaste, {
  type AlfamartPasteRow,
} from '../components/AlfamartPaste';
import AlfamartCsvUpload from '../components/AlfamartCsvUpload';

import type { Store } from '../types/store';
import { generateLabelsPDF } from '../utils/pdf';
import { generateLabelsWord } from '../utils/word';

interface LabelGeneratorProps {
  onPrint: (stores: Store[]) => void;
}

type InputMode = 'manual' | 'csv' | 'paste';
type PreviewType = 'pdf' | 'word' | null;

const inputModes = [
  { id: 'manual', label: 'Input Manual', icon: PencilLine },
  { id: 'csv', label: 'Upload CSV', icon: FileSpreadsheet },
  { id: 'paste', label: 'Copy-Paste', icon: ClipboardPaste },
] as const;

export default function LabelGenerator({
  onPrint,
}: LabelGeneratorProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // Popup hapus semua
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Preview
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);
  const [activePreview, setActivePreview] =
    useState<PreviewType>(null);

  // Loading
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [previewingWord, setPreviewingWord] = useState(false);
  const [wordPreviewError, setWordPreviewError] = useState('');

  // Refs
  const pdfUrlRef = useRef<string | null>(null);
  const wordPreviewRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLElement>(null);

  const isGenerating = generatingPDF || generatingWord;

  // Alfamart: 4 label per Store
  const totalLabels = stores.length * 4;
  const totalPages = Math.ceil(totalLabels / 12);

  // Pencarian Store
  const filteredStores = stores.filter((store) => {
    const keyword = search.trim().toLowerCase();

    return (
      store.storeCode.toLowerCase().includes(keyword) ||
      store.primaryNumber.toLowerCase().includes(keyword) ||
      store.backupNumber.toLowerCase().includes(keyword)
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
    setWordBlob(null);
    setWordPreviewError('');
    setPreviewingWord(false);
  };

  // Bersihkan hasil generate
  const clearGeneratedFiles = () => {
    clearPdf();
    clearWord();
    setActivePreview(null);
  };

  // Cleanup PDF URL
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  // Pengaturan popup konfirmasi
  useEffect(() => {
    if (!showDeleteModal) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement as HTMLElement | null;

    document.body.style.overflow = 'hidden';

    cancelDeleteRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      // Tutup dengan Escape
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowDeleteModal(false);
        return;
      }

      // Jaga fokus tetap di popup
      if (event.key === 'Tab') {
        const buttons =
          deleteModalRef.current?.querySelectorAll<HTMLButtonElement>(
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

      if (previousFocus?.isConnected) {
        previousFocus.focus();
      } else {
        deleteTriggerRef.current?.focus();
      }
    };
  }, [showDeleteModal]);

  // Scroll otomatis ke preview
  useEffect(() => {
    if (!activePreview) return;

    const timer = window.setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [activePreview]);

  // Preview Word
  useEffect(() => {
    if (
      activePreview !== 'word' ||
      !wordBlob ||
      !wordPreviewRef.current
    ) {
      return;
    }

    const container = wordPreviewRef.current;
    let cancelled = false;

    container.innerHTML = '';
    setPreviewingWord(true);
    setWordPreviewError('');

    const renderWord = async () => {
      try {
        await renderAsync(wordBlob, container, undefined, {
          inWrapper: true,
          breakPages: true,
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
  }, [wordBlob, activePreview]);

  // Tambah Store manual
  const addStore = (store: Store) => {
    if (isGenerating) return;

    clearGeneratedFiles();

    setStores((prev) => [...prev, store]);
    setNotice(`Store ${store.storeCode} berhasil ditambahkan.`);
  };

  // Import CSV / Copy-Paste
  const importAlfamart = (rows: AlfamartPasteRow[]) => {
    if (!rows.length || isGenerating) return;

    const newStores: Store[] = rows.map((row, index) => ({
      id: `${Date.now()}-${index}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,
      storeCode: row.store,
      primaryNumber: row.modemPrimary,
      backupNumber: row.modemBackup,
    }));

    clearGeneratedFiles();

    setStores((prev) => [...prev, ...newStores]);
    setNotice(`${newStores.length} Store berhasil diimpor.`);
  };

  // Hapus satu Store
  const removeStore = (id: string) => {
    if (isGenerating) return;

    clearGeneratedFiles();

    setStores((prev) =>
      prev.filter((store) => store.id !== id)
    );

    setNotice('Store berhasil dihapus.');
  };

  // Buka popup konfirmasi
  const openDeleteModal = () => {
    if (isGenerating || !stores.length) return;

    setShowDeleteModal(true);
  };

  // Tutup popup konfirmasi
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  // Hapus semua setelah dikonfirmasi
  const clearStores = () => {
    if (isGenerating || !stores.length) return;

    clearGeneratedFiles();

    setStores([]);
    setSearch('');
    setNotice('Semua data Store Alfamart berhasil dihapus.');
    setShowDeleteModal(false);
  };

  // Generate PDF
  const handleGeneratePDF = async () => {
    if (!stores.length || isGenerating) return;

    setGeneratingPDF(true);
    setNotice('');

    try {
      const blob = await generateLabelsPDF(stores);

      if (!blob) {
        throw new Error('PDF gagal dibuat.');
      }

      const url = URL.createObjectURL(blob);

      clearGeneratedFiles();

      pdfUrlRef.current = url;
      setPdfUrl(url);
      setActivePreview('pdf');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal membuat PDF.'
      );
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generate Word
  const handleGenerateWord = async () => {
    if (!stores.length || isGenerating) return;

    setGeneratingWord(true);
    setNotice('');

    try {
      const blob = await generateLabelsWord(stores);

      if (!blob) {
        throw new Error('Word gagal dibuat.');
      }

      clearGeneratedFiles();

      setWordBlob(blob);
      setActivePreview('word');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Gagal membuat Word.'
      );
    } finally {
      setGeneratingWord(false);
    }
  };

  // Download Word
  const handleDownloadWord = () => {
    if (!wordBlob) return;

    const url = URL.createObjectURL(wordBlob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'Label-Telkomsel-Alfamart.docx';

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  };

  // Print Label
  const handlePrint = () => {
    if (!stores.length || isGenerating) return;

    onPrint([...stores]);
  };

  // Tutup Preview
  const closePreview = () => {
    clearGeneratedFiles();
  };

  return (
    <main className="min-h-screen bg-[#f8f9fb] text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-11 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-white px-2">
            <img
              src={AlfaLogo}
              alt="Logo Alfamart"
              className="max-h-9 w-full object-contain"
            />
          </div>

          <div className="min-w-0 border-l border-slate-200 pl-3">
            <h1 className="text-sm font-semibold tracking-tight sm:text-base">
              Alfamart Label Generator
            </h1>

            <p className="mt-0.5 text-[11px] text-slate-500">
              SD-WAN Label Management
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-6">
        {/* TITLE */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Cetak Label Alfamart
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
            Kelola data Store dan buat label siap cetak dalam
            format PDF atau Word.
          </p>
        </div>

        {/* RINGKASAN */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
              <StoreIcon size={14} />
              <span className="text-[11px] sm:text-xs">
                Total Store
              </span>
            </div>

            <p className="text-xl font-semibold tabular-nums sm:text-2xl">
              {stores.length}
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
              Tambah Data Store
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Pilih salah satu metode input yang paling mudah.
            </p>
          </div>

          <div className="border-b border-slate-100 px-3 py-2 sm:px-4">
            <div
              role="tablist"
              aria-label="Metode input Store"
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
                        ? 'bg-white text-slate-900 shadow-sm'
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
            {/* MANUAL */}
            <div
              style={{
                display:
                  inputMode === 'manual' ? 'block' : 'none',
              }}
            >
              <StoreForm onAdd={addStore} />
            </div>

            {/* CSV */}
            <div
              style={{
                display: inputMode === 'csv' ? 'block' : 'none',
              }}
            >
              <AlfamartCsvUpload
                onImport={importAlfamart}
                disabled={isGenerating}
              />
            </div>

            {/* COPY PASTE */}
            <div
              style={{
                display:
                  inputMode === 'paste' ? 'block' : 'none',
              }}
            >
              <AlfamartPaste
                onImport={importAlfamart}
                disabled={isGenerating}
              />
            </div>
          </div>
        </section>

        {/* NOTIFIKASI */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={15}
                className="shrink-0 text-emerald-700"
              />

              <span className="text-xs text-emerald-800">
                {notice}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Tutup notifikasi"
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* DAFTAR STORE */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">
                Daftar Store
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {stores.length} data tersimpan untuk pembuatan label.
              </p>
            </div>

            {stores.length > 0 && (
              <button
                ref={deleteTriggerRef}
                type="button"
                onClick={openDeleteModal}
                disabled={isGenerating}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-2.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={13} />
                Hapus Semua
              </button>
            )}
          </div>

          {/* SEARCH */}
          {stores.length > 0 && (
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
                  placeholder="Cari Store atau nomor modem..."
                  aria-label="Cari Store"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                <StoreIcon
                  size={21}
                  className="text-slate-400"
                />
              </div>

              <p className="mt-3 text-sm font-medium">
                Belum ada data Store
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tambahkan Store menggunakan metode input di atas.
              </p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="px-4 py-9 text-center">
              <p className="text-sm font-medium">
                Store tidak ditemukan
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
                      Kode Store
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      Modem Primary
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      Modem Backup
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStores.map((store) => (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {stores.findIndex(
                          (item) => item.id === store.id
                        ) + 1}
                      </td>

                      <td className="px-4 py-3 text-xs font-semibold text-slate-900">
                        {store.storeCode}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {store.primaryNumber}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {store.backupNumber}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            removeStore(store.id)
                          }
                          disabled={isGenerating}
                          title={`Hapus ${store.storeCode}`}
                          aria-label={`Hapus ${store.storeCode}`}
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

          {stores.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              Menampilkan {filteredStores.length} dari{' '}
              {stores.length} Store.
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
                {stores.length > 0
                  ? `${totalLabels} label dari ${stores.length} Store siap diproses.`
                  : 'Tambahkan data Store untuk mengaktifkan tombol.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PDF */}
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={!stores.length || isGenerating}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generatingPDF ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <FileDown size={14} />
                )}

                {generatingPDF
                  ? 'Memproses...'
                  : 'Generate PDF'}
              </button>

              {/* WORD */}
              <button
                type="button"
                onClick={handleGenerateWord}
                disabled={!stores.length || isGenerating}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generatingWord ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                ) : (
                  <FileText size={14} />
                )}

                {generatingWord
                  ? 'Memproses...'
                  : 'Generate Word'}
              </button>

              {/* PRINT */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={!stores.length || isGenerating}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
              >
                <Printer size={14} />
                Print Label
              </button>
            </div>
          </div>
        </section>

        {/* PREVIEW PDF */}
        {activePreview === 'pdf' && pdfUrl && (
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
                  Preview PDF
                </h3>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white hover:bg-slate-800"
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
                  download="Label-Telkomsel-Alfamart.pdf"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700"
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
                title="Preview PDF Label Telkomsel Alfamart"
                className="h-[580px] w-full rounded-md border border-slate-200"
              />

              <p className="mt-2 text-xs text-slate-500">
                Kertas 205 × 165 mm · Skala 100% · Tanpa Fit to Page.
              </p>
            </div>
          </section>
        )}

        {/* PREVIEW WORD */}
        {activePreview === 'word' && wordBlob && (
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
                  Preview Word
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
          SD-WAN Label Generator · Alfamart
        </footer>
      </div>

      {/* POPUP KONFIRMASI HAPUS SEMUA */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteModal();
            }
          }}
        >
          <div
            ref={deleteModalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alfamart-delete-title"
            aria-describedby="alfamart-delete-description"
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* KONTEN POPUP */}
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                {/* ICON */}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                  <Trash2
                    size={22}
                    className="text-red-600"
                  />
                </div>

                {/* CLOSE */}
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  aria-label="Tutup popup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* TITLE */}
              <h2
                id="alfamart-delete-title"
                className="text-lg font-semibold tracking-tight text-slate-900"
              >
                Hapus Semua Data?
              </h2>

              {/* DESCRIPTION */}
              <p
                id="alfamart-delete-description"
                className="mt-2 text-sm leading-6 text-slate-500"
              >
                Anda akan menghapus seluruh{' '}
                <span className="font-semibold text-slate-900">
                  {stores.length} data Store Alfamart
                </span>
                . Pastikan data tersebut sudah tidak diperlukan.
              </p>

              {/* WARNING */}
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-3">
                <TriangleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <p className="text-xs leading-5 text-red-700">
                  Tindakan ini tidak dapat dibatalkan.
                  Seluruh data Store yang telah dimasukkan
                  akan dihapus dari daftar.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              {/* BATAL */}
              <button
                ref={cancelDeleteRef}
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Batal
              </button>

              {/* KONFIRMASI HAPUS */}
              <button
                type="button"
                onClick={clearStores}
                disabled={isGenerating}
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
