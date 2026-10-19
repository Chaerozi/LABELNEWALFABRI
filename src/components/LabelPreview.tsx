
import type { Store } from '../types/store';

interface LabelPreviewProps {
  stores: Store[];
}

const SITE_NUMBER = '081113017039';

interface LabelData {
  title: string;
  storeCode: string;
  number: string;
}

function createStoreLabels(store: Store): LabelData[] {
  return [
    {
      title: 'SITE: MTM',
      storeCode: store.storeCode,
      number: SITE_NUMBER,
    },
    {
      title: 'Modem: Primary',
      storeCode: store.storeCode,
      number: store.primaryNumber,
    },
    {
      title: 'Modem: Backup',
      storeCode: store.storeCode,
      number: store.backupNumber,
    },
    {
      title: 'SITE: MTM',
      storeCode: store.storeCode,
      number: SITE_NUMBER,
    },
  ];
}

function LabelItem({ label }: { label: LabelData }) {
  return (
    <div
      className="flex shrink-0 overflow-hidden bg-white text-black"
      style={{
        width: '64mm',
        height: '32mm',
        fontFamily: 'Calibri, Arial, sans-serif',
      }}
    >
      {/* Logo */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: '21mm' }}
      >
        <img
          src="/Telkomsel.png"
          alt="Telkomsel"
          className="object-contain"
          style={{
            maxWidth: '20mm',
            maxHeight: '28mm',
          }}
        />
      </div>

      {/* Informasi */}
      <div className="flex min-w-0 flex-1 flex-col justify-center pl-1">
        <p className="m-0 text-[13px] leading-[1.3]">
          {label.title}
        </p>

        <p className="m-0 text-[13px] font-bold leading-[1.3]">
          STORE- {label.storeCode}
        </p>

        <p className="m-0 text-[13px] leading-[1.3]">
          SD-WAN – Alfamart
        </p>

        <p className="m-0 text-[13px] leading-[1.3]">
          No: {label.number}
        </p>
      </div>
    </div>
  );
}

export default function LabelPreview({
  stores,
}: LabelPreviewProps) {
  if (stores.length === 0) return null;

  // Setiap halaman berisi maksimal 3 store
  const pages: Store[][] = [];

  for (let i = 0; i < stores.length; i += 3) {
    pages.push(stores.slice(i, i + 3));
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-900">
          Preview Label
        </h3>

        <p className="mt-1 text-xs text-gray-500">
          Tom & Jerry No. 103 · 64 × 32 mm ·
          12 label per lembar
        </p>
      </div>

      {pages.map((pageStores, pageIndex) => (
        <div key={pageIndex}>
          <p className="mb-2 text-xs text-gray-500">
            Lembar {pageIndex + 1}
          </p>

          <div className="overflow-x-auto rounded-lg bg-gray-200 p-4">
            {/* Simulasi kertas 205 × 165 mm */}
            <div
              className="relative bg-white shadow-sm"
              style={{
                width: '205mm',
                height: '165mm',
              }}
            >
              <div
                className="absolute grid grid-cols-3"
                style={{
                  top: '7mm',
                  left: '2mm',
                  columnGap: '4.5mm',
                }}
              >
                {pageStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex flex-col"
                    style={{ rowGap: '6mm' }}
                  >
                    {createStoreLabels(store).map(
                      (label, index) => (
                        <LabelItem
                          key={`${store.id}-${index}`}
                          label={label}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
