import React from 'react';
import {
  X,
  Calendar,
  Clock,
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Award,
  Globe,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  Bookmark,
  Building,
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

interface CourseDetailModalProps {
  course: CourseData | null;
  onClose: () => void;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
  examConflictWith?: string[];
}

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  onClose,
  isShortlisted,
  onToggleShortlist,
  examConflictWith,
}) => {
  if (!course) return null;

  const primaryLec = course.lectures[0];
  const categories = getCourseGECategories(course);
  const exam = getPrimaryExam(course);
  const modality = getCourseModality(course);

  const hasLab = hasLabDemoCredit(course);
  const isWritingII = satisfiesWritingII(course);
  const isDiversity = satisfiesDiversity(course);
  const hasConflict = examConflictWith && examConflictWith.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-950 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-400 text-slate-950">
              {course.course.course_code}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/15 text-white">
              {primaryLec?.units || '4.0'} Units
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/15 text-white">
              {modality === 'online' ? 'Online' : 'In-Person'}
            </span>
            {primaryLec?.grading && (
              <span className="px-2 py-0.5 rounded-md text-xs bg-white/10 text-white/90">
                {primaryLec.grading}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white pr-8">
            {course.course.title}
          </h2>

          {primaryLec?.department && (
            <div className="flex items-center gap-2 mt-2 text-xs text-blue-200">
              <Building className="w-3.5 h-3.5" />
              <span>Department of {primaryLec.department}</span>
              {primaryLec.department_url && (
                <a
                  href={primaryLec.department_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-amber-300 hover:underline"
                >
                  <span>Website</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Pin to Plan Action */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleShortlist}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                isShortlisted
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isShortlisted ? 'fill-current' : ''}`} />
              <span>{isShortlisted ? 'In Your Plan (Click to Remove)' : 'Add to My Plan'}</span>
            </button>

            {hasConflict && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                <AlertTriangle className="w-4 h-4" />
                Exam clashes with {examConflictWith.join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 1. Description */}
          {primaryLec?.course_description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Course Description
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {primaryLec.course_description}
              </p>
            </div>
          )}

          {/* 2. GE & Degree Requirements Satisfied */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Requirements Satisfied
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((catId) => {
                const def = GE_CATEGORIES.find((c) => c.id === catId);
                if (!def) return null;
                return (
                  <span
                    key={catId}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${def.badgeColor}`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{def.label}</span>
                  </span>
                );
              })}

              {hasLab && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Carries GE Lab / Demo Credit
                </span>
              )}

              {isWritingII && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200">
                  <Award className="w-3.5 h-3.5" />
                  Writing II Satisfied
                </span>
              )}

              {isDiversity && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950 dark:text-teal-200">
                  <Globe className="w-3.5 h-3.5" />
                  Diversity Satisfied
                </span>
              )}
            </div>
          </div>

          {/* 3. Final Exam Schedule */}
          {exam && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Final Examination
                </span>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    {exam.date} ({exam.day})
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>{exam.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Location: {exam.location}
                </p>
              </div>

              {primaryLec?.materials_fee && primaryLec.materials_fee !== '0.00' && (
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Course Materials Fee</span>
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    ${primaryLec.materials_fee}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Course Requisites */}
          {primaryLec?.requisites && primaryLec.requisites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Course Requisites
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">
                    <tr>
                      <th className="p-2.5">Course Name</th>
                      <th className="p-2.5">Min Grade</th>
                      <th className="p-2.5">Pre-requisite</th>
                      <th className="p-2.5">Co-requisite</th>
                      <th className="p-2.5">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {primaryLec.requisites.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {r.course}
                        </td>
                        <td className="p-2.5 font-bold text-blue-600">{r.min_grade}</td>
                        <td className="p-2.5">{r.is_prereq ? 'Yes' : '---'}</td>
                        <td className="p-2.5">{r.is_coreq ? 'Yes' : '---'}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              r.type === 'Enforced'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Enrollment Restrictions & Official Class Notes */}
          {((primaryLec?.restrictions && primaryLec.restrictions.length > 0) ||
            (primaryLec?.class_notes && primaryLec.class_notes.length > 0)) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Restrictions & Class Notes
              </h3>
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 space-y-2">
                {primaryLec?.restrictions?.map((restr, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{restr}</span>
                  </div>
                ))}
                {primaryLec?.class_notes?.map((note, idx) => (
                  <div key={idx} className="text-xs text-amber-800 dark:text-amber-300 pl-6 list-item">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Lectures & Discussion Sections Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              All Lectures & Discussion Sections
            </h3>

            {course.lectures.map((lec) => (
              <div
                key={lec.section_id}
                className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden"
              >
                {/* Lecture Row */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {lec.section_id}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Instructor: <strong>{lec.instructor}</strong>
                    </span>
                    {lec.class_id && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {lec.class_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {lec.meetings.map((m, idx) => (
                      <span key={idx} className="text-slate-600 dark:text-slate-300 font-medium">
                        {m.days} {m.time} ({m.location})
                      </span>
                    ))}
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        lec.status.toLowerCase() === 'open'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {lec.status}
                    </span>
                  </div>
                </div>

                {/* Discussions Table */}
                {lec.discussions && lec.discussions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white dark:bg-slate-900 text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Section</th>
                          <th className="p-2.5">Days & Time</th>
                          <th className="p-2.5">Location</th>
                          <th className="p-2.5">Instructor</th>
                          <th className="p-2.5">Status & Seats</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {lec.discussions.map((d) => (
                          <tr key={d.section_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {d.section_id}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
                              {d.meetings[0]?.days} {d.meetings[0]?.time}
                            </td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">
                              {d.meetings[0]?.location}
                            </td>
                            <td className="p-2.5 text-slate-500">{d.instructor}</td>
                            <td className="p-2.5">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  d.status.toLowerCase() === 'open'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-500'
                                }`}
                              >
                                {d.status === 'Open' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    {d.enrollment?.spots_left !== undefined
                                      ? `${d.enrollment.spots_left} left`
                                      : 'Open'}
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3" />
                                    {d.status}
                                  </>
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-400 italic text-center">
                    No separate discussion sections for this lecture.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 7. External Bookstore & Library Links */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs font-semibold">
            {primaryLec?.textbooks_url && (
              <a
                href={primaryLec.textbooks_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 hover:underline"
              >
                <span>ASUCLA Bookstore Textbooks</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {primaryLec?.library_reserve_url && (
              <a
                href={primaryLec.library_reserve_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 hover:underline"
              >
                <span>UCLA Library Course Reserves</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
