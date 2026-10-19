
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import {
  PencilLine,
  FileText,
  FileDown,
  Download,
  ExternalLink,
  Trash2,
  X,
  Printer,
  Loader2,
  CheckCircle2,
  Store as StoreIcon,
} from 'lucide-react';

import Logo from '../assets/Logo.png';
import StoreForm from '../components/StoreForm';
import LabelPreview from '../components/LabelPreview';

import type { Store } from '../types/store';
import { generateLabelsPDF } from '../utils/pdf';
import { generateLabelsWord } from '../utils/word';

interface LabelGeneratorProps {
  onPrint: (stores: Store[]) => void;
}

export default function LabelGenerator({
  onPrint,
}: LabelGeneratorProps) {
  const [stores, setStores] = useState<Store[]>([]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [wordPreviewError, setWordPreviewError] = useState('');
  const [previewingWord, setPreviewingWord] = useState(false);

  const pdfUrlRef = useRef<string | null>(null);
  const wordPreviewRef = useRef<HTMLDivElement>(null);

  const isGenerating = generatingPDF || generatingWord;
  const totalLabels = stores.length * 4;
  const totalPages = Math.ceil(totalLabels / 12);

  // ==========================================
  // BERSIHKAN FILE
  // ==========================================

  const clearPdf = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }

    setPdfUrl(null);
  };

  const clearWord = () => {
    setWordBlob(null);
    setWordPreviewError('');
    setPreviewingWord(false);
  };

  const clearGeneratedFiles = () => {
    clearPdf();
    clearWord();
  };

  // ==========================================
  // CLEANUP
  // ==========================================

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  // ==========================================
  // PREVIEW WORD
  // ==========================================

  useEffect(() => {
    if (!wordBlob || !wordPreviewRef.current) return;

    const container = wordPreviewRef.current;
    let cancelled = false;

    container.innerHTML = '';

    const renderWord = async () => {
      setPreviewingWord(true);
      setWordPreviewError('');

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
            'Preview Word gagal ditampilkan. Silakan coba generate ulang.'
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
  }, [wordBlob]);

  // ==========================================
  // KELOLA STORE
  // ==========================================

  const addStore = (store: Store) => {
    clearGeneratedFiles();

    setStores((prev) => [...prev, store]);
  };

  const removeStore = (id: string) => {
    clearGeneratedFiles();

    setStores((prev) =>
      prev.filter((store) => store.id !== id)
    );
  };

  const clearStores = () => {
    if (!window.confirm('Hapus semua data Store Alfamart?')) {
      return;
    }

    clearGeneratedFiles();
    setStores([]);
  };

  // ==========================================
  // GENERATE PDF
  // ==========================================

  const handleGeneratePDF = async () => {
    if (!stores.length || isGenerating) return;

    setGeneratingPDF(true);

    try {
      const blob = await generateLabelsPDF(stores);

      if (!blob) {
        throw new Error('PDF gagal dibuat.');
      }

      const url = URL.createObjectURL(blob);

      clearPdf();

      pdfUrlRef.current = url;
      setPdfUrl(url);
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

  // ==========================================
  // GENERATE WORD
  // ==========================================

  const handleGenerateWord = async () => {
    if (!stores.length || isGenerating) return;

    setGeneratingWord(true);
    clearWord();

    try {
      const blob = await generateLabelsWord(stores);
      setWordBlob(blob);
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

  // ==========================================
  // DOWNLOAD WORD
  // ==========================================

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

  // ==========================================
  // PRINT LABEL
  // ==========================================

  const handlePrint = () => {
    if (!stores.length || isGenerating) return;

    onPrint([...stores]);
  };

  // ==========================================
  // TAMPILAN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">

{/* HEADER */}
<header className="border-b border-slate-200 bg-white">
  <div className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-7">
    <div className="flex items-center gap-3">
      <img
        src={Logo}
        alt="Logo MTM"
        className="h-12 w-12 rounded-lg object-contain"
      />

      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          SD-WAN Label Generator
        </h1>

        <p className="text-xs text-slate-500">
          Telkomsel Alfamart
        </p>
      </div>
    </div>
  </div>
</header>

      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6 sm:px-7">

        {/* JUDUL HALAMAN */}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Cetak Label Alfamart
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tambahkan data Store, periksa label, lalu cetak dalam format PDF atau Word.
          </p>
        </div>

        {/* INPUT MANUAL */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <PencilLine size={18} className="text-slate-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Input Data Store
              </h3>

              <p className="text-xs text-slate-500">
                Masukkan kode Store, nomor modem Primary, dan Backup.
              </p>
            </div>
          </div>

          <div className="p-5">
            <StoreForm onAdd={addStore} />
          </div>
        </section>

        {/* DAFTAR STORE */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold">
                Daftar Store
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {stores.length} Store · {totalLabels} label · {totalPages} lembar
              </p>
            </div>

            {stores.length > 0 && (
              <button
                type="button"
                onClick={clearStores}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={14} />
                Hapus Semua
              </button>
            )}
          </div>

          {stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <StoreIcon size={22} className="text-slate-400" />
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700">
                Belum ada data Store
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tambahkan data Store melalui formulir di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">No.</th>
                    <th className="px-5 py-3 font-medium">Store</th>
                    <th className="px-5 py-3 font-medium">Primary</th>
                    <th className="px-5 py-3 font-medium">Backup</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {stores.map((store, index) => (
                    <tr
                      key={store.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5 text-sm text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-3.5 text-sm font-medium">
                        {store.storeCode}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {store.primaryNumber}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {store.backupNumber}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeStore(store.id)}
                          disabled={isGenerating}
                          aria-label={`Hapus ${store.storeCode}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PREVIEW LABEL */}
        {stores.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold">
                Preview Label
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Ukuran 64 × 32 mm · 4 label per Store
              </p>
            </div>

            <div className="overflow-x-auto p-5">
              <LabelPreview stores={stores} />
            </div>
          </section>
        )}

        {/* GENERATE */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">
                Generate Label
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Periksa hasil sebelum mengunduh atau mencetak.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={!stores.length || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9232e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#bd1e28] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generatingPDF ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileDown size={16} />
                )}

                {generatingPDF ? 'Memproses...' : 'Generate PDF'}
              </button>

              <button
                type="button"
                onClick={handleGenerateWord}
                disabled={!stores.length || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {generatingWord ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <FileText size={16} />
                )}

                {generatingWord ? 'Memproses...' : 'Generate Word'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!stores.length || isGenerating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={16} />
                Print Label
              </button>
            </div>
          </div>
        </section>

        {/* PREVIEW PDF */}
        {pdfUrl && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />

                <h3 className="text-sm font-semibold">
                  Preview PDF
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Printer size={14} />
                  Print
                </button>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <ExternalLink size={14} />
                  Buka PDF
                </a>

                <a
                  href={pdfUrl}
                  download="Label-Telkomsel-Alfamart.pdf"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#d9232e] px-3 py-2 text-xs font-medium text-white hover:bg-[#bd1e28]"
                >
                  <Download size={14} />
                  Download PDF
                </a>

                <button
                  type="button"
                  onClick={clearPdf}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <X size={14} />
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-4">
              <iframe
                src={pdfUrl}
                title="Preview PDF Label Telkomsel"
                className="h-[650px] w-full rounded-lg border border-slate-200"
              />

              <p className="mt-3 text-xs text-slate-500">
                Cetak pada kertas 205 × 165 mm dengan skala 100%
                (Actual Size), tanpa Fit to Page.
              </p>
            </div>
          </section>
        )}

        {/* PREVIEW WORD */}
        {wordBlob && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />

                <h3 className="text-sm font-semibold">
                  Preview Word
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadWord}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Download size={14} />
                  Download Word
                </button>

                <button
                  type="button"
                  onClick={clearWord}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <X size={14} />
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-4">
              {previewingWord && (
                <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={15} className="animate-spin" />
                  Memuat preview Word...
                </p>
              )}

              {wordPreviewError && (
                <p className="mb-3 text-sm text-red-600">
                  {wordPreviewError}
                </p>
              )}

              <div className="max-h-[750px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3">
                <div
                  ref={wordPreviewRef}
                  className="min-w-max"
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Tampilan Word di browser dapat sedikit berbeda
                dari Microsoft Word.
              </p>
            </div>
          </section>
        )}

        <footer className="pb-2 text-center text-xs text-slate-400">
          SD-WAN Label Generator · Alfamart
        </footer>
      </div>
    </main>
  );
}
