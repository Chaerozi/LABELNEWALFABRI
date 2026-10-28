
import { useState } from 'react';

import Logo from './assets/Logo.png';
import AlfaLogo from './assets/Alfa.svg';
import BriLogo from './assets/BRI.png';
import PegadaianLogo from './assets/Pegadaian.png';

import LabelGenerator from './pages/LabelGenerator';
import BriLabelGenerator from './pages/BriLabelGenerator';
import PegadaianLabelGenerator from './pages/PegadaianLabelGenerator';
import PrintLabel from './pages/PrintLabel';

import type { Store as StoreData } from './types/store';

type Page = 'alfamart' | 'bri' | 'pegadaian';

interface NavigationItem {
  id: Page;
  label: string;
  logo: string;
}

const navigation: NavigationItem[] = [
  {
    id: 'alfamart',
    label: 'Alfamart',
    logo: AlfaLogo,
  },
  {
    id: 'bri',
    label: 'BRI',
    logo: BriLogo,
  },
  {
    id: 'pegadaian',
    label: 'Pegadaian',
    logo: PegadaianLogo,
  },
];

export default function App() {
  const [activePage, setActivePage] =
    useState<Page>('alfamart');

  const [printStores, setPrintStores] =
    useState<StoreData[] | null>(null);

  const isPrinting = printStores !== null;

  const handlePrint = (stores: StoreData[]) => {
    setPrintStores([...stores]);
  };

  const handleBackFromPrint = () => {
    setPrintStores(null);
    setActivePage('alfamart');
  };

  const handleNavigate = (page: Page) => {
    if (isPrinting) return;

    setActivePage(page);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* NAVBAR UTAMA */}
      {!isPrinting && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            {/* LOGO UTAMA */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src={Logo}
                  alt="Logo SD-WAN Label Generator"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0 border-l border-slate-200 pl-3">
                <h1 className="truncate text-[13px] font-semibold tracking-tight text-slate-900 sm:text-sm">
                  SD-WAN Label Generator
                </h1>

                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  Label Management System
                </p>
              </div>
            </div>

            {/* NAVIGASI DESKTOP */}
            <nav
              aria-label="Navigasi generator"
              className="hidden items-center gap-1.5 md:flex"
            >
              {navigation.map((item) => {
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'relative inline-flex h-11 items-center justify-center gap-2.5',
                      'rounded-lg border px-3.5 text-[13px] font-medium',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-slate-400 focus-visible:ring-offset-2',
                      isActive
                        ? 'border-slate-200 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {/* LOGO UKURAN SAMA */}
                    <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden">
                      <img
                        src={item.logo}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain"
                      />
                    </span>

                    <span>{item.label}</span>

                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-red-600"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* NAVIGASI TABLET */}
            <nav
              aria-label="Navigasi generator tablet"
              className="hidden items-center gap-1 sm:flex md:hidden"
            >
              {navigation.map((item) => {
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'inline-flex h-10 items-center gap-1.5 rounded-lg border px-2',
                      'text-xs font-medium transition-colors',
                      isActive
                        ? 'border-slate-200 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden">
                      <img
                        src={item.logo}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain"
                      />
                    </span>

                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* NAVIGASI MOBILE */}
          <nav
            aria-label="Navigasi generator mobile"
            className="border-t border-slate-100 px-3 py-2 sm:hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {navigation.map((item) => {
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={[
                      'relative flex min-h-[70px] min-w-0 flex-col items-center justify-center gap-1',
                      'rounded-lg border px-2 py-2',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                      isActive
                        ? 'border-slate-300 bg-slate-50 text-slate-900'
                        : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {/* LOGO MOBILE UKURAN SAMA */}
                    <div className="flex h-9 w-14 items-center justify-center overflow-hidden">
                      <img
                        src={item.logo}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <span className="max-w-full truncate text-[11px] font-medium">
                      {item.label}
                    </span>

                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-red-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>
      )}

      {/* HALAMAN ALFAMART */}
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

      {/* HALAMAN BRI */}
      <div
        style={{
          display:
            !isPrinting && activePage === 'bri'
              ? 'block'
              : 'none',
        }}
      >
        <BriLabelGenerator
          onBack={() => handleNavigate('alfamart')}
        />
      </div>

      {/* HALAMAN PEGADAIAN */}
      <div
        style={{
          display:
            !isPrinting && activePage === 'pegadaian'
              ? 'block'
              : 'none',
        }}
      >
        <PegadaianLabelGenerator
          onBack={() => handleNavigate('alfamart')}
        />
      </div>

      {/* HALAMAN PRINT ALFAMART */}
      {printStores !== null && (
        <PrintLabel
          stores={printStores}
          onBack={handleBackFromPrint}
        />
      )}
    </div>
  );
}
