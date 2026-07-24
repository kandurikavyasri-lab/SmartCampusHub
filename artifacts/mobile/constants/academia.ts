export const YEARS = [
  { label: "1st Year", value: "1st" },
  { label: "2nd Year", value: "2nd" },
  { label: "3rd Year", value: "3rd" },
  { label: "4th Year", value: "4th" },
];

export const BRANCHES = [
  { label: "CSE – Computer Science & Engineering",          value: "CSE"        },
  { label: "CSM – CS with AI & Machine Learning",           value: "CSM"        },
  { label: "CSIT – CS & Information Technology",            value: "CSIT"       },
  { label: "ECE – Electronics & Communication",             value: "ECE"        },
  { label: "EEE – Electrical & Electronics Engineering",    value: "EEE"        },
  { label: "Mechanical Engineering",                        value: "Mechanical" },
  { label: "Civil Engineering",                             value: "Civil"      },
  { label: "AI & DS – Artificial Intelligence & Data Science", value: "AIDS"   },
];

export const SECTIONS = [
  { label: "Section A", value: "A" },
  { label: "Section B", value: "B" },
  { label: "Section C", value: "C" },
  { label: "Section D", value: "D" },
];

export const BRANCH_FULL: Record<string, string> = {
  CSE:        "Computer Science & Engineering",
  CSM:        "CS with AI & Machine Learning",
  CSIT:       "CS & Information Technology",
  ECE:        "Electronics & Communication Engineering",
  EEE:        "Electrical & Electronics Engineering",
  Mechanical: "Mechanical Engineering",
  Civil:      "Civil Engineering",
  AIDS:       "Artificial Intelligence & Data Science",
};

export const TARGET_YEARS = [
  { label: "All Years", value: "All" },
  { label: "1st Year",  value: "1st" },
  { label: "2nd Year",  value: "2nd" },
  { label: "3rd Year",  value: "3rd" },
  { label: "4th Year",  value: "4th" },
];

export const TARGET_BRANCHES = [
  { label: "All Branches", value: "All"        },
  { label: "CSE",          value: "CSE"        },
  { label: "CSM",          value: "CSM"        },
  { label: "CSIT",         value: "CSIT"       },
  { label: "ECE",          value: "ECE"        },
  { label: "EEE",          value: "EEE"        },
  { label: "Mechanical",   value: "Mechanical" },
  { label: "Civil",        value: "Civil"      },
  { label: "AI & DS",      value: "AIDS"       },
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  label: `Semester ${n}`,
  value: String(n),
}));

export function getAcademicYearStart(date = new Date()) {
  const calendarYear = date.getFullYear();
  const month = date.getMonth();
  return month >= 5 ? calendarYear : calendarYear - 1;
}

export function formatAcademicYear(startYear: number) {
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function generateAcademicYears(pastYears = 8, futureYears = 1) {
  const currentStart = getAcademicYearStart();
  const startYears = [
    currentStart,
    ...Array.from({ length: futureYears }, (_, index) => currentStart + index + 1),
    ...Array.from({ length: pastYears }, (_, index) => currentStart - index - 1),
  ];

  return startYears.map((startYear) => {
    const academicYear = formatAcademicYear(startYear);
    return { label: academicYear, value: academicYear };
  });
}

export const DEFAULT_ACADEMIC_YEAR = formatAcademicYear(getAcademicYearStart());
export const ACADEMIC_YEARS = generateAcademicYears();

export const NOTIF_CATEGORIES: { label: string; value: NotifCategory; color: string; icon: string }[] = [
  { label: "All",         value: "general",   color: "#6366F1", icon: "bell"       },
  { label: "Exam Alert",  value: "exam",      color: "#EF4444", icon: "edit"       },
  { label: "Supply Exam", value: "supply",    color: "#F97316", icon: "alert-circle"},
  { label: "Timetable",   value: "timetable", color: "#3B82F6", icon: "calendar"   },
  { label: "Holiday",     value: "holiday",   color: "#22C55E", icon: "sun"        },
  { label: "Result",      value: "result",    color: "#8B5CF6", icon: "award"      },
  { label: "General",     value: "general",   color: "#6366F1", icon: "info"       },
];

export type NotifCategory = "exam" | "supply" | "timetable" | "holiday" | "result" | "general";
