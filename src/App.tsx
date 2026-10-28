
import { useState } from 'react';
import {
  Building2,
  Landmark,
  Store,
  type LucideIcon,
} from 'lucide-react';

import Logo from './assets/Logo.png';

import LabelGenerator from './pages/LabelGenerator';
import BriLabelGenerator from './pages/BriLabelGenerator';
import PegadaianLabelGenerator from './pages/PegadaianLabelGenerator';
import PrintLabel from './pages/PrintLabel';

import type { Store as StoreData } from './types/store';

type Page = 'alfamart' | 'bri' | 'pegadaian';

interface NavigationItem {
  id: Page;
  label: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  {
    id: 'alfamart',
    label: 'Alfamart',
    icon: Store,
  },
  {
    id: 'bri',
    label: 'BRI',
    icon: Landmark,
  },
  {
    id: 'pegadaian',
    label: 'Pegadaian',
    icon: Building2,
  },
];

export default function App() {
  const [activePage, setActivePage] =
    useState<Page>('alfamart');

  const [printStores, setPrintStores] =
    useState<StoreData[] | null>(null);

  const isPrinting = printStores !== null;

  // Buka halaman Print Alfamart
  const handlePrint = (stores: StoreData[]) => {
    setPrintStores([...stores]);
  };

  // Kembali dari halaman Print
  const handleBackFromPrint = () => {
    setPrintStores(null);
    setActivePage('alfamart');
  };

  // Navigasi antar halaman
  const handleNavigate = (page: Page) => {
    if (isPrinting) return;

    setActivePage(page);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* =====================================
          NAVBAR UTAMA
      ===================================== */}

      {!isPrinting && (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-[64px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">

            {/* BRAND / LOGO */}
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src={Logo}
                  alt="Logo SD-WAN Label Generator"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="hidden min-w-0 sm:block">
                <h1 className="text-[13px] font-semibold leading-tight tracking-tight text-slate-900">
                  SD-WAN Label Generator
                </h1>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  Label Management System
                </p>
              </div>
            </div>

            {/* NAVIGASI DESKTOP */}
            <nav
              aria-label="Navigasi generator"
              className="hidden items-center gap-1 md:flex"
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={
                      isActive ? 'page' : undefined
                    }
                    className={[
                      'relative inline-flex h-9 items-center justify-center gap-2',
                      'rounded-lg px-3.5 text-[13px] font-medium',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-red-500 focus-visible:ring-offset-2',
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />

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
              aria-label="Navigasi generator"
              className="hidden items-center gap-1 sm:flex md:hidden"
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={
                      isActive ? 'page' : undefined
                    }
                    className={[
                      'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5',
                      'text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
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
            <div className="grid grid-cols-3 gap-1.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    aria-current={
                      isActive ? 'page' : undefined
                    }
                    className={[
                      'flex min-h-11 min-w-0 items-center justify-center gap-1.5',
                      'rounded-lg px-2 text-[11px] font-medium',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-red-500',
                      isActive
                        ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                        : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.8}
                      className="shrink-0"
                      aria-hidden="true"
                    />

                    <span className="truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </header>
      )}

      {/* =====================================
          HALAMAN ALFAMART
      ===================================== */}

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

      {/* =====================================
          HALAMAN BRI
      ===================================== */}

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

      {/* =====================================
          HALAMAN PEGADAIAN
      ===================================== */}

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

      {/* =====================================
          HALAMAN PRINT ALFAMART
      ===================================== */}

      {printStores !== null && (
        <PrintLabel
          stores={printStores}
          onBack={handleBackFromPrint}
        />
      )}
    </div>
  );
}
