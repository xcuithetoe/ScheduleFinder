import React from 'react';
import { Bookmark, GraduationCap, Search, X } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  shortlistCount: number;
  hasConflicts: boolean;
  onToggleShortlist: () => void;
  totalCoursesCount: number;
  filteredCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  shortlistCount,
  hasConflicts,
  onToggleShortlist,
  totalCoursesCount,
  filteredCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  UCLA <span className="text-blue-600 dark:text-sky-400">GE Explorer</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/50">
                  Fall 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                Schedule of Classes & GE Requirement Planner
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-lg relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course (e.g. Physics 1B, Art 31A), instructor, or keyword..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-xs text-right text-slate-500 dark:text-slate-400 font-medium">
              <span>Showing <strong className="text-slate-800 dark:text-white">{filteredCount}</strong> of {totalCoursesCount} classes</span>
            </div>

            <button
              type="button"
              onClick={onToggleShortlist}
              className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                shortlistCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${shortlistCount > 0 ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">My Plan</span>
              {shortlistCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-white text-blue-700 shadow-sm">
                  {shortlistCount}
                </span>
              )}
              {hasConflicts && (
                <span
                  title="Exam conflict detected in your plan!"
                  className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 text-[9px] text-white items-center justify-center font-bold">
                    !
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
