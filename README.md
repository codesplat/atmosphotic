# AtmosPhotic - Landscape & Seascape Photography Opportunity Predictor

## Rolling Changelog

### Alpha v0.5.1 - November 21, 2026
- **Crepuscular Rays Card**: Replaced `Anticrepuscular Rays` with `Crepuscular Rays` in **Golden & Twilight Light**, updating the card ID, description, modal formula summary, and observation tip to reflect sunbeams fanning through broken clouds or gaps around a low sun.
- **Service Worker Cache Bump**: Updated `sw.js` cache key to `atmosphotic-alpha-v5.1`.

### Alpha v0.5.0 - November 21, 2026
- **Solar & Time-of-Day Context**: Added Open-Meteo `daily.sunrise` and `daily.sunset` fetching plus solar elevation calculation so sunrise/sunset windows, dawn/dusk blue hour, daytime, and night conditions are evaluated against time of day, with a live phase badge in the horizon header.
- **Reorganized Groups & Cards**:
  - **Golden & Twilight Light**: `Sunrise Color`, `Sunrise Burn`, `Sunset Color`, `Sunset Burn`, `Burn Potential` (time-agnostic mid/high cloud layer readiness index for future evaluation/consolidation), `Dawn Blue Hour`, `Dusk Blue Hour`, `Earth's Shadow & Belt of Venus`, `Anticrepuscular Rays`, and `Water Reflections` (time-aware across night, twilight/horizon, and daytime calm water).
  - **Mist & Fog**: `Fog & Low Mist` and `Valley Fog`.
  - **Night Sky**: `Milky Way Clarity`.
  - **Storm Dynamics**: `Storm Light` and `Dramatic Storms / Golden Hour Light`.
- **Hour-Over-Hour Trend Indicators**: Added `↑` (rising), `↓` (falling), and `→` (steady) badges comparing each prediction score against the prior hour.
- **Sky & Weather Observation Tips**: Updated card descriptions and modal tips to focus on observing light and weather mechanics for broader audiences.

### Alpha v0.4.8 - November 19, 2026
- **Cross-Platform Native Scrollbar**: Removed custom overlay scroll indicators in favor of standard native scrolling (`overflow-y: auto`) with `scrollbar-width` and `::-webkit-scrollbar` styling.
