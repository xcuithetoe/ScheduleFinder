import React from 'react';
import {
  Bookmark,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Building2,
  Laptop,
  CheckCircle2,
  XCircle,
  FlaskConical,
  BookOpen,
  Globe,
  ChevronRight,
} from 'lucide-react';
import type { CourseData } from '../types/ge';
import {
  getCourseGECategories,
  getCourseModality,
  getPrimaryExam,
  hasLabDemoCredit,
  satisfiesDiversity,
  satisfiesWritingII,
} from '../data/coursesData';
import { GE_CATEGORIES } from '../types/ge';

interface CourseCardProps {
  course: CourseData;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
  onSelect: () => void;
  examConflictWith?: string[]; // list of course titles that clash
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isShortlisted,
  onToggleShortlist,
  onSelect,
  examConflictWith,
}) => {
  const primaryLec = course.lectures[0];
  const primaryMeeting = primaryLec?.meetings[0];
  const exam = getPrimaryExam(course);
  const modality = getCourseModality(course);
  const categories = getCourseGECategories(course);

  const hasLab = hasLabDemoCredit(course);
  const isWritingII = satisfiesWritingII(course);
  const isDiversity = satisfiesDiversity(course);

  const hasConflict = examConflictWith && examConflictWith.length > 0;

  // Enrollment status formatting
  const statusLower = primaryLec?.status?.toLowerCase() || 'unknown';
  const isOpen = statusLower === 'open';
  const spotsLeft = primaryLec?.enrollment?.spots_left;
  const enrolled = primaryLec?.enrollment?.enrolled;
  const capacity = primaryLec?.enrollment?.capacity;

  const restrictions = primaryLec?.restrictions || [];
  const hasDeptConsent = restrictions.some((r) => r.toLowerCase().includes('department consent'));
  const isNewOnly = restrictions.some(
    (r) => r.toLowerCase().includes('new student') || r.toLowerCase().includes('new transfer')
  );

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all hover:shadow-md flex flex-col justify-between ${
        hasConflict
          ? 'border-amber-400/80 dark:border-amber-500/60 bg-amber-50/20'
          : isShortlisted
          ? 'border-blue-500/80 dark:border-sky-500/60 ring-1 ring-blue-500/30 dark:ring-sky-400/30'
          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-blue-900 dark:text-sky-300">
              {course.course.course_code}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {primaryLec?.units || '4.0'} Units
            </span>

            {modality === 'online' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">
                <Laptop className="w-3 h-3" />
                Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                <Building2 className="w-3 h-3 text-slate-400" />
                In-Person
              </span>
            )}
          </div>

          {/* Bookmark / Pin to Plan button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleShortlist();
            }}
            title={isShortlisted ? 'Remove from My Plan' : 'Save to My Plan'}
            className={`p-2 rounded-xl transition-all ${
              isShortlisted
                ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Course Title */}
        <h3
          onClick={onSelect}
          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors cursor-pointer line-clamp-2 leading-snug mb-3"
        >
          {course.course.title}
        </h3>

        {/* Schedule & Location */}
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {primaryMeeting?.days ? (
                <span>
                  <strong>{primaryMeeting.days}</strong> {primaryMeeting.time}
                </span>
              ) : (
                <span className="italic text-slate-400">Time to be arranged</span>
              )}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <User className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[110px]">{primaryLec?.instructor || 'TBA'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{primaryMeeting?.location || 'Location TBA'}</span>
          </div>
        </div>

        {/* Exam Conflict Alert Box */}
        {hasConflict && (
          <div className="mb-3.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold leading-tight">Final Exam Conflict!</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Clashes with <strong>{examConflictWith.join(', ')}</strong> ({exam?.time})
              </p>
            </div>
          </div>
        )}

        {/* GE Category Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map((catId) => {
            const def = GE_CATEGORIES.find((c) => c.id === catId);
            if (!def) return null;
            return (
              <span
                key={catId}
                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${def.badgeColor}`}
              >
                {def.label}
              </span>
            );
          })}

          {hasLab && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300/60">
              <FlaskConical className="w-2.5 h-2.5" />
              Lab/Demo
            </span>
          )}

          {isWritingII && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/60">
              <BookOpen className="w-2.5 h-2.5" />
              Writing II
            </span>
          )}

          {isDiversity && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300/60">
              <Globe className="w-2.5 h-2.5" />
              Diversity
            </span>
          )}

          {hasDeptConsent && (
            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200">
              Dept Consent
            </span>
          )}

          {isNewOnly && (
            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200">
              New Students
            </span>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {/* Status & Seats */}
        <div className="flex items-center gap-1.5">
          {isOpen ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                {spotsLeft !== undefined && spotsLeft !== null
                  ? `${spotsLeft} spots left`
                  : 'Open'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{primaryLec?.status || 'Closed'}</span>
            </div>
          )}

          {capacity && enrolled !== undefined && (
            <span className="text-[11px] text-slate-400">
              ({enrolled}/{capacity})
            </span>
          )}
        </div>

        {/* View Details button */}
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-sky-400 hover:text-blue-800 dark:hover:text-sky-300 transition-colors"
        >
          <span>Details</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
