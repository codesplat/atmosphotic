# AtmosPhotic - Landscape & Seascape Photography Opportunity Predictor

## Rolling Changelog

### v0.4.5 - November 15, 2026
- **Timeline Label Clarity**: Updated the 48-Hour Prediction Horizon start tick from `"Now"` to `"Current"` to clearly indicate the current local hour.
- **Stale-While-Revalidate (SWR) Forecast Caching**:
  - Persists fetched 48-hour forecasts per coordinate pair in `localStorage` (`atmosphotic_forecast_cache_v1`) so cached predictions render instantaneously on cold startup or while offline, automatically advancing past hours to keep index `0` aligned with the current local hour.
  - Silently fetches fresh Open-Meteo weather and marine telemetry in the background on app launch and whenever the app returns to the foreground (`visibilitychange` / `focus`), seamlessly refreshing the cache and UI.
  - Updated Service Worker (`sw.js` v4.5) with Stale-While-Revalidate handling for static app shell assets.

### v0.4.4 - November 12, 2026
- **Accurate Local Hour Prediction Horizon Fix**: Replaced `new Date().toISOString()` with local date component extraction (`getFullYear()`, `getMonth()`, `getDate()`, `getHours()`) to construct the exact local hour prefix.
- **Auto-Scroll to Top on Favorite Selection**: Smoothly scrolls back to top when selecting saved favorites.
- **Compact Vertical Spacing**: Minimized vertical padding and card margins.
