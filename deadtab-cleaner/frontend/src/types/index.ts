export interface Note {
  id: string;
  summary: string;
  intentTag: string;
  topicTags: string[];
  readTimeSeconds: number;
  aiModel?: string;
  generatedAt?: string;
}

export interface Archive {
  id: string;
  userId: string;
  url: string;
  title: string;
  domain: string | null;
  focusSeconds: number;
  scrollDepth: number;
  pageTextSnippet: string | null;
  archivedAt: string;
  status: string;
  notes?: Note[]; // Joined from Supabase
}

export interface HabitScoreFactor {
  score: number;
  weight: number;
  tabsPerDay?: number;
  focusedTabs?: number;
  totalTabs?: number;
  withNotes?: number;
}

export interface HabitScoreWeekly {
  week: number;
  weekStart: string;
  score: number;
  archives: number;
}

export interface HabitScore {
  userId: string;
  score: number;
  factors: {
    tabTurnover: HabitScoreFactor;
    focusRatio: HabitScoreFactor;
    researchConversion: HabitScoreFactor;
    sessionDiscipline: HabitScoreFactor;
  };
  weeklyHistory: HabitScoreWeekly[];
  totalArchives: number;
  periodDays: number;
}

export interface Settings {
  id: string;
  inactivityThresholdMinutes: number;
  whitelistDomains: string[];
  notificationsEnabled: boolean;
}

export interface User {
  id?: string;
  email: string;
  apiKey: string;
  plan?: string;
  createdAt?: string;
}

export interface PaginatedResult<T> {
  archives: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
