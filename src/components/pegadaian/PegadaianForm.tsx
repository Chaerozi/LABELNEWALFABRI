
import { useState, type FormEvent } from 'react';
import type { PegadaianLabel } from '../../types/pegadaian';

interface Props {
  onAdd: (item: PegadaianLabel) => void;
}

export default function PegadaianForm({ onAdd }: Props) {
  const [kanwil, setKanwil] = useState('');
  const [unit, setUnit] = useState('');
  const [ipLan, setIpLan] = useState('');
  const [noSimcard, setNoSimcard] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (![kanwil, unit, ipLan, noSimcard].every((v) => v.trim())) {
      return;
    }

    onAdd({
      id: crypto.randomUUID(),
      kanwil: kanwil.trim(),
      unit: unit.trim(),
      ipLan: ipLan.trim(),
      noSimcard: noSimcard.trim(),
    });

    // KANWIL dipertahankan agar input banyak unit lebih cepat.
    setUnit('');
    setIpLan('');
    setNoSimcard('');
  };

  const fields = [
    {
      label: 'KANWIL',
      value: kanwil,
      change: setKanwil,
      placeholder: 'Contoh: PALEMBANG',
    },
    {
      label: 'UNIT',
      value: unit,
      change: setUnit,
      placeholder: 'Nama unit Pegadaian',
    },
    {
      label: 'IP LAN',
      value: ipLan,
      change: setIpLan,
      placeholder: 'Contoh: 10.31.87.1',
    },
    {
      label: 'No SIMCARD',
      value: noSimcard,
      change: setNoSimcard,
      placeholder: 'Nomor SIMCARD',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.label} className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              {field.label}
            </span>
            <input
              required
              type="text"
              value={field.value}
              onChange={(e) => field.change(e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          + Tambah Unit
        </button>
      </div>
    </form>
  );
}
