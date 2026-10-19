
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Loader2,
  AlertCircle,
  ExternalLink,
  FileText,
} from 'lucide-react';

import type { Store } from '../types/store';
import { generateLabelsPDF } from '../utils/pdf';

interface PrintLabelProps {
  stores: Store[];
  onBack: () => void;
}

export default function PrintLabel({
  stores,
  onBack,
}: PrintLabelProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  const urlRef = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const totalLabels = stores.length * 4;
  const totalPages = Math.ceil(totalLabels / 12);

  // ==========================================
  // GENERATE PDF UNTUK PREVIEW DAN PRINT
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setLoading(true);
      setError('');
      setPdfUrl(null);

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }

      if (stores.length === 0) {
        setError('Tidak ada data Store untuk dicetak.');
        setLoading(false);
        return;
      }

      try {
        const blob = await generateLabelsPDF(stores);

        if (!blob) {
          throw new Error('PDF gagal dibuat.');
        }

        if (cancelled) return;

        const url = URL.createObjectURL(blob);

        urlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Gagal menyiapkan label.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void prepare();

    return () => {
      cancelled = true;

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [stores]);

  // ==========================================
  // PRINT LANGSUNG DARI WEBSITE
  // ==========================================

  const handlePrint = () => {
    if (!pdfUrl || loading || printing) return;

    setPrinting(true);

    try {
      const iframe = iframeRef.current;
      const printWindow = iframe?.contentWindow;

      if (!printWindow) {
        throw new Error('Preview PDF belum siap.');
      }

      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error('Print gagal:', err);

      alert(
        'Browser tidak dapat mencetak PDF langsung. ' +
        'Silakan buka PDF lalu gunakan Ctrl + P.'
      );
    } finally {
      setPrinting(false);
    }
  };

  // ==========================================
  // BUKA PDF SEBAGAI ALTERNATIF
  // ==========================================

  const handleOpenPdf = () => {
    if (!pdfUrl) return;

    const tab = window.open(pdfUrl, '_blank');

    if (!tab) {
      alert('Izinkan pop-up untuk membuka PDF.');
    }
  };

  // ==========================================
  // TAMPILAN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-7">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Print Label Alfamart
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Preview dan cetak label langsung dari website
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6 sm:px-7">

        {/* RINGKASAN */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">
                Dokumen Siap Cetak
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {stores.length} Store · {totalLabels} label · {totalPages} lembar
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={!pdfUrl || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ExternalLink size={16} />
                Buka PDF
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={!pdfUrl || loading || printing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9232e] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#bd1e28] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {printing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Printer size={16} />
                )}

                {printing ? 'Menyiapkan...' : 'Print Sekarang'}
              </button>
            </div>
          </div>
        </section>

        {/* PREVIEW PDF */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <FileText size={18} className="text-slate-600" />
            </div>

            <div>
              <h3 className="text-sm font-semibold">
                Preview Label
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Periksa posisi label sebelum mencetak.
              </p>
            </div>
          </div>

          <div className="p-4">

            {loading && (
              <div className="flex min-h-[350px] flex-col items-center justify-center gap-3">
                <Loader2
                  size={25}
                  className="animate-spin text-slate-500"
                />

                <p className="text-sm text-slate-500">
                  Menyiapkan dokumen cetak...
                </p>
              </div>
            )}

            {error && (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
                <AlertCircle size={26} className="text-red-500" />

                <p className="text-sm text-red-600">
                  {error}
                </p>
              </div>
            )}

            {pdfUrl && !error && (
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                title="Preview PDF Label Alfamart"
                className="h-[700px] w-full rounded-lg border border-slate-200"
              />
            )}
          </div>
        </section>

        {/* INFORMASI CETAK */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">
            Pengaturan Printer
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">
                Ukuran Kertas
              </p>
              <p className="mt-1 font-medium">
                205 × 165 mm
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Orientasi
              </p>
              <p className="mt-1 font-medium">
                Landscape
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Skala
              </p>
              <p className="mt-1 font-medium">
                100% / Actual Size
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Label
              </p>
              <p className="mt-1 font-medium">
                3 kolom × 4 baris
              </p>
            </div>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
            Pilih printer yang digunakan, pastikan ukuran kertas
            sesuai, nonaktifkan Fit to Page, dan lakukan uji cetak
            pada kertas biasa sebelum menggunakan stiker.
          </p>
        </section>

        <footer className="pb-2 text-center text-xs text-slate-400">
          SD-WAN Label Generator · Alfamart
        </footer>
      </div>
    </main>
  );
}
