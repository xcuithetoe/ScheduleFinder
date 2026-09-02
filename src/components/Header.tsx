import React from 'react';
import { Layers, ShieldCheck, Clock, CalendarDays } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center text-white font-semibold text-sm tracking-tight">
                SC
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">Schedule Cleaner</h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-2xl">
              Upload course lecture and discussion time slots in CSV format. The tool enforces scheduling constraints, eliminates conflicts, and outputs candidate schedules ranked by optimal time distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-600">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
              No Overlaps
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              Max 3 Classes/Day
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
              <Clock className="w-3.5 h-3.5 text-zinc-700" />
              &ge; 5 Min Gap
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 border border-zinc-200">
              <CalendarDays className="w-3.5 h-3.5 text-zinc-700" />
              Start &ge; 9:00 AM
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
