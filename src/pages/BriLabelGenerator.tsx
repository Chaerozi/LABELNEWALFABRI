
import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import {
  ArrowLeft,
  FileText,
  FileDown,
  Download,
  ExternalLink,
  Trash2,
  X,
  Building2,
  Printer,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import Logo from '../assets/Logo.png';
import BriForm from '../components/bri/BriForm';
import type { BriLabel } from '../types/bri';

import { generateBriPDF } from '../utils/briPdf';
import { generateBriWord } from '../utils/briWord';

interface BriLabelGeneratorProps {
  onBack: () => void;
}

type PreviewType = 'pdf' | 'word' | null;

export default function BriLabelGenerator({
  onBack,
}: BriLabelGeneratorProps) {
  const [items, setItems] = useState<BriLabel[]>([]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [wordUrl, setWordUrl] = useState<string | null>(null);
  const [wordBlob, setWordBlob] = useState<Blob | null>(null);

  const [previewType, setPreviewType] =
    useState<PreviewType>(null);

  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingWord, setLoadingWord] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [previewingWord, setPreviewingWord] = useState(false);

  const pdfUrlRef = useRef<string | null>(null);
  const wordUrlRef = useRef<string | null>(null);
  const printUrlsRef = useRef<string[]>([]);
  const wordPreviewRef = useRef<HTMLDivElement | null>(null);

  const isLoading = loadingPdf || loadingWord || loadingPrint;

  const totalLabels = items.length * 2;
  const totalPages = Math.ceil(totalLabels / 12);

  // ==========================================
  // BERSIHKAN PDF
  // ==========================================

  const clearPdf = () => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }

    setPdfUrl(null);
  };

  // ==========================================
  // BERSIHKAN WORD
  // ==========================================

  const clearWord = () => {
    if (wordUrlRef.current) {
      URL.revokeObjectURL(wordUrlRef.current);
      wordUrlRef.current = null;
    }

    setWordUrl(null);
    setWordBlob(null);
  };

  // ==========================================
  // RESET HASIL GENERATE
  // ==========================================

  const clearGeneratedFiles = () => {
    clearPdf();
    clearWord();
    setPreviewType(null);
  };

  // ==========================================
  // CLEANUP SAAT UNMOUNT
  // ==========================================

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

      printUrlsRef.current = [];
    };
  }, []);

  // ==========================================
  // TAMBAH SITE
  // ==========================================

  const addItem = (item: BriLabel) => {
    clearGeneratedFiles();

    setItems((prev) => [...prev, item]);
  };

  // ==========================================
  // HAPUS SITE
  // ==========================================

  const removeItem = (id: string) => {
    clearGeneratedFiles();

    setItems((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  // ==========================================
  // HAPUS SEMUA SITE
  // ==========================================

  const clearAllItems = () => {
    if (!window.confirm('Hapus semua data Site BRI?')) {
      return;
    }

    clearGeneratedFiles();
    setItems([]);
  };

  // ==========================================
  // GENERATE PDF
  // ==========================================

  const handleGeneratePdf = async () => {
    if (!items.length || isLoading) return;

    setLoadingPdf(true);

    try {
      const blob = await generateBriPDF(items);
      const url = URL.createObjectURL(blob);

      clearPdf();

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

  // ==========================================
  // GENERATE WORD
  // ==========================================

  const handleGenerateWord = async () => {
    if (!items.length || isLoading) return;

    setLoadingWord(true);

    try {
      const blob = await generateBriWord(items);
      const url = URL.createObjectURL(blob);

      clearWord();

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

  // ==========================================
  // PRINT LABEL BRI
  // ==========================================

  const handlePrintBri = async () => {
    if (!items.length || isLoading) return;

    // Buka tab langsung saat klik agar tidak
    // diblokir oleh pop-up blocker browser.
    const printTab = window.open('', '_blank');

    if (!printTab) {
      alert(
        'Browser memblokir tab cetak. ' +
        'Izinkan pop-up untuk website ini.'
      );
      return;
    }

    setLoadingPrint(true);

    printTab.document.title = 'Print Label BRI';

    printTab.document.body.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:80vh;
        font-family:Arial,sans-serif;
        color:#334155;
      ">
        Menyiapkan dokumen cetak BRI...
      </div>
    `;

    try {
      // Gunakan PDF yang sudah dibuat jika tersedia.
      // Jika belum ada, generate secara otomatis.
      let url = pdfUrlRef.current;

      if (!url) {
        const blob = await generateBriPDF(items);

        url = URL.createObjectURL(blob);

        // Simpan agar URL tetap aktif ketika
        // PDF sedang dibuka di tab printer.
        printUrlsRef.current.push(url);
      }

      if (printTab.closed) return;

      printTab.location.replace(url);
    } catch (error) {
      if (!printTab.closed) {
        printTab.close();
      }

      alert(
        error instanceof Error
          ? error.message
          : 'Gagal menyiapkan label BRI untuk dicetak.'
      );
    } finally {
      setLoadingPrint(false);
    }
  };

  // ==========================================
  // PREVIEW WORD
  // ==========================================

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

    const renderWord = async () => {
      setPreviewingWord(true);
      container.innerHTML = '';

      try {
        const buffer = await wordBlob.arrayBuffer();

        if (cancelled) return;

        await renderAsync(
          buffer,
          container,
          undefined,
          {
            className: 'docx',
            inWrapper: true,
            breakPages: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            useBase64URL: true,
          }
        );
      } catch (error) {
        if (!cancelled) {
          console.error('Gagal preview Word:', error);

          container.textContent =
            'Gagal menampilkan preview Word. Silakan download file Word.';
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
    };
  }, [previewType, wordBlob]);

  // ==========================================
  // DOWNLOAD WORD
  // ==========================================

  const handleDownloadWord = () => {
    if (!wordUrl) return;

    const link = document.createElement('a');

    link.href = wordUrl;
    link.download = 'Label-BRI-Telkomsel.docx';

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // ==========================================
  // TAMPILAN HALAMAN
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">

      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <img
              src={Logo}
              alt="Logo MTM"
              className="h-12 w-12 rounded-lg object-contain"
            />

            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                BRI Label Generator
              </h1>

              <p className="text-xs text-slate-500">
                SD-WAN Label Management
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Kembali ke Alfamart
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6 sm:px-7">

        {/* JUDUL */}
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Cetak Label BRI
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Kelola data Site, buat label, dan cetak langsung dari website.
          </p>
        </div>

        {/* FORM INPUT */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
              <Building2
                size={18}
                className="text-slate-600"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Input Data Site
              </h3>

              <p className="text-xs text-slate-500">
                Masukkan Services, Site, dan No IoT.
              </p>
            </div>
          </div>

          <div className="p-5">
            <BriForm onAdd={addItem} />
          </div>
        </section>

        {/* DAFTAR SITE */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold">
                Daftar Site
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {items.length} Site · {totalLabels} label · {totalPages} lembar
              </p>
            </div>

            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAllItems}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 size={14} />
                Hapus Semua
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <FileText
                  size={22}
                  className="text-slate-400"
                />
              </div>

              <p className="mt-3 text-sm font-medium text-slate-700">
                Belum ada data Site
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Tambahkan data melalui formulir di atas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">
                      No.
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Services
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Site
                    </th>

                    <th className="px-5 py-3 font-medium">
                      No IoT
                    </th>

                    <th className="px-5 py-3 text-right font-medium">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-3.5 text-sm text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-3.5 text-sm font-medium">
                        {item.services}
                      </td>

                      <td className="max-w-[360px] break-words px-5 py-3.5 text-sm font-medium text-slate-800">
                        {item.site}
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-600">
                        {item.noIot}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          aria-label={`Hapus ${item.site}`}
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

        {/* GENERATE DAN PRINT */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">
                Generate & Print Label
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Setiap Site menghasilkan 2 label identik.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">

              {/* GENERATE PDF */}
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={!items.length || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d9232e] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#bd1e28] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPdf ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <FileDown size={16} />
                )}

                {loadingPdf
                  ? 'Memproses...'
                  : 'Generate PDF'}
              </button>

              {/* GENERATE WORD */}
              <button
                type="button"
                onClick={handleGenerateWord}
                disabled={!items.length || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingWord ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <FileText size={16} />
                )}

                {loadingWord
                  ? 'Memproses...'
                  : 'Generate Word'}
              </button>

              {/* PRINT LABEL */}
              <button
                type="button"
                onClick={handlePrintBri}
                disabled={!items.length || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingPrint ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Printer size={16} />
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
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={18}
                  className="text-emerald-600"
                />

                <h3 className="text-sm font-semibold">
                  Preview PDF BRI
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={handlePrintBri}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  <Printer size={14} />
                  Print Label
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
                  download="Label-BRI-Telkomsel.pdf"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#d9232e] px-3 py-2 text-xs font-medium text-white hover:bg-[#bd1e28]"
                >
                  <Download size={14} />
                  Download PDF
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewType(null)}
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
                title="Preview Label BRI PDF"
                className="h-[650px] w-full rounded-lg border border-slate-200"
              />

              <p className="mt-3 text-xs text-slate-500">
                Cetak menggunakan kertas 205 × 165 mm,
                orientasi landscape, skala 100%
                (Actual Size), tanpa Fit to Page.
              </p>
            </div>
          </section>
        )}

        {/* PREVIEW WORD */}
        {previewType === 'word' && wordBlob && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={18}
                  className="text-emerald-600"
                />

                <h3 className="text-sm font-semibold">
                  Preview Word BRI
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
                  onClick={() => setPreviewType(null)}
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
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Memuat preview Word...
                </p>
              )}

              <div className="max-h-[750px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3">
                <div
                  ref={wordPreviewRef}
                  className="min-w-max"
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Tampilan Word di browser dapat sedikit
                berbeda dari Microsoft Word.
              </p>
            </div>
          </section>
        )}

        <footer className="pb-2 text-center text-xs text-slate-400">
          SD-WAN Label Generator · BRI
        </footer>
      </div>
    </main>
  );
}
