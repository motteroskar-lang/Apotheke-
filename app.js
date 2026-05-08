'use strict';

// ===== CONSTANTS =====
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org';
const VIEWBOX = '5.82,50.38,6.72,50.98';

const PRIORITY = {
  urgent: { label: 'Dringend', order: 0, color: '#e53935' },
  normal: { label: 'Normal',   order: 1, color: '#d97706' },
  low:    { label: 'Niedrig',  order: 2, color: '#4caf50' }
};

// ===== STATE =====
const state = {
  depot: null,
  stops: [],
  nextId: 1,
  routeResult: null,
  settings: { fuelPrice: 1.75, fuelConsumption: 7.5, wearCost: 0.08, hourlyRate: 15.0 }
};

// ===== MAP =====
let map = null;
let mapInitialized = false;
let depotMarker = null;
let stopMarkers = {};
let routeLayer = null;

function initMap() {
  if (mapInitialized) return;
  mapInitialized = true;

  map = L.map('map', {
    center: [50.7753, 6.0839],
    zoom: 12,
    zoomControl: true,
    attributionControl: true
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
    html: `<div style="width:34px;height:34px;background:#1b1b28;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:15px;">🏥</span></div>`,
    className: '', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -34]
  });
}

function makeStopIcon(num, priority) {
  const c = PRIORITY[priority]?.color || '#1b1b28';
  return L.divIcon({
    html: `<div style="width:30px;height:30px;background:${c};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:10px;font-weight:700;color:white;font-family:Inter,sans-serif;">${num}</span></div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30]
  });
}

// ===== GEOCODING =====
const geoCache = new Map();

async function nominatimSearch(query, signal) {
  const key = query.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);
  const params = new URLSearchParams({
    format: 'json', q: query, countrycodes: 'de,be,nl',
    limit: 6, addressdetails: 1, 'accept-language': 'de', viewbox: VIEWBOX, bounded: 0
  });
  const resp = await fetch(`${NOMINATIM}?${params}`, {
    signal, headers: { 'User-Agent': 'ApothekeRoutenplaner/1.0' }
  });
  if (!resp.ok) throw new Error('Geocoding nicht verfügbar');
  const data = await resp.json();
  geoCache.set(key, data);
  return data;
}

function attachAutocomplete(inputEl, dropdownEl, onSelect) {
  let timer = null, ctrl = null;

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
    const road   = [addr.road || '', addr.house_number || ''].filter(Boolean).join(' ');
    const city   = addr.city || addr.town || addr.village || addr.suburb || '';
    const main   = road || item.display_name.split(',')[0];
    const detail = [city, addr.country || ''].filter(Boolean).join(', ');
    const el = document.createElement('div');
    el.className = 'autocomplete-item';
    el.innerHTML = `<div class="place-name">${esc(main)}</div><div class="place-detail">${esc(detail)}</div>`;

    const handleSelect = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const shortName = [road || main, city].filter(Boolean).join(', ') ||
        item.display_name.split(',').slice(0, 3).join(',').trim();
      inputEl.value = shortName;
      dropdownEl.innerHTML = '';
      onSelect({ address: shortName, displayName: item.display_name, coords: [parseFloat(item.lat), parseFloat(item.lon)] });
    };

    // mousedown prevents input blur on desktop; touchend fires before click on mobile
    el.addEventListener('mousedown', handleSelect);
    el.addEventListener('touchend', handleSelect, { passive: false });

    dropdownEl.appendChild(el);
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== DEPOT =====
function setDepot(geocoded) {
  state.depot = geocoded;
  document.getElementById('depot-chip-text').textContent = geocoded.address;
  document.getElementById('depot-chip').classList.remove('hidden');
  document.getElementById('depot-input').value = '';
  updateOptimizeBtn();
  showToast('Startpunkt gesetzt');
}

function clearDepot() {
  state.depot = null;
  document.getElementById('depot-chip').classList.add('hidden');
  clearRoute();
  updateOptimizeBtn();
}

// ===== STOPS =====
let pendingStop = null;

function addStop(geocoded, priority, note) {
  const stop = { id: state.nextId++, ...geocoded, priority, note: note.trim() };
  state.stops.push(stop);
  // Bestehende Route ungültig machen (ohne doppeltes renderStops)
  if (state.routeResult) {
    state.routeResult = null;
    document.getElementById('results-card').classList.add('hidden');
  }
  renderStops();
  updateOptimizeBtn();
  showToast('Adresse hinzugefügt');
}

function removeStop(id) {
  const idx = state.stops.findIndex(s => s.id === id);
  if (idx === -1) return;
  state.stops.splice(idx, 1);
  if (stopMarkers[id]) { map?.removeLayer(stopMarkers[id]); delete stopMarkers[id]; }
  renderStops();
  updateOptimizeBtn();
  clearRoute();
}

function setStopPriority(id, priority) {
  const stop = state.stops.find(s => s.id === id);
  if (!stop) return;
  stop.priority = priority;
  renderStops();
  clearRoute();
}

function renderStops(orderedList) {
  const listEl  = document.getElementById('stops-list');
  const emptyEl = document.getElementById('stops-empty');
  document.getElementById('stops-count').textContent = state.stops.length;

  if (!state.stops.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  const display = orderedList
    ? orderedList
    : [...state.stops].sort((a, b) => PRIORITY[a.priority].order - PRIORITY[b.priority].order);

  listEl.innerHTML = display.map((s, i) => `
    <div class="stop-item priority-${s.priority}">
      <div class="stop-seq">${i + 1}</div>
      <div class="stop-info">
        <div class="stop-addr" title="${esc(s.displayName)}">${esc(s.address)}</div>
        <div class="stop-meta">
          <span class="prio-pill ${s.priority}">${PRIORITY[s.priority].label}</span>
          ${s.note ? `<span class="stop-note-lbl">${esc(s.note)}</span>` : ''}
        </div>
      </div>
      <div class="stop-actions">
        <select class="prio-select" onchange="setStopPriority(${s.id}, this.value)" title="Priorität">
          <option value="urgent" ${s.priority === 'urgent' ? 'selected' : ''}>🔴</option>
          <option value="normal" ${s.priority === 'normal' ? 'selected' : ''}>🟡</option>
          <option value="low"    ${s.priority === 'low'    ? 'selected' : ''}>🟢</option>
        </select>
        <button class="btn-del" onclick="removeStop(${s.id})" aria-label="Entfernen">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
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

// ===== HAVERSINE / UTILITIES =====
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

// ===== OSRM =====
async function osrmTable(points) {
  const coords = points.map(p => `${p.coords[1]},${p.coords[0]}`).join(';');
  try {
    const resp = await withTimeout(
      fetch(`${OSRM}/table/v1/driving/${coords}?annotations=duration,distance`), 12000
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    if (data.code !== 'Ok') throw new Error(data.code);
    return { durations: data.durations, distances: data.distances, type: 'osrm' };
  } catch (e) {
    console.warn('OSRM table → Luftlinie:', e.message);
    return buildHaversineMatrix(points);
  }
}

function buildHaversineMatrix(points) {
  const n = points.length;
  const dur  = Array.from({ length: n }, () => new Array(n).fill(0));
  const dist = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) if (i !== j) {
      const d = haversine(points[i].coords, points[j].coords);
      dist[i][j] = d;
      dur[i][j]  = d / (40 / 3.6);
    }
  return { durations: dur, distances: dist, type: 'haversine' };
}

async function osrmRoute(points) {
  const coords = points.map(p => `${p.coords[1]},${p.coords[0]}`).join(';');
  try {
    const resp = await withTimeout(
      fetch(`${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`), 18000
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
        from: points[i].address, to: points[i + 1].address,
        distance: leg.distance, duration: leg.duration
      })),
      type: 'osrm'
    };
  } catch (e) {
    console.warn('OSRM route → Luftlinie:', e.message);
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
  return { totalDistance, totalDuration: totalDistance / (40 / 3.6), geometry: null, segments, type: 'haversine' };
}

// ===== TSP =====
function nearestNeighbor(startIdx, candidates, durations) {
  if (!candidates.length) return [];
  if (candidates.length === 1) return [candidates[0]];
  const rem = [...candidates];
  const ordered = [];
  let cur = startIdx;
  while (rem.length) {
    let best = -1, bestD = Infinity, bestPos = -1;
    rem.forEach((idx, pos) => { const d = durations[cur][idx]; if (d < bestD) { bestD = d; best = idx; bestPos = pos; } });
    ordered.push(best);
    rem.splice(bestPos, 1);
    cur = best;
  }
  return ordered;
}

function optimizeTSP(allPoints, matrix) {
  const byPrio = { urgent: [], normal: [], low: [] };
  state.stops.forEach((s, i) => byPrio[s.priority].push(i + 1));
  const ordered = [];
  let cur = 0;
  for (const p of ['urgent', 'normal', 'low']) {
    if (!byPrio[p].length) continue;
    const g = nearestNeighbor(cur, byPrio[p], matrix.durations);
    ordered.push(...g);
    cur = g[g.length - 1];
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
    const orderedStops  = orderedIndices.map(i => state.stops[i - 1]);
    const orderedPoints = [state.depot, ...orderedStops];

    setLoadingText('Routengeometrie laden …');
    const routeData = await osrmRoute(orderedPoints);

    state.routeResult = { orderedStops, orderedPoints, ...routeData };

    showResults(state.routeResult);
    renderStops(orderedStops);
    drawMapRoute(state.routeResult);

    showToast(routeData.type === 'haversine'
      ? 'Route optimiert (Luftlinie – OSRM nicht erreichbar)'
      : 'Route optimiert!');

    // Scroll zu den Ergebnissen
    setTimeout(() => {
      document.getElementById('results-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

  } catch (err) {
    console.error(err);
    showToast('Fehler: ' + (err.message || 'Unbekannter Fehler'));
  } finally {
    hideLoading();
  }
}

// ===== ROUTE DRAW =====
function drawMapRoute(result) {
  // Warten bis der Browser results-card gerendert hat, dann Leaflet initialisieren
  // requestAnimationFrame stellt sicher dass der DOM gemalt ist bevor Leaflet die Containermaße liest
  requestAnimationFrame(() => {
    initMap();

    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

    if (result.geometry) {
      routeLayer = L.geoJSON(result.geometry, {
        style: { color: '#1b1b28', weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }
      }).addTo(map);
    } else {
      routeLayer = L.polyline(result.orderedPoints.map(p => p.coords), {
        color: '#1b1b28', weight: 4, opacity: 0.65, dashArray: '10, 8', lineCap: 'round'
      }).addTo(map);
    }

    // Marker neu setzen
    Object.values(stopMarkers).forEach(m => map.removeLayer(m));
    stopMarkers = {};
    if (depotMarker) { map.removeLayer(depotMarker); depotMarker = null; }

    depotMarker = L.marker(result.orderedPoints[0].coords, { icon: makeDepotIcon() })
      .addTo(map)
      .bindPopup(`<strong>Startpunkt</strong><br>${esc(state.depot.address)}`);

    result.orderedStops.forEach((s, i) => {
      stopMarkers[s.id] = L.marker(s.coords, { icon: makeStopIcon(i + 1, s.priority) })
        .addTo(map)
        .bindPopup(`<strong>${esc(s.address)}</strong><br>${PRIORITY[s.priority].label}${s.note ? '<br><em>' + esc(s.note) + '</em>' : ''}`);
    });

    // Nach zweitem Frame: Maße korrigieren und Route einpassen
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (routeLayer) {
        map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
      }
    });
  });
}

// ===== COSTS =====
function calcCosts(distM, durS) {
  const km = distM / 1000, h = durS / 3600, s = state.settings;
  const fuel  = (km / 100) * s.fuelConsumption * s.fuelPrice;
  const wear  = km * s.wearCost;
  const labor = h * s.hourlyRate;
  return { fuel, wear, labor, total: fuel + wear + labor };
}

function fmtDist(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m'; }
function fmtDur(s)  { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h > 0 ? `${h}h ${m}min` : `${m} min`; }
function fmtEur(v)  { return v.toFixed(2).replace('.', ',') + ' €'; }

// ===== RESULTS =====
function showResults(result) {
  const card = document.getElementById('results-card');
  card.classList.remove('hidden');

  const costs = calcCosts(result.totalDistance, result.totalDuration);
  const km = (result.totalDistance / 1000).toFixed(1).replace('.', ',');
  const s = state.settings;

  document.getElementById('result-distance').textContent = fmtDist(result.totalDistance);
  document.getElementById('result-duration').textContent = fmtDur(result.totalDuration);
  document.getElementById('result-cost').textContent     = fmtEur(costs.total);

  document.getElementById('cost-breakdown').innerHTML = `
    <div class="cost-line"><span>⛽ Kraftstoff (${km} km × ${s.fuelConsumption} L/100km × ${s.fuelPrice.toFixed(2).replace('.',',')} €/L)</span><strong>${fmtEur(costs.fuel)}</strong></div>
    <div class="cost-line"><span>🔧 Verschleiß (${km} km × ${s.wearCost.toFixed(2).replace('.',',')} €/km)</span><strong>${fmtEur(costs.wear)}</strong></div>
    <div class="cost-line"><span>👤 Arbeitszeit (${fmtDur(result.totalDuration)} × ${s.hourlyRate.toFixed(2).replace('.',',')} €/h)</span><strong>${fmtEur(costs.labor)}</strong></div>
    <div class="cost-line total"><span>Gesamtkosten</span><strong>${fmtEur(costs.total)}</strong></div>
  `;

  let html = `
    <div class="route-step">
      <div class="step-dot depot">S</div>
      <div class="step-body">
        <div class="step-addr">${esc(state.depot.address)}</div>
        <div class="step-meta">Startpunkt · Apotheke</div>
      </div>
    </div>`;

  result.orderedStops.forEach((stop, i) => {
    const seg = result.segments[i];
    html += `
      <div class="route-step">
        <div class="step-dot ${stop.priority}">${i + 1}</div>
        <div class="step-body">
          <div class="step-addr">${esc(stop.address)}</div>
          <div class="step-meta">${PRIORITY[stop.priority].label}${stop.note ? ' · ' + esc(stop.note) : ''}</div>
          ${seg ? `<div class="step-dist">${fmtDist(seg.distance)} · ${fmtDur(seg.duration)}</div>` : ''}
        </div>
      </div>`;
  });

  document.getElementById('route-steps').innerHTML = html;
}

// ===== CLEAR ROUTE =====
function clearRoute() {
  document.getElementById('results-card').classList.add('hidden');
  state.routeResult = null;
  if (map) {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    Object.values(stopMarkers).forEach(m => map.removeLayer(m));
    stopMarkers = {};
    if (depotMarker) { map.removeLayer(depotMarker); depotMarker = null; }
  }
  renderStops();
}

// ===== EXPORT =====
function exportGoogleMaps() {
  if (!state.routeResult) return;
  const { orderedPoints } = state.routeResult;
  const toLL = p => `${p.coords[0]},${p.coords[1]}`;
  const origin = toLL(orderedPoints[0]);
  const dest   = toLL(orderedPoints[orderedPoints.length - 1]);
  const wps    = orderedPoints.slice(1, -1);
  if (wps.length > 9) showToast(`Hinweis: Max. 9 Zwischenstopps in Google Maps`, 4000);
  const url = 'https://www.google.com/maps/dir/?api=1'
    + `&origin=${origin}&destination=${dest}`
    + (wps.length ? `&waypoints=${wps.slice(0, 9).map(toLL).join('|')}` : '')
    + '&travelmode=driving';
  window.open(url, '_blank');
}

function copyRoute() {
  if (!state.routeResult) return;
  const { orderedStops, segments, totalDistance, totalDuration } = state.routeResult;
  const costs = calcCosts(totalDistance, totalDuration);
  const lines = ['=== LIEFERROUTE ===', '', `Start: ${state.depot.address}`, ''];
  orderedStops.forEach((s, i) => {
    const seg = segments[i];
    lines.push(`${i + 1}. ${s.address}`);
    lines.push(`   ${PRIORITY[s.priority].label}${s.note ? ' | ' + s.note : ''}`);
    if (seg) lines.push(`   ${fmtDist(seg.distance)} · ${fmtDur(seg.duration)}`);
    lines.push('');
  });
  lines.push('---');
  lines.push(`Strecke: ${fmtDist(totalDistance)} | Fahrzeit: ${fmtDur(totalDuration)}`);
  lines.push(`Kosten: ${fmtEur(costs.total)} (Kraftstoff ${fmtEur(costs.fuel)} + Verschleiß ${fmtEur(costs.wear)} + Arbeit ${fmtEur(costs.labor)})`);
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showToast('Route kopiert'))
    .catch(() => showToast('Kopieren nicht möglich'));
}

// ===== UI =====
function showLoading(t) { document.getElementById('loading-text').textContent = t; document.getElementById('loading-overlay').classList.remove('hidden'); }
function setLoadingText(t) { document.getElementById('loading-text').textContent = t; }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

let toastTimer = null;
function showToast(msg, dur = 3000) {
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

  // Depot
  attachAutocomplete(
    document.getElementById('depot-input'),
    document.getElementById('depot-dropdown'),
    geo => setDepot(geo)
  );
  document.getElementById('depot-clear').addEventListener('click', clearDepot);

  // Stop input
  const stopInput = document.getElementById('stop-input');
  const stopDrop  = document.getElementById('stop-dropdown');
  let blockInputClear = false;
  attachAutocomplete(stopInput, stopDrop, geo => {
    blockInputClear = true;   // Dropdown-Auswahl → input-Event ignorieren
    pendingStop = geo;
    setTimeout(() => { blockInputClear = false; }, 100);
  });
  stopInput.addEventListener('input', () => {
    if (!blockInputClear) pendingStop = null;
  });

  // Add stop
  document.getElementById('add-stop-btn').addEventListener('click', () => {
    if (!pendingStop) {
      showToast(stopInput.value.trim().length >= 3
        ? 'Adresse aus der Liste auswählen'
        : 'Bitte Adresse eingeben');
      stopInput.focus();
      return;
    }
    addStop(pendingStop, document.getElementById('stop-priority').value, document.getElementById('stop-note').value);
    stopInput.value = '';
    document.getElementById('stop-note').value = '';
    document.getElementById('stop-priority').value = 'normal';
    pendingStop = null;
    // Scroll zu Stops
    document.getElementById('stops-list').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  document.getElementById('stop-note').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('add-stop-btn').click();
  });

  // Optimize
  document.getElementById('optimize-btn').addEventListener('click', optimizeRoute);

  // Results actions
  document.getElementById('export-gmaps-btn').addEventListener('click', exportGoogleMaps);
  document.getElementById('copy-route-btn').addEventListener('click', copyRoute);
  document.getElementById('clear-route-btn').addEventListener('click', clearRoute);

  // Cost collapsible
  const costBody  = document.getElementById('cost-body');
  const costArrow = document.getElementById('cost-arrow');
  document.getElementById('cost-toggle').addEventListener('click', () => {
    costBody.classList.toggle('open');
    costArrow.classList.toggle('open');
  });

  updateOptimizeBtn();
  renderStops();
});
