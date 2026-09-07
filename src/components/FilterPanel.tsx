import React from 'react';
import {
  Filter,
  RotateCcw,
  Building2,
  Laptop,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FlaskConical,
  Award,
  Globe,
  UserCheck,
} from 'lucide-react';
import {
  GE_CATEGORIES,
  type FilterState,
  type GECategoryId,
} from '../types/ge';
import { UNIQUE_EXAM_DATES } from '../data/coursesData';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFilterCount: number;
  shortlistCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  activeFilterCount,
  shortlistCount,
}) => {
  const toggleCategory = (catId: GECategoryId) => {
    const next = filters.selectedCategories.includes(catId)
      ? filters.selectedCategories.filter((c) => c !== catId)
      : [...filters.selectedCategories, catId];
    onChange({ ...filters, selectedCategories: next });
  };

  return (
    <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <h2 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white uppercase">
            Filter Courses
          </h2>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all
          </button>
        )}
      </div>

      {/* 1. What Major / Student Standing Am I? */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <UserCheck className="w-4 h-4 text-blue-500" />
          Student Standing & Major
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter classes based on enrollment restrictions and major holds:
        </p>
        <select
          value={filters.majorStanding}
          onChange={(e) => onChange({ ...filters, majorStanding: e.target.value })}
          className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="all">All Courses (Ignore Restrictions)</option>
          <option value="open_all">Open to Any Major (No Major Holds)</option>
          <option value="no_consent">No Department Consent Needed</option>
          <option value="freshmen">Freshmen / New Students Eligible</option>
          <option value="transfers">New Transfers Eligible</option>
          <option value="humanities_majors">Humanities & Arts Majors</option>
          <option value="social_sci_majors">Social Sciences Majors</option>
          <option value="stem_majors">STEM & Health Pre-Majors</option>
        </select>
      </div>

      {/* 2. Instructional Modality */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Building2 className="w-4 h-4 text-indigo-500" />
          Class Modality
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
          {(
            [
              { value: 'all', label: 'All', icon: Layers },
              { value: 'in_person', label: 'In-Person', icon: Building2 },
              { value: 'online', label: 'Online', icon: Laptop },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ ...filters, modality: value })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
                filters.modality === value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. GE Foundation Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <BookOpen className="w-4 h-4 text-purple-500" />
            GE Foundation Categories
          </label>
          {filters.selectedCategories.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, selectedCategories: [] })}
              className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {GE_CATEGORIES.map((cat) => {
            const isSelected = filters.selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left border ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex flex-col">
                  <span>{cat.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                    {cat.foundation}
                  </span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Degree Requirement Badges */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Award className="w-4 h-4 text-emerald-500" />
          Special Requirements
        </label>
        <div className="space-y-2">
          {/* GE Lab/Demo */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={filters.labDemoOnly}
              onChange={(e) => onChange({ ...filters, labDemoOnly: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
            <span className="text-slate-800 dark:text-slate-200">Carries GE Lab / Demo Credit</span>
          </label>

          {/* Writing II */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={filters.writingIIOnly}
              onChange={(e) => onChange({ ...filters, writingIIOnly: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-slate-800 dark:text-slate-200">Fulfills Writing II</span>
          </label>

          {/* Diversity */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={filters.diversityOnly}
              onChange={(e) => onChange({ ...filters, diversityOnly: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-slate-800 dark:text-slate-200">Fulfills Diversity</span>
          </label>

          {/* Open Seats */}
          <label className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={filters.openSeatsOnly}
              onChange={(e) => onChange({ ...filters, openSeatsOnly: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-800 dark:text-slate-200">Open Seats Available Only</span>
          </label>
        </div>
      </div>

      {/* 5. Final Exam Conflict Checker */}
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-amber-500" />
          Final Exam Schedule
        </label>

        {/* Conflict toggle for shortlisted classes */}
        <label
          className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
            filters.hideExamConflicts
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <input
            type="checkbox"
            checked={filters.hideExamConflicts}
            onChange={(e) => onChange({ ...filters, hideExamConflicts: e.target.checked })}
            disabled={shortlistCount === 0}
            className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 disabled:opacity-50"
          />
          <div className="flex flex-col">
            <span className="flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Hide My Exam Conflicts
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              {shortlistCount === 0
                ? 'Pin courses to your plan first to check conflicts'
                : `Hides classes whose exam clashes with ${shortlistCount} pinned course(s)`}
            </span>
          </div>
        </label>

        {/* Filter by Exam Date */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            View by Final Exam Date:
          </span>
          <select
            value={filters.selectedExamDate}
            onChange={(e) => onChange({ ...filters, selectedExamDate: e.target.value })}
            className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="all">Any Final Exam Date</option>
            {UNIQUE_EXAM_DATES.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
};
