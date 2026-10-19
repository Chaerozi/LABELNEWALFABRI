
import { useState, type FormEvent } from 'react';
import type { BriLabel } from '../../types/bri';

interface BriFormProps {
  onAdd: (label: BriLabel) => void;
}

export default function BriForm({ onAdd }: BriFormProps) {
  const [services, setServices] = useState('');
  const [site, setSite] = useState('');
  const [noIot, setNoIot] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!services.trim() || !site.trim() || !noIot.trim()) {
      return;
    }

    onAdd({
      id: crypto.randomUUID(),
      services: services.trim(),
      site: site.trim(),
      noIot: noIot.trim(),
    });

    setServices('');
    setSite('');
    setNoIot('');
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold text-gray-900">
        Input Data BRI
      </h2>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Services
          </label>
          <input
            value={services}
            onChange={(e) => setServices(e.target.value)}
            placeholder="Contoh: GBR"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Site
          </label>
          <input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="Contoh: GBRNEW-BRI-TID-70117"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            No IoT
          </label>
          <input
            value={noIot}
            onChange={(e) => setNoIot(e.target.value)}
            placeholder="Contoh: 085140044572"
            className={inputClass}
            required
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Helpdesk: 081113017039 (otomatis)
      </p>

      <button
        type="submit"
        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
      >
        + Tambah Data BRI
      </button>
    </form>
  );
}
