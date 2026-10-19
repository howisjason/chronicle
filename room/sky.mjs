// sky.mjs: the real sky over Chiang Mai, for the room's window (the room plan of
// 19 Oct 2026, section 8). Plain values only, no drawing: the chosen style's scene reads
// them later. All of it runs in the visitor's browser, so nothing private leaves and no
// wake pays for it. The page (room.js) keeps the latest in window.roomSky.
//
// The sun: where it stands, from the date and time alone (the usual low-precision
// sun formulas, good to about a degree, which is plenty for a window). No service.
// The weather: Open-Meteo's free current-weather answer for Chiang Mai, no key. Asked
// at most once every 30 minutes per visitor (the answer, or the failure, is kept with
// its time in localStorage), and any failure means a clear sky.

export const CHIANG_MAI = { lat: 18.7883, lon: 98.9853 };
const RAD = Math.PI / 180;

// altitude: degrees above the horizon (below zero is night); azimuth: degrees from north,
// clockwise; phase: night, dawn, day or dusk (dawn and dusk are the sun within 6 degrees
// under the horizon, the light before sunrise and after sunset).
export function sunAt(date = new Date(), where = CHIANG_MAI) {
  const d = date.getTime() / 86400000 - 10957.5;                 // days since noon, 1 Jan 2000 (UTC)
  const g = (357.529 + 0.98560028 * d) * RAD;                    // the sun's mean anomaly
  const q = 280.459 + 0.98564736 * d;                            // its mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;                     // the tilt of the earth
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) * 15;      // sidereal time, in degrees
  const H = ((gmst + where.lon) * RAD - ra);                     // the hour angle
  const lat = where.lat * RAD;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H));
  const altitude = alt / RAD, azimuth = ((az / RAD) % 360 + 360) % 360;
  const phase = altitude > 0 ? 'day' : altitude > -6 ? (azimuth < 180 ? 'dawn' : 'dusk') : 'night';
  return { altitude, azimuth, phase };
}

export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=18.79&longitude=98.99&current=weather_code,cloud_cover,precipitation&timezone=Asia%2FBangkok';
export const WEATHER_EVERY_MS = 30 * 60 * 1000;
const KEY = 'room-weather';

// Open-Meteo's weather code (WMO) to the four skies the window can draw.
export function skyFromCode(code, cloud) {
  const c = Number(code);
  if (!Number.isFinite(c)) return Number(cloud) > 60 ? 'cloud' : 'clear';
  if (c >= 95) return 'storm';
  if ((c >= 51 && c <= 67) || (c >= 71 && c <= 86)) return 'rain';
  if (c === 2 || c === 3 || c === 45 || c === 48) return 'cloud';
  return 'clear';
}

// { sky: clear|cloud|rain|storm, code, cloud, at (ms), from: live|kept|fallback }
// fetchFn, store (localStorage or anything with getItem/setItem) and now are passed in so
// the tests can plant a failure, a stale answer and a fresh one.
export async function weatherNow({ fetchFn = globalThis.fetch, store = null, now = Date.now() } = {}) {
  let kept = null;
  try { kept = store ? JSON.parse(store.getItem(KEY) || 'null') : null; } catch { kept = null; }
  if (kept && typeof kept.at === 'number' && now - kept.at < WEATHER_EVERY_MS && typeof kept.sky === 'string') return { ...kept, from: 'kept' };
  let w = { sky: 'clear', code: null, cloud: null, at: now, from: 'fallback' };
  try {
    const r = await fetchFn(WEATHER_URL);
    const j = r && r.ok ? await r.json() : null;
    const cur = j && j.current;
    if (cur && (cur.weather_code !== undefined || cur.cloud_cover !== undefined)) {
      w = { sky: skyFromCode(cur.weather_code, cur.cloud_cover), code: cur.weather_code ?? null, cloud: cur.cloud_cover ?? null, at: now, from: 'live' };
    }
  } catch { /* the service is down or overloaded: a clear sky, and no new ask for 30 minutes */ }
  try { if (store) store.setItem(KEY, JSON.stringify(w)); } catch { /* a full or blocked store only means asking again next load */ }
  return w;
}
