import { DAILY_QUOTES, type DailyQuote } from '@/data/dailyQuotes';

const DAILY_QUOTE_ID_KEY = 'dailyQuoteId';
const DAILY_QUOTE_DATE_KEY = 'dailyQuoteDate';
const USED_QUOTES_KEY = 'usedQuoteIds';

const memoryState = {
  id: null as number | null,
  date: null as string | null,
  usedIds: [] as number[],
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[DailyQuoteManager] Local storage unavailable', error);
    return null;
  }
};

const formatDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getQuoteById = (id: number | null): DailyQuote => {
  if (typeof id === 'number') {
    const match = DAILY_QUOTES.find((quote) => quote.id === id);
    if (match) {
      return match;
    }
  }
  return DAILY_QUOTES[0];
};

const getStoredQuoteId = (): number | null => {
  const storage = getLocalStorage();
  const value = storage?.getItem(DAILY_QUOTE_ID_KEY);
  if (value !== null && value !== undefined) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return memoryState.id;
};

const setStoredQuoteId = (id: number | null) => {
  const storage = getLocalStorage();
  memoryState.id = id;
  if (!storage) return;
  if (typeof id === 'number') {
    storage.setItem(DAILY_QUOTE_ID_KEY, String(id));
  } else {
    storage.removeItem(DAILY_QUOTE_ID_KEY);
  }
};

const getStoredDate = (): string | null => {
  const storage = getLocalStorage();
  const value = storage?.getItem(DAILY_QUOTE_DATE_KEY);
  return value ?? memoryState.date;
};

const setStoredDate = (dateKey: string | null) => {
  const storage = getLocalStorage();
  memoryState.date = dateKey;
  if (!storage) return;
  if (dateKey) {
    storage.setItem(DAILY_QUOTE_DATE_KEY, dateKey);
  } else {
    storage.removeItem(DAILY_QUOTE_DATE_KEY);
  }
};

const parseUsedQuoteIds = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value));
    }
  } catch (error) {
    console.warn('[DailyQuoteManager] Failed to parse usedQuoteIds', error);
  }
  return [];
};

const getStoredUsedQuoteIds = (): number[] => {
  const storage = getLocalStorage();
  if (storage) {
    const raw = storage.getItem(USED_QUOTES_KEY);
    if (raw) {
      const ids = parseUsedQuoteIds(raw);
      memoryState.usedIds = ids;
      return ids;
    }
  }
  return memoryState.usedIds;
};

const setStoredUsedQuoteIds = (ids: number[]) => {
  const uniqueIds = Array.from(new Set(ids));
  memoryState.usedIds = uniqueIds;
  const storage = getLocalStorage();
  if (!storage) return;
  if (uniqueIds.length === 0) {
    storage.removeItem(USED_QUOTES_KEY);
  } else {
    storage.setItem(USED_QUOTES_KEY, JSON.stringify(uniqueIds));
  }
};

const pickRandomQuote = (excludeIds: number[]): DailyQuote => {
  const available = DAILY_QUOTES.filter((quote) => !excludeIds.includes(quote.id));
  if (available.length === 0) {
    return DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
  }
  const index = Math.floor(Math.random() * available.length);
  return available[index];
};

export const resetQuoteCycle = (): void => {
  setStoredUsedQuoteIds([]);
  setStoredQuoteId(null);
  setStoredDate(null);
};

export const selectNewDailyQuote = (): DailyQuote => {
  let usedIds = getStoredUsedQuoteIds();
  if (usedIds.length >= DAILY_QUOTES.length) {
    resetQuoteCycle();
    usedIds = [];
  }

  const nextQuote = pickRandomQuote(usedIds);
  const todayKey = formatDateKey();
  const updatedUsed = [...usedIds, nextQuote.id];

  setStoredQuoteId(nextQuote.id);
  setStoredDate(todayKey);
  setStoredUsedQuoteIds(updatedUsed);

  return nextQuote;
};

export const getTodayQuote = (): DailyQuote => {
  const todayKey = formatDateKey();
  const storedDate = getStoredDate();
  const storedId = getStoredQuoteId();

  if (storedDate === todayKey && typeof storedId === 'number') {
    return getQuoteById(storedId);
  }

  return selectNewDailyQuote();
};
```,