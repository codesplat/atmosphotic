/**
 * AtmosPhotic Mock Dataset - Fremont, CA & Vicinity (Expanded to 25 Locations)
 */
const MOCK_LOCATIONS = [
  {
    id: 'coyote-hills',
    name: 'Coyote Hills Regional Park',
    category: 'Wetlands & Salt Ponds',
    lat: 37.5528,
    lng: -122.0874,
    description: 'Expansive wetlands, wooden boardwalks, and salt pond reflections.',
    forecast: generateHourlyForecast(37.5528, -122.0874)
  },
  {
    id: 'mission-peak',
    name: 'Mission Peak Regional Preserve',
    category: 'Summit & Mountain Ridges',
    lat: 37.5122,
    lng: -121.8894,
    description: 'High elevation summit overlooking Sunol Valley and South Bay fog layers.',
    forecast: generateHourlyForecast(37.5122, -121.8894)
  },
  {
    id: 'don-edwards',
    name: 'Don Edwards Wildlife Refuge (Dumbarton Pier)',
    category: 'Coastal Bay & Estuary',
    lat: 37.5372,
    lng: -122.0735,
    description: 'Historic pier structure, open bay water, and dramatic horizon golden hour lighting.',
    forecast: generateHourlyForecast(37.5372, -122.0735)
  },
  {
    id: 'sunol-wilderness',
    name: 'Sunol Regional Wilderness',
    category: 'Canyon & Forest Creek',
    lat: 37.5147,
    lng: -121.8311,
    description: 'Deep Alameda Creek valley, oak woodland fog pockets, and stream reflections.',
    forecast: generateHourlyForecast(37.5147, -121.8311)
  },
  {
    id: 'quarry-lakes',
    name: 'Quarry Lakes Regional Recreation Area',
    category: 'Lakes & Inland Shorelines',
    lat: 37.5702,
    lng: -121.9868,
    description: 'Calm horseshoe lake surfaces ideal for glassy morning reflections and twilight colors.',
    forecast: generateHourlyForecast(37.5702, -121.9868)
  },
  {
    id: 'ardenwood',
    name: 'Ardenwood Historic Farm',
    category: 'Eucalyptus Groves & Historic Estate',
    lat: 37.5714,
    lng: -122.0232,
    description: 'Tall eucalyptus trees, historic Victorian gardens, and misty morning farm fields.',
    forecast: generateHourlyForecast(37.5714, -122.0232)
  },
  {
    id: 'alameda-creek-trail',
    name: 'Alameda Creek Regional Trail',
    category: 'Riparian Corridor & Levee',
    lat: 37.5611,
    lng: -122.0125,
    description: 'Linear water channel and levee trail capturing long-range sunset clouds and cyclist silhouettes.',
    forecast: generateHourlyForecast(37.5611, -122.0125)
  },
  {
    id: 'niles-canyon',
    name: 'Niles Canyon Railway Corridor',
    category: 'Canyon Gorge & Historic Bridge',
    lat: 37.5733,
    lng: -121.9324,
    description: 'Rugged canyon curves, winding creek beds, and old iron railroad bridge vantage points.',
    forecast: generateHourlyForecast(37.5733, -121.9324)
  },
  {
    id: 'ed-levin',
    name: 'Ed R. Levin County Park',
    category: 'Foothill Reservoir & Glider Hill',
    lat: 37.4561,
    lng: -121.8752,
    description: 'Spring Lake reflections and elevated grassy slopes looking out toward Milpitas and South Bay.',
    forecast: generateHourlyForecast(37.4561, -121.8752)
  },
  {
    id: 'el-corte-madera',
    name: 'Garin Regional Park',
    category: 'Oak Woodlands & Rolling Hills',
    lat: 37.6433,
    lng: -122.0392,
    description: 'Rolling East Bay hills, stock ponds, and historic farm windmills catching morning mist.',
    forecast: generateHourlyForecast(37.6433, -122.0392)
  },
  {
    id: 'dry-creek-pioneer',
    name: 'Dry Creek Pioneer Regional Park',
    category: 'Wooded Ravine & Grasslands',
    lat: 37.6189,
    lng: -122.0521,
    description: 'Quiet wooded ravines and golden grassland ridges near Union City and Hayward.',
    forecast: generateHourlyForecast(37.6189, -122.0521)
  },
  {
    id: 'hayward-shoreline',
    name: 'Hayward Shoreline Interpretive Center',
    category: 'Salt Marsh & Tidal Slough',
    lat: 37.6364,
    lng: -122.1158,
    description: 'Expansive salt marshes, tidal sloughs, and unobstructed views across San Francisco Bay.',
    forecast: generateHourlyForecast(37.6364, -122.1158)
  },
  {
    id: 'oyote-creek-trail',
    name: 'Coyote Creek Trail (Milpitas Reach)',
    category: 'Riparian Woodland & Stream',
    lat: 37.4389,
    lng: -121.9125,
    description: 'Winding multi-use path bordered by cottonwoods and seasonal creek reflections.',
    forecast: generateHourlyForecast(37.4389, -121.9125)
  },
  {
    id: 'elizabeth-lake',
    name: 'Lake Elizabeth (Central Park Fremont)',
    category: 'Urban Lake & Mountain Backdrop',
    lat: 37.5585,
    lng: -121.9708,
    description: 'Central Fremont lake with wide open fountain views and sunset glow behind Mission Peak.',
    forecast: generateHourlyForecast(37.5585, -121.9708)
  },
  {
    id: 'stately-pines',
    name: 'Palomares Hills Ridge',
    category: 'Mountain Ridge & Valley Fog',
    lat: 37.6912,
    lng: -122.0489,
    description: 'High ridge looking down into Castro Valley cloud inversions and morning fog.',
    forecast: generateHourlyForecast(37.6912, -122.0489)
  },
  {
    id: 'bair-island',
    name: 'Bair Island Wildlife Refuge',
    category: 'Deep Bay Slough & Wetlands',
    lat: 37.5028,
    lng: -122.2154,
    description: 'Peninsula-side tidal marshlands with glassy water channels at dawn and dusk.',
    forecast: generateHourlyForecast(37.5028, -122.2154)
  },
  {
    id: 'ravenswood-pier',
    name: 'Ravenswood Open Space Preserve',
    category: 'Historic Pier & Salt Pans',
    lat: 37.4851,
    lng: -122.1465,
    description: 'Old wooden pier remnants jutting into South Bay mudflats and vibrant sunset skies.',
    forecast: generateHourlyForecast(37.4851, -122.1465)
  },
  {
    id: 'crystal-springs',
    name: 'Pulwater Watershed Viewpoint (San Andreas)',
    category: 'Reservoir & Pine Forest',
    lat: 37.4721,
    lng: -122.3214,
    description: 'Pristine reservoir water reflections framed by dense Santa Cruz mountain conifers.',
    forecast: generateHourlyForecast(37.4721, -122.3214)
  },
  {
    id: 'huddart-park',
    name: 'Huddart Park',
    category: 'Redwood Forest & Ravine',
    lat: 37.4412,
    lng: -122.2814,
    description: 'Towering redwood canopies creating dramatic crepuscular light rays during morning mist.',
    forecast: generateHourlyForecast(37.4412, -122.2814)
  },
  {
    id: 'windy-hill',
    name: 'Windy Hill Open Space Preserve',
    category: 'Grassland Ridge & Bay Vista',
    lat: 37.3789,
    lng: -122.2341,
    description: 'High ridgetop grassland with panoramic views stretching across the entire Bay Area.',
    forecast: generateHourlyForecast(37.3789, -122.2341)
  },
  {
    id: 'castle-rock',
    name: 'Castle Rock Ridge',
    category: 'Sandstone Formations & Conifers',
    lat: 37.2285,
    lng: -122.0964,
    description: 'Unique sandstone rock formations, dense fog channels, and sunset lookouts in the Santa Cruz mountains.',
    forecast: generateHourlyForecast(37.2285, -122.0964)
  },
  {
    id: 'monte-bello',
    name: 'Monte Bello Open Space Preserve',
    category: 'Mountain Peak & Radio Dish Vista',
    lat: 37.3325,
    lng: -122.1784,
    description: 'High elevation plateau offering sweeping views of fog layers pouring over the Peninsula.',
    forecast: generateHourlyForecast(37.3325, -122.1784)
  },
  {
    id: 'rancho-san-antonio',
    name: 'Rancho San Antonio County Park',
    category: 'Foothill Farm & Deer Hollow',
    lat: 37.3481,
    lng: -122.0912,
    description: 'Rolling foothills, oak savanna, and quiet streamside trails near Cupertino.',
    forecast: generateHourlyForecast(37.3481, -122.0912)
  },
  {
    id: 'stevens-creek',
    name: 'Stevens Creek County Park',
    category: 'Reservoir & Sycamore Groves',
    lat: 37.3012,
    lng: -122.0654,
    description: 'Calm reservoir waters reflecting surrounding sycamore and oak fall foliage.',
    forecast: generateHourlyForecast(37.3012, -122.0654)
  },
  {
    id: 'san-asidro',
    name: 'San Ysidro Open Space Preserve',
    category: 'Gilroy Hills & Oak Grassland',
    lat: 37.0014,
    lng: -121.5542,
    description: 'Rolling South County hillsides with vibrant spring wildflowers and dramatic sunset angles.',
    forecast: generateHourlyForecast(37.0014, -121.5542)
  }
];

function generateHourlyForecast(lat, lng) {
  const hours = [];
  const start = new Date();
  start.setMinutes(0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const time = new Date(start.getTime() + i * 3600 * 1000);
    const hourNum = time.getHours();
    
    const isDawnDusk = (hourNum >= 5 && hourNum <= 7) || (hourNum >= 17 && hourNum <= 19);
    const isNight = hourNum >= 21 || hourNum <= 4;
    
    hours.push({
      timestamp: time.toISOString(),
      hourDisplay: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateDisplay: time.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      cloudLow: Math.floor(Math.random() * 20),
      cloudMid: isDawnDusk ? Math.floor(20 + Math.random() * 30) : Math.floor(Math.random() * 40),
      cloudHigh: isDawnDusk ? Math.floor(40 + Math.random() * 45) : Math.floor(Math.random() * 50),
      windSpeed: Math.max(1, Math.floor(2 + Math.sin(i / 3) * 4 + Math.random() * 3)),
      windGust: Math.floor(3 + Math.random() * 5),
      humidity: isNight ? Math.floor(85 + Math.random() * 14) : Math.floor(50 + Math.random() * 30),
      dewPointDepression: isNight ? (Math.random() * 2.5).toFixed(1) : (3.0 + Math.random() * 5).toFixed(1),
      visibilityKm: Math.floor(12 + Math.random() * 10),
      waveHeightFt: (0.5 + Math.random() * 1.5).toFixed(1),
      tideHeightFt: (Math.sin(i / 2) * 3 + 2.5).toFixed(1),
      moonPhase: 0.1,
      pressureTrend: (Math.random() > 0.5 ? 2.5 : -1.2)
    });
  }
  return hours;
}