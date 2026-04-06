// ═══════════════════════════════════════════════════════════
//  FLYPAL — MAIN APP
// ═══════════════════════════════════════════════════════════

// ── ITEMS CATALOG ─────────────────────────────────────────
const ITEMS = {
  bedding:  ['Towels','Laundry Bag','Pillow Case','Flat or Fitted Sheet','Blanket','Duvet / Duvet Cover','Other'],
  clothing: ['Pilot Shirt','Crew Jacket','Uniform Pants','Vest / Gilet','Tie / Scarf','Other'],
  kitchen:  ['Apron','Kitchen Towel','Oven Mitt','Table Linen','Napkins','Other']
};

// ── FBO LIST ──────────────────────────────────────────────
const FBOS = {
  active: [
    { name: 'Sheltair', airport: 'Fort Lauderdale / Hollywood Intl', code: 'FLL' },
    { name: 'Sheltair', airport: 'Orlando Executive', code: 'ORL' },
    { name: 'Sheltair', airport: 'Sarasota-Bradenton Intl', code: 'SRQ' },
    { name: 'Atlantic Aviation', airport: 'Orlando Executive', code: 'ORL' },
    { name: 'Atlantic Aviation', airport: 'Orlando International', code: 'MCO' },
    { name: 'Atlantic Aviation', airport: 'Sarasota-Bradenton Intl', code: 'SRQ' }
  ],
  expansion: [
    { name: 'Signature Flight', airport: 'Orlando International', code: 'MCO' },
    { name: 'Signature Flight', airport: 'Kissimmee Gateway', code: 'ISM' },
    { name: 'Kissimmee Jet Center', airport: 'Kissimmee Gateway', code: 'ISM' },
    { name: 'Odyssey Aviation', airport: 'Kissimmee Gateway', code: 'ISM' },
    { name: 'Million Air', airport: 'Orlando Sanford', code: 'SFB' },
    { name: 'Sheltair', airport: 'Melbourne Orlando Intl', code: 'MLB' },
    { name: 'Sheltair', airport: 'Tampa International', code: 'TPA' },
    { name: 'Signature Flight', airport: 'Tampa International', code: 'TPA' },
    { name: 'Sheltair', airport: 'St. Pete-Clearwater Intl', code: 'PIE' },
    { name: 'Banyan Air Service', airport: 'Fort Lauderdale Executive', code: 'FXE' },
    { name: 'W Aviation', airport: 'Fort Lauderdale Executive', code: 'FXE' }
  ]
};

// ── STATE ─────────────────────────────────────────────────
let state = {
  currentView: 'dashboard',
  quantities:  {},
  serviceType: 'regular',
  rushReason:  null,
  orders:      [],
  activeOrderId: null,
  gpsWatchId:  null
};

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  buildFBODropdown();
  buildItemsForm();
  updateSummary();
  showView('dashboard');
  await loadDashboard();
  setupRealtimeUpdates();
});

// ── NAVIGATION ────────────────────────────────────────────
function showView(name) {
  // Hide all pages
  document.querySelectorAll('.view-page').forEach(p => p.style.display = 'none');
  // Show target
  const page = document.getElementById('page-' + name);
  if (page) page.style.display = 'block';
  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-view="${name}"]`);
  if (navEl) navEl.classList.add('active');
  // Update breadcrumb
  const labels = { dashboard: 'Dashboard', order: 'New Order', tracking: 'Live Tracking', history: 'Order History' };
  const bcEl = document.getElementById('bc-page');
  if (bcEl) bcEl.textContent = labels[name] || name;

  state.currentView = name;
  if (name === 'dashboard') loadDashboard();
  if (name === 'tracking')  loadTracking();
  if (name === 'history')   loadHistory();
}

// ── FBO DROPDOWN ──────────────────────────────────────────
function buildFBODropdown() {
  const sel = document.getElementById('fbo-select');
  sel.innerHTML = '<option value="" disabled selected>Select FBO location...</option>';

  const activeGrp = document.createElement('optgroup');
  activeGrp.label = '── Active Clients ──';
  FBOS.active.forEach(f => {
    const opt = document.createElement('option');
    opt.value = `${f.name} — ${f.code}`;
    opt.textContent = `${f.name} — ${f.code} (${f.airport})`;
    activeGrp.appendChild(opt);
  });
  sel.appendChild(activeGrp);

  const expGrp = document.createElement('optgroup');
  expGrp.label = '── Expansion ──';
  FBOS.expansion.forEach(f => {
    const opt = document.createElement('option');
    opt.value = `${f.name} — ${f.code}`;
    opt.textContent = `${f.name} — ${f.code} (${f.airport})`;
    expGrp.appendChild(opt);
  });
  sel.appendChild(expGrp);
}

// ── ITEMS FORM ────────────────────────────────────────────
function buildItemsForm() {
  state.quantities = {};
  ['bedding','clothing','kitchen'].forEach(cat => {
    const container = document.getElementById('cat-' + cat);
    container.innerHTML = '';
    ITEMS[cat].forEach(item => {
      const key = `${cat}:${item}`;
      state.quantities[key] = 0;
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <div class="item-name">
          <div class="item-pip"></div>
          ${item}
        </div>
        <div class="qty-wrap">
          <button class="qty-btn" onclick="changeQty('${key}', -1)">−</button>
          <div class="qty-num" id="qn-${cat}-${item.replace(/[^a-z0-9]/gi,'_')}">0</div>
          <button class="qty-btn" onclick="changeQty('${key}', 1)">+</button>
        </div>`;
      container.appendChild(row);
    });
  });
}

function changeQty(key, delta) {
  state.quantities[key] = Math.max(0, (state.quantities[key] || 0) + delta);
  const [cat, item] = key.split(':');
  const elId = `qn-${cat}-${item.replace(/[^a-z0-9]/gi,'_')}`;
  const el = document.getElementById(elId);
  if (el) {
    el.textContent = state.quantities[key];
    el.className = 'qty-num' + (state.quantities[key] > 0 ? ' on' : '');
  }
  updateSummary();
}

// ── SERVICE TOGGLE ────────────────────────────────────────
function selectService(type) {
  state.serviceType = type;
  const cardReg  = document.getElementById('svc-regular');
  const cardRush = document.getElementById('svc-rush');
  cardReg.className  = 'service-card' + (type === 'regular' ? ' active' : '');
  cardRush.className = 'service-card' + (type === 'rush' ? ' rush-active' : '');
  const alert = document.getElementById('rush-alert');
  alert.className = 'rush-alert' + (type === 'rush' ? ' show' : '');
  updateSummary();
}

// ── RUSH DETECTION ────────────────────────────────────────
function onDeliveryChange() {
  const date = document.getElementById('delivery-date').value;
  const time = document.getElementById('delivery-time').value;
  if (!date || !time) return;

  const result = detectRush(date, time);
  state.rushReason = result.reason;

  if (result.isRush) {
    selectService('rush');
    document.getElementById('alert-msg').textContent =
      `${result.label}. A 50% surcharge will be applied and included in the FBO confirmation.`;
  } else {
    selectService('regular');
  }
  updateSummary();
}

// ── ORDER SUMMARY ─────────────────────────────────────────
function updateSummary() {
  const tail     = document.getElementById('tail-input').value   || '—';
  const fbo      = document.getElementById('fbo-select').value   || '—';
  const csr      = document.getElementById('csr-input').value    || '—';
  const date     = document.getElementById('delivery-date').value;
  const time     = document.getElementById('delivery-time').value;
  const delivery = date ? `${date}${time ? ' · ' + time : ''}` : '—';

  document.getElementById('sum-tail').textContent     = tail;
  document.getElementById('sum-fbo').textContent      = fbo === '—' ? '—' : fbo.split(' — ')[0];
  document.getElementById('sum-delivery').textContent = delivery;
  document.getElementById('sum-csr').textContent      = csr;
  document.getElementById('sum-service').textContent  = state.serviceType === 'rush' ? 'Rush / Overnight' : 'Regular (48h)';
  document.getElementById('sum-surcharge').textContent = state.serviceType === 'rush' ? '+50%' : 'None';

  const sumSvc = document.getElementById('sum-service');
  const sumSur = document.getElementById('sum-surcharge');
  sumSvc.className = state.serviceType === 'rush' ? 'sum-val warn' : 'sum-val';
  sumSur.className = state.serviceType === 'rush' ? 'sum-val warn' : 'sum-val';

  // Items breakdown
  let total = 0;
  const lines = [];
  Object.entries(state.quantities).forEach(([key, qty]) => {
    if (qty > 0) {
      total += qty;
      lines.push(`${qty}× ${key.split(':')[1]}`);
    }
  });
  document.getElementById('sum-items').textContent = total;
  document.getElementById('sum-breakdown').innerHTML = lines.length
    ? lines.map(l => `<div style="color:var(--mist);font-size:12px;line-height:1.9">${l}</div>`).join('')
    : '<span style="color:var(--steel);font-style:italic;font-size:12px">No items added yet</span>';
}

// ── SUBMIT ORDER ──────────────────────────────────────────
async function submitOrder() {
  const tail     = document.getElementById('tail-input').value.trim();
  const fbo      = document.getElementById('fbo-select').value;
  const arriving = document.getElementById('arriving-date').value;
  const delDate  = document.getElementById('delivery-date').value;
  const delTime  = document.getElementById('delivery-time').value;
  const csr      = document.getElementById('csr-input').value.trim();
  const notes    = document.getElementById('notes-input').value.trim();

  // Validation
  const errors = [];
  if (!tail)     errors.push('tail-input');
  if (!fbo)      errors.push('fbo-select');
  if (!arriving) errors.push('arriving-date');
  if (!delDate)  errors.push('delivery-date');
  if (!delTime)  errors.push('delivery-time');
  if (!csr)      errors.push('csr-input');

  // Highlight errors
  document.querySelectorAll('.field-input, .field-select').forEach(el => el.classList.remove('error'));
  if (errors.length) {
    errors.forEach(id => document.getElementById(id)?.classList.add('error'));
    showToast('Please fill in all required fields', 'error');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Submitting...';

  try {
    const items = Object.entries(state.quantities)
      .filter(([,qty]) => qty > 0)
      .map(([key, quantity]) => {
        const [category, name] = key.split(':');
        return { category, name, quantity };
      });

    const order = await createOrder({
      tailNumber:   tail,
      fboName:      fbo,
      arrivingDate: arriving,
      deliveryDate: delDate,
      deliveryTime: delTime,
      csrName:      csr,
      specialNotes: notes,
      serviceType:  state.serviceType,
      rushReason:   state.rushReason
    }, items);

    showToast(`Order submitted — Tail ${tail}. Flypal team notified.`, 'success');
    resetOrderForm();
    await loadDashboard();

    // Switch to dashboard to show new order
    setTimeout(() => showView('dashboard'), 1500);

  } catch (err) {
    console.error(err);
    showToast('Error submitting order. Check your connection.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Manifest';
  }
}

function resetOrderForm() {
  ['tail-input','arriving-date','delivery-date','delivery-time','csr-input','notes-input']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  document.getElementById('fbo-select').value = '';
  buildItemsForm();
  selectService('regular');
  updateSummary();
}

// ── DASHBOARD ─────────────────────────────────────────────
async function loadDashboard() {
  try {
    state.orders = await getOrders();
    renderKPIs();
    renderOrdersTable(state.orders);
  } catch(e) {
    console.error('Dashboard load error:', e);
    renderOrdersTable([]); // show empty state
  }
}

function renderKPIs() {
  const counts = { pending:0, accepted:0, picked_up:0, in_transit:0, delivered:0, rush:0 };
  state.orders.forEach(o => {
    if (counts[o.status] !== undefined) counts[o.status]++;
    if (o.service_type === 'rush') counts.rush++;
  });
  document.getElementById('kpi-pending').textContent   = counts.pending;
  document.getElementById('kpi-accepted').textContent  = counts.accepted + counts.picked_up;
  document.getElementById('kpi-transit').textContent   = counts.in_transit;
  document.getElementById('kpi-delivered').textContent = counts.delivered;
  document.getElementById('kpi-rush').textContent      = counts.rush;
}

function renderOrdersTable(orders, filter = 'all') {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--steel);font-style:italic">No orders found</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr style="cursor:pointer" onclick="openOrderModal('${o.id}')">
      <td>
        <div class="tail">${o.tail_number}</div>
        <div class="sub-text">${formatDate(o.created_at)}</div>
      </td>
      <td>
        <div style="font-size:13px;color:var(--mist)">${o.fbo_name}</div>
      </td>
      <td>
        <div style="font-size:13px;color:var(--white)">${o.delivery_date}</div>
        <div class="sub-text">${o.delivery_time}</div>
      </td>
      <td><div class="sub-text">${o.csr_name}</div></td>
      <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
      <td><span class="badge badge-${o.service_type === 'rush' ? 'rush' : 'regular'}">${o.service_type === 'rush' ? 'Rush' : 'Regular'}</span></td>
    </tr>
  `).join('');
}

function filterOrders(filter) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  renderOrdersTable(state.orders, filter);
}

// ── ORDER MODAL ───────────────────────────────────────────
async function openOrderModal(orderId) {
  state.activeOrderId = orderId;
  try {
    const order = await getOrderWithItems(orderId);
    const modal = document.getElementById('order-modal');
    document.getElementById('modal-tail').textContent   = order.tail_number;
    document.getElementById('modal-fbo').textContent    = order.fbo_name;
    document.getElementById('modal-date').textContent   = `${order.delivery_date} · ${order.delivery_time}`;
    document.getElementById('modal-csr').textContent    = order.csr_name;
    document.getElementById('modal-status').className   = `badge badge-${order.status}`;
    document.getElementById('modal-status').textContent = statusLabel(order.status);
    document.getElementById('modal-service').className  = `badge badge-${order.service_type === 'rush' ? 'rush' : 'regular'}`;
    document.getElementById('modal-service').textContent = order.service_type === 'rush' ? 'Rush / Overnight +50%' : 'Regular Service';

    // Items
    const itemsEl = document.getElementById('modal-items');
    if (order.items && order.items.length > 0) {
      itemsEl.innerHTML = order.items.map(i =>
        `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="color:var(--mist);font-size:12px">${i.item_name}</span>
          <span style="color:var(--gold);font-weight:700;font-size:12px">${i.quantity}</span>
        </div>`
      ).join('');
    } else {
      itemsEl.innerHTML = '<span style="color:var(--steel);font-size:12px;font-style:italic">No items specified</span>';
    }

    // Action buttons based on status
    const actions = document.getElementById('modal-actions');
    actions.innerHTML = '';

    if (order.status === 'pending') {
      actions.innerHTML = `
        <button class="btn-success" onclick="handleAccept('${orderId}')">✓ Accept Order</button>
        <button class="btn-danger"  onclick="showRejectPanel('${orderId}')">✕ Reject</button>
        <button class="btn-ghost"   onclick="closeModal()">Close</button>`;
    } else if (order.status === 'accepted') {
      actions.innerHTML = `
        <button class="btn-gold"  onclick="handlePickedUp('${orderId}')">Mark as Picked Up</button>
        <button class="btn-ghost" onclick="closeModal()">Close</button>`;
    } else if (order.status === 'picked_up') {
      actions.innerHTML = `
        <button class="btn-gold"  onclick="handleInTransit('${orderId}')">Start Delivery (GPS)</button>
        <button class="btn-ghost" onclick="closeModal()">Close</button>`;
    } else if (order.status === 'in_transit') {
      actions.innerHTML = `
        <button class="btn-gold"  onclick="closeModal();showView('tracking')">View Live Tracking</button>
        <button class="btn-ghost" onclick="closeModal()">Close</button>`;
    } else {
      actions.innerHTML = `<button class="btn-ghost btn-full" onclick="closeModal()">Close</button>`;
    }

    document.getElementById('reject-panel').style.display = 'none';
    modal.classList.add('open');
  } catch(e) {
    showToast('Error loading order details', 'error');
  }
}

function closeModal() {
  document.getElementById('order-modal').classList.remove('open');
  state.activeOrderId = null;
}

function showRejectPanel(orderId) {
  document.getElementById('reject-panel').style.display = 'block';
  document.getElementById('modal-actions').innerHTML =
    `<button class="btn-danger" onclick="handleReject('${orderId}')">Confirm Rejection</button>
     <button class="btn-ghost"  onclick="document.getElementById('reject-panel').style.display='none'">Cancel</button>`;
}

// ── ORDER ACTIONS ─────────────────────────────────────────
async function handleAccept(orderId) {
  try {
    await acceptOrder(orderId);
    showToast('Order accepted — FBO notified via email', 'success');
    closeModal();
    await loadDashboard();
  } catch(e) { showToast('Error accepting order', 'error'); }
}

async function handleReject(orderId) {
  const reason = document.getElementById('reject-reason').value;
  const notes  = document.getElementById('reject-notes').value;
  if (!reason) { showToast('Please select a rejection reason', 'error'); return; }
  try {
    await rejectOrder(orderId, reason, notes);
    showToast('Order rejected — FBO notified', 'success');
    closeModal();
    await loadDashboard();
  } catch(e) { showToast('Error rejecting order', 'error'); }
}

async function handlePickedUp(orderId) {
  try {
    await markPickedUp(orderId);
    showToast('Marked as Picked Up — FBO notified', 'success');
    closeModal();
    await loadDashboard();
  } catch(e) { showToast('Error updating order', 'error'); }
}

async function handleInTransit(orderId) {
  if (!navigator.geolocation) {
    showToast('GPS not available on this device', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      await markInTransit(orderId, pos.coords.latitude, pos.coords.longitude);
      startGPSTracking(orderId);
      showToast('Delivery started — Live GPS active — FBO notified', 'success');
      closeModal();
      showView('tracking');
      await loadDashboard();
    } catch(e) { showToast('Error starting delivery', 'error'); }
  }, () => {
    showToast('Could not get GPS location. Enable location permissions.', 'error');
  });
}

// ── GPS TRACKING ──────────────────────────────────────────
function startGPSTracking(orderId) {
  if (state.gpsWatchId) navigator.geolocation.clearWatch(state.gpsWatchId);
  state.gpsWatchId = navigator.geolocation.watchPosition(async (pos) => {
    await updateDriverLocation(orderId, pos.coords.latitude, pos.coords.longitude);
    updateMapPin(pos.coords.latitude, pos.coords.longitude);
  }, null, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
}

function stopGPSTracking() {
  if (state.gpsWatchId) {
    navigator.geolocation.clearWatch(state.gpsWatchId);
    state.gpsWatchId = null;
  }
}

// ── TRACKING PAGE ─────────────────────────────────────────
let map = null;
let driverMarker = null;

async function loadTracking() {
  const activeDelivery = state.orders.find(o => o.status === 'in_transit');
  const el = document.getElementById('tracking-content');

  if (!activeDelivery) {
    el.innerHTML = `
      <div style="text-align:center;padding:80px 20px;color:var(--steel)">
        <div style="font-size:40px;margin-bottom:16px">📍</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:0.1em;text-transform:uppercase">
          No active deliveries in transit
        </div>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px;align-items:start">
      <div>
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Live GPS — ${activeDelivery.tail_number} · ${activeDelivery.fbo_name}</div>
            <span class="badge badge-transit">In Transit</span>
          </div>
          <div class="panel-body-flush">
            <div class="map-box"><div id="delivery-map"></div></div>
            <div class="track-stats">
              <div><div class="ts-label">Destination</div><div class="ts-val" style="font-size:13px">${activeDelivery.fbo_name}</div></div>
              <div><div class="ts-label">Status</div><div class="ts-val blue">Live Tracking</div></div>
              <div><div class="ts-label">Delivery By</div><div class="ts-val" style="font-size:13px">${activeDelivery.delivery_time}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-head"><div class="panel-title">Delivery Sign-Off</div></div>
          <div class="panel-body">
            <div class="field" style="margin-bottom:14px">
              <label class="field-label">Delivered By <span class="req">*</span></label>
              <input class="field-input" id="signoff-name" placeholder="Your name" type="text">
            </div>
            <div style="color:var(--steel);font-size:12px;margin-bottom:16px;line-height:1.6">
              Confirm delivery of order for <strong style="color:var(--white)">${activeDelivery.tail_number}</strong> at <strong style="color:var(--white)">${activeDelivery.fbo_name}</strong>
            </div>
            <button class="btn-gold btn-full" onclick="handleSignOff('${activeDelivery.id}')">
              Confirm Delivery
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // Init map
  initMap(activeDelivery.driver_lat || 25.7617, activeDelivery.driver_lng || -80.1918);
}

function initMap(lat, lng) {
  if (!FLYPAL_CONFIG.googleMaps.apiKey || FLYPAL_CONFIG.googleMaps.apiKey.startsWith('YOUR_')) {
    document.getElementById('delivery-map').innerHTML = `
      <div class="map-placeholder-inner">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="rgba(201,168,76,0.4)"/></svg>
        <div class="map-no-key">Google Maps API key not configured.<br>Add your key in js/config.js</div>
      </div>`;
    return;
  }
  if (typeof google === 'undefined') return;
  map = new google.maps.Map(document.getElementById('delivery-map'), {
    center: { lat, lng }, zoom: 13,
    styles: darkMapStyle(),
    disableDefaultUI: true, zoomControl: true
  });
  driverMarker = new google.maps.Marker({
    position: { lat, lng }, map,
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#5DADE2', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    title: 'Driver'
  });
}

function updateMapPin(lat, lng) {
  if (driverMarker) driverMarker.setPosition({ lat, lng });
  if (map) map.panTo({ lat, lng });
}

function darkMapStyle() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1628' }] },
    { elementType: 'labels.text.fill',   stylers: [{ color: '#7a8da3' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2d47' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1b2e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061220' }] }
  ];
}

async function handleSignOff(orderId) {
  const name = document.getElementById('signoff-name')?.value?.trim();
  if (!name) { showToast('Please enter your name', 'error'); return; }
  try {
    stopGPSTracking();
    await signOffDelivery(orderId, name);
    showToast('Delivery confirmed — FBO notified. Order closed.', 'success');
    await loadDashboard();
    showView('dashboard');
  } catch(e) { showToast('Error signing off delivery', 'error'); }
}

// ── REAL-TIME ─────────────────────────────────────────────
function setupRealtimeUpdates() {
  subscribeToOrders(async () => {
    if (state.currentView === 'dashboard') await loadDashboard();
  });
}

// ── UTILS ─────────────────────────────────────────────────
function statusLabel(s) {
  return { pending:'Pending', accepted:'Accepted', picked_up:'Picked Up',
           in_transit:'In Transit', delivered:'Delivered', rejected:'Rejected' }[s] || s;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── MOBILE SIDEBAR ────────────────────────────────────────
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ── LOAD HISTORY ──────────────────────────────────────────
async function loadHistory() {
  try {
    const all = await getOrders();
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    if (all.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--steel);font-style:italic">No orders yet</td></tr>`;
      return;
    }
    tbody.innerHTML = all.map(o => `
      <tr style="cursor:pointer" onclick="openOrderModal('${o.id}')">
        <td><div class="tail">${o.tail_number}</div><div class="sub-text">${formatDate(o.created_at)}</div></td>
        <td><div style="font-size:13px;color:var(--mist)">${o.fbo_name}</div></td>
        <td><div style="font-size:13px;color:var(--white)">${o.delivery_date} · ${o.delivery_time}</div></td>
        <td><div class="sub-text">${o.csr_name}</div></td>
        <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
        <td><span class="badge badge-${o.service_type === 'rush' ? 'rush' : 'regular'}">${o.service_type === 'rush' ? 'Rush' : 'Regular'}</span></td>
      </tr>`).join('');
  } catch(e) {
    console.error('History load error:', e);
  }
}

async function searchHistory(query) {
  try {
    const all = await getOrders();
    const q = query.toLowerCase();
    const filtered = q ? all.filter(o =>
      o.tail_number.toLowerCase().includes(q) ||
      o.fbo_name.toLowerCase().includes(q) ||
      o.csr_name.toLowerCase().includes(q)
    ) : all;
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(o => `
      <tr style="cursor:pointer" onclick="openOrderModal('${o.id}')">
        <td><div class="tail">${o.tail_number}</div></td>
        <td><div style="font-size:13px;color:var(--mist)">${o.fbo_name}</div></td>
        <td><div style="font-size:13px">${o.delivery_date} · ${o.delivery_time}</div></td>
        <td><div class="sub-text">${o.csr_name}</div></td>
        <td><span class="badge badge-${o.status}">${statusLabel(o.status)}</span></td>
        <td><span class="badge badge-${o.service_type === 'rush' ? 'rush' : 'regular'}">${o.service_type === 'rush' ? 'Rush' : 'Regular'}</span></td>
      </tr>`).join('');
  } catch(e) { console.error(e); }
}
