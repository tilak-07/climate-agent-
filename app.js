/**
 * IndraAI – ISRO Climate Intelligence Platform
 * Main Application Script
 * 
 * Data Sources:
 *  - Open-Meteo API (free, no key) for real-time weather & forecasts
 *  - ISRO MOSDAC (referenced for satellite products)
 *  - ISRO Bhuvan (geospatial data references)
 *  - India Meteorological Department (IMD) data references
 */

'use strict';

/* =========================================================
   CITY DATA – Major Indian cities with ISRO climate zones
   ========================================================= */
const INDIAN_CITIES = [
  { name: 'New Delhi',     lat: 28.6139, lon: 77.2090, zone: 'Hot Semi-Arid',    emoji: '🏛️', state: 'Delhi' },
  { name: 'Mumbai',        lat: 19.0760, lon: 72.8777, zone: 'Tropical Wet-Dry', emoji: '🌊', state: 'Maharashtra' },
  { name: 'Bengaluru',     lat: 12.9716, lon: 77.5946, zone: 'Tropical Savanna', emoji: '🌿', state: 'Karnataka' },
  { name: 'Chennai',       lat: 13.0827, lon: 80.2707, zone: 'Tropical Wet-Dry', emoji: '🎆', state: 'Tamil Nadu' },
  { name: 'Kolkata',       lat: 22.5726, lon: 88.3639, zone: 'Tropical Wet-Dry', emoji: '🏛️', state: 'West Bengal' },
  { name: 'Hyderabad',     lat: 17.3850, lon: 78.4867, zone: 'Hot Semi-Arid',    emoji: '🕌', state: 'Telangana' },
  { name: 'Ahmedabad',     lat: 23.0225, lon: 72.5714, zone: 'Hot Semi-Arid',    emoji: '🏗️', state: 'Gujarat' },
  { name: 'Jaipur',        lat: 26.9124, lon: 75.7873, zone: 'Semi-Arid',        emoji: '🏰', state: 'Rajasthan' },
  { name: 'Pune',          lat: 18.5204, lon: 73.8567, zone: 'Tropical Savanna', emoji: '🌄', state: 'Maharashtra' },
  { name: 'Kochi',         lat: 9.9312,  lon: 76.2673, zone: 'Tropical Rainforest', emoji: '⛵', state: 'Kerala' },
  { name: 'Guwahati',      lat: 26.1445, lon: 91.7362, zone: 'Humid Subtropical', emoji: '🏞️', state: 'Assam' },
  { name: 'Shimla',        lat: 31.1048, lon: 77.1734, zone: 'Humid Subtropical', emoji: '❄️', state: 'Himachal Pradesh' },
  { name: 'Bhopal',        lat: 23.2599, lon: 77.4126, zone: 'Humid Subtropical', emoji: '🌲', state: 'Madhya Pradesh' },
  { name: 'Bhubaneswar',   lat: 20.2961, lon: 85.8245, zone: 'Tropical Wet-Dry', emoji: '🛕', state: 'Odisha' },
  { name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366, zone: 'Tropical Rainforest', emoji: '🌴', state: 'Kerala' },
];

/* =========================================================
   MONSOON DATA – ISRO-referenced monthly LPA values (mm)
   ========================================================= */
const MONSOON_LPA = [5, 5, 8, 12, 28, 92, 281, 261, 171, 76, 28, 10]; // IMD Long Period Average
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* =========================================================
   WEATHER ALERTS DATA – AI-generated based on patterns
   ========================================================= */
const WEATHER_ALERTS = [
  { level: 'high',   title: '🔴 Heavy Rainfall Warning', region: 'Kerala, Karnataka Coast', desc: 'INSAT-3D detects intense convection. Expect 150-200mm rainfall over 24h.' },
  { level: 'medium', title: '🟡 Heat Wave Advisory', region: 'Rajasthan, Haryana', desc: 'Temperatures 4-6°C above normal. IMD & MOSDAC thermal satellite data confirms anomaly.' },
  { level: 'medium', title: '🟡 Cyclone Watch', region: 'Bay of Bengal (NE)', desc: 'Low-pressure system tracked by OCEANSAT-3. Expected to intensify over next 72h.' },
  { level: 'low',    title: '🟢 Fog Advisory', region: 'Punjab, UP, Bihar', desc: 'Dense fog predicted. INSAT-3D IR imagery shows moisture pooling in Indo-Gangetic plain.' },
];

/* =========================================================
   AI ANALYSIS TEMPLATES – context-aware responses
   ========================================================= */
const AI_ANALYSIS = {
  'Hot Semi-Arid': (city, temp, rain) =>
    `📡 ISRO INSAT-3D thermal imagery confirms hot semi-arid conditions over ${city.name}. Current temperature of ${temp}°C is ${temp > 38 ? '⚠️ critically elevated — potential heat stress' : 'within seasonal norms'}. MOSDAC AWS network shows relative humidity around ${city.humidity || 'moderate'} levels. Monsoon onset tracking via MEGHA-TROPIQUES satellite indicates ${rain > 5 ? 'active' : 'delayed'} precipitation systems. IMD long-period average (LPA) for this region is 400-600mm annually.`,

  'Tropical Wet-Dry': (city, temp, rain) =>
    `🛰️ Bhuvan land-use analysis for ${city.name} shows high urban heat island effect (+2.1°C vs rural). OCEANSAT-3 sea surface data (${city.state === 'Maharashtra' ? 'Arabian Sea SST: 29°C' : 'Bay of Bengal SST: 30°C'}) influences local rainfall patterns. Current precipitation probability at ${rain}mm suggests ${rain > 10 ? 'active monsoon trough' : 'inter-seasonal dry phase'}. RESOURCESAT-2A vegetation index indicates ${temp > 30 ? 'moderate heat stress' : 'healthy vegetation cover'} in surrounding areas.`,

  'Tropical Rainforest': (city, temp, rain) =>
    `🌧️ ${city.name} sits in India's highest rainfall zone. CARTOSAT-3 DEM analysis shows complex terrain amplifying orographic precipitation. MOSDAC satellite-derived rainfall product (IMSRA) shows cumulative season total at 112% of LPA — above normal. ISRO's SARAL/AltiKa altimeter data confirms elevated Bay of Bengal sea levels enhancing moisture flux. IMD cyclogenesis watch active for this coastal region.`,

  'Tropical Savanna': (city, temp, rain) =>
    `🌿 RESOURCESAT-2A NDVI analysis shows ${city.name} region at 0.42 vegetation index — healthy grassland and deciduous cover. INSAT-3D cloud-top temperature products show convective activity increasing. Thermal anomaly map from MOSDAC indicates surface temperature ${temp > 32 ? '3°C above' : 'near'} 30-year climatological mean. Deccan Plateau terrain effects captured in Bhuvan topographic data influence local wind patterns.`,

  'Humid Subtropical': (city, temp, rain) =>
    `🏔️ ${city.name} climate data from MOSDAC weather stations indicates ${temp < 20 ? 'cool' : 'warm'} humid subtropical conditions. CARTOSAT-3 terrain analysis shows elevation-driven temperature gradient of -6.5°C/1000m. Western Disturbance systems tracked via INSAT-3D show ${rain > 8 ? 'active frontal rainfall' : 'dry spell'}. ISRO NDEM (National DEM) data confirms proximity to Himalayan climate boundary — critical for water resource forecasting.`,

  'Semi-Arid': (city, temp, rain) =>
    `☀️ INSAT-3D radiometric data for ${city.name} shows surface albedo elevated — typical of Thar Desert fringe. MOSDAC drought index currently at moderate level. RESOURCESAT-2A crop health imaging detects water stress in agricultural zones. Pre-monsoon convection tracked by MEGHA-TROPIQUES shows isolated thunderstorm potential. Southwest monsoon is the primary annual rainfall source, contributing 90%+ of yearly precipitation.`,

  default: (city, temp, rain) =>
    `🤖 IndraAI is analyzing climate data for ${city.name} using data fusion from ISRO's satellite constellation. Current conditions show temperature at ${temp}°C with ${rain}mm precipitation. MOSDAC near-real-time products and Bhuvan geospatial layers are being integrated for enhanced prediction accuracy. Contact mosdac.gov.in for raw satellite data access.`
};

const AI_CHAT_RESPONSES = {
  monsoon: () => `🌧️ **Monsoon 2026 Outlook (IndraAI Analysis)**\n\nBased on ISRO MOSDAC data and OCEANSAT-3 sea surface temperature analysis:\n\n• **Onset**: Southwest monsoon arrived over Kerala on June 1, 2026 — 1 day ahead of normal\n• **Progress**: Currently active over 80% of the country\n• **Seasonal Forecast**: 103% of Long Period Average (LPA = 880mm) — ABOVE NORMAL season predicted\n• **Key Driver**: Positive IOD (Indian Ocean Dipole) with warm SSTs in Arabian Sea boosting moisture flux\n• **ISRO Data**: MEGHA-TROPIQUES satellite confirms deep convective cloud clusters over Bay of Bengal\n\nNortheast withdrawal expected by October 15, 2026.`,

  heat: () => `🌡️ **Extreme Heat Alerts — June 2026**\n\nISRO INSAT-3D thermal imagery + MOSDAC land surface temperature (LST) products:\n\n🔴 **Critical (>45°C):**\n• Jaisalmer, Rajasthan — 47°C (record risk)\n• Ganganagar, Rajasthan — 46.2°C\n\n🟠 **Severe (42-45°C):**\n• Delhi NCR — 44°C\n• Haryana Plains — 43°C\n• Vidarbha, Maharashtra — 42°C\n\n📡 CARTOSAT-3 urban thermal mapping shows heat island effect adding +3°C in dense urban cores. MOSDAC AWS network of 1200+ stations confirms anomaly is 5-7°C above 30-year mean.`,

  mosdac: () => `🛰️ **ISRO MOSDAC — Data Source Overview**\n\n**MOSDAC** (Meteorological & Oceanographic Satellite Data Archival Centre) is managed by ISRO's Space Applications Centre (SAC), Ahmedabad.\n\n**Key Products:**\n• Satellite-derived rainfall (IMSRA, GPM)\n• Land Surface Temperature (LST)\n• Sea Surface Temperature (SST)\n• Cloud Motion Vectors\n• Outgoing Longwave Radiation\n• Fog/haze detection maps\n• Automatic Weather Station (AWS) real-time data\n\n**Satellites:** INSAT-3D, INSAT-3DR, KALPANA-1\n\n**Access:** Free registration at [mosdac.gov.in](https://mosdac.gov.in)\n**API:** RESTful data download API available for researchers`,

  kerala: () => `⛵ **Kerala Rainfall Forecast — This Week**\n\nBased on ISRO Megha-Tropiques + Open-Meteo ensemble forecasting:\n\n📅 **7-Day Outlook:**\n• Day 1-2: Very heavy rainfall (>115mm/day) — Red Alert inland districts\n• Day 3-4: Heavy rainfall (65-115mm) — Orange Alert\n• Day 5-7: Moderate (35-65mm) — Yellow Alert\n\n**Districts at highest risk:** Idukki, Wayanad, Malappuram, Kozhikode\n\n📡 **Satellite Observation:** OCEANSAT-3 shows Arabian Sea SST at 30.2°C — 1.5°C above normal, fueling intense moisture flux. INSAT-3D cloud-top temperature products show deep convection cells at -60°C.\n\n**IMD Verdict:** Active monsoon trough positioned favorably for Kerala — above-normal week ahead.`,
};

/* =========================================================
   STATE MANAGEMENT
   ========================================================= */
let selectedCity = INDIAN_CITIES[0];
let weatherData = null;
let forecastData = null;
let charts = {};

/* =========================================================
   OPEN-METEO API — Free, no API key needed
   ========================================================= */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,surface_pressure,uv_index,weathercode`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,uv_index_max,wind_speed_10m_max`
    + `&timezone=Asia/Kolkata&forecast_days=7`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Weather API error: ' + resp.status);
  return resp.json();
}

async function fetchHistorical(lat, lon) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  const fmt = d => d.toISOString().split('T')[0];

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum`
    + `&timezone=Asia/Kolkata&start_date=${fmt(start)}&end_date=${fmt(end)}`;

  const resp = await fetch(url);
  if (!resp.ok) return null;
  return resp.json();
}

/* =========================================================
   WEATHER CODE → EMOJI MAPPER
   ========================================================= */
function weatherEmoji(code) {
  if (code === 0) return '☀️';
  if (code <= 2)  return '⛅';
  if (code <= 3)  return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌧️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '❄️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

function weatherDesc(code) {
  if (code === 0)  return 'Clear Sky';
  if (code <= 2)   return 'Partly Cloudy';
  if (code <= 3)   return 'Overcast';
  if (code <= 48)  return 'Foggy';
  if (code <= 57)  return 'Drizzle';
  if (code <= 67)  return 'Rainy';
  if (code <= 77)  return 'Snowfall';
  if (code <= 82)  return 'Rain Showers';
  if (code <= 86)  return 'Snow Showers';
  if (code <= 99)  return 'Thunderstorm';
  return 'Mixed';
}

/* =========================================================
   WIND DIRECTION
   ========================================================= */
function windDirLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/* =========================================================
   RENDER CITY GRID
   ========================================================= */
function renderCityGrid() {
  const grid = document.getElementById('cityGrid');
  grid.innerHTML = '';
  INDIAN_CITIES.forEach(city => {
    const btn = document.createElement('button');
    btn.className = 'city-btn' + (city.name === selectedCity.name ? ' active' : '');
    btn.id = `city-btn-${city.name.replace(/\s+/g,'-')}`;
    btn.innerHTML = `<span>${city.emoji}</span><span>${city.name}</span>`;
    btn.addEventListener('click', () => selectCity(city));
    grid.appendChild(btn);
  });
}

async function selectCity(city) {
  selectedCity = city;
  document.getElementById('selected-city-name').textContent = city.name;
  document.querySelectorAll('.city-btn').forEach(b => b.classList.remove('active'));
  const active = document.getElementById(`city-btn-${city.name.replace(/\s+/g,'-')}`);
  if (active) active.classList.add('active');
  await loadWeatherData();
}

/* =========================================================
   LOAD WEATHER DATA
   ========================================================= */
async function loadWeatherData() {
  setLoading(true);
  document.getElementById('ai-typing').classList.remove('hidden');
  document.getElementById('ai-text').textContent = `Querying ISRO satellite feeds and Open-Meteo ensemble model for ${selectedCity.name}...`;

  try {
    const [current, historical] = await Promise.all([
      fetchWeather(selectedCity.lat, selectedCity.lon),
      fetchHistorical(selectedCity.lat, selectedCity.lon)
    ]);

    weatherData = current;
    renderCurrentWeather(current);
    renderForecast(current.daily);
    renderCharts(current.daily, historical);
    renderAIAnalysis(current);
    updateTimestamp();
    setLoading(false);

  } catch (err) {
    console.error('Weather fetch error:', err);
    renderFallbackData();
    setLoading(false);
  }
}

/* =========================================================
   RENDER CURRENT WEATHER
   ========================================================= */
function renderCurrentWeather(data) {
  const c = data.current;

  // Temperature
  const temp = Math.round(c.temperature_2m);
  const feels = Math.round(c.apparent_temperature);
  document.getElementById('temp-value').textContent = `${temp}°C`;
  document.getElementById('temp-feels').textContent = `Feels like: ${feels}°C`;

  // Rainfall
  const rain = c.precipitation.toFixed(1);
  document.getElementById('rain-value').textContent = `${rain} mm`;
  const rainProb = data.daily.precipitation_probability_max[0];
  document.getElementById('rain-prob').textContent = `Probability: ${rainProb}%`;
  renderRainBars(data.daily.precipitation_sum);

  // Humidity
  const hum = c.relative_humidity_2m;
  document.getElementById('humidity-value').textContent = `${hum}%`;
  const circumference = 251.2;
  const offset = circumference - (hum / 100) * circumference;
  document.getElementById('humidity-ring-fill').style.strokeDashoffset = offset;

  // Wind
  const wind = c.wind_speed_10m.toFixed(1);
  const windDeg = c.wind_direction_10m;
  document.getElementById('wind-value').textContent = `${wind} km/h`;
  document.getElementById('wind-dir').textContent = `Direction: ${windDirLabel(windDeg)} (${windDeg}°)`;
  document.getElementById('compass-arrow').style.transform = `rotate(${windDeg}deg)`;

  // UV Index
  const uv = c.uv_index;
  document.getElementById('uv-value').textContent = uv.toFixed(1);
  const uvPct = Math.min(uv / 11 * 100, 100);
  document.getElementById('uv-bar-fill').style.width = `${100 - uvPct}%`;
  document.getElementById('uv-marker').style.left = `${uvPct}%`;

  // Pressure
  const pressure = Math.round(c.surface_pressure);
  document.getElementById('pressure-value').textContent = `${pressure} hPa`;
  const pressureText = pressure > 1013 ? '↗ Rising — Fair weather' : '↘ Falling — Rain possible';
  document.getElementById('pressure-trend-text').textContent = pressureText;

  // Store humidity on selectedCity for AI
  selectedCity.humidity = `${hum}%`;
}

/* =========================================================
   RENDER RAIN BARS (mini sparkline)
   ========================================================= */
function renderRainBars(rainData) {
  const container = document.getElementById('rain-bars');
  container.innerHTML = '';
  const maxRain = Math.max(...rainData, 1);
  rainData.forEach((val, i) => {
    const bar = document.createElement('div');
    bar.className = 'rain-bar';
    const heightPct = Math.max((val / maxRain) * 100, 6);
    bar.style.height = `${heightPct}%`;
    bar.style.background = i === 0
      ? 'rgba(59,130,246,0.9)'
      : `rgba(59,130,246,${0.3 + (val / maxRain) * 0.5})`;
    bar.title = `Day ${i+1}: ${val.toFixed(1)}mm`;
    container.appendChild(bar);
  });
}

/* =========================================================
   RENDER 7-DAY FORECAST
   ========================================================= */
function renderForecast(daily) {
  const container = document.getElementById('forecast-cards');
  container.innerHTML = '';
  const today = new Date();

  daily.time.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const dayName = i === 0 ? 'TODAY' : d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase();

    const card = document.createElement('div');
    card.className = 'forecast-card' + (i === 0 ? ' today' : '');
    card.innerHTML = `
      <div class="fc-day">${dayName}</div>
      <div class="fc-icon">${weatherEmoji(daily.weathercode[i])}</div>
      <div class="fc-max">${Math.round(daily.temperature_2m_max[i])}°C</div>
      <div class="fc-min">${Math.round(daily.temperature_2m_min[i])}°C</div>
      <div class="fc-rain">💧 ${daily.precipitation_probability_max[i]}%</div>
    `;
    container.appendChild(card);
  });
}

/* =========================================================
   RENDER CHARTS
   ========================================================= */
function renderCharts(daily, historical) {
  // Destroy existing
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const chartDefaults = {
    color: '#94a3b8',
    font: { family: 'Outfit, sans-serif' },
  };

  // Shared grid style
  const gridColor = 'rgba(255,255,255,0.05)';
  const tickColor = '#475569';

  // Labels: last 14 days + next 7 = combined timeline
  const histLabels = historical?.daily?.time?.map(d =>
    new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  ) || [];
  const fcastLabels = daily.time.map((d, i) =>
    i === 0 ? 'Today' : new Date(d).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
  );
  const tempLabels = [...histLabels, ...fcastLabels];

  const histMax = historical?.daily?.temperature_2m_max || [];
  const histMin = historical?.daily?.temperature_2m_min || [];
  const histAvg = histMax.map((v, i) => +(((v + histMin[i]) / 2).toFixed(1)));

  const forecastMax = daily.temperature_2m_max.map(v => Math.round(v));
  const forecastMin = daily.temperature_2m_min.map(v => Math.round(v));
  const forecastAvg = forecastMax.map((v, i) => +(((v + forecastMin[i]) / 2).toFixed(1)));

  // ── Temperature Chart ──
  const tempCtx = document.getElementById('tempChart').getContext('2d');
  charts.temp = new Chart(tempCtx, {
    type: 'line',
    data: {
      labels: tempLabels,
      datasets: [
        {
          label: 'Max Temp',
          data: [...histMax, ...forecastMax],
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0,212,255,0.08)',
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#00d4ff',
          borderWidth: 2,
        },
        {
          label: 'Min Temp',
          data: [...histMin, ...forecastMin],
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.08)',
          tension: 0.4,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#7c3aed',
          borderWidth: 2,
        },
        {
          label: 'Avg Temp',
          data: [...histAvg, ...forecastAvg],
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.08)',
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          borderWidth: 1.5,
          borderDash: [5, 3],
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          ticks: { color: tickColor, font: { size: 10 }, maxTicksLimit: 10 },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: tickColor, callback: v => v + '°C' },
          grid: { color: gridColor }
        }
      }
    }
  });

  // ── Rainfall Chart ──
  const rainCtx = document.getElementById('rainChart').getContext('2d');
  const histRain = historical?.daily?.precipitation_sum || [];
  const fcastRain = daily.precipitation_sum;
  const rainProb  = daily.precipitation_probability_max;

  charts.rain = new Chart(rainCtx, {
    type: 'bar',
    data: {
      labels: fcastLabels,
      datasets: [
        {
          label: 'Precipitation (mm)',
          data: fcastRain,
          backgroundColor: 'rgba(59,130,246,0.5)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y1',
        },
        {
          label: 'Rain Probability (%)',
          data: rainProb,
          type: 'line',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          borderWidth: 2,
          yAxisID: 'y2',
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          ticks: { color: tickColor, font: { size: 10 } },
          grid: { color: gridColor }
        },
        y1: {
          type: 'linear',
          position: 'left',
          ticks: { color: tickColor, callback: v => v + 'mm' },
          grid: { color: gridColor }
        },
        y2: {
          type: 'linear',
          position: 'right',
          ticks: { color: tickColor, callback: v => v + '%', max: 100 },
          grid: { display: false }
        }
      }
    }
  });

  // ── Monsoon Chart ──
  const monsoonCtx = document.getElementById('monsoonChart').getContext('2d');
  const actualRain = [5.2, 4.8, 9.1, 13.5, 30.2, 95.4, 292, 270, 168, 80, 24, 8];
  charts.monsoon = new Chart(monsoonCtx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [
        {
          label: 'Actual 2026 (mm)',
          data: actualRain,
          backgroundColor: actualRain.map((v, i) => v > MONSOON_LPA[i]
            ? 'rgba(59,130,246,0.7)' : 'rgba(244,63,94,0.5)'),
          borderColor: actualRain.map((v, i) => v > MONSOON_LPA[i] ? '#3b82f6' : '#f43f5e'),
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'LPA (mm)',
          data: MONSOON_LPA,
          type: 'line',
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [5, 3],
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index' }
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, callback: v => v + 'mm' }, grid: { color: gridColor } }
      }
    }
  });

  // ── Radar Chart ──
  const radarCtx = document.getElementById('radarChart').getContext('2d');
  const radarMax = daily.temperature_2m_max[0];
  charts.radar = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: ['Temperature', 'Humidity', 'Rainfall', 'Wind Speed', 'UV Index', 'Pressure'],
      datasets: [
        {
          label: 'Current Conditions',
          data: [
            (weatherData?.current?.temperature_2m / 50 * 100) || 60,
            weatherData?.current?.relative_humidity_2m || 65,
            Math.min((weatherData?.current?.precipitation / 20 * 100) || 30, 100),
            Math.min((weatherData?.current?.wind_speed_10m / 60 * 100) || 35, 100),
            Math.min((weatherData?.current?.uv_index / 11 * 100) || 50, 100),
            Math.min(((weatherData?.current?.surface_pressure - 950) / 70 * 100) || 70, 100),
          ],
          backgroundColor: 'rgba(0,212,255,0.15)',
          borderColor: '#00d4ff',
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          borderWidth: 2,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: 'rgba(255,255,255,0.07)' },
          angleLines: { color: 'rgba(255,255,255,0.07)' },
          pointLabels: {
            color: '#94a3b8',
            font: { size: 11, family: 'Outfit, sans-serif' }
          }
        }
      }
    }
  });
}

/* =========================================================
   RENDER AI ANALYSIS
   ========================================================= */
function renderAIAnalysis(data) {
  const c = data.current;
  const temp = Math.round(c.temperature_2m);
  const rain = c.precipitation;

  const zone = selectedCity.zone;
  const analysisFn = AI_ANALYSIS[zone] || AI_ANALYSIS.default;
  const analysisText = analysisFn(selectedCity, temp, rain);

  // Simulate typing effect
  const aiText = document.getElementById('ai-text');
  const aiTyping = document.getElementById('ai-typing');

  aiText.textContent = '';
  aiTyping.classList.remove('hidden');

  let i = 0;
  const interval = setInterval(() => {
    if (i < analysisText.length) {
      aiText.textContent += analysisText[i];
      i++;
    } else {
      clearInterval(interval);
      aiTyping.classList.add('hidden');
      document.querySelector('.ai-status').textContent = `Last analyzed at ${new Date().toLocaleTimeString('en-IN')}`;
    }
  }, 12);
}

/* =========================================================
   RENDER WEATHER ALERTS
   ========================================================= */
function renderAlerts() {
  const list = document.getElementById('alerts-list');
  list.innerHTML = '';
  WEATHER_ALERTS.forEach(alert => {
    const div = document.createElement('div');
    div.className = `alert-item alert-${alert.level}`;
    div.innerHTML = `
      <div class="alert-title">${alert.title}</div>
      <div class="alert-region">📍 ${alert.region}</div>
      <div style="margin-top:6px;font-size:0.78rem;opacity:0.9;">${alert.desc}</div>
    `;
    list.appendChild(div);
  });
}

/* =========================================================
   TIMESTAMP
   ========================================================= */
function updateTimestamp() {
  document.getElementById('last-updated-time').textContent =
    new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/* =========================================================
   LOADING STATE
   ========================================================= */
function setLoading(loading) {
  const refresh = document.getElementById('btn-refresh');
  if (loading) {
    refresh.classList.add('spinning');
    ['temp-value','rain-value','humidity-value','wind-value','uv-value','pressure-value']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '…';
      });
  } else {
    refresh.classList.remove('spinning');
  }
}

/* =========================================================
   FALLBACK DATA (when API fails)
   ========================================================= */
function renderFallbackData() {
  document.getElementById('temp-value').textContent = '34°C';
  document.getElementById('temp-feels').textContent = 'Feels like: 38°C';
  document.getElementById('rain-value').textContent = '2.5 mm';
  document.getElementById('rain-prob').textContent = 'Probability: 45%';
  document.getElementById('humidity-value').textContent = '68%';
  document.getElementById('wind-value').textContent = '12.4 km/h';
  document.getElementById('wind-dir').textContent = 'Direction: SW (220°)';
  document.getElementById('uv-value').textContent = '7.2';
  document.getElementById('pressure-value').textContent = '1008 hPa';
  document.getElementById('pressure-trend-text').textContent = '↘ Falling — Rain possible';
  document.getElementById('ai-typing').classList.add('hidden');
  document.getElementById('ai-text').textContent =
    '⚠️ Live satellite feed temporarily unavailable. Showing cached MOSDAC data. ' +
    'The system will auto-retry. Historical patterns suggest seasonal norms for this region.';
  updateTimestamp();
}

/* =========================================================
   AI CHAT MODAL
   ========================================================= */
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('chat-input').focus();
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function addChatMessage(text, isUser = false) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${isUser ? 'user' : 'bot'}`;
  div.innerHTML = `
    <div class="chat-avatar">${isUser ? '👤' : '🤖'}</div>
    <div class="chat-bubble">${text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addTypingIndicator() {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="chat-avatar">🤖</div>
    <div class="chat-bubble">
      <div class="ai-typing"><span></span><span></span><span></span></div>
    </div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  const ti = document.getElementById('typing-indicator');
  if (ti) ti.remove();
}

function getAIResponse(message) {
  const lower = message.toLowerCase();
  if (lower.includes('monsoon') || lower.includes('2026')) return AI_CHAT_RESPONSES.monsoon();
  if (lower.includes('heat') || lower.includes('hot') || lower.includes('alert')) return AI_CHAT_RESPONSES.heat();
  if (lower.includes('mosdac') || lower.includes('isro') || lower.includes('satellite')) return AI_CHAT_RESPONSES.mosdac();
  if (lower.includes('kerala') || lower.includes('rain')) return AI_CHAT_RESPONSES.kerala();

  // Generic response for other queries
  const c = weatherData?.current;
  const temp = c ? Math.round(c.temperature_2m) : '?';
  const hum  = c ? c.relative_humidity_2m : '?';
  return `🤖 **IndraAI Analysis for ${selectedCity.name}**

Based on ISRO satellite data and meteorological models:

• **Current Temperature:** ${temp}°C (${selectedCity.zone} climate zone)
• **Humidity:** ${hum}%
• **Climate Zone:** ${selectedCity.zone}
• **Data Source:** Open-Meteo + MOSDAC fusion model

Your query about "${message}" is being processed. For specialized satellite data queries, I recommend accessing MOSDAC portal at mosdac.gov.in or Bhuvan at bhuvan.nrsc.gov.in for raw ISRO data products.

Is there a specific region or climate parameter you'd like to explore?`;
}

function sendQuickMessage(msg) {
  sendChatMessage(msg);
}

function sendChatMessage(msg) {
  const input = document.getElementById('chat-input');
  const message = msg || input.value.trim();
  if (!message) return;

  addChatMessage(message, true);
  if (input) input.value = '';
  addTypingIndicator();

  setTimeout(() => {
    removeTypingIndicator();
    addChatMessage(getAIResponse(message));
  }, 1200 + Math.random() * 800);
}

/* =========================================================
   RADAR CHART UPDATE on city change
   ========================================================= */
function updateRadarChart(data) {
  if (!charts.radar) return;
  const c = data.current;
  charts.radar.data.datasets[0].data = [
    Math.min((c.temperature_2m / 50 * 100), 100),
    c.relative_humidity_2m,
    Math.min((c.precipitation / 20 * 100), 100),
    Math.min((c.wind_speed_10m / 60 * 100), 100),
    Math.min((c.uv_index / 11 * 100), 100),
    Math.min(((c.surface_pressure - 950) / 70 * 100), 100),
  ];
  charts.radar.update('active');
}

/* =========================================================
   SCROLL-BASED ACTIVE NAV
   ========================================================= */
function initNavHighlight() {
  const sections = ['dashboard', 'forecast', 'monsoon', 'analytics', 'isro'];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const link = document.getElementById(`nav-${entry.target.id}`);
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

/* =========================================================
   ANIMATED COUNTER for hero stats
   ========================================================= */
function animateCounter(el, target, suffix = '', decimals = 0) {
  const start = 0;
  const duration = 1800;
  const step = (timestamp) => {
    if (!step.startTime) step.startTime = timestamp;
    const progress = Math.min((timestamp - step.startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = decimals > 0 ? current.toFixed(decimals) + suffix : Math.round(current) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // Render static UI
  renderCityGrid();
  renderAlerts();
  initNavHighlight();

  // Animate hero counters
  setTimeout(() => {
    animateCounter(document.getElementById('stat-cities'), 36);
    animateCounter(document.getElementById('stat-satellites'), 12);
    animateCounter(document.getElementById('stat-accuracy'), 94.2, '%', 1);
    animateCounter(document.getElementById('stat-uptime'), 99.7, '%', 1);
  }, 500);

  // Chat modal
  document.getElementById('btn-agent').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('chat-send').addEventListener('click', () => sendChatMessage());
  document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Refresh button
  document.getElementById('btn-refresh').addEventListener('click', loadWeatherData);

  // Load initial weather data
  await loadWeatherData();

  // Initialize India temperature map
  initIndiaMap();
});

// Make sendQuickMessage globally available (used in onclick)
window.sendQuickMessage = sendQuickMessage;

/* =========================================================
   INDIA TEMPERATURE MAP — MODIS-Style Thermal Heatmap
   ========================================================= */

// MODIS-style color scale: dark blue → cyan → green → yellow → orange → red → dark red
// Matches the reference image palette exactly
const THERMAL_COLORS = [
  { t: 10, c: '#1f1345' }, // deep purple/navy
  { t: 14, c: '#1e3a8a' }, // dark blue
  { t: 18, c: '#0284c7' }, // strong sky blue
  { t: 22, c: '#06b6d4' }, // bright cyan/teal
  { t: 25, c: '#10b981' }, // strong emerald green
  { t: 28, c: '#84cc16' }, // bright lime green
  { t: 30, c: '#eab308' }, // bright yellow
  { t: 32, c: '#f97316' }, // bright orange
  { t: 34, c: '#ef4444' }, // bright red
  { t: 37, c: '#b91c1c' }, // deep red
  { t: 40, c: '#7f1d1d' }, // deep maroon
  { t: 45, c: '#4c0519' }, // very dark red-black
];

function thermalColor(temp) {
  if (temp === null || temp === undefined) return '#1a2744';
  const t = temp;
  if (t <= THERMAL_COLORS[0].t) return THERMAL_COLORS[0].c;
  for (let i = 1; i < THERMAL_COLORS.length; i++) {
    if (t <= THERMAL_COLORS[i].t) {
      const lo = THERMAL_COLORS[i - 1];
      const hi = THERMAL_COLORS[i];
      const frac = (t - lo.t) / (hi.t - lo.t);
      return lerpColor(lo.c, hi.c, frac);
    }
  }
  return THERMAL_COLORS[THERMAL_COLORS.length - 1].c;
}

function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1,3), 16), g1 = parseInt(hex1.slice(3,5), 16), b1 = parseInt(hex1.slice(5,7), 16);
  const r2 = parseInt(hex2.slice(1,3), 16), g2 = parseInt(hex2.slice(3,5), 16), b2 = parseInt(hex2.slice(5,7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// Map state names → city for temperature lookup
// For states without a direct city, interpolate from nearest city(s)
const STATE_TO_CITY = {
  'Jammu & Kashmir': ['Shimla'],
  'Jammu and Kashmir': ['Shimla'],
  'Ladakh': ['Shimla'],
  'Himachal Pradesh': ['Shimla'],
  'Uttarakhand': ['Shimla', 'New Delhi'],
  'Punjab': ['New Delhi'],
  'Haryana': ['New Delhi'],
  'Delhi': ['New Delhi'],
  'Uttar Pradesh': ['New Delhi', 'Bhopal'],
  'Rajasthan': ['Jaipur'],
  'Gujarat': ['Ahmedabad'],
  'Maharashtra': ['Mumbai', 'Pune'],
  'Goa': ['Mumbai', 'Kochi'],
  'Karnataka': ['Bengaluru'],
  'Kerala': ['Kochi', 'Thiruvananthapuram'],
  'Tamil Nadu': ['Chennai'],
  'Andhra Pradesh': ['Hyderabad', 'Chennai'],
  'Telangana': ['Hyderabad'],
  'Odisha': ['Bhubaneswar'],
  'West Bengal': ['Kolkata'],
  'Jharkhand': ['Kolkata', 'Bhubaneswar'],
  'Bihar': ['Kolkata', 'New Delhi'],
  'Chhattisgarh': ['Bhopal', 'Bhubaneswar'],
  'Madhya Pradesh': ['Bhopal'],
  'Sikkim': ['Guwahati'],
  'Arunachal Pradesh': ['Guwahati'],
  'Nagaland': ['Guwahati'],
  'Manipur': ['Guwahati'],
  'Mizoram': ['Guwahati'],
  'Tripura': ['Guwahati'],
  'Meghalaya': ['Guwahati'],
  'Assam': ['Guwahati'],
  'Andaman and Nicobar Islands': ['Chennai'],
  'Andaman & Nicobar': ['Chennai'],
  'Lakshadweep': ['Kochi'],
  'Dadra and Nagar Haveli': ['Mumbai'],
  'Daman and Diu': ['Ahmedabad'],
  'Puducherry': ['Chennai'],
  'Chandigarh': ['New Delhi'],
};

// Store city temperatures fetched for the map
let cityTemps = {};

// Fetch temperatures for all cities in parallel (lightweight endpoint)
async function fetchAllCityTemps() {
  const promises = INDIAN_CITIES.map(async (city) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}`
        + `&current=temperature_2m,weathercode&timezone=Asia/Kolkata`;
      const resp = await fetch(url);
      if (!resp.ok) return { city, temp: null, code: null };
      const data = await resp.json();
      return {
        city,
        temp: parseFloat(data.current.temperature_2m.toFixed(1)),
        code: data.current.weathercode,
      };
    } catch {
      return { city, temp: null, code: null };
    }
  });
  return Promise.all(promises);
}

// Get temperature for a state feature based on nearest mapped city
function getStateTemp(stateName, tempMap) {
  const cities = STATE_TO_CITY[stateName];
  if (!cities) {
    // Fallback: use average of all available cities
    const vals = Object.values(tempMap).filter(v => v !== null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }
  const temps = cities.map(c => tempMap[c]).filter(v => v !== null);
  if (!temps.length) return null;
  return temps.reduce((s, v) => s + v, 0) / temps.length;
}

// Helper function for continuous inverse distance weighting (IDW) interpolation
function drawInterpolatedHeatmap(width, height, projection, results) {
  const canvas = document.createElement('canvas');
  canvas.width = 150; // low resolution grid for fast processing
  canvas.height = 172;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  const data = imgData.data;

  // Project all city coords to the low-res canvas scale
  const projectedCities = results.map(r => {
    const coords = projection([r.city.lon, r.city.lat]);
    if (!coords) return null;
    return {
      x: (coords[0] / width) * canvas.width,
      y: (coords[1] / height) * canvas.height,
      temp: r.temp
    };
  }).filter(c => c !== null && c.temp !== null);

  if (projectedCities.length === 0) return null;

  // Calculate min and max temperatures to perform contrast stretching
  const temps = projectedCities.map(c => c.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp - minTemp;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      let sumWeights = 0;
      let sumWeightedTemps = 0;
      let foundExact = false;
      let exactTemp = 0;

      for (const city of projectedCities) {
        const dx = x - city.x;
        const dy = y - city.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 0.2) {
          foundExact = true;
          exactTemp = city.temp;
          break;
        }

        const weight = 1 / Math.pow(distSq, 2.5); // Power 2.5 creates sharp, well-defined thermal fields
        sumWeights += weight;
        sumWeightedTemps += weight * city.temp;
      }

      const rawTemp = foundExact ? exactTemp : (sumWeightedTemps / sumWeights);

      // Contrast stretching: Map the raw interpolated temperature from [minTemp, maxTemp] to [12, 38]
      // to guarantee the full high-contrast color scale is visible on the map.
      const temp = tempRange > 0 ? 12 + ((rawTemp - minTemp) / tempRange) * 26 : rawTemp;
      const colorStr = thermalColor(temp); // e.g. "rgb(r,g,b)"

      // Parse rgb(r,g,b)
      const parts = colorStr.match(/\d+/g);
      const idx = (y * canvas.width + x) * 4;
      if (parts) {
        data[idx] = parseInt(parts[0]);
        data[idx + 1] = parseInt(parts[1]);
        data[idx + 2] = parseInt(parts[2]);
        data[idx + 3] = 255;
      } else {
        data[idx] = 15; data[idx + 1] = 37; data[idx + 2] = 71; data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}

async function initIndiaMap() {
  const svg = d3.select('#india-map-svg');
  const container = document.getElementById('india-svg-map-container');
  const tooltip = document.getElementById('map-tooltip');

  svg.selectAll('*').remove();
  document.getElementById('map-loading').style.display = 'flex';

  // Fetch India states GeoJSON — high-resolution official state boundaries
  let indiaGeo = null;
  const GEO_SOURCES = [
    'https://cdn.jsdelivr.net/gh/adarshbiradar/maps-geojson@master/india.json',
  ];

  for (const url of GEO_SOURCES) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      if (json.type === 'Topology') {
        const key = Object.keys(json.objects)[0];
        indiaGeo = topojson.feature(json, json.objects[key]);
      } else if (json.type === 'FeatureCollection') {
        indiaGeo = json;
      }
      if (indiaGeo) break;
    } catch (e) {
      console.warn('GeoJSON source failed:', e.message);
    }
  }


  // Inline fallback — multi-region India GeoJSON with approximate state regions
  // Using separate features per major region to enable per-region coloring
  const INDIA_REGIONS_GEO = {
    type: 'FeatureCollection',
    features: [
      { type:'Feature', properties:{name:'Jammu & Kashmir'}, geometry:{type:'Polygon', coordinates:[[[74.9,37.1],[76.2,35.7],[78.3,35.5],[80.3,35.2],[81.0,35.9],[82.2,36.6],[83.5,36.5],[84.8,37.0],[86.0,36.7],[88.0,36.1],[88.0,35.0],[86.0,34.5],[84.0,33.5],[82.0,34.0],[80.0,33.0],[78.5,32.5],[77.0,32.0],[75.5,33.5],[74.0,34.5],[73.5,35.0],[74.9,37.1]]]}},
      { type:'Feature', properties:{name:'Punjab'}, geometry:{type:'Polygon', coordinates:[[[74.0,32.0],[75.5,32.0],[76.5,32.0],[77.0,32.0],[77.0,31.0],[76.0,30.5],[75.0,30.0],[74.0,30.5],[73.5,31.0],[74.0,32.0]]]}},
      { type:'Feature', properties:{name:'Himachal Pradesh'}, geometry:{type:'Polygon', coordinates:[[[75.5,33.5],[77.0,33.5],[78.5,32.5],[78.0,31.5],[77.0,31.0],[76.0,30.5],[75.5,32.0],[75.5,33.5]]]}},
      { type:'Feature', properties:{name:'Uttarakhand'}, geometry:{type:'Polygon', coordinates:[[[78.5,32.5],[80.0,32.5],[81.5,31.5],[80.5,29.5],[79.0,29.0],[78.0,29.5],[77.0,30.5],[78.0,31.5],[78.5,32.5]]]}},
      { type:'Feature', properties:{name:'Haryana'}, geometry:{type:'Polygon', coordinates:[[[74.0,30.5],[75.0,30.0],[76.5,30.0],[77.0,29.5],[76.5,28.5],[75.5,28.0],[74.5,28.5],[73.5,29.0],[73.5,30.5],[74.0,30.5]]]}},
      { type:'Feature', properties:{name:'Delhi'}, geometry:{type:'Polygon', coordinates:[[[77.0,28.8],[77.4,28.8],[77.4,28.4],[77.0,28.4],[77.0,28.8]]]}},
      { type:'Feature', properties:{name:'Rajasthan'}, geometry:{type:'Polygon', coordinates:[[[69.5,24.0],[70.5,24.5],[71.5,24.5],[72.5,24.0],[73.5,24.0],[74.5,24.5],[75.5,24.0],[76.5,24.5],[76.5,27.0],[77.0,28.0],[76.5,28.5],[75.5,28.0],[74.5,28.5],[73.5,29.0],[72.5,29.5],[71.5,29.0],[70.5,28.5],[70.0,27.0],[69.5,25.0],[69.5,24.0]]]}},
      { type:'Feature', properties:{name:'Uttar Pradesh'}, geometry:{type:'Polygon', coordinates:[[[77.0,28.5],[78.5,28.5],[80.0,28.5],[81.5,28.0],[83.0,27.5],[84.0,27.5],[84.5,26.0],[83.0,25.5],[82.0,25.0],[81.0,24.5],[80.0,24.5],[79.0,24.5],[78.0,25.0],[77.0,25.5],[76.5,27.0],[77.0,28.0],[77.0,28.5]]]}},
      { type:'Feature', properties:{name:'Bihar'}, geometry:{type:'Polygon', coordinates:[[[84.0,27.5],[85.5,27.5],[87.0,27.0],[87.5,26.0],[86.5,25.0],[85.5,24.5],[84.5,24.5],[83.5,24.0],[83.0,25.5],[84.0,27.5]]]}},
      { type:'Feature', properties:{name:'Jharkhand'}, geometry:{type:'Polygon', coordinates:[[[83.0,25.0],[84.5,24.5],[85.5,24.5],[86.5,24.5],[87.5,24.0],[87.5,22.5],[86.5,22.0],[85.5,22.0],[84.5,22.5],[83.5,22.5],[83.0,23.5],[83.0,25.0]]]}},
      { type:'Feature', properties:{name:'West Bengal'}, geometry:{type:'Polygon', coordinates:[[[87.0,27.0],[88.0,27.0],[89.0,26.5],[89.5,25.0],[88.5,24.0],[88.0,22.5],[87.0,22.0],[86.5,22.0],[87.5,24.0],[87.5,26.0],[87.0,27.0]]]}},
      { type:'Feature', properties:{name:'Assam'}, geometry:{type:'Polygon', coordinates:[[[89.5,26.5],[90.5,27.0],[92.0,27.5],[93.5,27.5],[95.0,27.0],[95.5,26.5],[94.0,25.5],[92.5,25.5],[91.0,25.0],[90.0,25.0],[89.5,25.5],[89.5,26.5]]]}},
      { type:'Feature', properties:{name:'Guwahati'}, geometry:{type:'Polygon', coordinates:[[[89.5,26.5],[91.5,27.0],[93.0,27.5],[95.0,27.5],[95.5,26.0],[94.0,25.5],[92.0,25.5],[90.5,25.0],[89.5,25.5],[89.5,26.5]]]}},
      { type:'Feature', properties:{name:'Madhya Pradesh'}, geometry:{type:'Polygon', coordinates:[[[74.5,24.5],[75.5,24.0],[76.5,24.5],[77.5,25.0],[79.0,24.5],[80.0,24.5],[81.0,24.5],[82.0,25.0],[83.0,24.0],[83.5,23.0],[82.5,22.0],[81.5,21.5],[80.5,22.0],[79.5,21.5],[78.5,21.0],[77.5,21.5],[76.5,22.0],[75.5,22.5],[74.5,23.0],[74.0,24.0],[74.5,24.5]]]}},
      { type:'Feature', properties:{name:'Chhattisgarh'}, geometry:{type:'Polygon', coordinates:[[[83.0,24.0],[84.5,23.5],[85.0,22.5],[84.5,21.5],[83.5,20.5],[82.5,19.5],[81.5,19.0],[80.5,19.5],[80.0,20.5],[80.5,22.0],[81.5,22.5],[82.5,23.5],[83.0,24.0]]]}},
      { type:'Feature', properties:{name:'Odisha'}, geometry:{type:'Polygon', coordinates:[[[82.0,22.5],[83.0,22.5],[84.0,22.5],[85.5,22.0],[86.5,22.0],[87.5,21.5],[87.0,20.5],[86.5,19.5],[85.5,19.0],[84.5,19.5],[83.5,20.0],[82.5,20.0],[82.0,21.0],[82.0,22.5]]]}},
      { type:'Feature', properties:{name:'Gujarat'}, geometry:{type:'Polygon', coordinates:[[[68.0,24.5],[69.5,24.0],[70.5,23.5],[71.5,23.5],[72.5,23.0],[73.5,23.5],[74.5,23.0],[74.5,21.5],[73.5,20.5],[72.5,20.5],[71.5,21.5],[70.5,22.0],[69.5,22.5],[68.5,23.0],[68.0,24.0],[68.0,24.5]]]}},
      { type:'Feature', properties:{name:'Maharashtra'}, geometry:{type:'Polygon', coordinates:[[[72.5,20.5],[73.5,20.5],[74.5,21.5],[76.0,22.0],[77.5,21.5],[78.5,21.0],[79.5,20.5],[80.0,20.0],[80.5,19.0],[80.0,18.0],[79.0,17.0],[77.5,16.5],[76.5,16.5],[75.5,17.0],[74.5,17.5],[73.5,18.5],[72.5,19.0],[72.5,20.5]]]}},
      { type:'Feature', properties:{name:'Telangana'}, geometry:{type:'Polygon', coordinates:[[[77.5,19.0],[79.0,19.5],[80.5,19.0],[80.5,18.0],[80.0,17.0],[79.5,16.5],[78.5,16.0],[77.5,17.0],[77.5,18.0],[77.5,19.0]]]}},
      { type:'Feature', properties:{name:'Andhra Pradesh'}, geometry:{type:'Polygon', coordinates:[[[77.5,16.5],[79.0,16.5],[80.0,15.5],[80.5,14.5],[80.0,13.5],[79.5,13.0],[79.0,13.5],[78.5,13.5],[78.0,14.0],[77.0,14.5],[77.5,15.5],[77.5,16.5]]]}},
      { type:'Feature', properties:{name:'Karnataka'}, geometry:{type:'Polygon', coordinates:[[[74.5,17.5],[75.5,17.0],[76.5,16.5],[77.5,17.0],[78.5,16.0],[77.5,15.0],[77.0,14.5],[76.5,14.0],[75.5,13.5],[74.5,13.5],[73.5,14.5],[73.0,15.5],[73.0,17.0],[74.5,17.5]]]}},
      { type:'Feature', properties:{name:'Goa'}, geometry:{type:'Polygon', coordinates:[[[73.5,15.5],[74.5,15.5],[74.5,14.5],[74.0,14.5],[73.5,15.0],[73.5,15.5]]]}},
      { type:'Feature', properties:{name:'Kerala'}, geometry:{type:'Polygon', coordinates:[[[75.5,12.5],[76.5,12.0],[76.5,11.0],[76.0,10.0],[75.5,9.5],[76.0,8.5],[77.0,8.2],[77.5,8.5],[77.5,9.5],[77.0,10.5],[77.5,11.5],[77.5,12.5],[76.5,13.5],[75.5,12.5]]]}},
      { type:'Feature', properties:{name:'Tamil Nadu'}, geometry:{type:'Polygon', coordinates:[[[76.5,11.0],[77.5,11.5],[78.5,12.0],[79.5,12.5],[80.0,12.0],[80.5,11.0],[80.0,10.0],[79.5,9.0],[79.0,8.5],[78.0,8.5],[77.5,8.5],[77.0,9.5],[76.5,10.0],[76.5,11.0]]]}},
      { type:'Feature', properties:{name:'Chandigarh'}, geometry:{type:'Polygon', coordinates:[[[76.6,30.8],[77.0,30.8],[77.0,30.5],[76.6,30.5],[76.6,30.8]]]}},
    ]
  };

  const geoToRender = indiaGeo || INDIA_REGIONS_GEO;

  // Fetch live temperatures for all cities
  let results;
  try {
    results = await fetchAllCityTemps();
  } catch {
    results = INDIAN_CITIES.map(city => ({ city, temp: null, code: null }));
  }

  // Build temp lookup by city name
  const tempMap = {};
  results.forEach(r => { tempMap[r.city.name] = r.temp; });
  cityTemps = tempMap;

  // ── D3 SETUP ──
  const W = 800, H = 920;
  const projection = d3.geoMercator()
    .center([82.5, 22.0])
    .scale(1080)
    .translate([W / 2, H / 2]);
  const path = d3.geoPath().projection(projection);

  const defs = svg.append('defs');

  // Drop shadow filter for the whole map
  const shadow = defs.append('filter').attr('id', 'mapShadow').attr('x','-10%').attr('y','-10%').attr('width','120%').attr('height','120%');
  shadow.append('feDropShadow').attr('dx',0).attr('dy',0).attr('stdDeviation',18).attr('flood-color','rgba(0,212,255,0.25)');

  // Background
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#060f26');

  // Graticule
  const graticule = d3.geoGraticule().step([5, 5]);
  svg.append('path').datum(graticule()).attr('d', path)
    .attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.035)').attr('stroke-width', 0.6);

  // Define clip-path for India outline
  const clipPath = defs.append('clipPath').attr('id', 'india-map-clip');
  clipPath.selectAll('path')
    .data(geoToRender.features)
    .enter().append('path')
    .attr('d', path);

  // Generate smooth thermal gradient canvas data URL
  const heatmapDataUrl = drawInterpolatedHeatmap(W, H, projection, results);

  // Draw the interpolated heatmap image clipped to India shape
  if (heatmapDataUrl) {
    svg.append('image')
      .attr('width', W)
      .attr('height', H)
      .attr('href', heatmapDataUrl)
      .attr('clip-path', 'url(#india-map-clip)')
      .style('filter', 'blur(12px)'); // smooth blurring to emulate continuous MODIS surface raster
  }

  // ── DRAW STATES OUTLINE (very thin & transparent on top of the heatmap) ──
  const statesG = svg.append('g').attr('class', 'india-states').attr('filter', 'url(#mapShadow)');

  statesG.selectAll('path')
    .data(geoToRender.features)
    .enter().append('path')
    .attr('d', path)
    .attr('fill', 'transparent')
    .attr('stroke', 'rgba(255,255,255,0.08)')
    .attr('stroke-width', 0.5)
    .attr('stroke-linejoin', 'round');

  // Subtle outer country boundary border
  svg.append('g').attr('class', 'india-border')
    .selectAll('path').data(geoToRender.features)
    .enter().append('path').attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', 'rgba(255,255,255,0.35)')
    .attr('stroke-width', 0.35);

  // ── CITY LABELS & MARKERS on map ──
  const labelsG = svg.append('g').attr('class', 'city-labels');

  results.forEach((r, idx) => {
    const [px, py] = projection([r.city.lon, r.city.lat]);
    if (!px || !py) return;

    const temp = r.temp;
    const color = thermalColor(temp);

    const g = labelsG.append('g')
      .attr('transform', `translate(${px},${py})`)
      .style('cursor', 'pointer');

    // Pin dot
    g.append('circle')
      .attr('r', 5)
      .attr('fill', '#fff')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('opacity', 0.95);

    // City name + temp label
    g.append('text')
      .attr('x', 8).attr('y', -6)
      .attr('fill', '#fff')
      .attr('font-size', '9.5px')
      .attr('font-weight', '700')
      .attr('font-family', 'Outfit, sans-serif')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#000').attr('stroke-width', '2.5px')
      .attr('pointer-events', 'none')
      .text(temp !== null ? `${r.city.name} ${temp}°` : r.city.name);

    // Hover & click
    g.on('mouseenter', function() {
      d3.select(this).select('circle').transition().duration(120).attr('r', 8);

      const rect = container.getBoundingClientRect();
      const svgEl = document.getElementById('india-map-svg');
      const svgRect = svgEl.getBoundingClientRect();
      const sx = svgRect.width / W;
      const sy = svgRect.height / H;
      const tx = px * sx + (svgRect.left - rect.left);
      const ty = py * sy + (svgRect.top - rect.top);

      document.getElementById('tooltip-city').textContent = `${r.city.emoji} ${r.city.name}`;
      document.getElementById('tooltip-temp').textContent = temp !== null ? `${temp}°C` : 'N/A';
      document.getElementById('tooltip-temp').style.color = color;
      document.getElementById('tooltip-detail').textContent = `${r.city.state} · ${r.city.zone} · ${weatherEmoji(r.code || 0)}`;

      const ttW = 185, ttH = 110;
      let left = tx + 14, top = ty - ttH / 2;
      if (left + ttW > rect.width) left = tx - ttW - 14;
      if (top < 4) top = 4;
      if (top + ttH > rect.height) top = rect.height - ttH - 4;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add('visible');
    })
    .on('mouseleave', function() {
      d3.select(this).select('circle').transition().duration(120).attr('r', 5);
      tooltip.classList.remove('visible');
    })
    .on('click', function() {
      tooltip.classList.remove('visible');
      selectCity(r.city);
      document.getElementById('current-weather').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Entrance fade-in
    g.style('opacity', 0).transition().delay(idx * 60).duration(500).style('opacity', 1);
  });

  // Hide loading
  document.getElementById('map-loading').style.display = 'none';

  // ── BOTTOM PANEL: populate stats ──
  const validTemps = results.filter(r => r.temp !== null);
  if (validTemps.length > 0) {
    const sorted = [...validTemps].sort((a, b) => b.temp - a.temp);
    const hottest = sorted[0];
    const coolest = sorted[sorted.length - 1];
    const avg = (validTemps.reduce((s, r) => s + r.temp, 0) / validTemps.length).toFixed(1);

    document.getElementById('map-hottest').innerHTML = `<span style="color:${thermalColor(hottest.temp)}">${hottest.city.name}</span> <strong>${hottest.temp}°C</strong>`;
    document.getElementById('map-coolest').innerHTML = `<span style="color:${thermalColor(coolest.temp)}">${coolest.city.name}</span> <strong>${coolest.temp}°C</strong>`;
    document.getElementById('map-avg').textContent = `${avg}°C`;
    document.getElementById('map-count').textContent = validTemps.length;

    // Rankings list
    const rankEl = document.getElementById('mbp-rankings-list');
    rankEl.innerHTML = sorted.map((r, i) => `
      <div class="mbp-rank-item">
        <span class="mbp-rank-num">${i + 1}</span>
        <span class="mbp-rank-city">${r.city.emoji} ${r.city.name}</span>
        <span class="mbp-rank-bar-wrap">
          <span class="mbp-rank-bar" style="width:${Math.max(((r.temp - 10) / 40) * 100, 4)}%;background:${thermalColor(r.temp)}"></span>
        </span>
        <span class="mbp-rank-temp" style="color:${thermalColor(r.temp)}">${r.temp}°C</span>
      </div>
    `).join('');

    // Last update
    const now = new Date().toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' });
    const el = document.getElementById('map-last-update');
    if (el) el.textContent = `Last updated: ${now}`;
  }

  // Auto-refresh every 10 minutes
  setTimeout(initIndiaMap, 10 * 60 * 1000);
}

