import React from 'react';
import {
  X,
  Bookmark,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { CourseData } from '../types/ge';
import { getPrimaryExam, haveConflictingExams } from '../data/coursesData';

interface ShortlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shortlistedCourses: CourseData[];
  onRemove: (courseCode: string) => void;
  onClearAll: () => void;
  onSelectCourse: (course: CourseData) => void;
}

export const ShortlistDrawer: React.FC<ShortlistDrawerProps> = ({
  isOpen,
  onClose,
  shortlistedCourses,
  onRemove,
  onClearAll,
  onSelectCourse,
}) => {
  if (!isOpen) return null;

  // Calculate total units
  const totalUnits = shortlistedCourses.reduce((sum, c) => {
    const u = parseFloat(c.lectures[0]?.units || '4.0') || 4;
    return sum + u;
  }, 0);

  // Check conflicts among shortlisted courses
  const conflicts: { courseA: CourseData; courseB: CourseData; examDate: string; examTime: string }[] = [];
  for (let i = 0; i < shortlistedCourses.length; i++) {
    for (let j = i + 1; j < shortlistedCourses.length; j++) {
      const cA = shortlistedCourses[i];
      const cB = shortlistedCourses[j];
      if (haveConflictingExams(cA, cB)) {
        const exam = getPrimaryExam(cA);
        conflicts.push({
          courseA: cA,
          courseB: cB,
          examDate: exam?.date || 'Unknown Date',
          examTime: exam?.time || 'Unknown Time',
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600 fill-current" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              My Saved Plan ({shortlistedCourses.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan Stats Bar */}
        <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
          <span className="text-blue-900 dark:text-blue-200 font-medium">
            Total Workload: <strong className="text-sm font-bold">{totalUnits.toFixed(1)} Units</strong>
          </span>
          {shortlistedCourses.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>

        {/* Conflicts Banner */}
        {conflicts.length > 0 ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Final Exam Conflict Detected!</span>
            </div>
            {conflicts.map((conf, idx) => (
              <div
                key={idx}
                className="text-xs text-amber-800 dark:text-amber-300 bg-white/70 dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800"
              >
                <strong>{conf.courseA.course.course_code}</strong> and{' '}
                <strong>{conf.courseB.course.course_code}</strong> both have their final exam on{' '}
                <span className="underline font-bold">
                  {conf.examDate} at {conf.examTime}
                </span>
                .
              </div>
            ))}
          </div>
        ) : shortlistedCourses.length > 1 ? (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>No final exam conflicts detected among your saved courses!</span>
          </div>
        ) : null}

        {/* Saved Courses List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {shortlistedCourses.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bookmark className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-semibold text-sm">No courses saved yet.</p>
              <p className="text-xs">
                Browse classes and click the bookmark icon to plan your schedule and test for exam conflicts.
              </p>
            </div>
          ) : (
            shortlistedCourses.map((c) => {
              const lec = c.lectures[0];
              const meeting = lec?.meetings[0];
              const exam = getPrimaryExam(c);

              return (
                <div
                  key={c.course.course_code}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-start justify-between gap-3"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectCourse(c)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-blue-900 dark:text-sky-300">
                        {c.course.course_code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {lec?.units || '4.0'}u
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mb-2">
                      {c.course.title}
                    </h4>

                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          {meeting?.days} {meeting?.time}
                        </span>
                      </div>
                      {exam && (
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>
                            Exam: {exam.day}, {exam.time}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemove(c.course.course_code)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                    title="Remove from plan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            Continue Browsing Classes
          </button>
        </div>
      </div>
    </div>
  );
};
