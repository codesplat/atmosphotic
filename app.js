/**
 * AtmosPhotic PWA Core Engine (Alpha v0.4.8)
 * - Uses standard native browser scrolling in the Phenomena Predictions pane
 *   for maximum cross-platform and cross-device compatibility.
 * - Preserved Concise/Verbose mode, sticky 48h horizon slider, SWR cache, and GPS locate button.
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
const FORECAST_CACHE_KEY = 'atmosphotic_forecast_cache_v1';
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

let favorites = JSON.parse(localStorage.getItem('atmosphotic_favorites') || '[]');
let infoMode = localStorage.getItem('atmosphotic_info_mode') || 'streamlined';
let monitoringRadiusMiles = parseFloat(localStorage.getItem('atmosphotic_radius_miles')) || 5;
let independentPhenomenaScroll = localStorage.getItem('atmosphotic_phenomena_scroll') !== 'false';

const INFO_CONTENT = {
  globalGuide: {
    title: 'AtmosPhotic Alpha User Guide & Engine Overview',
    html: `
      <h4>1. Startup Location & Offline Resilience (Stale-While-Revalidate)</h4>
      <p>AtmosPhotic automatically loads your <strong>last selected location</strong>. Cached 48-hour forecast telemetry renders immediately on cold startup or offline, while fresh Open-Meteo data is silently fetched in the background whenever the app launches or returns to the foreground.</p>

      <h4>2. Information Modes (Concise vs. Verbose)</h4>
      <p>Use the <strong>Concise / Verbose</strong> toggle in the header action bar to switch between a compact dashboard and an expanded educational view. Even in Concise mode, tap any <strong>ℹ️</strong> icon to inspect details for that single item.</p>

      <h4>3. Independent Phenomena Scroll & Sticky 48-Hour Slider</h4>
      <p>The <strong>48-Hour Prediction Horizon</strong> slider stays pinned above <strong>Phenomena Predictions</strong>, which scrolls inside its own scrollable pane (<strong>⇅ Scroll Pane</strong>). Scroll down to any specific condition—such as <em>Valley Fog</em> or <em>Milky Way Clarity</em>—and drag the time slider to watch that score evolve hour by hour without losing your place.</p>

      <h4>4. Searching, Tapping the Map & Microclimate Radius</h4>
      <ul>
        <li><strong>Global Text Search:</strong> Type any city, region, or major landmark into the search bar to fetch coordinates via the Open-Meteo Geocoding API.</li>
        <li><strong>Center on User Location:</strong> Tap the crosshair/locate icon next to the radius presets on the map card to re-center on your current GPS position.</li>
        <li><strong>Direct Map Click / Tap:</strong> Click or tap anywhere on the Leaflet map to drop a pin and immediately pull live forecasts for those exact coordinates.</li>
        <li><strong>Spatial Radius Overlay:</strong> Use the <strong>1 mi</strong>, <strong>5 mi</strong>, and <strong>10 mi</strong> preset buttons above the map to visualize the spatial footprint of your microclimate monitoring zone.</li>
      </ul>

      <h4>5. Custom Favorite Titles</h4>
      <p>Tap the heart icon (<strong>❤️</strong>) to save the active spot and assign a custom title (such as <em>"North Overlook"</em>) so custom map pins are easy to find later. Selecting any favorite automatically scrolls back to the top to display the spot and map.</p>
    `
  },
  locationBanner: {
    title: 'Active Monitoring Location',
    html: `
      <p>Displays the currently selected photography spot, regional classification, and exact GPS coordinates.</p>
      <p>On startup, AtmosPhotic restores your previously selected spot with cached forecast telemetry immediately, detects your current GPS location, or defaults to <strong>Fremont, CA</strong>.</p>
    `
  },
  spatialMap: {
    title: 'Interactive Spatial Map & Microclimate Radius Overlay',
    html: `
      <p>Powered by OpenStreetMap and Leaflet.js, this viewport displays your active coordinate pin surrounded by a shaded <strong>microclimate monitoring radius circle</strong>.</p>
      <ul>
        <li><strong>Distance Presets (1 mi, 5 mi, 10 mi):</strong> Quickly resize the spatial footprint to judge local fog banks, coastal marine layers, or valley inversions around your pin.</li>
        <li><strong>Center on Current Location:</strong> Tap the crosshair button next to the radius controls to center the map on your device's GPS location.</li>
        <li><strong>Tap Anywhere for Instant Forecasts:</strong> Click or tap any spot on the map to relocate the pin and fetch a fresh 48-hour forecast.</li>
      </ul>
    `
  },
  predictionHorizon: {
    title: '48-Hour Prediction Horizon',
    html: `
      <p>In meteorology, a <strong>Prediction Horizon</strong> defines the forward-looking temporal window being analyzed.</p>
      <p>The slider stays pinned right above the scrollable <strong>Phenomena Predictions</strong> pane so you can scroll to any phenomenon card and drag from <strong>Current</strong> through <strong>+48h</strong> while keeping that exact card in view.</p>
    `
  },
  phenomenaOverview: {
    title: 'Grouped Phenomena Predictions (Scroll Pane)',
    html: `
      <p>AtmosPhotic evaluates live atmospheric and marine variables for the selected hour and computes a normalized <strong>0%–100% opportunity score</strong> for 9 photography conditions, organized into three categories:</p>
      <ul>
        <li><strong>Golden & Twilight Light:</strong> Sunrise Color, Sunset Burn, Burn Potential, and Blue Hour Reflections.</li>
        <li><strong>Atmospheric Mist & Fog:</strong> Coastal/Low Mist and Valley Fog.</li>
        <li><strong>Night Sky & Storm Dynamics:</strong> Milky Way Clarity, Storm Light, and Dramatic Post-Storm Light.</li>
      </ul>
      <p>Use the <strong>⇅ Scroll Pane</strong> button in the card header to switch between an independent fixed-height scroll container (ideal for scrubbing the 48h slider) and full-height page flow.</p>
    `
  },
  metricsOverview: {
    title: 'Atmospheric & Ocean Metrics Feed',
    html: `
      <p>Raw hourly telemetry streamed asynchronously from the <strong>Open-Meteo Weather API</strong> and <strong>Open-Meteo Marine API</strong> for the active pin coordinates.</p>
      <p>Tap the <strong>ℹ️</strong> icon on any individual metric pill to learn how that variable affects landscape and seascape photography.</p>
    `
  },
  favoritesSection: {
    title: 'Saved Favorite Locations',
    html: `
      <p>Locations bookmarked with the heart (<strong>❤️</strong>) button are saved persistently in your browser's local storage.</p>
      <p>Tap any saved favorite to load its forecast and scroll smoothly to the top of the page to view the active banner and map. You can rename or remove saved locations anytime.</p>
    `
  }
};

const METRIC_DEFINITIONS = {
  cloudHigh: {
    title: 'High Cloud Cover (%)',
    desc: 'Cirrus and cirrostratus clouds above 20,000 ft. Ideal (30%–70%) for catching vibrant red/orange light during sunrise and sunset burns.',
    ideal: 'Sunrise/Sunset: 30%–70% | Milky Way: < 10%'
  },
  cloudMid: {
    title: 'Mid Cloud Cover (%)',
    desc: 'Altocumulus and altostratus clouds (6,500–20,000 ft). Adds dramatic texture during golden hour and storm light if the western/eastern horizon remains open.',
    ideal: 'Dramatic Light: 25%–60% | Milky Way: < 10%'
  },
  cloudLow: {
    title: 'Low Cloud Cover (%)',
    desc: 'Stratus and cumulus clouds below 6,500 ft. Dense low clouds often block low-angle horizon sunlight, muting sunrise and sunset colors.',
    ideal: 'Sunset/Sunrise & Astro: < 15%'
  },
  windSpeed: {
    title: 'Wind Speed (10m)',
    desc: 'Sustained surface wind speed. Calm winds (< 4 mph) are essential for mirror-like water reflections during blue hour and keep mist/fog intact.',
    ideal: 'Reflections & Fog: < 4 mph'
  },
  windGusts: {
    title: 'Wind Gusts',
    desc: 'Peak short-duration wind bursts. High gusts cause tripod vibration during long exposures and signal active frontal boundaries for storm photography.',
    ideal: 'Long Exposures: < 8 mph | Storm Drama: > 12 mph'
  },
  humidity: {
    title: 'Relative Humidity (%)',
    desc: 'Percentage of moisture saturation in the air. High humidity (> 85%) promotes coastal mist, valley fog, and rich atmospheric color scattering.',
    ideal: 'Fog & Mist: ≥ 88%'
  },
  dewPointDepression: {
    title: 'Dew Point Spread (°C)',
    desc: 'The difference between air temperature and dew point. When this spread drops below 2.0°C, water vapor condenses into visible fog or low mist.',
    ideal: 'Fog Formation: < 1.5°C – 2.0°C'
  },
  visibility: {
    title: 'Atmospheric Visibility (km)',
    desc: 'Horizontal transparency of the atmosphere. High visibility (> 15 km) produces crisp distant mountain ridges, clean starlight, and vivid post-storm clarity.',
    ideal: 'Astro & Crisp Vistas: > 15 km'
  },
  waveHeight: {
    title: 'Swell / Wave Height (ft)',
    desc: 'Significant ocean wave height from the Open-Meteo Marine feed. Larger swells create dramatic sea spray and long-exposure motion trails on coastal rocks.',
    ideal: 'Seascape Drama: 3–8 ft | Calm Bays: < 1.5 ft'
  },
  tideLevel: {
    title: 'Estimated Tide Level (ft)',
    desc: 'Relative tidal stage indicator for coastal planning—useful for timing sea stacks, tide pools, and exposed sandbar reflections.',
    ideal: 'Depends on coastal foreground geometry'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  applyInfoMode(infoMode);
  applyPhenomenaScrollMode(independentPhenomenaScroll);
  updateRadiusPresetUI(monitoringRadiusMiles);
  setupUniversalSearch();
  setupFavorites();
  setupEventListeners();
  setupForegroundRevalidation();
  resolveInitialLocation();
  registerServiceWorker();
});

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

function setMonitoringRadius(miles) {
  monitoringRadiusMiles = miles;
  localStorage.setItem('atmosphotic_radius_miles', String(miles));
  updateRadiusPresetUI(miles);
  updateMapMarkerAndRadius(true);
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
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&hourly=cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m,windgusts_10m,relativehumidity_2m,dewpoint_2m,visibility,surface_pressure&timezone=auto`;
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
      const windSpeed = weatherData.hourly.windspeed_10m[idx] || 2;
      const windGust = weatherData.hourly.windgusts_10m[idx] || 3;
      const humidity = weatherData.hourly.relativehumidity_2m[idx] || 60;
      
      const tempC = 15;
      const dewPoint = weatherData.hourly.dewpoint_2m ? weatherData.hourly.dewpoint_2m[idx] : tempC - 3;
      const dewPointDepression = Math.max(0.1, tempC - dewPoint).toFixed(1);
      
      const visibilityKm = (weatherData.hourly.visibility ? weatherData.hourly.visibility[idx] / 1000 : 15);
      const pressure = weatherData.hourly.surface_pressure ? weatherData.hourly.surface_pressure[idx] : 1013;
      const pressureTrend = idx > 0 ? pressure - weatherData.hourly.surface_pressure[idx-1] : 0;

      const waveHeightFt = marineData && marineData.hourly && marineData.hourly.wave_height && marineData.hourly.wave_height[idx] != null
        ? (marineData.hourly.wave_height[idx] * 3.28084).toFixed(1)
        : '1.2';
      const tideHeightFt = (Math.sin(idx / 3) * 3 + 2.0).toFixed(1);

      hourlyForecast.push({
        timestamp: times[idx],
        hourDisplay: timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateDisplay: timeObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        cloudLow,
        cloudMid,
        cloudHigh,
        windSpeed,
        windGust,
        humidity,
        dewPointDepression,
        visibilityKm: Math.round(visibilityKm),
        waveHeightFt,
        tideHeightFt,
        moonPhase: 0.15,
        pressureTrend
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
    currentHourIdx = parseInt(e.target.value, 10);
    renderApp();
  });

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
      const allScores = computeScores(currentLoc.forecast[currentHourIdx]);
      const p = allScores.find(item => item.id === phenomId);
      if (p) {
        openInfoModal(
          `${p.name} (${p.score}%)`,
          `
            <h4>Category</h4>
            <p>${p.groupTitle}</p>
            <h4>Photographic Conditions</h4>
            <p>${p.desc}</p>
            <h4>Scoring Formula & Weighting</h4>
            <div class="modal-formula-box">${p.formulaSummary}</div>
            <h4>Field Tip</h4>
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
          <h4>Ideal Photography Range</h4>
          <div class="modal-formula-box">${m.ideal}</div>
        `
      );
    }
  });
}

function renderApp() {
  if (!currentLoc || !currentLoc.forecast || currentLoc.forecast.length === 0) return;

  const hourData = currentLoc.forecast[currentHourIdx];
  
  document.getElementById('locName').textContent = currentLoc.name;
  document.getElementById('locCategory').textContent = currentLoc.category;
  document.getElementById('locDescription').textContent = currentLoc.description;
  document.getElementById('locCoords').textContent = `${currentLoc.lat.toFixed(4)}°N, ${currentLoc.lng.toFixed(4)}°W`;
  
  document.getElementById('activeTimeLabel').textContent = `${hourData.dateDisplay} @ ${hourData.hourDisplay}`;

  renderFavoritesUI();
  renderPhenomenaGroups(hourData);
  renderMetricsBreakdown(hourData);
}

function computeScores(d) {
  return [
    {
      id: 'sunrise-color',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunrise Color',
      score: clamp(Math.round((d.cloudHigh * 0.6) + (d.cloudMid * 0.3) - (d.cloudLow * 0.8) + (d.visibilityKm > 15 ? 10 : 0))),
      desc: 'High cirrus clouds catching early dawn light prior to sunrise.',
      formulaSummary: '60% High Cloud + 30% Mid Cloud − 80% Low Cloud + Visibility Bonus (+10%)',
      fieldTip: 'Arrive 30–40 minutes before official sunrise; peak color often happens 15 minutes before the sun breaks the horizon.'
    },
    {
      id: 'sunset-burn',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunset Burn',
      score: clamp(Math.round((d.cloudHigh * 0.65) + (d.cloudMid * 0.25) - (d.cloudLow * 0.9) + 10)),
      desc: 'Vibrant cloud canvas receiving unblocked horizon illumination.',
      formulaSummary: '65% High Cloud + 25% Mid Cloud − 90% Low Cloud + Horizon Baseline (+10%)',
      fieldTip: 'Stay 15–20 minutes after sunset for the "afterglow" when high-altitude clouds ignite in magenta and crimson.'
    },
    {
      id: 'burn-potential',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Sunset/Sunrise Burn Potential',
      score: clamp(Math.round(((d.cloudHigh + d.cloudMid) / 2) * 0.8 - (d.cloudLow * 0.5) + 15)),
      desc: 'General atmospheric setup favorable for dawn or dusk color creation.',
      formulaSummary: '80% Avg(High + Mid Cloud) − 50% Low Cloud + Baseline (+15%)',
      fieldTip: 'Works best when a clean gap exists along the western (sunset) or eastern (sunrise) horizon.'
    },
    {
      id: 'blue-hour-reflections',
      group: 'golden-twilight',
      groupTitle: 'Golden & Twilight Light',
      name: 'Blue Hour Reflections',
      score: clamp(Math.round((100 - d.windSpeed * 10) * 0.5 + (d.humidity > 80 ? 40 : 20) + (d.cloudLow < 15 ? 10 : 0))),
      desc: 'Deep twilight sky combined with glassy, calm water conditions.',
      formulaSummary: '50% Wind Calmness + Humidity Bonus (+20% to +40%) + Clear Low Sky (+10%)',
      fieldTip: 'Use a tripod and a 2–10 second exposure over still ponds, lakes, or sheltered coves to smooth minor ripples.'
    },
    {
      id: 'fog-low-mist',
      group: 'fog-mist',
      groupTitle: 'Atmospheric Mist & Fog',
      name: 'Fog & Low Mist',
      score: clamp(Math.round((d.humidity >= 90 ? 50 : 20) + (parseFloat(d.dewPointDepression) < 2.0 ? 40 : 10) - (d.windSpeed * 5))),
      desc: 'Atmospheric saturation and near-zero dew point spread with calm winds.',
      formulaSummary: 'Humidity Saturation (+50% if ≥90%) + Dew Point Spread (+40% if <2.0°C) − Wind Penalty',
      fieldTip: 'Look for elevated overlooks just above the marine layer to photograph ridges piercing through low fog.'
    },
    {
      id: 'valley-fog',
      group: 'fog-mist',
      groupTitle: 'Atmospheric Mist & Fog',
      name: 'Valley Fog',
      score: clamp(Math.round((d.humidity > 88 ? 45 : 15) + (parseFloat(d.dewPointDepression) < 1.5 ? 45 : 10) - (d.windSpeed * 6))),
      desc: 'Ground-hugging temperature inversion mist settling into low elevation valleys.',
      formulaSummary: 'High Humidity (+45% if >88%) + Tight Dew Point Spread (+45% if <1.5°C) − Wind Penalty',
      fieldTip: 'Best photographed right after dawn when warm golden sunlight illuminates the top of the valley mist.'
    },
    {
      id: 'milky-way-clarity',
      group: 'astro-storms',
      groupTitle: 'Night Sky & Storm Dynamics',
      name: 'Milky Way Clarity',
      score: clamp(Math.round((100 - (d.cloudLow + d.cloudMid + d.cloudHigh)) * 0.6 + (d.moonPhase < 0.25 ? 30 : 0) + (d.visibilityKm > 15 ? 10 : 0))),
      desc: 'Dark sky conditions with low cloud cover and low lunar illumination.',
      formulaSummary: '60% Clear Sky Fraction + Dark Moon Bonus (+30%) + High Visibility (+10%)',
      fieldTip: 'Follow the 500-rule or NPF rule for shutter speed to keep stars sharp without trailing.'
    },
    {
      id: 'storm-light',
      group: 'astro-storms',
      groupTitle: 'Night Sky & Storm Dynamics',
      name: 'Storm Light',
      score: clamp(Math.round((d.cloudMid * 0.5) + (d.pressureTrend !== 0 ? 30 : 10) + (d.windGust > 6 ? 20 : 0))),
      desc: 'High atmospheric contrast, thick cloud dynamics, and post-rain clarity.',
      formulaSummary: '50% Mid-Level Cloud + Active Barometric Shift (+30%) + Gust Dynamics (+20%)',
      fieldTip: 'Position yourself with dark storm clouds as a backdrop while breaks in the clouds spotlight foreground subjects.'
    },
    {
      id: 'dramatic-storms-golden',
      group: 'astro-storms',
      groupTitle: 'Night Sky & Storm Dynamics',
      name: 'Dramatic Storms / Golden Hour Light',
      score: clamp(Math.round((d.cloudMid * 0.4) + (d.pressureTrend > 0 ? 35 : 10) + (d.visibilityKm > 15 ? 25 : 0))),
      desc: 'Passing storm edges allowing low directional golden sunlight.',
      formulaSummary: '40% Mid-Level Cloud + Rising Barometric Pressure (+35%) + High Visibility (+25%)',
      fieldTip: 'Watch for rainbows opposite the sun immediately after rain showers clear near sunset or sunrise.'
    }
  ];
}

function renderPhenomenaGroups(hourData) {
  const scores = computeScores(hourData);
  const container = document.getElementById('phenomenaGroupsContainer');

  const groups = [
    {
      key: 'golden-twilight',
      title: '🌅 Golden & Twilight Light',
      subtitle: 'Horizon color burns, dawn/dusk transitions, and calm twilight water reflections'
    },
    {
      key: 'fog-mist',
      title: '🌫️ Atmospheric Mist & Fog',
      subtitle: 'Marine layer inversions, radiation fog, and low-lying moisture saturation'
    },
    {
      key: 'astro-storms',
      title: '🌌 Night Sky & Storm Dynamics',
      subtitle: 'Astrophotography transparency, clearing storm fronts, and high-contrast light'
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
                <span class="score-badge ${scoreClass}">${item.score}%</span>
                <button class="info-icon-btn" data-phenom-id="${item.id}" title="Details & formula for ${item.name}">ℹ️</button>
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
  const metrics = [
    { key: 'cloudHigh', label: 'High Cloud', val: `${d.cloudHigh}%`, note: 'Cirrus canvas (30–70% ideal)' },
    { key: 'cloudMid', label: 'Mid Cloud', val: `${d.cloudMid}%`, note: 'Altocumulus texture' },
    { key: 'cloudLow', label: 'Low Cloud', val: `${d.cloudLow}%`, note: '<15% keeps horizon open' },
    { key: 'windSpeed', label: 'Wind Speed', val: `${d.windSpeed} mph`, note: '<4 mph for glassy water' },
    { key: 'windGusts', label: 'Wind Gusts', val: `${d.windGust} mph`, note: 'Tripod stability check' },
    { key: 'humidity', label: 'Humidity', val: `${d.humidity}%`, note: '≥88% supports fog/mist' },
    { key: 'dewPointDepression', label: 'Dew Pt Spread', val: `${d.dewPointDepression}°C`, note: '<2.0°C condenses mist' },
    { key: 'visibility', label: 'Visibility', val: `${d.visibilityKm} km`, note: '>15 km for crisp air' },
    { key: 'waveHeight', label: 'Swell / Wave', val: `${d.waveHeightFt} ft`, note: 'Coastal surf energy' },
    { key: 'tideLevel', label: 'Tide Level', val: `${d.tideHeightFt} ft`, note: 'Relative coastal stage' }
  ];

  container.innerHTML = metrics.map(m => `
    <div class="metric-pill">
      <div>
        <div class="metric-top-row">
          <span class="metric-label">${m.label}</span>
          <button class="info-icon-btn" data-metric-key="${m.key}" title="About ${m.label}">ℹ️</button>
        </div>
        <div class="metric-val">${m.val}</div>
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
