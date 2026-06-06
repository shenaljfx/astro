const API_BASE = 'http://localhost:3000';

export interface NakathData {
  date: string;
  nakshatra: string;
  nakshatraLord: string;
  tithi: string;
  yoga: string;
  karana: string;
  rashi: string;
  sunrise: string;
  sunset: string;
  rahuKalam: string;
  gulikaKalam: string;
  auspiciousPeriods: Array<{ start: string; end: string; activity: string }>;
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  nakshatra: string;
  retrograde: boolean;
}

export interface WeeklyForecast {
  sign: string;
  period: string;
  summary: string;
  highlights: string[];
  challenges: string[];
  luckyDays: string[];
}

export async function fetchNakath(date?: string): Promise<NakathData> {
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_BASE}/api/marketing/today${params}`);
  if (!res.ok) throw new Error(`Marketing API failed: ${res.status}`);
  return res.json();
}

export async function fetchPlanetPositions(date?: string): Promise<PlanetPosition[]> {
  const params = date ? `?date=${date}` : '';
  const res = await fetch(`${API_BASE}/api/horoscope/planets${params}`);
  if (!res.ok) throw new Error(`Planet API failed: ${res.status}`);
  const data = await res.json();
  return data.planets;
}

export async function fetchWeeklyLagna(sign: string): Promise<WeeklyForecast> {
  const res = await fetch(`${API_BASE}/api/weekly-lagna/${sign}`);
  if (!res.ok) throw new Error(`Weekly lagna API failed: ${res.status}`);
  return res.json();
}

export async function fetchDailyHoroscope(sign: string, date?: string): Promise<any> {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  params.set('sign', sign);
  const res = await fetch(`${API_BASE}/api/horoscope/daily?${params}`);
  if (!res.ok) throw new Error(`Daily horoscope API failed: ${res.status}`);
  return res.json();
}

export async function fetchCompatibility(sign1: string, sign2: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/porondam/quick?sign1=${sign1}&sign2=${sign2}`);
  if (!res.ok) throw new Error(`Compatibility API failed: ${res.status}`);
  return res.json();
}

export const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
] as const;

export const VEDIC_SIGNS = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'
] as const;

export const SIGN_MAP: Record<string, string> = Object.fromEntries(
  ZODIAC_SIGNS.map((w, i) => [w, VEDIC_SIGNS[i]])
);

export type CTAType = 'follow' | 'download' | 'website' | 'free-chart';
