
import { useState } from 'react';

import LabelGenerator from './pages/LabelGenerator';
import BriLabelGenerator from './pages/BriLabelGenerator';
import PrintLabel from './pages/PrintLabel';

import type { Store } from './types/store';

type Page = 'alfamart' | 'bri';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('alfamart');

  const [printStores, setPrintStores] = useState<Store[] | null>(
    null
  );

  // Buka halaman Print Label Alfamart
  const handlePrint = (stores: Store[]) => {
    setPrintStores([...stores]);
  };

  // Kembali dari halaman Print Label
  const handleBackFromPrint = () => {
    setPrintStores(null);
    setActivePage('alfamart');
  };

  const isPrinting = printStores !== null;

  return (
    <>
      {/* Navigasi Alfamart dan BRI */}
      {!isPrinting && (
        <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setActivePage('alfamart')}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                activePage === 'alfamart'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Alfamart
            </button>

            <button
              type="button"
              onClick={() => setActivePage('bri')}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                activePage === 'bri'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              BRI
            </button>
          </div>
        </nav>
      )}

      {/* Halaman Alfamart */}
      <div
        style={{
          display:
            !isPrinting && activePage === 'alfamart'
              ? 'block'
              : 'none',
        }}
      >
        <LabelGenerator onPrint={handlePrint} />
      </div>

      {/* Halaman BRI */}
      <div
        style={{
          display:
            !isPrinting && activePage === 'bri'
              ? 'block'
              : 'none',
        }}
      >
        <BriLabelGenerator
          onBack={() => setActivePage('alfamart')}
        />
      </div>

      {/* Halaman Print Alfamart */}
      {printStores !== null && (
        <PrintLabel
          stores={printStores}
          onBack={handleBackFromPrint}
        />
      )}
    </>
  );
}
