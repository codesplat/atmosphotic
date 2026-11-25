# AtmosPhotic - Landscape & Seascape Photography Opportunity Predictor

## Rolling Changelog

### Alpha v0.5.2 - November 25, 2026
- **48-Hour Prediction Horizon Slider Lock**: Added a persistent **Unlocked / Locked** toggle (`🔓` / `🔒`) next to the horizon readout that disables slider input when locked to prevent accidental time scrubbing while scrolling on mobile screens.
- **Spatial View Tidal Water Detection**: Checks whether tidal ocean or bay waters lie within the active Spatial View radius (`1 mi`, `5 mi`, or `10 mi`). When no tidal waters fall inside the active radius, **Tide Level** and **Swell / Wave** display **Not Applicable**.
- **Sunset Green Flash Prediction + Eye Safety Warning**: Added **Sunset Green Flash** to **Golden & Twilight Light**, gated to the sunset window with low horizon cloud cover and high visibility, including an eye-safety warning in its info popover.
- **Common Term in Prediction Info Popovers**: Added a dedicated **Common Term** section at the top of every prediction's `ℹ️` popover to give non-technical users the everyday name or description.
- **Expanded Atmospheric, Solar & Lunar Metrics**: Added **Chance of Rain** (`precipitation_probability`), **Sunrise**, **Sunset**, **Moonrise**, **Moonset**, and **Moon Phase** (phase name, illumination %, and lunar cycle progression) to **Atmospheric & Ocean Metrics (Live Feed)**.
- **Service Worker Cache Bump**: Updated `sw.js` cache key to `atmosphotic-alpha-v5.2`.

### Alpha v0.5.1 - November 21, 2026
- **Crepuscular Rays Card**: Replaced `Anticrepuscular Rays` with `Crepuscular Rays` in **Golden & Twilight Light**.

### Alpha v0.5.0 - November 21, 2026
- **Solar & Time-of-Day Context**: Added Open-Meteo `daily.sunrise` and `daily.sunset` fetching plus solar elevation calculation, reorganized groups, time-aware `Water Reflections`, and hour-over-hour trend arrows.
