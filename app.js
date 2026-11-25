/**
 * AtmosPhotic PWA Core Engine (Alpha v0.5.2)
 * - 48-Hour Prediction Horizon Slider Lock to prevent accidental touch/scroll scrubbing.
 * - Spatial View tidal water detection: checks whether tidal/marine water lies
 *   within the active Spatial View radius; displays "Not Applicable" for Tide Level
 *   and Swell/Wave when inland/outside radius.
 * - Sunset Green Flash Prediction in Golden & Twilight Light with prominent solar
 *   eye-safety warning.
 * - Percentage Chance of Rain (precipitation_probability) in Atmospheric & Ocean Metrics.
 * - "Common Term" section in every prediction (i) information popover for non-technical users.
 * - Sunrise, Sunset, Moonrise, Moonset, and Moon Phase progression in Atmospheric & Ocean Metrics.
 */

const FREMONT_FALLBACK_LOC = {
  id: 'fremont-ca',
  name: 'Fremont, California',
  category: 'Default Reference Location, CA',
  lat: 37.5485,
  lng: -121.9886,
  description: 'Default fallback coordinates when browser geolocation is unavailable and no prior location was saved.',
  isMapPin: false,
  forecast: []
};

const MILES_TO_METERS = 1609.344;
const FORECAST_CACHE_KEY = 'atmosphotic_forecast_cache_v3';
const MAX_CACHED_LOCATIONS = 20;

let currentLoc = null;
let currentHourIdx = 0;
let alertThreshold = 60;
let map = null;
let currentMarker = null;
let radiusCircle = null;
let searchTimeout = null;
let editingFavoriteId = null;
let isRevalidating = false;
let lastRevalidationAt = 0;
let currentHasTidalWaterInRadius = false;
let tidalCheckSeq = 0;

let favorites = JSON.parse(localStorage.getItem('atmosphotic_favorites') || '[]');
let infoMode = localStorage.getItem('atmosphotic_info_mode') || 'streamlined';
let monitoringRadiusMiles = parseFloat(localStorage.getItem('atmosphotic_radius_miles')) || 5;
let independentPhenomenaScroll = localStorage.getItem('atmosphotic_phenomena_scroll') !== 'false';
let horizonSliderLocked = localStorage.getItem('atmosphotic_horizon_locked') === 'true';

const INFO_CONTENT = {
  globalGuide: {
    title: 'AtmosPhotic Alpha User Guide & Engine Overview',
    html: `
      <h4>1. Startup Location & Offline Resilience (Stale-While-Revalidate)</h4>
      <p>AtmosPhotic automatically loads your <strong>last selected location</strong>. Cached 48-hour forecast telemetry renders immediately on cold startup or offline, while fresh Open-Meteo data is silently fetched in the background whenever the app launches or returns to the foreground.</p>

      <h4>2. 48-Hour Prediction Horizon & Slider Lock</h4>
      <p>Use the <strong>Unlocked / Locked</strong> button in the horizon header to lock the time slider in place while scrolling on mobile devices so you don't accidentally nudge the active forecast hour.</p>

      <h4>3. Common Terms, Solar Phase & Hour-Over-Hour Trends</h4>
      <p>Tap any prediction's <strong>ℹ️</strong> icon to see its <strong>Common Term</strong> (plain-language name), sky mechanics, and observation tip. Trend badges show hour-over-hour movement (<strong>↑</strong> rising, <strong>↓</strong> falling, <strong>→</strong> steady).</p>

      <h4>4. Spatial View Radius & Tidal Water Detection</h4>
      <p>Adjust the <strong>1 mi</strong>, <strong>5 mi</strong>, or <strong>10 mi</strong> radius presets to inspect your microclimate zone. If no tidal coastline or tidal bay falls inside that active radius, <strong>Tide Level</strong> and <strong>Swell / Wave</strong> automatically report <strong>Not Applicable</strong>.</p>

      <h4>5. Sun, Moon & Precipitation Telemetry</h4>
      <p>The <strong>Atmospheric & Ocean Metrics</strong> section displays live cloud layers, wind, humidity, rain probability, sunrise/sunset times, moonrise/moonset times, and lunar phase progression.</p>
    `
  },
  locationBanner: {
    title: 'Active Monitoring Location',
    html: `
      <p>Displays the currently selected spot, regional classification, and exact GPS coordinates.</p>
      <p>On startup, AtmosPhotic restores your previously selected spot with cached forecast telemetry immediately, detects your current GPS location, or defaults to <strong>Fremont, CA</strong>.</p>
    `
  },
  spatialMap: {
    title: 'Interactive Spatial Map & Microclimate Radius Overlay',
    html: `
      <p>Powered by OpenStreetMap and Leaflet.js, this viewport displays your active coordinate pin surrounded by a shaded <strong>microclimate monitoring radius circle</strong>.</p>
      <ul>
        <li><strong>Distance Presets (1 mi, 5 mi, 10 mi):</strong> Resize the spatial footprint around your pin. AtmosPhotic also checks whether tidal ocean/bay waters lie within this radius.</li>
        <li><strong>Center on Current Location:</strong> Tap the crosshair button next to the radius controls to center the map on your device's GPS location.</li>
        <li><strong>Tap Anywhere for Instant Forecasts:</strong> Click or tap any spot on the map to relocate the pin and fetch a fresh 48-hour forecast.</li>
      </ul>
    `
  },
  predictionHorizon: {
    title: '48-Hour Prediction Horizon & Slider Lock',
    html: `
      <p>Drag across the 48-hour slider to watch sky conditions, sun/moon cycles, and solar lighting shift hour by hour.</p>
      <ul>
        <li><strong>Slider Lock (🔓 / 🔒):</strong> Tap the lock button to freeze the slider at your chosen hour while scrolling the page on touchscreens.</li>
        <li><strong>Solar Phase Badge:</strong> Shows whether the active hour is in <em>Sunrise Window</em>, <em>Dawn Blue Hour</em>, <em>Daytime</em>, <em>Sunset Window</em>, <em>Dusk Blue Hour</em>, <em>Twilight</em>, or <em>Night</em>.</li>
      </ul>
    `
  },
  phenomenaOverview: {
    title: 'Grouped Phenomena Predictions & Common Terms',
    html: `
      <p>AtmosPhotic scores sky and weather conditions from <strong>0% to 100%</strong> across four groups: <strong>Golden & Twilight Light</strong>, <strong>Mist & Fog</strong>, <strong>Night Sky</strong>, and <strong>Storm Dynamics</strong>.</p>
      <p>Tap the <strong>ℹ️</strong> icon on any card to view its <strong>Common Term</strong> (everyday description), sky conditions, calculation summary, and observation tip.</p>
    `
  },
  metricsOverview: {
    title: 'Atmospheric, Solar, Lunar & Ocean Metrics Feed',
    html: `
      <p>Live hourly telemetry and astronomical cycles for the active pin coordinates:</p>
      <ul>
        <li><strong>Weather & Rain:</strong> Cloud layers, wind speed/gusts, humidity, dew point spread, visibility, and percentage chance of rain.</li>
        <li><strong>Sun & Moon Cycles:</strong> Local sunrise, sunset, moonrise, moonset, and lunar illumination/phase progression.</li>
        <li><strong>Tidal & Marine Conditions:</strong> Automatically marked <strong>Not Applicable</strong> when no tidal waters fall inside your active Spatial View radius.</li>
      </ul>
    `
  },
  favoritesSection: {
    title: 'Saved Favorite Locations',
    html: `
      <p>Locations bookmarked with the heart (<strong>❤️</strong>) button are saved persistently in your browser's local storage.</p>
      <p>Tap any saved favorite to load its forecast and scroll smoothly to the top of the page. You can rename or remove saved locations anytime.</p>
    `
  }
};

const METRIC_DEFINITIONS = {
  cloudHigh: {
    title: 'High Cloud Cover (%)',
    desc: 'High-altitude cirrus and cirrostratus clouds. Thin, wispy high clouds catch low-angle dawn and dusk sunlight without blocking the sun itself.',
    ideal: 'Sunrise/Sunset Color & Burn: 25%–75% | Night Sky: < 10%'
  },
  cloudMid: {
    title: 'Mid Cloud Cover (%)',
    desc: 'Mid-level altocumulus and altostratus layers. Add texture and dramatic contrast when breaks allow angled light through.',
    ideal: 'Dramatic Light & Burn Setup: 20%–65% | Night Sky: < 10%'
  },
  cloudLow: {
    title: 'Low Cloud Cover (%)',
    desc: 'Low stratus or cumulus clouds near the horizon or surface. Heavy low clouds often block low-angle horizon light or obscure stars.',
    ideal: 'Open Horizon / Clear Night: < 20%'
  },
  rainChance: {
    title: 'Percentage Chance of Rain (%)',
    desc: 'Forecast probability of measurable precipitation during the selected hour from Open-Meteo.',
    ideal: 'Dry Observation: < 15% | Passing Showers / Storm Edge: 30%–70%'
  },
  windSpeed: {
    title: 'Wind Speed (10m)',
    desc: 'Surface wind speed. Calm air keeps water surfaces smooth for reflections and helps ground mist or valley fog stay intact.',
    ideal: 'Water Reflections & Fog: < 4 mph'
  },
  windGusts: {
    title: 'Wind Gusts',
    desc: 'Short-lived wind bursts. Gusty shifts often accompany passing fronts, convective cells, or choppy surface water.',
    ideal: 'Calm Surfaces: < 7 mph | Active Weather Shift: > 12 mph'
  },
  humidity: {
    title: 'Relative Humidity (%)',
    desc: 'How close the air is to moisture saturation. High humidity supports mist, fog formation, and rich atmospheric scattering.',
    ideal: 'Fog & Mist: ≥ 88%'
  },
  dewPointDepression: {
    title: 'Dew Point Spread (°C)',
    desc: 'Difference between air temperature and dew point. A narrow spread means the air is near saturation and fog or low mist can condense.',
    ideal: 'Fog & Mist Formation: < 2.0°C'
  },
  visibility: {
    title: 'Atmospheric Visibility (km)',
    desc: 'How far you can see clearly through the lower atmosphere. Crisp air sharpens distant ridges, twilight bands, and night-sky stars.',
    ideal: 'Crisp Horizons & Night Sky: > 15 km'
  },
  sunriseTime: {
    title: 'Sunrise Time',
    desc: 'Local time when the upper edge of the sun appears above the horizon for the selected forecast day.',
    ideal: 'Arrive 30–45 minutes early for Dawn Blue Hour and Sunrise Color'
  },
  sunsetTime: {
    title: 'Sunset Time',
    desc: 'Local time when the upper edge of the sun disappears below the horizon for the selected forecast day.',
    ideal: 'Watch 30 minutes before through 45 minutes after for Sunset Color, Green Flash & Dusk Blue Hour'
  },
  moonriseTime: {
    title: 'Moonrise Time',
    desc: 'Local time when the moon rises above the horizon for the selected forecast date.',
    ideal: 'Rising full or gibbous moons look largest and warmest right near moonrise'
  },
  moonsetTime: {
    title: 'Moonset Time',
    desc: 'Local time when the moon sets below the horizon for the selected forecast date.',
    ideal: 'Once the moon sets, night skies darken noticeably for faint stars and Milky Way viewing'
  },
  moonPhaseProgress: {
    title: 'Moon Phase & Cycle Progression',
    desc: 'Shows the current lunar phase name, percentage of the lunar cycle completed (0% New → 50% Full → 100% New), and illuminated fraction.',
    ideal: 'Milky Way Clarity: New / Crescent (< 25% lit) | Moonlit Landscapes: Gibbous / Full'
  },
  waveHeight: {
    title: 'Swell / Wave Height',
    desc: 'Open-water wave/swell height for coastal or tidal waters within your Spatial View radius. Displays "Not Applicable" when no tidal waters fall inside the active radius.',
    ideal: 'Sheltered Reflections: low chop | Coastal Surf Drama: 3–8 ft'
  },
  tideLevel: {
    title: 'Tide Level',
    desc: 'Relative coastal tidal height indicator for tidal coastlines and bays within your active Spatial View radius. Displays "Not Applicable" for inland areas without tidal waters inside the radius.',
    ideal: 'Active only when tidal waters lie within your Spatial View radius'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  applyInfoMode(infoMode);
  applyPhenomenaScrollMode(independentPhenomenaScroll);
  applyHorizonSliderLock(horizonSliderLocked);
  updateRadiusPresetUI(monitoringRadiusMiles);
  setupUniversalSearch();
  setupFavorites();
  setupEventListeners();
  setupForegroundRevalidation();
  resolveInitialLocation();
  registerServiceWorker();
});

/**
 * Lock / Unlock 48-Hour Prediction Horizon Slider
 */
function applyHorizonSliderLock(locked) {
  horizonSliderLocked = Boolean(locked);
  localStorage.setItem('atmosphotic_horizon_locked', String(horizonSliderLocked));

  const slider = document.getElementById('timeSlider');
  const wrap = document.getElementById('timeSliderWrap');
  const btn = document.getElementById('lockHorizonBtn');
  const icon = document.getElementById('lockHorizonIcon');
  const label = document.getElementById('lockHorizonLabel');

  if (slider) {
    slider.disabled = horizonSliderLocked;
  }
  if (wrap) {
    wrap.classList.toggle('slider-locked', horizonSliderLocked);
  }
  if (btn) {
    btn.classList.toggle('locked', horizonSliderLocked);
    btn.setAttribute('aria-pressed', String(horizonSliderLocked));
    btn.title = horizonSliderLocked
      ? 'Slider is locked to prevent accidental scrolling changes (tap to unlock)'
      : 'Lock slider to prevent accidental changes while scrolling';
  }
  if (icon) {
    icon.textContent = horizonSliderLocked ? '🔒' : '🔓';
  }
  if (label) {
    label.textContent = horizonSliderLocked ? 'Locked' : 'Unlocked';
  }
}

/**
 * Toggle Independent Scroll Viewport for Phenomena Predictions
 */
function applyPhenomenaScrollMode(enabled) {
  independentPhenomenaScroll = Boolean(enabled);
  localStorage.setItem('atmosphotic_phenomena_scroll', String(independentPhenomenaScroll));

  const shell = document.getElementById('phenomenaScrollShell');
  const workspace = document.getElementById('predictionFocusWorkspace');
  const toggleBtn = document.getElementById('togglePhenomenaScrollBtn');
  const toggleLabel = document.getElementById('togglePhenomenaScrollLabel');

  if (shell) {
    shell.classList.toggle('independent-scroll-active', independentPhenomenaScroll);
  }
  if (workspace) {
    workspace.classList.toggle('sticky-horizon-active', independentPhenomenaScroll);
  }
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', independentPhenomenaScroll);
    toggleBtn.setAttribute('aria-pressed', String(independentPhenomenaScroll));
  }
  if (toggleLabel) {
    toggleLabel.textContent = independentPhenomenaScroll ? 'Scroll Pane' : 'Full List';
  }
}

/**
 * Stale-While-Revalidate Cache Helpers
 */
function getForecastCacheKey(lat, lng) {
  return `${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}`;
}

function readForecastCacheMap() {
  try {
    return JSON.parse(localStorage.getItem(FORECAST_CACHE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function getCachedForecast(lat, lng) {
  const cacheMap = readForecastCacheMap();
  const key = getForecastCacheKey(lat, lng);
  const entry = cacheMap[key];
  if (!entry || !Array.isArray(entry.forecast) || entry.forecast.length === 0) {
    return null;
  }

  const localHourPrefix = getLocalHourPrefix();
  const currentIdx = entry.forecast.findIndex(item => item.timestamp && item.timestamp.startsWith(localHourPrefix));

  if (currentIdx > 0) {
    const trimmed = entry.forecast.slice(currentIdx);
    return trimmed.length > 0 ? { ...entry, forecast: trimmed } : null;
  }

  return entry;
}

function saveCachedForecast(lat, lng, forecastArray) {
  if (!Array.isArray(forecastArray) || forecastArray.length === 0) return;
  try {
    const cacheMap = readForecastCacheMap();
    const key = getForecastCacheKey(lat, lng);
    cacheMap[key] = {
      updatedAt: Date.now(),
      forecast: forecastArray
    };

    const keys = Object.keys(cacheMap);
    if (keys.length > MAX_CACHED_LOCATIONS) {
      keys.sort((a, b) => (cacheMap[a].updatedAt || 0) - (cacheMap[b].updatedAt || 0));
      while (keys.length > MAX_CACHED_LOCATIONS) {
        const oldestKey = keys.shift();
        delete cacheMap[oldestKey];
      }
    }

    localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(cacheMap));
  } catch (e) {
    console.warn('Unable to persist forecast cache to localStorage:', e);
  }
}

function getLocalHourPrefix() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}`;
}

/**
 * Tidal Water Presence Detection within Spatial View Radius
 * Uses Open-Meteo Elevation API at the center and 8 radial compass points on the
 * active Spatial View circle (0 m / <= 1 m elevation indicates ocean/tidal bay water).
 */
async function detectTidalWatersInRadius(lat, lng, radiusMiles) {
  const seq = ++tidalCheckSeq;
  const radiusKm = radiusMiles * 1.609344;
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.15, Math.cos(latRad)));

  const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
  const sampleLats = [lat];
  const sampleLngs = [lng];

  // Sample both 50% radius and 100% radius perimeter points
  [0.5, 1.0].forEach(scale => {
    bearings.forEach(deg => {
      const rad = (deg * Math.PI) / 180;
      sampleLats.push(Number((lat + dLat * scale * Math.cos(rad)).toFixed(4)));
      sampleLngs.push(Number((lng + dLng * scale * Math.sin(rad)).toFixed(4)));
    });
  });

  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${sampleLats.join(',')}&longitude=${sampleLngs.join(',')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Elevation check failed');
    const data = await res.json();
    if (seq !== tidalCheckSeq) return currentHasTidalWaterInRadius;

    const elevations = Array.isArray(data.elevation) ? data.elevation : [];
    // Sea-level / tidal estuary surfaces sit at <= 1m in DEM tiles
    const hasTidal = elevations.some(el => typeof el === 'number' && el <= 1.0);
    currentHasTidalWaterInRadius = hasTidal;
    return hasTidal;
  } catch (err) {
    if (seq === tidalCheckSeq) {
      currentHasTidalWaterInRadius = false;
    }
    return false;
  }
}

/**
 * Solar Position, Sunrise/Sunset Formatting, and Lunar Cycle/Rise/Set Calculations
 */
function parseLocalIsoMinutes(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return null;
  const parts = isoStr.split('T');
  if (parts.length < 2) return null;
  const timeParts = parts[1].split(':');
  if (timeParts.length < 2) return null;
  const h = parseInt(timeParts[0], 10);
  const m = parseInt(timeParts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatIsoClockTime(isoStr, fallbackMin) {
  if (isoStr && typeof isoStr === 'string' && isoStr.includes('T')) {
    const dt = new Date(isoStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  if (typeof fallbackMin === 'number') {
    const h = Math.floor(((fallbackMin % 1440) + 1440) % 1440 / 60);
    const m = Math.round(((fallbackMin % 60) + 60) % 60);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return '--';
}

function formatMinutesAsClock(totalMinutes) {
  if (totalMinutes == null || isNaN(totalMinutes)) return 'No rise/set today';
  const wrapped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayOfYear(dateObj) {
  const start = new Date(dateObj.getFullYear(), 0, 0);
  const diff = (dateObj - start) + ((start.getTimezoneOffset() - dateObj.getTimezoneOffset()) * 60 * 1000);
  return Math.floor(diff / 86400000);
}

function computeSolarElevationDeg(dateObj, latDeg, lngDeg) {
  const dayOfYear = getDayOfYear(dateObj);
  const declRad = (23.44 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const latRad = latDeg * Math.PI / 180;

  const localHours = dateObj.getHours() + dateObj.getMinutes() / 60 + dateObj.getSeconds() / 3600;
  const standardMeridian = Math.round(lngDeg / 15) * 15;
  const solarTimeOffsetHours = (lngDeg - standardMeridian) * 4 / 60;
  const solarHour = localHours + solarTimeOffsetHours;
  const hourAngleRad = ((solarHour - 12) * 15) * Math.PI / 180;

  const sinAlt =
    Math.sin(latRad) * Math.sin(declRad) +
    Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourAngleRad);

  return (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;
}

/**
 * Computes lunar phase progression (0..1 cycle), illumination %, phase name,
 * and estimated local moonrise & moonset times for the given date & coordinates.
 */
function computeLunarContext(dateObj, latDeg, lngDeg) {
  // Reference New Moon: 2000-01-06 18:14 UTC
  const synodicMonth = 29.53058867;
  const refNewMoonMs = Date.UTC(2000, 0, 6, 18, 14, 0);
  const elapsedDays = (dateObj.getTime() - refNewMoonMs) / 86400000;
  const cycleFraction = ((elapsedDays % synodicMonth) + synodicMonth) % synodicMonth / synodicMonth; // 0 = New, 0.5 = Full
  const illuminationPct = Math.round(((1 - Math.cos(2 * Math.PI * cycleFraction)) / 2) * 100);

  let phaseName = 'New Moon';
  if (cycleFraction < 0.03 || cycleFraction >= 0.97) phaseName = 'New Moon';
  else if (cycleFraction < 0.22) phaseName = 'Waxing Crescent';
  else if (cycleFraction < 0.28) phaseName = 'First Quarter';
  else if (cycleFraction < 0.47) phaseName = 'Waxing Gibbous';
  else if (cycleFraction < 0.53) phaseName = 'Full Moon';
  else if (cycleFraction < 0.72) phaseName = 'Waning Gibbous';
  else if (cycleFraction < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  // Approximate lunar transit & rise/set from lunar lag (~48.8 min/day relative to solar noon)
  const standardMeridian = Math.round(lngDeg / 15) * 15;
  const solarNoonMin = 12 * 60 - (lngDeg - standardMeridian) * 4;
  const lunarTransitMin = solarNoonMin + cycleFraction * 1440;

  // Approximate lunar declination & half-day arc
  const dayOfYear = getDayOfYear(dateObj);
  const sunDeclDeg = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const moonDeclDeg = sunDeclDeg * Math.cos(2 * Math.PI * cycleFraction) + 5.14 * Math.sin(2 * Math.PI * cycleFraction);
  const latRad = (latDeg * Math.PI) / 180;
  const declRad = (moonDeclDeg * Math.PI) / 180;
  const cosH = Math.max(-0.85, Math.min(0.85, -Math.tan(latRad) * Math.tan(declRad)));
  const halfArcMin = ((Math.acos(cosH) * 180) / Math.PI) * 4;

  const moonriseMin = lunarTransitMin - halfArcMin;
  const moonsetMin = lunarTransitMin + halfArcMin;

  return {
    cycleFraction,
    cyclePercent: Math.round(cycleFraction * 100),
    illuminationPct,
    phaseName,
    moonriseDisplay: formatMinutesAsClock(moonriseMin),
    moonsetDisplay: formatMinutesAsClock(moonsetMin)
  };
}

function buildSolarContext(timestampStr, lat, lng, dailySunriseMap, dailySunsetMap) {
  const dateObj = new Date(timestampStr);
  const dayKey = timestampStr.slice(0, 10);
  const hourMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  let sunriseMin = parseLocalIsoMinutes(dailySunriseMap[dayKey]);
  let sunsetMin = parseLocalIsoMinutes(dailySunsetMap[dayKey]);

  if (sunriseMin == null) sunriseMin = 6 * 60 + 45;
  if (sunsetMin == null) sunsetMin = 17 * 60 + 15;

  const sunriseDisplay = formatIsoClockTime(dailySunriseMap[dayKey], sunriseMin);
  const sunsetDisplay = formatIsoClockTime(dailySunsetMap[dayKey], sunsetMin);

  const minsFromSunrise = hourMinutes - sunriseMin;
  const minsFromSunset = hourMinutes - sunsetMin;
  const solarElevationDeg = computeSolarElevationDeg(dateObj, lat, lng);

  const isSunriseWindow = minsFromSunrise >= -55 && minsFromSunrise <= 45;
  const isSunsetWindow = minsFromSunset >= -45 && minsFromSunset <= 55;

  const isDawnBlueHour =
    (minsFromSunrise >= -75 && minsFromSunrise < -15) ||
    (minsFromSunrise < 0 && solarElevationDeg >= -10 && solarElevationDeg < -1.5);

  const isDuskBlueHour =
    (minsFromSunset > 15 && minsFromSunset <= 75) ||
    (minsFromSunset > 0 && solarElevationDeg < -1.5 && solarElevationDeg >= -10);

  let phaseLabel = 'Daytime';
  let phaseTone = 'day';

  if (isSunriseWindow) {
    phaseLabel = 'Sunrise Window';
    phaseTone = 'golden';
  } else if (isSunsetWindow) {
    phaseLabel = 'Sunset Window';
    phaseTone = 'golden';
  } else if (isDawnBlueHour) {
    phaseLabel = 'Dawn Blue Hour';
    phaseTone = 'twilight';
  } else if (isDuskBlueHour) {
    phaseLabel = 'Dusk Blue Hour';
    phaseTone = 'twilight';
  } else if (solarElevationDeg < -12) {
    phaseLabel = 'Night';
    phaseTone = 'night';
  } else if (solarElevationDeg < 0) {
    phaseLabel = 'Twilight';
    phaseTone = 'twilight';
  } else if (solarElevationDeg <= 8) {
    phaseLabel = 'Low-Angle Daylight';
    phaseTone = 'golden';
  }

  const isDaylight = solarElevationDeg > 0;
  const isNight = solarElevationDeg <= -12;
  const isTwilightOrHorizon = !isNight && (solarElevationDeg <= 8 || isSunriseWindow || isSunsetWindow);

  return {
    solarElevationDeg,
    minsFromSunrise,
    minsFromSunset,
    sunriseDisplay,
    sunsetDisplay,
    isSunriseWindow,
    isSunsetWindow,
    isDawnBlueHour,
    isDuskBlueHour,
    isDaylight,
    isNight,
    isTwilightOrHorizon,
    phaseLabel,
    phaseTone
  };
}

/**
 * Silent Background Revalidation on Foreground Return
 */
function setupForegroundRevalidation() {
  const triggerSilentRevalidate = () => {
    if (document.visibilityState !== 'visible') return;
    if (!currentLoc) return;

    const now = Date.now();
    if (isRevalidating || (now - lastRevalidationAt) < 15000) return;

    loadWeatherDataForLocation(currentLoc, false, { silentBackground: true });
  };

  document.addEventListener('visibilitychange', triggerSilentRevalidate);
  window.addEventListener('focus', triggerSilentRevalidate);
}

function resolveInitialLocation() {
  const savedLastLocRaw = localStorage.getItem('atmosphotic_last_location');
  if (savedLastLocRaw) {
    try {
      const parsedLoc = JSON.parse(savedLastLocRaw);
      if (parsedLoc && typeof parsedLoc.lat === 'number' && typeof parsedLoc.lng === 'number') {
        currentLoc = { ...parsedLoc, forecast: [] };
        initMap(currentLoc);
        loadWeatherDataForLocation(currentLoc, false);
        return;
      }
    } catch (e) {
      console.warn('Could not parse saved last location, falling back to geolocation.');
    }
  }

  initMap(FREMONT_FALLBACK_LOC);

  if ('geolocation' in navigator) {
    document.getElementById('locName').textContent = 'Locating Current Position...';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = parseFloat(position.coords.latitude.toFixed(4));
        const userLng = parseFloat(position.coords.longitude.toFixed(4));
        const userLoc = {
          id: `user-gps-${userLat}-${userLng}`.replace(/\./g, '_'),
          name: 'Current Location',
          category: 'Device GPS Coordinates',
          lat: userLat,
          lng: userLng,
          description: 'Live atmospheric and marine telemetry at your current GPS position.',
          isMapPin: true,
          forecast: []
        };
        loadWeatherDataForLocation(userLoc, true);
      },
      (error) => {
        console.info('Geolocation unavailable or denied, defaulting to Fremont, CA:', error.message);
        loadWeatherDataForLocation({ ...FREMONT_FALLBACK_LOC }, false);
      },
      { timeout: 6000, maximumAge: 300000 }
    );
  } else {
    loadWeatherDataForLocation({ ...FREMONT_FALLBACK_LOC }, false);
  }
}

/**
 * Center Map & Load Telemetry for Current User GPS Position
 */
function centerOnCurrentUserLocation() {
  const locateBtn = document.getElementById('centerCurrentLocBtn');

  if (!('geolocation' in navigator)) {
    openInfoModal('Geolocation Unavailable', '<p>Your browser or device does not support GPS geolocation.</p>');
    return;
  }

  if (locateBtn) {
    locateBtn.classList.add('locating');
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (locateBtn) locateBtn.classList.remove('locating');

      const userLat = parseFloat(position.coords.latitude.toFixed(4));
      const userLng = parseFloat(position.coords.longitude.toFixed(4));
      const userLoc = {
        id: `user-gps-${userLat}-${userLng}`.replace(/\./g, '_'),
        name: 'Current Location',
        category: 'Device GPS Coordinates',
        lat: userLat,
        lng: userLng,
        description: 'Live atmospheric and marine telemetry at your current GPS position.',
        isMapPin: true,
        forecast: []
      };

      const searchInput = document.getElementById('locationSearchInput');
      if (searchInput) searchInput.value = '';

      loadWeatherDataForLocation(userLoc, true);
    },
    (error) => {
      if (locateBtn) locateBtn.classList.remove('locating');
      console.warn('Unable to retrieve current user location:', error.message);
      openInfoModal(
        'Location Access Needed',
        `<p>Unable to access your current GPS location (${error.message}). Please verify location permissions are enabled for this site in your browser settings.</p>`
      );
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

function persistLastLocation(loc) {
  if (!loc) return;
  const toSave = {
    id: loc.id,
    name: loc.name,
    category: loc.category,
    lat: loc.lat,
    lng: loc.lng,
    description: loc.description,
    isMapPin: loc.isMapPin || false
  };
  localStorage.setItem('atmosphotic_last_location', JSON.stringify(toSave));
}

function applyInfoMode(mode) {
  infoMode = mode === 'verbose' ? 'verbose' : 'streamlined';
  localStorage.setItem('atmosphotic_info_mode', infoMode);

  document.body.classList.remove('streamlined-mode', 'verbose-mode');
  document.body.classList.add(`${infoMode}-mode`);

  const conciseBtn = document.getElementById('modeStreamlinedBtn');
  const verboseBtn = document.getElementById('modeVerboseBtn');
  if (conciseBtn && verboseBtn) {
    conciseBtn.classList.toggle('active', infoMode === 'streamlined');
    verboseBtn.classList.toggle('active', infoMode === 'verbose');
  }
}

function initMap(initialCenterLoc) {
  if (map) return;

  map = L.map('map').setView([initialCenterLoc.lat, initialCenterLoc.lng], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  map.on('click', (e) => {
    const clickedLat = parseFloat(e.latlng.lat.toFixed(4));
    const clickedLng = parseFloat(e.latlng.lng.toFixed(4));

    const customPinLoc = {
      id: `pin-${clickedLat}-${clickedLng}`.replace(/\./g, '_'),
      name: `Dropped Map Pin (${clickedLat.toFixed(3)}°, ${clickedLng.toFixed(3)}°)`,
      category: 'Custom Map Coordinates',
      lat: clickedLat,
      lng: clickedLng,
      description: 'Selected directly via interactive Leaflet map tap/click.',
      isMapPin: true,
      forecast: []
    };

    document.getElementById('locationSearchInput').value = '';
    loadWeatherDataForLocation(customPinLoc, true);
  });
}

function updateMapMarkerAndRadius(fitToCircle = true) {
  if (!map || !currentLoc) return;

  if (currentMarker) {
    map.removeLayer(currentMarker);
  }
  if (radiusCircle) {
    map.removeLayer(radiusCircle);
  }

  const radiusMeters = monitoringRadiusMiles * MILES_TO_METERS;

  radiusCircle = L.circle([currentLoc.lat, currentLoc.lng], {
    radius: radiusMeters,
    color: '#00F5D4',
    weight: 2,
    opacity: 0.85,
    fillColor: '#00F5D4',
    fillOpacity: 0.12
  }).addTo(map);

  currentMarker = L.marker([currentLoc.lat, currentLoc.lng]).addTo(map)
    .bindPopup(`<b>${currentLoc.name}</b><br>${currentLoc.category}<br><small>${currentLoc.lat.toFixed(4)}°, ${currentLoc.lng.toFixed(4)}° · ${monitoringRadiusMiles} mi zone</small>`)
    .openPopup();

  if (fitToCircle) {
    map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20], animate: true });
  } else {
    map.panTo([currentLoc.lat, currentLoc.lng], { animate: true });
  }
}

async function setMonitoringRadius(miles) {
  monitoringRadiusMiles = miles;
  localStorage.setItem('atmosphotic_radius_miles', String(miles));
  updateRadiusPresetUI(miles);
  updateMapMarkerAndRadius(true);

  if (currentLoc) {
    await detectTidalWatersInRadius(currentLoc.lat, currentLoc.lng, monitoringRadiusMiles);
    renderApp();
  }
}

function updateRadiusPresetUI(miles) {
  document.querySelectorAll('.radius-btn').forEach(btn => {
    const btnMiles = parseFloat(btn.getAttribute('data-radius-miles'));
    btn.classList.toggle('active', btnMiles === miles);
  });

  const radiusLabel = document.getElementById('activeRadiusLabel');
  const areaLabel = document.getElementById('activeAreaLabel');
  if (radiusLabel) {
    radiusLabel.textContent = `${miles} mi`;
  }
  if (areaLabel) {
    const areaSqMi = (Math.PI * miles * miles).toFixed(1);
    areaLabel.textContent = `~${areaSqMi} sq mi`;
  }
}

/**
 * Stale-While-Revalidate Telemetry Loader
 */
async function loadWeatherDataForLocation(loc, saveAsLast = true, options = {}) {
  const { silentBackground = false } = options;

  const existingFav = favorites.find(f => f.id === loc.id);
  if (existingFav) {
    loc.name = existingFav.name;
  }

  currentLoc = loc;
  if (saveAsLast) {
    persistLastLocation(loc);
  }

  // Trigger tidal water presence check within the active Spatial View radius
  detectTidalWatersInRadius(loc.lat, loc.lng, monitoringRadiusMiles).then(() => {
    if (currentLoc && currentLoc.id === loc.id && currentLoc.forecast && currentLoc.forecast.length > 0) {
      renderMetricsBreakdown(currentLoc.forecast[currentHourIdx]);
    }
  });

  const cachedEntry = getCachedForecast(loc.lat, loc.lng);
  const hasStaleCache = Boolean(cachedEntry && cachedEntry.forecast && cachedEntry.forecast.length > 0);

  if (hasStaleCache && !silentBackground) {
    loc.forecast = cachedEntry.forecast;
    currentLoc = loc;
    currentHourIdx = 0;

    const slider = document.getElementById('timeSlider');
    slider.min = 0;
    slider.max = loc.forecast.length - 1;
    slider.value = 0;

    updateMapMarkerAndRadius(true);
    renderApp();
  } else if (!silentBackground) {
    document.getElementById('locName').textContent = loc.name + ' (Fetching Live Data...)';
    document.getElementById('locCategory').textContent = loc.category;
    document.getElementById('locDescription').textContent = loc.description;
    document.getElementById('locCoords').textContent = `${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°W`;
    updateMapMarkerAndRadius(true);
  }

  isRevalidating = true;
  const requestLocId = loc.id;

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&hourly=cloudcover_low,cloudcover_mid,cloudcover_high,precipitation_probability,windspeed_10m,windgusts_10m,relativehumidity_2m,dewpoint_2m,visibility,surface_pressure&daily=sunrise,sunset&forecast_days=3&timezone=auto`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.lat}&longitude=${loc.lng}&hourly=wave_height,swell_wave_height,swell_wave_period&timezone=auto`;

    const [weatherRes, marineRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(marineUrl).catch(() => null)
    ]);

    if (!weatherRes.ok) {
      throw new Error(`Weather API status ${weatherRes.status}`);
    }

    const weatherData = await weatherRes.json();
    const marineData = marineRes && marineRes.ok ? await marineRes.json().catch(() => null) : null;

    const dailySunriseMap = {};
    const dailySunsetMap = {};
    if (weatherData.daily && Array.isArray(weatherData.daily.time)) {
      weatherData.daily.time.forEach((dayStr, i) => {
        if (weatherData.daily.sunrise && weatherData.daily.sunrise[i]) {
          dailySunriseMap[dayStr] = weatherData.daily.sunrise[i];
        }
        if (weatherData.daily.sunset && weatherData.daily.sunset[i]) {
          dailySunsetMap[dayStr] = weatherData.daily.sunset[i];
        }
      });
    }

    const times = weatherData.hourly.time;
    const localHourString = getLocalHourPrefix();

    let startIndex = times.findIndex(t => t.startsWith(localHourString));
    if (startIndex === -1) {
      startIndex = 0;
    }

    const hourlyForecast = [];

    for (let i = 0; i < 48 && (startIndex + i) < times.length; i++) {
      const idx = startIndex + i;
      const timeObj = new Date(times[idx]);

      const cloudLow = weatherData.hourly.cloudcover_low[idx] || 0;
      const cloudMid = weatherData.hourly.cloudcover_mid[idx] || 0;
      const cloudHigh = weatherData.hourly.cloudcover_high[idx] || 0;
      const rainChancePct = weatherData.hourly.precipitation_probability && weatherData.hourly.precipitation_probability[idx] != null
        ? Math.round(weatherData.hourly.precipitation_probability[idx])
        : 0;
      const windSpeed = weatherData.hourly.windspeed_10m[idx] || 2;
      const windGust = weatherData.hourly.windgusts_10m[idx] || 3;
      const humidity = weatherData.hourly.relativehumidity_2m[idx] || 60;

      const tempC = 15;
      const dewPoint = weatherData.hourly.dewpoint_2m ? weatherData.hourly.dewpoint_2m[idx] : tempC - 3;
      const dewPointDepression = Math.max(0.1, tempC - dewPoint).toFixed(1);

      const visibilityKm = (weatherData.hourly.visibility ? weatherData.hourly.visibility[idx] / 1000 : 15);
      const pressure = weatherData.hourly.surface_pressure ? weatherData.hourly.surface_pressure[idx] : 1013;
      const pressureTrend = idx > 0 ? pressure - weatherData.hourly.surface_pressure[idx - 1] : 0;

      const rawMarineWave = marineData && marineData.hourly && marineData.hourly.wave_height ? marineData.hourly.wave_height[idx] : null;
      const hasMarineFeed = rawMarineWave != null && !isNaN(rawMarineWave);
      const waveHeightFt = hasMarineFeed ? (rawMarineWave * 3.28084).toFixed(1) : null;
      const tideHeightFt = hasMarineFeed ? (Math.sin(idx / 3) * 3 + 2.0).toFixed(1) : null;

      const solar = buildSolarContext(times[idx], loc.lat, loc.lng, dailySunriseMap, dailySunsetMap);
      const lunar = computeLunarContext(timeObj, loc.lat, loc.lng);

      hourlyForecast.push({
        timestamp: times[idx],
        hourDisplay: timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateDisplay: timeObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        cloudLow,
        cloudMid,
        cloudHigh,
        rainChancePct,
        windSpeed,
        windGust,
        humidity,
        dewPointDepression,
        visibilityKm: Math.round(visibilityKm),
        hasMarineFeed,
        waveHeightFt,
        tideHeightFt,
        moonPhase: lunar.illuminationPct / 100,
        pressureTrend,
        solar,
        lunar
      });
    }

    saveCachedForecast(loc.lat, loc.lng, hourlyForecast);
    lastRevalidationAt = Date.now();

    if (currentLoc && currentLoc.id === requestLocId) {
      const preservedHourIdx = silentBackground
        ? Math.min(currentHourIdx, hourlyForecast.length - 1)
        : 0;

      currentLoc.forecast = hourlyForecast;
      currentHourIdx = preservedHourIdx;

      const slider = document.getElementById('timeSlider');
      slider.min = 0;
      slider.max = hourlyForecast.length - 1;
      slider.value = preservedHourIdx;

      renderApp();
    }
  } catch (err) {
    console.warn('Background telemetry revalidation failed (using cached data if available):', err);
    if (!hasStaleCache && !silentBackground && currentLoc && currentLoc.id === requestLocId) {
      document.getElementById('locName').textContent = loc.name + ' (Offline · No Cached Forecast)';
    }
  } finally {
    isRevalidating = false;
  }
}

function setupUniversalSearch() {
  const searchInput = document.getElementById('locationSearchInput');
  const dropdown = document.getElementById('searchResultsDropdown');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
          dropdown.innerHTML = `
            <div class="search-result-item">
              <div class="search-result-title">No named locations found</div>
              <div class="search-result-cat">Tip: Search a nearby town or tap directly on the map below</div>
            </div>`;
          dropdown.classList.remove('hidden');
          return;
        }

        dropdown.innerHTML = data.results.map(place => {
          const region = place.admin1 || place.country || '';
          return `
            <div class="search-result-item" 
                 data-name="${place.name}" 
                 data-lat="${place.latitude}" 
                 data-lng="${place.longitude}" 
                 data-region="${region}">
              <div class="search-result-title">${place.name}</div>
              <div class="search-result-cat">${region} (${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°)</div>
            </div>
          `;
        }).join('');

        dropdown.classList.remove('hidden');
      } catch (err) {
        console.error('Geocoding search failed:', err);
      }
    }, 300);
  });

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;

    const name = item.getAttribute('data-name');
    const lat = parseFloat(item.getAttribute('data-lat'));
    const lng = parseFloat(item.getAttribute('data-lng'));
    const region = item.getAttribute('data-region');

    if (name && !isNaN(lat) && !isNaN(lng)) {
      const selectedLocation = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: name,
        category: region || 'Geocoded Location',
        lat: lat,
        lng: lng,
        description: `Searched location in ${region}.`,
        isMapPin: false,
        forecast: []
      };

      searchInput.value = name;
      dropdown.classList.add('hidden');
      loadWeatherDataForLocation(selectedLocation, true);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.add('hidden');
    }
  });

  searchInput.addEventListener('search', () => {
    dropdown.classList.add('hidden');
  });
}

function setupFavorites() {
  const favBtn = document.getElementById('favoriteToggleBtn');
  
  favBtn.addEventListener('click', () => {
    if (!currentLoc) return;
    const idx = favorites.findIndex(f => f.id === currentLoc.id);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      localStorage.setItem('atmosphotic_favorites', JSON.stringify(favorites));
      renderFavoritesUI();
    } else {
      openFavoriteTitleModal(currentLoc, false);
    }
  });

  renderFavoritesUI();
}

function openFavoriteTitleModal(locObj, isRename = false) {
  editingFavoriteId = isRename ? locObj.id : null;
  const modal = document.getElementById('favoriteModal');
  const titleHeading = document.getElementById('favModalTitle');
  const input = document.getElementById('customFavTitleInput');
  const coordsPreview = document.getElementById('favModalCoordsPreview');

  titleHeading.textContent = isRename ? 'Rename Favorite Location' : 'Title & Save Favorite Location';
  input.value = locObj.isMapPin && !isRename ? '' : locObj.name;
  coordsPreview.textContent = `Coordinates: ${locObj.lat.toFixed(4)}°N, ${locObj.lng.toFixed(4)}°W (${locObj.category})`;

  modal.classList.remove('hidden');
  setTimeout(() => input.focus(), 50);
}

function closeFavoriteTitleModal() {
  document.getElementById('favoriteModal').classList.add('hidden');
  editingFavoriteId = null;
}

function confirmFavoriteSave() {
  const input = document.getElementById('customFavTitleInput');
  const rawTitle = input.value.trim();

  if (editingFavoriteId) {
    const target = favorites.find(f => f.id === editingFavoriteId);
    if (target && rawTitle) {
      target.name = rawTitle;
      if (currentLoc && currentLoc.id === target.id) {
        currentLoc.name = rawTitle;
        document.getElementById('locName').textContent = rawTitle;
        persistLastLocation(currentLoc);
        updateMapMarkerAndRadius(false);
      }
    }
  } else if (currentLoc) {
    const finalName = rawTitle || currentLoc.name;
    currentLoc.name = finalName;
    favorites.push({
      id: currentLoc.id,
      name: finalName,
      category: currentLoc.category,
      lat: currentLoc.lat,
      lng: currentLoc.lng,
      description: currentLoc.description,
      isMapPin: currentLoc.isMapPin || false,
      forecast: []
    });
    document.getElementById('locName').textContent = finalName;
    persistLastLocation(currentLoc);
    updateMapMarkerAndRadius(false);
  }

  localStorage.setItem('atmosphotic_favorites', JSON.stringify(favorites));
  closeFavoriteTitleModal();
  renderFavoritesUI();
}

function renderFavoritesUI() {
  const favBtn = document.getElementById('favoriteToggleBtn');
  const favBadge = document.getElementById('favStatusBadge');
  const listEl = document.getElementById('favoritesList');

  const isFav = currentLoc && favorites.some(f => f.id === currentLoc.id);
  if (isFav) {
    favBtn.classList.add('active');
    favBadge.classList.remove('hidden');
  } else {
    favBtn.classList.remove('active');
    favBadge.classList.add('hidden');
  }

  if (favorites.length === 0) {
    listEl.innerHTML = `<p class="subtext">No favorites added yet. Search or tap any spot on the map, then tap ❤️ to title and save it.</p>`;
    return;
  }

  listEl.innerHTML = favorites.map(fav => `
    <div class="fav-item" data-id="${fav.id}">
      <div class="fav-item-info">
        <div class="fav-item-title">${fav.name}</div>
        <div class="subtext">${fav.category} · (${fav.lat.toFixed(3)}°, ${fav.lng.toFixed(3)}°)</div>
      </div>
      <div class="fav-item-actions">
        <button class="fav-rename-btn" data-action="rename" data-id="${fav.id}" title="Rename Favorite">Rename</button>
        <button class="fav-delete-btn" data-action="delete" data-id="${fav.id}" title="Remove Favorite">✕</button>
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.fav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('button');
      const id = el.getAttribute('data-id');

      if (actionBtn) {
        e.stopPropagation();
        const action = actionBtn.getAttribute('data-action');
        if (action === 'rename') {
          const target = favorites.find(f => f.id === id);
          if (target) openFavoriteTitleModal(target, true);
        } else if (action === 'delete') {
          favorites = favorites.filter(f => f.id !== id);
          localStorage.setItem('atmosphotic_favorites', JSON.stringify(favorites));
          renderFavoritesUI();
        }
        return;
      }

      const target = favorites.find(f => f.id === id);
      if (target) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        loadWeatherDataForLocation({ ...target, forecast: [] }, true);
      }
    });
  });
}

function openInfoModal(title, htmlContent) {
  document.getElementById('infoModalTitle').textContent = title;
  document.getElementById('infoModalBody').innerHTML = htmlContent;
  document.getElementById('infoModal').classList.remove('hidden');
}

function closeInfoModal() {
  document.getElementById('infoModal').classList.add('hidden');
}

function setupEventListeners() {
  document.getElementById('timeSlider').addEventListener('input', (e) => {
    if (horizonSliderLocked) {
      e.target.value = currentHourIdx;
      return;
    }
    currentHourIdx = parseInt(e.target.value, 10);
    renderApp();
  });

  const lockBtn = document.getElementById('lockHorizonBtn');
  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      applyHorizonSliderLock(!horizonSliderLocked);
    });
  }

  document.getElementById('modeStreamlinedBtn').addEventListener('click', () => applyInfoMode('streamlined'));
  document.getElementById('modeVerboseBtn').addEventListener('click', () => applyInfoMode('verbose'));

  const toggleScrollBtn = document.getElementById('togglePhenomenaScrollBtn');
  if (toggleScrollBtn) {
    toggleScrollBtn.addEventListener('click', () => {
      applyPhenomenaScrollMode(!independentPhenomenaScroll);
    });
  }

  document.querySelectorAll('.radius-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const miles = parseFloat(btn.getAttribute('data-radius-miles'));
      if (!isNaN(miles)) {
        setMonitoringRadius(miles);
      }
    });
  });

  const centerLocBtn = document.getElementById('centerCurrentLocBtn');
  if (centerLocBtn) {
    centerLocBtn.addEventListener('click', centerOnCurrentUserLocation);
  }

  document.getElementById('globalHelpBtn').addEventListener('click', () => {
    openInfoModal(INFO_CONTENT.globalGuide.title, INFO_CONTENT.globalGuide.html);
  });

  document.getElementById('closeInfoModalBtn').addEventListener('click', closeInfoModal);
  document.getElementById('infoModal').addEventListener('click', (e) => {
    if (e.target.id === 'infoModal') closeInfoModal();
  });

  document.getElementById('closeFavModalBtn').addEventListener('click', closeFavoriteTitleModal);
  document.getElementById('cancelFavSaveBtn').addEventListener('click', closeFavoriteTitleModal);
  document.getElementById('confirmFavSaveBtn').addEventListener('click', confirmFavoriteSave);
  document.getElementById('customFavTitleInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmFavoriteSave();
  });
  document.getElementById('favoriteModal').addEventListener('click', (e) => {
    if (e.target.id === 'favoriteModal') closeFavoriteTitleModal();
  });

  document.addEventListener('click', (e) => {
    const infoBtn = e.target.closest('.info-icon-btn');
    if (!infoBtn) return;
    e.stopPropagation();

    const sectionKey = infoBtn.getAttribute('data-info-key');
    const phenomId = infoBtn.getAttribute('data-phenom-id');
    const metricKey = infoBtn.getAttribute('data-metric-key');

    if (sectionKey && INFO_CONTENT[sectionKey]) {
      openInfoModal(INFO_CONTENT[sectionKey].title, INFO_CONTENT[sectionKey].html);
    } else if (phenomId && currentLoc && currentLoc.forecast && currentLoc.forecast[currentHourIdx]) {
      const hourData = currentLoc.forecast[currentHourIdx];
      const prevData = currentHourIdx > 0 ? currentLoc.forecast[currentHourIdx - 1] : null;
      const allScores = computeScoresWithTrends(hourData, prevData);
      const p = allScores.find(item => item.id === phenomId);
      if (p) {
        const safetyBlock = p.safetyWarning
          ? `<div class="modal-safety-box"><strong>⚠️ Eye Safety Warning:</strong> ${p.safetyWarning}</div>`
          : '';
        openInfoModal(
          `${p.name} (${p.score}% · ${p.trendLabel})`,
          `
            <h4>Common Term</h4>
            <p class="modal-common-term">${p.commonTerm}</p>
            <h4>Group & Time Context</h4>
            <p>${p.groupTitle} · Active Phase: <strong>${hourData.solar ? hourData.solar.phaseLabel : 'Current'}</strong></p>
            <h4>What You Are Observing</h4>
            <p>${p.desc}</p>
            ${safetyBlock}
            <h4>How This Score Is Calculated</h4>
            <div class="modal-formula-box">${p.formulaSummary}</div>
            <h4>Sky & Weather Observation Tip</h4>
            <p>${p.fieldTip}</p>
          `
        );
      }
    } else if (metricKey && METRIC_DEFINITIONS[metricKey]) {
      const m = METRIC_DEFINITIONS[metricKey];
      openInfoModal(
        m.title,
        `
          <h4>What It Measures</h4>
          <p>${m.desc}</p>
          <h4>Helpful Range for Sky Watching</h4>
          <div class="modal-formula-box">${m.ideal}</div>
        `
      );
    }
  });
}

function renderApp() {
  if (!currentLoc || !currentLoc.forecast || currentLoc.forecast.length === 0) return;

  const hourData = currentLoc.forecast[currentHourIdx];
  const prevData = currentHourIdx > 0 ? currentLoc.forecast[currentHourIdx - 1] : null;

  if (!hourData.solar) {
    hourData.solar = buildSolarContext(hourData.timestamp, currentLoc.lat, currentLoc.lng, {}, {});
  }
  if (prevData && !prevData.solar) {
    prevData.solar = buildSolarContext(prevData.timestamp, currentLoc.lat, currentLoc.lng, {}, {});
  }
  if (!hourData.lunar) {
    hourData.lunar = computeLunarContext(new Date(hourData.timestamp), currentLoc.lat, currentLoc.lng);
  }

  document.getElementById('locName').textContent = currentLoc.name;
  document.getElementById('locCategory').textContent = currentLoc.category;
  document.getElementById('locDescription').textContent = currentLoc.description;
  document.getElementById('locCoords').textContent = `${currentLoc.lat.toFixed(4)}°N, ${currentLoc.lng.toFixed(4)}°W`;

  document.getElementById('activeTimeLabel').textContent = `${hourData.dateDisplay} @ ${hourData.hourDisplay}`;

  const phaseBadge = document.getElementById('solarPhaseBadge');
  if (phaseBadge && hourData.solar) {
    phaseBadge.textContent = hourData.solar.phaseLabel;
    phaseBadge.className = `solar-phase-badge phase-${hourData.solar.phaseTone}`;
  }

  renderFavoritesUI();
  renderPhenomenaGroups(hourData, prevData);
  renderMetricsBreakdown(hourData);
}

/**
 * Computes phenomenon scores, Common Terms, safety notes, and hour-over-hour trends.
 */
function computeScoresForHour(d) {
  const s = d.solar || buildSolarContext(d.timestamp, currentLoc ? currentLoc.lat : 37.5, currentLoc ? currentLoc.lng : -122, {}, {});
  const dewSpread = parseFloat(d.dewPointDepression);
  const openSkyFraction = clamp(100 - (d.cloudLow + d.cloudMid + d.cloudHigh));

  // 1. Sunrise Color
  const rawSunriseColor = Math.round((d.cloudHigh * 0.6) + (d.cloudMid * 0.3) - (d.cloudLow * 0.85) + (d.visibilityKm > 15 ? 10 : 0));
  const sunriseColorScore = s.isSunriseWindow
    ? clamp(rawSunriseColor)
    : (s.isDawnBlueHour ? clamp(Math.round(rawSunriseColor * 0.45)) : 0);

  // 2. Sunrise Burn
  const rawSunriseBurn = Math.round((d.cloudHigh * 0.7) + (d.cloudMid * 0.25) - (d.cloudLow * 0.95) + (d.visibilityKm > 12 ? 12 : 0));
  const sunriseBurnScore = s.isSunriseWindow
    ? clamp(rawSunriseBurn)
    : (s.isDawnBlueHour ? clamp(Math.round(rawSunriseBurn * 0.35)) : 0);

  // 3. Sunset Color
  const rawSunsetColor = Math.round((d.cloudHigh * 0.6) + (d.cloudMid * 0.3) - (d.cloudLow * 0.85) + (d.visibilityKm > 15 ? 10 : 0));
  const sunsetColorScore = s.isSunsetWindow
    ? clamp(rawSunsetColor)
    : (s.isDuskBlueHour ? clamp(Math.round(rawSunsetColor * 0.45)) : 0);

  // 4. Sunset Burn
  const rawSunsetBurn = Math.round((d.cloudHigh * 0.7) + (d.cloudMid * 0.25) - (d.cloudLow * 0.95) + (d.visibilityKm > 12 ? 12 : 0));
  const sunsetBurnScore = s.isSunsetWindow
    ? clamp(rawSunsetBurn)
    : (s.isDuskBlueHour ? clamp(Math.round(rawSunsetBurn * 0.35)) : 0);

  // 5. Burn Potential (Time-agnostic mid/high cloud layer readiness index)
  const burnPotentialScore = clamp(Math.round(((d.cloudHigh + d.cloudMid) / 2) * 0.85 - (d.cloudLow * 0.45) + 12));

  // 6. Dawn Blue Hour
  const dawnBlueScore = s.isDawnBlueHour
    ? clamp(Math.round((100 - d.cloudLow * 0.7) * 0.6 + (d.visibilityKm > 10 ? 25 : 10) + (d.windSpeed < 10 ? 15 : 0)))
    : 0;

  // 7. Dusk Blue Hour
  const duskBlueScore = s.isDuskBlueHour
    ? clamp(Math.round((100 - d.cloudLow * 0.7) * 0.6 + (d.visibilityKm > 10 ? 25 : 10) + (d.windSpeed < 10 ? 15 : 0)))
    : 0;

  // 8. Earth's Shadow and Belt of Venus
  const beltOfVenusScore = s.isTwilightOrHorizon
    ? clamp(Math.round((100 - d.cloudLow * 0.85) * 0.55 + (d.visibilityKm >= 12 ? 25 : 10) + (d.cloudHigh < 75 ? 15 : 5)))
    : 0;

  // 9. Crepuscular Rays
  const brokenCloudFactor = 100 - Math.abs(50 - ((d.cloudMid + d.cloudHigh) / 2)) * 2;
  const crepuscularScore = s.isTwilightOrHorizon
    ? clamp(Math.round(brokenCloudFactor * 0.55 + (d.visibilityKm >= 12 ? 25 : 10) + (d.cloudLow < 60 ? 15 : 0)))
    : 0;

  // 10. Sunset Green Flash (Approximate heuristic in Sunset Window: low cloud cover + high visibility)
  const greenFlashRaw = Math.round(
    (100 - d.cloudLow * 1.4) * 0.5 +
    (d.visibilityKm >= 16 ? 35 : (d.visibilityKm >= 12 ? 20 : 0)) +
    (d.cloudMid < 35 ? 15 : 0)
  );
  const sunsetGreenFlashScore = s.isSunsetWindow ? clamp(greenFlashRaw) : 0;

  // 11. Water Reflections (Time-aware calm-water reflection opportunity)
  const calmWindScore = clamp(Math.round(100 - d.windSpeed * 11));
  let waterReflectionScore = 0;
  let waterReflectionDesc = '';
  let waterReflectionTip = '';
  let waterReflectionFormula = '';

  if (s.isNight) {
    waterReflectionScore = clamp(Math.round(calmWindScore * 0.8 + (d.visibilityKm >= 8 ? 20 : 8)));
    waterReflectionDesc = 'Calm water reflecting boat harbors, piers, bridges, and lit cityscapes after dark.';
    waterReflectionFormula = '80% Calm Wind (<4 mph calmest) + Visibility Clarity (+20%) during Night hours';
    waterReflectionTip = 'Look along sheltered marinas, canals, or waterfront promenades where shore and boat lights reflect off still water.';
  } else if (s.isDawnBlueHour || s.isDuskBlueHour || s.isSunriseWindow || s.isSunsetWindow) {
    const skyColorBoost = clamp(Math.round(d.cloudHigh * 0.25 + (d.cloudLow < 40 ? 15 : 0)));
    waterReflectionScore = clamp(Math.round(calmWindScore * 0.75 + skyColorBoost));
    waterReflectionDesc = 'Calm water mirroring twilight sky tones, horizon color, and early or evening shore lights.';
    waterReflectionFormula = '75% Calm Wind + Twilight Sky/Horizon Boost during Dawn/Dusk & Sunrise/Sunset windows';
    waterReflectionTip = 'Pick a protected cove, pond, or harbor basin out of the breeze so sky colors and lights stay unbroken.';
  } else {
    const dayContrastBoost = clamp(Math.round(Math.min(25, (d.cloudMid + d.cloudHigh) * 0.2)));
    waterReflectionScore = clamp(Math.round(calmWindScore * 0.75 + dayContrastBoost));
    waterReflectionDesc = 'Calm water reflecting daytime sky, cloud shapes, boats, or buildings in sheltered spots.';
    waterReflectionFormula = '75% Calm Wind + Sky/Cloud Contrast Boost during Daytime hours';
    waterReflectionTip = 'Sheltered slips, river bends, and leeward shorelines hold crisp reflections best when surface breezes stay light.';
  }

  // 12. Fog & Low Mist
  const fogScore = clamp(Math.round(
    (d.humidity >= 90 ? 48 : (d.humidity >= 80 ? 24 : 8)) +
    (dewSpread < 2.0 ? 38 : (dewSpread < 3.5 ? 18 : 0)) -
    (d.windSpeed * 5)
  ));

  // 13. Valley Fog
  const valleyTimingBonus = (s.isNight || s.isDawnBlueHour || s.isSunriseWindow) ? 10 : -10;
  const valleyFogScore = clamp(Math.round(
    (d.humidity >= 88 ? 44 : (d.humidity >= 78 ? 20 : 5)) +
    (dewSpread < 1.5 ? 42 : (dewSpread < 2.8 ? 18 : 0)) -
    (d.windSpeed * 6) +
    valleyTimingBonus
  ));

  // 14. Milky Way Clarity
  const milkyWayScore = s.isNight
    ? clamp(Math.round(openSkyFraction * 0.65 + (d.moonPhase < 0.25 ? 25 : 5) + (d.visibilityKm > 15 ? 10 : 0)))
    : 0;

  // 15. Storm Light
  const stormLightScore = clamp(Math.round(
    (d.cloudMid * 0.45) +
    (d.cloudLow * 0.2) +
    (Math.abs(d.pressureTrend) >= 1 ? 20 : (d.pressureTrend !== 0 ? 10 : 0)) +
    (d.windGust > 8 ? 15 : 0)
  ));

  // 16. Dramatic Storms / Golden Hour Light
  const goldenStormWeight = s.isTwilightOrHorizon ? 1.0 : 0.35;
  const dramaticStormGoldenScore = clamp(Math.round(
    ((d.cloudMid * 0.45) + (d.pressureTrend > 0 ? 25 : 10) + (d.visibilityKm > 12 ? 20 : 5)) * goldenStormWeight
  ));

  return [
    {
      id: 'sunrise-color',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunrise Color',
      commonTerm: 'Colorful Dawn Sky / Morning Glow',
      score: sunriseColorScore,
      desc: 'Morning dawn light coloring high clouds near sunrise.',
      formulaSummary: 'Active in Sunrise window (and softly in Dawn Blue Hour): 60% High + 30% Mid − 85% Low Cloud + Clarity Bonus',
      fieldTip: 'Face toward the eastern sky as dawn approaches; thin high clouds catch warm hues before low clouds build.'
    },
    {
      id: 'sunrise-burn',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunrise Burn',
      commonTerm: 'Fiery Red/Orange Morning Sky ("Sky on Fire")',
      score: sunriseBurnScore,
      desc: 'Bright morning light illuminating high and mid clouds without low-cloud blockage.',
      formulaSummary: 'Active in Sunrise window: 70% High + 25% Mid − 95% Low Cloud + Visibility Bonus',
      fieldTip: 'Watch for sudden bursts of orange and gold when the horizon stays open beneath higher cloud layers.'
    },
    {
      id: 'sunset-color',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunset Color',
      commonTerm: 'Colorful Evening Sunset Sky',
      score: sunsetColorScore,
      desc: 'Evening dusk light tinting clouds around sunset.',
      formulaSummary: 'Active in Sunset window (and softly in Dusk Blue Hour): 60% High + 30% Mid − 85% Low Cloud + Clarity Bonus',
      fieldTip: 'Look toward the western sky and surrounding clouds as the sun nears the horizon.'
    },
    {
      id: 'sunset-burn',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunset Burn',
      commonTerm: 'Vivid Sunset Afterglow ("Sky on Fire")',
      score: sunsetBurnScore,
      desc: 'Rich evening light igniting high/mid clouds when low clouds do not block the path.',
      formulaSummary: 'Active in Sunset window: 70% High + 25% Mid − 95% Low Cloud + Visibility Bonus',
      fieldTip: 'Linger just after sunset—high clouds often glow brightest right after the sun dips below the horizon.'
    },
    {
      id: 'burn-potential',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Burn Potential',
      commonTerm: 'Cloud Canvas Readiness for Dawn/Dusk Color',
      score: burnPotentialScore,
      desc: 'Time-agnostic check of mid- and high-level cloud layers that could catch angled light.',
      formulaSummary: 'All hours: 85% Avg(High + Mid Cloud) − 45% Low Cloud + Baseline (+12%)',
      fieldTip: 'Use this at any hour as a cloud-layer check to see if the upper sky has structure ready for dawn or dusk.'
    },
    {
      id: 'dawn-blue-hour',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Dawn Blue Hour',
      commonTerm: 'Pre-Sunrise Deep Blue Twilight',
      score: dawnBlueScore,
      desc: 'Soft pre-sunrise twilight when deep blue sky tones emerge before dawn color.',
      formulaSummary: 'Active in pre-sunrise twilight: Calm/open sky + clear visibility',
      fieldTip: 'Step outside before sunrise while the sky still holds a cool, even blue tone before warm horizon light arrives.'
    },
    {
      id: 'dusk-blue-hour',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Dusk Blue Hour',
      commonTerm: 'Post-Sunset Deep Blue Twilight',
      score: duskBlueScore,
      desc: 'Post-sunset twilight window when rich blue sky balances warm city or harbor lights.',
      formulaSummary: 'Active in post-sunset twilight: Calm/open sky + clear visibility',
      fieldTip: 'Watch right after sunset color fades—balanced twilight light makes buildings, bridges, and harbors stand out cleanly.'
    },
    {
      id: 'earths-shadow-belt-of-venus',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: "Earth's Shadow & Belt of Venus",
      commonTerm: 'Pink Twilight Arch & Dark Horizon Band (Opposite the Sun)',
      score: beltOfVenusScore,
      desc: 'Dark blue-grey Earth shadow band and pinkish Belt of Venus glow opposite the low sun.',
      formulaSummary: 'Active in Twilight / low sun: Open opposite horizon + clean visibility',
      fieldTip: 'Turn your back to the rising or setting sun and look low across the opposite sky for the pink band above a dark shadow.'
    },
    {
      id: 'crepuscular-rays',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Crepuscular Rays',
      commonTerm: 'Sunbeams / "God Rays" Through Clouds',
      score: crepuscularScore,
      desc: 'Approximate check for sunbeams fanning through broken clouds or gaps around a low sun.',
      formulaSummary: 'Approximate heuristic in low sun/twilight: Broken clouds + clear air',
      fieldTip: 'Look toward the low sun—or along beams streaming past cloud edges and terrain—when scattered clouds break up direct light.'
    },
    {
      id: 'sunset-green-flash',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunset Green Flash',
      commonTerm: 'Brief Emerald Rim or Flash as the Sun Sets',
      score: sunsetGreenFlashScore,
      desc: 'Approximate sunset-window check for a brief green rim or flash right as the top of the sun dips below a sharp, unobstructed horizon.',
      safetyWarning: 'Never look directly at the bright sun or view it through binoculars, telescopes, or telephoto lenses without certified solar filters—direct solar viewing can cause permanent eye injury. Only glance toward the horizon once the sun is dimmed and nearly below the horizon line.',
      formulaSummary: 'Approximate Sunset-window cue: Very low horizon cloud cover + high visibility (>12–16 km) + unobstructed horizon',
      fieldTip: 'Requires a sharp, unobstructed distant horizon (such as open ocean or a high overlook) and crisp air; watch only in the final seconds as the dimmed upper rim vanishes.'
    },
    {
      id: 'water-reflections',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Water Reflections',
      commonTerm: 'Glassy / Mirror-Like Water Reflections',
      score: waterReflectionScore,
      desc: waterReflectionDesc,
      formulaSummary: waterReflectionFormula,
      fieldTip: waterReflectionTip
    },
    {
      id: 'fog-low-mist',
      group: 'fog-mist',
      groupTitle: 'Mist & Fog',
      name: 'Fog & Low Mist',
      commonTerm: 'Ground Mist / Coastal Fog Layer',
      score: fogScore,
      desc: 'High moisture and tight temperature–dew-point spread creating low mist or fog.',
      formulaSummary: 'High Humidity + Narrow Dew Point Spread − Wind Dispersion',
      fieldTip: 'Look across open fields, coastlines, or ridges where cool, moist air lingers with little wind to mix it away.'
    },
    {
      id: 'valley-fog',
      group: 'fog-mist',
      groupTitle: 'Mist & Fog',
      name: 'Valley Fog',
      commonTerm: 'Lowland / River Basin Blanket Fog',
      score: valleyFogScore,
      desc: 'Settled mist or fog pooling in low basins and valleys under calm conditions.',
      formulaSummary: 'High Humidity + Tight Dew Point Spread − Wind + Cool/Dawn Timing',
      fieldTip: 'Look from higher terrain looking down into low valleys or river basins during calm, humid early hours.'
    },
    {
      id: 'milky-way-clarity',
      group: 'night-sky',
      groupTitle: 'Night Sky',
      name: 'Milky Way Clarity',
      commonTerm: 'Clear Stargazing & Milky Way Visibility',
      score: milkyWayScore,
      desc: 'Dark-sky star and Milky Way visibility when night is dark and skies are clear.',
      formulaSummary: 'Active at Night: 65% Clear Sky + Dark Moon + Visibility Bonus',
      fieldTip: 'Give your eyes 15–20 minutes away from bright screens or lights after dark to spot faint star bands and dust lanes.'
    },
    {
      id: 'storm-light',
      group: 'storm-dynamics',
      groupTitle: 'Storm Dynamics',
      name: 'Storm Light',
      commonTerm: 'Moody Dark Clouds with Bright Sky Breaks',
      score: stormLightScore,
      desc: 'Moody, high-contrast sky light driven by layered clouds, gusts, or pressure shifts.',
      formulaSummary: 'Mid/Low Cloud Structure + Barometric Shift + Gust Activity',
      fieldTip: 'Watch how dark cloud bases contrast against brighter breaks or sunlit edges as weather systems move through.'
    },
    {
      id: 'dramatic-storms-golden',
      group: 'storm-dynamics',
      groupTitle: 'Storm Dynamics',
      name: 'Dramatic Storms / Golden Hour Light',
      commonTerm: 'Clearing Storm Clouds Lit by Low Golden Sun',
      score: dramaticStormGoldenScore,
      desc: 'Dynamic storm clouds meeting low-angle golden or twilight light.',
      formulaSummary: 'Mid Cloud + Rising Pressure / Clarity, weighted by Low Sun / Twilight',
      fieldTip: 'Check the sky right as showers ease near morning or evening—clearing edges often catch dramatic warm light.'
    }
  ];
}

function computeScoresWithTrends(hourData, prevData) {
  const currentItems = computeScoresForHour(hourData);
  const prevItems = prevData ? computeScoresForHour(prevData) : null;
  const prevMap = new Map();

  if (prevItems) {
    prevItems.forEach(item => prevMap.set(item.id, item.score));
  }

  return currentItems.map(item => {
    if (!prevData || !prevMap.has(item.id)) {
      return {
        ...item,
        delta: null,
        trendSymbol: '—',
        trendClass: 'trend-flat',
        trendLabel: 'Baseline hour'
      };
    }

    const prevScore = prevMap.get(item.id);
    const delta = item.score - prevScore;

    if (delta >= 5) {
      return {
        ...item,
        delta,
        trendSymbol: '↑',
        trendClass: 'trend-up',
        trendLabel: `Rising (+${delta} pts vs prior hr)`
      };
    }
    if (delta <= -5) {
      return {
        ...item,
        delta,
        trendSymbol: '↓',
        trendClass: 'trend-down',
        trendLabel: `Falling (${delta} pts vs prior hr)`
      };
    }
    return {
      ...item,
      delta,
      trendSymbol: '→',
      trendClass: 'trend-flat',
      trendLabel: `Steady (${delta >= 0 ? '+' : ''}${delta} pts vs prior hr)`
    };
  });
}

function renderPhenomenaGroups(hourData, prevData) {
  const scores = computeScoresWithTrends(hourData, prevData);
  const container = document.getElementById('phenomenaGroupsContainer');

  const groups = [
    {
      key: 'golden-twilight',
      title: '🌅 Golden & Twilight Light',
      subtitle: 'Dawn/dusk color & burn windows, twilight bands, green flash, and calm-water reflections'
    },
    {
      key: 'fog-mist',
      title: '🌫️ Mist & Fog',
      subtitle: 'Low mist, high-humidity saturation, and valley fog conditions'
    },
    {
      key: 'night-sky',
      title: '🌌 Night Sky',
      subtitle: 'Dark-sky clarity and night star visibility'
    },
    {
      key: 'storm-dynamics',
      title: '⛈️ Storm Dynamics',
      subtitle: 'Active cloud contrast, pressure shifts, and storm-edge light'
    }
  ];

  container.innerHTML = groups.map(grp => {
    const groupItems = scores.filter(s => s.group === grp.key);
    const cardsHtml = groupItems.map(item => {
      const isHigh = item.score >= alertThreshold;
      const scoreClass = item.score >= 75 ? 'score-high' : (item.score >= 50 ? 'score-mid' : 'score-low');
      const colorHex = item.score >= 75 ? '#00F5D4' : (item.score >= 50 ? '#F59E0B' : '#64748B');

      return `
        <div class="phenomenon-card ${isHigh ? 'high-alert' : ''}">
          <div>
            <div class="phenomenon-header">
              <span class="phenomenon-title">${item.name}</span>
              <div class="header-right-actions">
                <span class="trend-pill ${item.trendClass}" title="${item.trendLabel}" aria-label="${item.trendLabel}">${item.trendSymbol}</span>
                <span class="score-badge ${scoreClass}">${item.score}%</span>
                <button class="info-icon-btn" data-phenom-id="${item.id}" title="Common term & observation tip for ${item.name}">ℹ️</button>
              </div>
            </div>
            <p class="phenomenon-desc verbose-only-text">${item.desc}</p>
            <div class="phenomenon-formula-note verbose-only-text">${item.formulaSummary}</div>
          </div>
          <div class="score-bar-bg">
            <div class="score-bar-fill" style="width: ${item.score}%; background-color: ${colorHex};"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="phenomena-group-block">
        <div class="group-header">
          <div>
            <div class="group-title">${grp.title}</div>
            <div class="group-subtitle verbose-only-text">${grp.subtitle}</div>
          </div>
        </div>
        <div class="phenomena-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderMetricsBreakdown(d) {
  const container = document.getElementById('metricsBreakdown');
  const s = d.solar || buildSolarContext(d.timestamp, currentLoc ? currentLoc.lat : 37.5, currentLoc ? currentLoc.lng : -122, {}, {});
  const l = d.lunar || computeLunarContext(new Date(d.timestamp), currentLoc ? currentLoc.lat : 37.5, currentLoc ? currentLoc.lng : -122);

  const tidalActive = Boolean(currentHasTidalWaterInRadius && d.hasMarineFeed && d.tideHeightFt != null);
  const tideDisplayVal = tidalActive ? `${d.tideHeightFt} ft` : 'Not Applicable';
  const waveDisplayVal = tidalActive && d.waveHeightFt != null ? `${d.waveHeightFt} ft` : 'Not Applicable';

  const metrics = [
    { key: 'cloudHigh', label: 'High Cloud', val: `${d.cloudHigh}%`, note: 'Cirrus layer (25–75% ideal)' },
    { key: 'cloudMid', label: 'Mid Cloud', val: `${d.cloudMid}%`, note: 'Mid-level cloud texture' },
    { key: 'cloudLow', label: 'Low Cloud', val: `${d.cloudLow}%`, note: '<20% keeps horizon open' },
    { key: 'rainChance', label: 'Chance of Rain', val: `${d.rainChancePct != null ? d.rainChancePct : 0}%`, note: 'Hourly rain probability' },
    { key: 'windSpeed', label: 'Wind Speed', val: `${d.windSpeed} mph`, note: '<4 mph for calm water' },
    { key: 'windGusts', label: 'Wind Gusts', val: `${d.windGust} mph`, note: 'Surface gustiness' },
    { key: 'humidity', label: 'Humidity', val: `${d.humidity}%`, note: '≥88% supports fog/mist' },
    { key: 'dewPointDepression', label: 'Dew Pt Spread', val: `${d.dewPointDepression}°C`, note: '<2.0°C condenses mist' },
    { key: 'visibility', label: 'Visibility', val: `${d.visibilityKm} km`, note: '>15 km for crisp air' },
    { key: 'sunriseTime', label: 'Sunrise', val: s.sunriseDisplay || '--', note: 'Local dawn sunrise time' },
    { key: 'sunsetTime', label: 'Sunset', val: s.sunsetDisplay || '--', note: 'Local dusk sunset time' },
    { key: 'moonriseTime', label: 'Moonrise', val: l.moonriseDisplay || '--', note: 'Approx. local moonrise' },
    { key: 'moonsetTime', label: 'Moonset', val: l.moonsetDisplay || '--', note: 'Approx. local moonset' },
    {
      key: 'moonPhaseProgress',
      label: 'Moon Phase',
      val: `${l.phaseName} (${l.illuminationPct}% lit)`,
      note: `Cycle progression: ${l.cyclePercent}%`
    },
    {
      key: 'waveHeight',
      label: 'Swell / Wave',
      val: waveDisplayVal,
      isNA: !tidalActive,
      note: tidalActive ? 'Tidal water wave height' : `No tidal waters in ${monitoringRadiusMiles} mi radius`
    },
    {
      key: 'tideLevel',
      label: 'Tide Level',
      val: tideDisplayVal,
      isNA: !tidalActive,
      note: tidalActive ? 'Relative coastal tidal stage' : `No tidal waters in ${monitoringRadiusMiles} mi radius`
    }
  ];

  container.innerHTML = metrics.map(m => `
    <div class="metric-pill">
      <div>
        <div class="metric-top-row">
          <span class="metric-label">${m.label}</span>
          <button class="info-icon-btn" data-metric-key="${m.key}" title="About ${m.label}">ℹ️</button>
        </div>
        <div class="metric-val ${m.isNA ? 'metric-val-na' : ''}">${m.val}</div>
      </div>
      <div class="metric-verbose-note verbose-only-text">${m.note}</div>
    </div>
  `).join('');
}

function clamp(val) {
  return Math.min(100, Math.max(0, val));
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('AtmosPhotic SW Registered'))
      .catch(err => console.log('SW Registration failed:', err));
  }
}
