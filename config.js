// ═══════════════════════════════════════════════════════════
//  FLYPAL — CONFIGURATION
//  Fill in your credentials here when you have them
// ═══════════════════════════════════════════════════════════

const FLYPAL_CONFIG = {

  // ── SUPABASE ─────────────────────────────────────────────
  // Get these from: supabase.com → Your Project → Settings → API
  supabase: {
    url:    'https://uhmyylmdllrsqubxwgqn.supabase.co',   // e.g. https://xxxx.supabase.co
    anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobXl5bG1kbGxyc3F1Ynh3Z3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NDIyMjcsImV4cCI6MjA5MTAxODIyN30.geuo7VGVycxIebmdsKOsQKecL_22AzeTXwItsMp0Zcw'       // starts with eyJ...
  },

  // ── GOOGLE MAPS ──────────────────────────────────────────
  // Get this from: console.cloud.google.com → Maps JavaScript API
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY'
  },

  // ── GO HIGH LEVEL WEBHOOKS ───────────────────────────────
  // In GHL: Automation → New Workflow → Trigger: Inbound Webhook → Copy URL
  // Create one webhook per event below
  ghl: {
    orderNew:       'YOUR_GHL_WEBHOOK_NEW_ORDER',
    orderAccepted:  'YOUR_GHL_WEBHOOK_ACCEPTED',
    orderRejected:  'YOUR_GHL_WEBHOOK_REJECTED',
    orderPickedUp:  'YOUR_GHL_WEBHOOK_PICKED_UP',
    orderInTransit: 'YOUR_GHL_WEBHOOK_IN_TRANSIT',
    orderDelivered: 'YOUR_GHL_WEBHOOK_DELIVERED'
  },

  // ── APP SETTINGS ─────────────────────────────────────────
  app: {
    name:    'Flypal',
    tagline: 'Aviation Linen Services',
    phone:   '(305) 306-0888',
    email:   'easy2crew@gmail.com'
  }
};
