# AtmosPhotic - Landscape & Seascape Photography Opportunity Predictor

## Rolling Changelog

### Alpha v0.4.8 - November 19, 2026
- **Cross-Platform Native Scrollbar (Option A)**: Removed custom overlay scroll indicators and scrollbar suppression in favor of standard native scrolling (`overflow-y: auto`) with `scrollbar-width` and `::-webkit-scrollbar` styling for broad cross-device compatibility.
- **Generic Cross-Platform CSS**: Replaced dynamic viewport `dvh` units and `backdrop-filter` rules on sticky/modal elements with standard `vh` units and solid surfaces.
- **Service Worker Cache Bump**: Updated `sw.js` cache key to `atmosphotic-alpha-v4.8`.

### Alpha v0.4.7 - November 19, 2026
- **Concise Mode Label**: Renamed `"Streamlined"` toggle button to `"Concise"`.
- **Independent Phenomena Predictions Scroll Pane + Sticky 48h Slider**: Added `#phenomenaScrollViewport` and `⇅ Scroll Pane / Full List` toggle.
