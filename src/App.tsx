import { useState, useMemo, useEffect } from 'react';
import {
  coursesList,
  coursesDatabase,
  getCourseGECategories,
  getCourseModality,
  getPrimaryExam,
  hasLabDemoCredit,
  satisfiesDiversity,
  satisfiesWritingII,
  hasOpenSeats,
  haveConflictingExams,
  matchesMajorOrStanding,
} from './data/coursesData';
import { Navbar } from './components/Navbar';
import { FilterPanel } from './components/FilterPanel';
import { CourseCard } from './components/CourseCard';
import { CourseDetailModal } from './components/CourseDetailModal';
import { ShortlistDrawer } from './components/ShortlistDrawer';
import type { FilterState, CourseData } from './types/ge';
import {
  BookOpen,
  Filter,
  Sparkles,
  Layers,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';

const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  selectedCategories: [],
  modality: 'all',
  majorStanding: 'all',
  openSeatsOnly: false,
  labDemoOnly: false,
  writingIIOnly: false,
  diversityOnly: false,
  hideExamConflicts: false,
  selectedExamDate: 'all',
};

export function App() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [shortlist, setShortlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ucla_ge_shortlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'code' | 'seats' | 'units' | 'exam'>('code');

  // Save shortlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ucla_ge_shortlist', JSON.stringify(shortlist));
    } catch {
      // ignore
    }
  }, [shortlist]);

  // Shortlisted course objects
  const shortlistedCourseObjects = useMemo(() => {
    return shortlist
      .map((code) => coursesDatabase[code])
      .filter((c): c is CourseData => Boolean(c));
  }, [shortlist]);

  // Compute conflicts with shortlisted courses for all courses
  const conflictsMap = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const course of coursesList) {
      const conflictingTitles: string[] = [];
      for (const pinned of shortlistedCourseObjects) {
        if (haveConflictingExams(course, pinned)) {
          conflictingTitles.push(pinned.course.course_code);
        }
      }
      if (conflictingTitles.length > 0) {
        map.set(course.course.course_code, conflictingTitles);
      }
    }

    return map;
  }, [shortlistedCourseObjects]);

  // Check if any pinned courses conflict with each other
  const hasPlanConflicts = useMemo(() => {
    for (let i = 0; i < shortlistedCourseObjects.length; i++) {
      for (let j = i + 1; j < shortlistedCourseObjects.length; j++) {
        if (haveConflictingExams(shortlistedCourseObjects[i], shortlistedCourseObjects[j])) {
          return true;
        }
      }
    }
    return false;
  }, [shortlistedCourseObjects]);

  // Active filter count computation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.selectedCategories.length > 0) count += filters.selectedCategories.length;
    if (filters.modality !== 'all') count++;
    if (filters.majorStanding !== 'all') count++;
    if (filters.openSeatsOnly) count++;
    if (filters.labDemoOnly) count++;
    if (filters.writingIIOnly) count++;
    if (filters.diversityOnly) count++;
    if (filters.hideExamConflicts) count++;
    if (filters.selectedExamDate !== 'all') count++;
    return count;
  }, [filters]);

  // Filter pipeline
  const filteredCourses = useMemo(() => {
    return coursesList.filter((course) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const words = filters.searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        const code = course.course.course_code.toLowerCase();
        const codeNoZeroes = code.replace(/0+/g, '');
        const title = course.course.title.toLowerCase();
        const instructors = course.lectures.map((l) => l.instructor.toLowerCase()).join(' ');
        const descriptions = course.lectures.map((l) => (l.course_description || '').toLowerCase()).join(' ');
        const departments = course.lectures.map((l) => (l.department || '').toLowerCase()).join(' ');

        const allWordsMatch = words.every(
          (w) =>
            code.includes(w) ||
            codeNoZeroes.includes(w) ||
            title.includes(w) ||
            instructors.includes(w) ||
            descriptions.includes(w) ||
            departments.includes(w)
        );

        if (!allWordsMatch) return false;
      }

      // 2. GE Categories
      if (filters.selectedCategories.length > 0) {
        const courseCats = getCourseGECategories(course);
        const matchesAny = filters.selectedCategories.some((c) => courseCats.includes(c));
        if (!matchesAny) return false;
      }

      // 3. Modality
      if (filters.modality !== 'all') {
        const courseModality = getCourseModality(course);
        if (courseModality !== filters.modality) return false;
      }

      // 4. Major Standing & Restrictions
      if (filters.majorStanding !== 'all') {
        if (!matchesMajorOrStanding(course, filters.majorStanding)) return false;
      }

      // 5. Open Seats Only
      if (filters.openSeatsOnly && !hasOpenSeats(course)) {
        return false;
      }

      // 6. GE Lab / Demo Credit
      if (filters.labDemoOnly && !hasLabDemoCredit(course)) {
        return false;
      }

      // 7. Writing II
      if (filters.writingIIOnly && !satisfiesWritingII(course)) {
        return false;
      }

      // 8. Diversity
      if (filters.diversityOnly && !satisfiesDiversity(course)) {
        return false;
      }

      // 9. Exam Date Filter
      if (filters.selectedExamDate !== 'all') {
        const exam = getPrimaryExam(course);
        if (!exam || !exam.date.toLowerCase().includes(filters.selectedExamDate.toLowerCase())) {
          return false;
        }
      }

      // 10. Hide Exam Conflicts with My Plan
      if (filters.hideExamConflicts) {
        const conflicts = conflictsMap.get(course.course.course_code);
        if (conflicts && conflicts.length > 0) return false;
      }

      return true;
    });
  }, [filters, conflictsMap]);

  // Sort pipeline
  const sortedCourses = useMemo(() => {
    const list = [...filteredCourses];
    if (sortBy === 'code') {
      list.sort((a, b) => a.course.course_code.localeCompare(b.course.course_code));
    } else if (sortBy === 'seats') {
      list.sort((a, b) => {
        const spotsA = a.lectures[0]?.enrollment?.spots_left ?? -1;
        const spotsB = b.lectures[0]?.enrollment?.spots_left ?? -1;
        return spotsB - spotsA;
      });
    } else if (sortBy === 'units') {
      list.sort((a, b) => {
        const uA = parseFloat(a.lectures[0]?.units || '0');
        const uB = parseFloat(b.lectures[0]?.units || '0');
        return uB - uA;
      });
    } else if (sortBy === 'exam') {
      list.sort((a, b) => {
        const eA = getPrimaryExam(a)?.date || '';
        const eB = getPrimaryExam(b)?.date || '';
        return eA.localeCompare(eB);
      });
    }
    return list;
  }, [filteredCourses, sortBy]);

  const toggleShortlist = (code: string) => {
    setShortlist((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <Navbar
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters({ ...filters, searchQuery: q })}
        shortlistCount={shortlist.length}
        hasConflicts={hasPlanConflicts}
        onToggleShortlist={() => setIsShortlistOpen(true)}
        totalCoursesCount={coursesList.length}
        filteredCount={filteredCourses.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Quick Banner */}
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fall 2026 GE Course Schedule</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Find the Perfect UCLA General Education Classes
            </h1>
            <p className="text-sm sm:text-base text-blue-200 leading-relaxed">
              Filter through all UCLA GE offerings by your major, instructional modality, foundation
              category, and automated final examination conflict detection.
            </p>

            {/* Quick Stat Chips */}
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-blue-100">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>{coursesList.length} Available GE Courses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>7 UCLA Foundation Categories</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>Automated Final Exam Conflict Detection</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>{isMobileFilterOpen ? 'Hide Filters' : 'Show Filters'}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <span className="text-xs text-slate-500 font-medium">
              {filteredCourses.length} results
            </span>
          </div>

          {/* Left Column: Filter Sidebar */}
          <div
            className={`lg:block ${
              isMobileFilterOpen ? 'block' : 'hidden'
            } lg:col-span-1 sticky top-24 z-20`}
          >
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={handleResetFilters}
              activeFilterCount={activeFilterCount}
              shortlistCount={shortlist.length}
            />
          </div>

          {/* Right Column: Course Grid & Sort Controls */}
          <div className="lg:col-span-3 space-y-5">
            {/* Control Bar: Sort & Active Chips */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  {filteredCourses.length}
                </strong>{' '}
                matching courses
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="code">Course Code (A - Z)</option>
                  <option value="seats">Most Open Seats</option>
                  <option value="units">Units (High to Low)</option>
                  <option value="exam">Final Exam Date</option>
                </select>
              </div>
            </div>

            {/* Course Cards Grid */}
            {sortedCourses.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Filter className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                    No classes match your current filters
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Try unchecking specific restrictions, clearing the search keyword, or allowing
                    multiple GE categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedCourses.map((course) => {
                  const code = course.course.course_code;
                  const isSaved = shortlist.includes(code);
                  const conflicts = conflictsMap.get(code);

                  return (
                    <CourseCard
                      key={code}
                      course={course}
                      isShortlisted={isSaved}
                      onToggleShortlist={() => toggleShortlist(code)}
                      onSelect={() => setSelectedCourse(course)}
                      examConflictWith={conflicts}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Course Detail Modal */}
      <CourseDetailModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        isShortlisted={selectedCourse ? shortlist.includes(selectedCourse.course.course_code) : false}
        onToggleShortlist={() => {
          if (selectedCourse) toggleShortlist(selectedCourse.course.course_code);
        }}
        examConflictWith={selectedCourse ? conflictsMap.get(selectedCourse.course.course_code) : undefined}
      />

      {/* Shortlist Drawer */}
      <ShortlistDrawer
        isOpen={isShortlistOpen}
        onClose={() => setIsShortlistOpen(false)}
        shortlistedCourses={shortlistedCourseObjects}
        onRemove={toggleShortlist}
        onClearAll={() => setShortlist([])}
        onSelectCourse={(c) => setSelectedCourse(c)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UCLA General Education Course Explorer & Schedule Planner</span>
          <span className="text-slate-400">
            Real-time enrollment, final exam, and GE category data fetched from the UCLA Registrar
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
