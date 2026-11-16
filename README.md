# AtmosPhotic - Landscape & Seascape Photography Opportunity Predictor

## Rolling Changelog

### Alpha v0.4.6 - November 16, 2026
- **Alpha Release Designation**: Updated header badge (`Alpha v0.4.6`), footer, and guide titles to reflect the AtmosPhotic Alpha build.
- **Center Map on Current User Location**: Added a GPS crosshair action button on the Spatial View map card (`#centerCurrentLocBtn`) to re-center the map and load live atmospheric/marine telemetry for the user's current position.
- **Location Card Description Refinement**: Updated searched location descriptions from `"Custom searched location in ..."` to `"Searched location in ..."`.
- **Service Worker Cache Bump**: Updated `sw.js` cache key to `atmosphotic-alpha-v4.6`.

### v0.4.5 - November 15, 2026
- **Timeline Label Clarity**: Updated the 48-Hour Prediction Horizon start tick from `"Now"` to `"Current"`.
- **Stale-While-Revalidate (SWR) Forecast Caching**: Instant cached forecast startup with silent background revalidation.
