// ═══════════════════════════════════════════════════════════
//  FLYPAL — DATABASE LAYER (Native Fetch, No CDN)
// ═══════════════════════════════════════════════════════════

function dbUrl(path) {
  return FLYPAL_CONFIG.supabase.url + '/rest/v1/' + path;
}

function dbHeaders(extra = {}) {
  return {
    'apikey': FLYPAL_CONFIG.supabase.anonKey,
    'Authorization': 'Bearer ' + FLYPAL_CONFIG.supabase.anonKey,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra
  };
}

async function dbGet(table, params = '') {
  const res = await fetch(dbUrl(table + '?' + params), {
    headers: dbHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbPost(table, body) {
  const res = await fetch(dbUrl(table), {
    method: 'POST',
    headers: dbHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbPatch(table, id, body) {
  const res = await fetch(dbUrl(table + '?id=eq.' + id), {
    method: 'PATCH',
    headers: dbHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── GHL WEBHOOK ───────────────────────────────────────────
async function sendGHLWebhook(url, payload) {
  if (!url || url.startsWith('YOUR_')) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch(e) { console.warn('GHL webhook error:', e); }
}

// ── ORDERS ────────────────────────────────────────────────
async function createOrder(data, items) {
  const orders = await dbPost('orders', {
    tail_number:   data.tailNumber,
    fbo_name:      data.fboName,
    arriving_date: data.arrivingDate,
    delivery_date: data.deliveryDate,
    delivery_time: data.deliveryTime,
    csr_name:      data.csrName,
    special_notes: data.specialNotes || null,
    service_type:  data.serviceType,
    rush_reason:   data.rushReason || null,
    status:        'pending'
  });
  const order = Array.isArray(orders) ? orders[0] : orders;

  const itemRows = items.filter(i => i.quantity > 0).map(i => ({
    order_id:  order.id,
    category:  i.category,
    item_name: i.name,
    quantity:  i.quantity
  }));
  if (itemRows.length > 0) await dbPost('order_items', itemRows);

  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderNew, {
    event: 'new_order', orderId: order.id,
    tailNumber: data.tailNumber, fboName: data.fboName,
    deliveryDate: data.deliveryDate, deliveryTime: data.deliveryTime,
    csrName: data.csrName, serviceType: data.serviceType
  });
  return order;
}

async function getOrders(statusFilter = null) {
  let params = 'order=created_at.desc';
  if (statusFilter) params += '&status=eq.' + statusFilter;
  return dbGet('orders', params);
}

async function getOrderWithItems(orderId) {
  const orders = await dbGet('orders', 'id=eq.' + orderId);
  const order = orders[0];
  const items = await dbGet('order_items', 'order_id=eq.' + orderId);
  return { ...order, items };
}

async function updateOrderStatus(orderId, status, extra = {}) {
  const tsField = {
    accepted: 'accepted_at', rejected: 'rejected_at',
    picked_up: 'picked_up_at', in_transit: 'in_transit_at',
    delivered: 'delivered_at_ts'
  }[status];
  const body = { status, ...extra };
  if (tsField) body[tsField] = new Date().toISOString();
  const result = await dbPatch('orders', orderId, body);
  return Array.isArray(result) ? result[0] : result;
}

async function acceptOrder(orderId) {
  const order = await updateOrderStatus(orderId, 'accepted');
  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderAccepted, {
    event: 'order_accepted', orderId,
    tailNumber: order.tail_number, fboName: order.fbo_name
  });
  return order;
}

async function rejectOrder(orderId, reason, notes = '') {
  const order = await updateOrderStatus(orderId, 'rejected', {
    rejection_reason: reason, rejection_notes: notes
  });
  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderRejected, {
    event: 'order_rejected', orderId,
    tailNumber: order.tail_number, fboName: order.fbo_name,
    rejectionReason: reason
  });
  return order;
}

async function markPickedUp(orderId) {
  const order = await updateOrderStatus(orderId, 'picked_up');
  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderPickedUp, {
    event: 'order_picked_up', orderId,
    tailNumber: order.tail_number, fboName: order.fbo_name
  });
  return order;
}

async function markInTransit(orderId, lat, lng) {
  const order = await updateOrderStatus(orderId, 'in_transit', {
    tracking_active: true, driver_lat: lat, driver_lng: lng
  });
  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderInTransit, {
    event: 'order_in_transit', orderId,
    tailNumber: order.tail_number, fboName: order.fbo_name,
    trackingUrl: 'https://www.google.com/maps?q=' + lat + ',' + lng
  });
  return order;
}

async function updateDriverLocation(orderId, lat, lng) {
  await dbPatch('orders', orderId, { driver_lat: lat, driver_lng: lng });
}

async function signOffDelivery(orderId, deliveredBy) {
  const order = await updateOrderStatus(orderId, 'delivered', {
    delivered_by: deliveredBy, delivered_at: new Date().toISOString(),
    tracking_active: false
  });
  await sendGHLWebhook(FLYPAL_CONFIG.ghl.orderDelivered, {
    event: 'order_delivered', orderId,
    tailNumber: order.tail_number, fboName: order.fbo_name,
    deliveredBy
  });
  return order;
}

// ── RUSH DETECTION ────────────────────────────────────────
function detectRush(deliveryDate, deliveryTime) {
  const deliveryMs = new Date(deliveryDate + 'T' + deliveryTime).getTime();
  const nowMs = Date.now();
  const hoursUntil = (deliveryMs - nowMs) / 3600000;
  const dayOfWeek = new Date(deliveryDate).getDay();
  const year = new Date().getFullYear();
  const holidays = [
    year+'-01-01', year+'-07-04', year+'-11-11',
    year+'-12-25', year+'-11-28'
  ];
  const isHoliday = holidays.includes(deliveryDate);
  if (hoursUntil <= 24) return { isRush: true, reason: 'under_24h', label: 'Delivery within 24 hours' };
  if (dayOfWeek === 0)  return { isRush: true, reason: 'sunday',    label: 'Sunday delivery' };
  if (isHoliday)        return { isRush: true, reason: 'holiday',   label: 'Federal holiday delivery' };
  return { isRush: false, reason: null, label: null };
}

// ── REALTIME (polling fallback since no CDN) ──────────────
function subscribeToOrders(callback) {
  setInterval(async () => {
    try { callback(); } catch(e) {}
  }, 15000);
}
