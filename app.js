'use strict';

// ===== CONSTANTS =====
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org';
// Bounding box: Aachen + belgische Umgebung (Raeren, Eynatten, Lichtenbusch etc.)
const VIEWBOX = '5.82,50.38,6.72,50.98';

const PRIORITY = {
  urgent: { label: 'Dringend', order: 0, color: '#e53935' },
  normal: { label: 'Normal',   order: 1, color: '#f59e0b' },
  low:    { label: 'Niedrig',  order: 2, color: '#4caf50' }
};

// ===== STATE =====
const state = {
  depot: null,           // { address, displayName, coords: [lat, lng] }
  stops: [],             // [{ id, address, displayName, coords, priority, note }]
  nextId: 1,
  routeResult: null,
  settings: {
    fuelPrice: 1.75,
    fuelConsumption: 7.5,
    wearCost: 0.08,
    hourlyRate: 15.0
  }
};

// ===== MAP =====
let map;
let depotMarker = null;
let stopMarkers = {};
let routeLayer = null;

function initMap() {
  map = L.map('map', {
    center: [50.7753, 6.0839],
    zoom: 12,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  map.zoomControl.setPosition('bottomright');
}

// ===== MARKER ICONS =====
function makeDepotIcon() {
  return L.divIcon({
    html: `<div style="
      width:36px;height:36px;
      background:#2796A8;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.28);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:16px;line-height:1;">🏥</span>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

function makeStopIcon(num, priority) {
  const color = PRIORITY[priority]?.color || '#2796A8';
  return L.divIcon({
    html: `<div style="
      width:30px;height:30px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:10px;font-weight:700;color:white;font-family:Inter,sans-serif;">${num}</span>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

// ===== GEOCODING / AUTOCOMPLETE =====
const geoCache = new Map();

async function nominatimSearch(query, signal) {
  const key = query.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);

  const params = new URLSearchParams({
    format: 'json',
    q: query,
    countrycodes: 'de,be,nl',
    limit: 7,
    addressdetails: 1,
    'accept-language': 'de',
    viewbox: VIEWBOX,
    bounded: 0
  });

  const resp = await fetch(`${NOMINATIM}?${params}`, {
    signal,
    headers: { 'User-Agent': 'ApothekeRoutenplaner/1.0' }
  });

  if (!resp.ok) throw new Error('Geocoding nicht verfügbar');
  const data = await resp.json();
  geoCache.set(key, data);
  return data;
}

function attachAutocomplete(inputEl, dropdownEl, onSelect) {
  let timer = null;
  let ctrl = null;

  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim();
    clearTimeout(timer);
    dropdownEl.innerHTML = '';
    if (q.length < 3) return;

    dropdownEl.innerHTML = '<div class="autocomplete-item searching">Suche …</div>';

    timer = setTimeout(async () => {
      if (ctrl) ctrl.abort();
      ctrl = new AbortController();
      try {
        const results = await nominatimSearch(q, ctrl.signal);
        renderDropdown(dropdownEl, results, inputEl, onSelect);
      } catch (e) {
        if (e.name !== 'AbortError') dropdownEl.innerHTML = '';
      }
    }, 340);
  });

  inputEl.addEventListener('keydown', e => {
    const items = [...dropdownEl.querySelectorAll('.autocomplete-item:not(.searching)')];
    const focused = dropdownEl.querySelector('.autocomplete-item.focused');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!focused) { items[0]?.classList.add('focused'); return; }
      const i = items.indexOf(focused);
      focused.classList.remove('focused');
      items[Math.min(i + 1, items.length - 1)]?.classList.add('focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!focused) return;
      const i = items.indexOf(focused);
      focused.classList.remove('focused');
      if (i > 0) items[i - 1]?.classList.add('focused');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      (dropdownEl.querySelector('.autocomplete-item.focused') || items[0])?.click();
    } else if (e.key === 'Escape') {
      dropdownEl.innerHTML = '';
    }
  });

  document.addEventListener('click', e => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target))
      dropdownEl.innerHTML = '';
  });
}

function renderDropdown(dropdownEl, results, inputEl, onSelect) {
  dropdownEl.innerHTML = '';

  if (!results.length) {
    dropdownEl.innerHTML = '<div class="autocomplete-item searching">Keine Ergebnisse</div>';
    return;
  }

  results.forEach(item => {
    const addr = item.address || {};
    const road = [addr.road || '', addr.house_number || ''].filter(Boolean).join(' ');
    const city = addr.city || addr.town || addr.village || addr.suburb || '';
    const country = addr.country || '';
    const main = road || item.display_name.split(',')[0];
    const detail = [city, country].filter(Boolean).join(', ');

    const el = document.createElement('div');
    el.className = 'autocomplete-item';
    el.innerHTML = `<div class="place-name">${esc(main)}</div><div class="place-detail">${esc(detail)}</div>`;

    el.addEventListener('click', () => {
      const shortName = [road || main, city].filter(Boolean).join(', ') ||
        item.display_name.split(',').slice(0, 3).join(',').trim();
      inputEl.value = shortName;
      dropdownEl.innerHTML = '';
      onSelect({ address: shortName, displayName: item.display_name, coords: [parseFloat(item.lat), parseFloat(item.lon)] });
    });

    dropdownEl.appendChild(el);
  });
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== DEPOT =====
function setDepot(geocoded) {
  state.depot = geocoded;

  if (depotMarker) map.removeLayer(depotMarker);
  depotMarker = L.marker(geocoded.coords, { icon: makeDepotIcon() })
    .addTo(map)
    .bindPopup(`<strong>Startpunkt</strong><br>${esc(geocoded.address)}`);

  document.getElementById('depot-chip-text').textContent = geocoded.address;
  document.getElementById('depot-chip').classList.remove('hidden');
  document.getElementById('depot-input').value = '';

  map.setView(geocoded.coords, 13);
  updateOptimizeBtn();
  showToast('Startpunkt gesetzt');
}

function clearDepot() {
  state.depot = null;
  if (depotMarker) { map.removeLayer(depotMarker); depotMarker = null; }
  document.getElementById('depot-chip').classList.add('hidden');
  clearRoute();
  updateOptimizeBtn();
}

// ===== STOPS =====
let pendingStop = null;

function addStop(geocoded, priority, note) {
  const stop = { id: state.nextId++, ...geocoded, priority, note: note.trim() };
  state.stops.push(stop);

  stopMarkers[stop.id] = L.marker(stop.coords, { icon: makeStopIcon(state.stops.length, priority) })
    .addTo(map)
    .bindPopup(`<strong>${esc(stop.address)}</strong><br>${PRIORITY[priority].label}${stop.note ? `<br><em>${esc(stop.note)}</em>` : ''}`);

  renderStops();
  fitAll();
  updateOptimizeBtn();
  showToast('Adresse hinzugefügt');
}

function removeStop(id) {
  const idx = state.stops.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.stops.splice(idx, 1);
  if (stopMarkers[id]) { map.removeLayer(stopMarkers[id]); delete stopMarkers[id]; }
  renumberMarkers();
  renderStops();
  updateOptimizeBtn();
  clearRoute();
}

function setStopPriority(id, priority) {
  const stop = state.stops.find(s => s.id === id);
  if (!stop) return;
  stop.priority = priority;
  const idx = state.stops.indexOf(stop);
  if (stopMarkers[id]) stopMarkers[id].setIcon(makeStopIcon(idx + 1, priority));
  renderStops();
  clearRoute();
}

function renumberMarkers() {
  state.stops.forEach((s, i) => {
    if (stopMarkers[s.id]) stopMarkers[s.id].setIcon(makeStopIcon(i + 1, s.priority));
  });
}

function renderStops(orderedList) {
  const list = document.getElementById('stops-list');
  const empty = document.getElementById('stops-empty');
  document.getElementById('stops-count').textContent = state.stops.length;

  if (!state.stops.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const display = orderedList
    ? orderedList
    : [...state.stops].sort((a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order);

  list.innerHTML = display.map((stop, i) => `
    <div class="stop-item priority-${stop.priority}">
      <div class="stop-seq">${i + 1}</div>
      <div class="stop-info">
        <div class="stop-address" title="${esc(stop.displayName)}">${esc(stop.address)}</div>
        <div class="stop-meta">
          <span class="stop-prio-badge ${stop.priority}">${PRIORITY[stop.priority].label}</span>
          ${stop.note ? `<span class="stop-note-text">${esc(stop.note)}</span>` : ''}
        </div>
      </div>
      <div class="stop-actions">
        <select class="prio-select" onchange="setStopPriority(${stop.id}, this.value)" title="Priorität">
          <option value="urgent" ${stop.priority === 'urgent' ? 'selected' : ''}>🔴</option>
          <option value="normal" ${stop.priority === 'normal' ? 'selected' : ''}>🟡</option>
          <option value="low"    ${stop.priority === 'low'    ? 'selected' : ''}>🟢</option>
        </select>
        <button class="btn-icon danger" onclick="removeStop(${stop.id})" title="Entfernen">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function updateOptimizeBtn() {
  document.getElementById('optimize-btn').disabled = !state.depot || state.stops.length === 0;
}

function fitAll() {
  const pts = [];
  if (state.depot) pts.push(state.depot.coords);
  state.stops.forEach(s => pts.push(s.coords));
  if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
}

// ===== HAVERSINE =====
function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), ms))
  ]);
}

// ===== OSRM API =====
async function osrmTable(points) {
  const coords = points.map(p => `${p.coords[1]},${p.coords[0]}`).join(';');
  try {
    const resp = await withTimeout(
      fetch(`${OSRM}/table/v1/driving/${coords}?annotations=duration,distance`),
      12000
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.code !== 'Ok') throw new Error(data.code);
    return { durations: data.durations, distances: data.distances, type: 'osrm' };
  } catch (e) {
    console.warn('OSRM table fallback (haversine):', e.message);
    return buildHaversineMatrix(points);
  }
}

function buildHaversineMatrix(points) {
  const n = points.length;
  const dur = Array.from({ length: n }, () => new Array(n).fill(0));
  const dist = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const d = haversine(points[i].coords, points[j].coords);
        dist[i][j] = d;
        dur[i][j] = d / (40 / 3.6); // ~40 km/h
      }
    }
  return { durations: dur, distances: dist, type: 'haversine' };
}

async function osrmRoute(points) {
  const coords = points.map(p => `${p.coords[1]},${p.coords[0]}`).join(';');
  try {
    const resp = await withTimeout(
      fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`),
      18000
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes.length) throw new Error('Keine Route');
    const route = data.routes[0];
    return {
      totalDistance: route.distance,
      totalDuration: route.duration,
      geometry: route.geometry,
      segments: route.legs.map((leg, i) => ({
        from: points[i].address,
        to: points[i + 1].address,
        distance: leg.distance,
        duration: leg.duration
      })),
      type: 'osrm'
    };
  } catch (e) {
    console.warn('OSRM route fallback (straight lines):', e.message);
    return buildFallbackRoute(points);
  }
}

function buildFallbackRoute(points) {
  let totalDistance = 0;
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const d = haversine(points[i].coords, points[i + 1].coords);
    totalDistance += d;
    segments.push({ from: points[i].address, to: points[i + 1].address, distance: d, duration: d / (40 / 3.6) });
  }
  return {
    totalDistance,
    totalDuration: totalDistance / (40 / 3.6),
    geometry: null,
    segments,
    type: 'haversine'
  };
}

// ===== TSP OPTIMIZATION =====
function nearestNeighbor(startIdx, candidates, durations) {
  if (!candidates.length) return [];
  if (candidates.length === 1) return [candidates[0]];

  const rem = [...candidates];
  const ordered = [];
  let cur = startIdx;

  while (rem.length) {
    let best = -1, bestD = Infinity, bestPos = -1;
    rem.forEach((idx, pos) => {
      const d = durations[cur][idx];
      if (d < bestD) { bestD = d; best = idx; bestPos = pos; }
    });
    ordered.push(best);
    rem.splice(bestPos, 1);
    cur = best;
  }
  return ordered;
}

function optimizeTSP(allPoints, matrix) {
  // allPoints[0] = depot, allPoints[1..n] = stops (same order as state.stops)
  // Returns optimized indices (into allPoints, not 0)
  const byPriority = { urgent: [], normal: [], low: [] };
  state.stops.forEach((s, i) => byPriority[s.priority].push(i + 1));

  const ordered = [];
  let cur = 0;
  for (const prio of ['urgent', 'normal', 'low']) {
    if (!byPriority[prio].length) continue;
    const group = nearestNeighbor(cur, byPriority[prio], matrix.durations);
    ordered.push(...group);
    cur = group[group.length - 1];
  }
  return ordered;
}

// ===== MAIN OPTIMIZATION =====
async function optimizeRoute() {
  if (!state.depot || !state.stops.length) return;
  readSettings();
  showLoading('Entfernungen berechnen …');

  try {
    const allPoints = [state.depot, ...state.stops];

    setLoadingText('Abstände berechnen …');
    const matrix = await osrmTable(allPoints);

    setLoadingText('Route optimieren …');
    const orderedIndices = optimizeTSP(allPoints, matrix);
    const orderedStops = orderedIndices.map(i => state.stops[i - 1]);
    const orderedPoints = [state.depot, ...orderedStops];

    setLoadingText('Routengeometrie laden …');
    const routeData = await osrmRoute(orderedPoints);

    state.routeResult = { orderedStops, orderedPoints, ...routeData };

    showRoute(state.routeResult);
    showResults(state.routeResult);

    // Update markers + sidebar to reflect optimized order
    orderedStops.forEach((s, i) => {
      if (stopMarkers[s.id]) stopMarkers[s.id].setIcon(makeStopIcon(i + 1, s.priority));
    });
    renderStops(orderedStops);

    showToast(routeData.type === 'haversine'
      ? 'Route optimiert (Luftlinie – OSRM nicht erreichbar)'
      : 'Route erfolgreich optimiert!');
  } catch (err) {
    console.error(err);
    showToast('Fehler: ' + (err.message || 'Unbekannter Fehler'));
  } finally {
    hideLoading();
  }
}

// ===== ROUTE DISPLAY =====
function showRoute(result) {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

  if (result.geometry) {
    routeLayer = L.geoJSON(result.geometry, {
      style: { color: '#2796A8', weight: 5, opacity: 0.82, lineCap: 'round', lineJoin: 'round' }
    }).addTo(map);
  } else {
    routeLayer = L.polyline(result.orderedPoints.map(p => p.coords), {
      color: '#2796A8', weight: 4, opacity: 0.7, dashArray: '10, 7', lineCap: 'round'
    }).addTo(map);
  }

  if (routeLayer) map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  document.getElementById('results-panel').classList.add('hidden');
  state.routeResult = null;
  renumberMarkers();
  renderStops();
}

// ===== COSTS =====
function calcCosts(distM, durS) {
  const km = distM / 1000;
  const h = durS / 3600;
  const s = state.settings;
  const fuel  = (km / 100) * s.fuelConsumption * s.fuelPrice;
  const wear  = km * s.wearCost;
  const labor = h * s.hourlyRate;
  return { fuel, wear, labor, total: fuel + wear + labor };
}

// ===== FORMATTING =====
function fmtDist(m) {
  return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m';
}

function fmtDur(s) {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

function fmtEur(v) {
  return v.toFixed(2).replace('.', ',') + ' €';
}

// ===== RESULTS =====
function showResults(result) {
  const panel = document.getElementById('results-panel');
  panel.classList.remove('hidden');

  const costs = calcCosts(result.totalDistance, result.totalDuration);
  const km = (result.totalDistance / 1000).toFixed(1).replace('.', ',');
  const s = state.settings;

  document.getElementById('result-distance').textContent = fmtDist(result.totalDistance);
  document.getElementById('result-duration').textContent = fmtDur(result.totalDuration);
  document.getElementById('result-cost').textContent = fmtEur(costs.total);

  document.getElementById('cost-breakdown').innerHTML = `
    <div class="cost-item">
      <span>⛽ Kraftstoff (${km} km × ${s.fuelConsumption} L/100 km × ${s.fuelPrice.toFixed(2).replace('.', ',')} €/L)</span>
      <strong>${fmtEur(costs.fuel)}</strong>
    </div>
    <div class="cost-item">
      <span>🔧 Verschleiß (${km} km × ${s.wearCost.toFixed(2).replace('.', ',')} €/km)</span>
      <strong>${fmtEur(costs.wear)}</strong>
    </div>
    <div class="cost-item">
      <span>👤 Arbeitszeit (${fmtDur(result.totalDuration)} × ${s.hourlyRate.toFixed(2).replace('.', ',')} €/h)</span>
      <strong>${fmtEur(costs.labor)}</strong>
    </div>
    <div class="cost-item total-row">
      <span>Gesamtkosten</span>
      <strong>${fmtEur(costs.total)}</strong>
    </div>
  `;

  let html = `
    <div class="route-step">
      <div class="step-dot depot">S</div>
      <div class="step-info">
        <div class="step-address">${esc(state.depot.address)}</div>
        <div class="step-detail">Startpunkt (Apotheke)</div>
      </div>
    </div>`;

  result.orderedStops.forEach((stop, i) => {
    const seg = result.segments[i];
    html += `
      <div class="route-step">
        <div class="step-dot ${stop.priority}">${i + 1}</div>
        <div class="step-info">
          <div class="step-address">${esc(stop.address)}</div>
          <div class="step-detail">${PRIORITY[stop.priority].label}${stop.note ? ' · ' + esc(stop.note) : ''}</div>
        </div>
        ${seg ? `<div class="step-dist">${fmtDist(seg.distance)}<br>${fmtDur(seg.duration)}</div>` : ''}
      </div>`;
  });

  document.getElementById('route-steps').innerHTML = html;
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== EXPORT =====
function exportGoogleMaps() {
  if (!state.routeResult) return;
  const { orderedPoints } = state.routeResult;

  const toLatLng = p => `${p.coords[0]},${p.coords[1]}`;
  const origin = toLatLng(orderedPoints[0]);
  const dest = toLatLng(orderedPoints[orderedPoints.length - 1]);
  const wps = orderedPoints.slice(1, -1);

  // Google Maps supports max 10 waypoints in URL
  const maxWp = 9;
  if (wps.length > maxWp) {
    showToast(`Hinweis: Nur erste ${maxWp} Zwischenstopps in Google Maps darstellbar`, 5000);
  }

  const wpParam = wps.slice(0, maxWp).map(toLatLng).join('|');
  const url = 'https://www.google.com/maps/dir/?api=1' +
    `&origin=${origin}` +
    `&destination=${dest}` +
    (wpParam ? `&waypoints=${wpParam}` : '') +
    '&travelmode=driving';

  window.open(url, '_blank');
}

function copyRoute() {
  if (!state.routeResult) return;
  const { orderedStops, segments, totalDistance, totalDuration } = state.routeResult;
  const costs = calcCosts(totalDistance, totalDuration);

  const lines = [
    '=== LIEFERROUTE ===',
    '',
    `Startpunkt: ${state.depot.address}`,
    ''
  ];

  orderedStops.forEach((s, i) => {
    const seg = segments[i];
    lines.push(`${i + 1}. ${s.address}`);
    lines.push(`   Priorität: ${PRIORITY[s.priority].label}${s.note ? ' | ' + s.note : ''}`);
    if (seg) lines.push(`   ${fmtDist(seg.distance)} · ${fmtDur(seg.duration)}`);
    lines.push('');
  });

  lines.push('---');
  lines.push(`Gesamtstrecke:  ${fmtDist(totalDistance)}`);
  lines.push(`Gesamtfahrzeit: ${fmtDur(totalDuration)}`);
  lines.push(`Kraftstoff:     ${fmtEur(costs.fuel)}`);
  lines.push(`Verschleiß:     ${fmtEur(costs.wear)}`);
  lines.push(`Arbeitszeit:    ${fmtEur(costs.labor)}`);
  lines.push(`Gesamtkosten:   ${fmtEur(costs.total)}`);

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showToast('Route in Zwischenablage kopiert'))
    .catch(() => showToast('Kopieren nicht möglich'));
}

// ===== UI HELPERS =====
function showLoading(text) {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
}
function setLoadingText(text) {
  document.getElementById('loading-text').textContent = text;
}
function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

let toastTimer = null;
function showToast(msg, dur = 3200) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), dur);
}

function readSettings() {
  const g = id => parseFloat(document.getElementById(id).value);
  state.settings.fuelPrice       = g('fuel-price')       || 1.75;
  state.settings.fuelConsumption = g('fuel-consumption') || 7.5;
  state.settings.wearCost        = g('wear-cost')        || 0.08;
  state.settings.hourlyRate      = g('hourly-rate')      || 15.0;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initMap();

  // Depot autocomplete
  const depotInput = document.getElementById('depot-input');
  const depotDrop  = document.getElementById('depot-dropdown');
  attachAutocomplete(depotInput, depotDrop, geo => setDepot(geo));
  document.getElementById('depot-clear').addEventListener('click', clearDepot);

  // Stop autocomplete
  const stopInput = document.getElementById('stop-input');
  const stopDrop  = document.getElementById('stop-dropdown');
  attachAutocomplete(stopInput, stopDrop, geo => {
    pendingStop = geo;
  });

  // Clear pending geocode when user types again
  stopInput.addEventListener('input', () => { pendingStop = null; });

  // Add stop button
  document.getElementById('add-stop-btn').addEventListener('click', () => {
    if (!pendingStop) {
      if (stopInput.value.trim().length >= 3) {
        showToast('Bitte eine Adresse aus der Vorschlagsliste auswählen');
      } else {
        showToast('Bitte zuerst eine Adresse eingeben');
      }
      stopInput.focus();
      return;
    }
    const priority = document.getElementById('stop-priority').value;
    const note = document.getElementById('stop-note').value;
    addStop(pendingStop, priority, note);
    stopInput.value = '';
    document.getElementById('stop-note').value = '';
    document.getElementById('stop-priority').value = 'normal';
    pendingStop = null;
  });

  // Enter on stop note also triggers add
  document.getElementById('stop-note').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('add-stop-btn').click();
  });

  // Export
  document.getElementById('export-gmaps-btn').addEventListener('click', exportGoogleMaps);
  document.getElementById('copy-route-btn').addEventListener('click', copyRoute);
  document.getElementById('clear-route-btn').addEventListener('click', clearRoute);

  // ---- Sidebar + Mobile Backdrop ----
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  function isMobile() { return window.innerWidth < 768; }

  function openSidebar() {
    sidebar.classList.remove('collapsed');
    if (isMobile()) backdrop.classList.remove('hidden');
    setTimeout(() => map.invalidateSize(), 320);
  }

  function closeSidebar() {
    sidebar.classList.add('collapsed');
    backdrop.classList.add('hidden');
    setTimeout(() => map.invalidateSize(), 320);
  }

  function toggleSidebar() {
    sidebar.classList.contains('collapsed') ? openSidebar() : closeSidebar();
  }

  // Start collapsed on mobile
  if (isMobile()) sidebar.classList.add('collapsed');

  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', closeSidebar);

  // On mobile: close sidebar after adding a stop (UX: see the map)
  const origAddStop = addStop;
  // After optimizing on mobile, close sidebar to show the map
  const origOptimize = optimizeRoute;

  // Close sidebar on mobile after optimization completes
  document.getElementById('optimize-btn').addEventListener('click', async () => {
    await optimizeRoute();
    if (isMobile()) closeSidebar();
  }, { once: false });

  // Recheck on resize (rotation)
  window.addEventListener('resize', () => {
    if (!isMobile() && sidebar.classList.contains('collapsed')) {
      // On desktop, keep sidebar open unless user explicitly closed it
    }
    map.invalidateSize();
  });

  // Settings collapse
  const settingsBody  = document.getElementById('settings-body');
  const settingsArrow = document.getElementById('settings-arrow');
  document.getElementById('settings-toggle').addEventListener('click', () => {
    settingsBody.classList.toggle('open');
    settingsArrow.classList.toggle('open');
  });

  updateOptimizeBtn();
  renderStops();
});
