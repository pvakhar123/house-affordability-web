import type { FinalReport } from "./types";

const STORAGE_KEY = "house-calc-reports";
const MAX_REPORTS = 10;

export interface SavedReport {
  id: string;
  name: string;
  savedAt: string;
  report: FinalReport;
  userLocation?: string;
}

function readAll(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(reports: SavedReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

export function getSavedReports(): SavedReport[] {
  return readAll();
}

export function saveReport(
  report: FinalReport,
  name?: string,
  userLocation?: string
): SavedReport {
  const reports = readAll();
  const autoName =
    name ||
    `Report – ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;

  const saved: SavedReport = {
    id: crypto.randomUUID(),
    name: autoName,
    savedAt: new Date().toISOString(),
    report,
    userLocation,
  };

  reports.unshift(saved);

  // FIFO: keep only the newest MAX_REPORTS
  if (reports.length > MAX_REPORTS) {
    reports.length = MAX_REPORTS;
  }

  writeAll(reports);
  return saved;
}

export function deleteReport(id: string): void {
  const reports = readAll().filter((r) => r.id !== id);
  writeAll(reports);
}

export function renameReport(id: string, newName: string): void {
  const reports = readAll();
  const report = reports.find((r) => r.id === id);
  if (report) {
    report.name = newName;
    writeAll(reports);
  }
}
