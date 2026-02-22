const STORAGE_KEY = "house-calc-recent-searches";
const MAX_ITEMS = 5;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(address: string): void {
  if (typeof window === "undefined" || !address.trim()) return;
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter(
      (a) => a.toLowerCase() !== address.trim().toLowerCase()
    );
    const updated = [address.trim(), ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}
