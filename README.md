# FLYPAL — Aviation Linen Order Management System
## Setup Guide (No coding knowledge required)

---

## STEP 1 — Create your Supabase database (5 minutes)

1. Go to **supabase.com** and create a free account
2. Click **"New Project"** — give it a name like "flypal"
3. Choose a region close to Florida (US East)
4. Wait ~2 minutes for it to set up
5. Once ready, click **"SQL Editor"** in the left menu
6. Copy the entire contents of **`supabase_setup.sql`** and paste it
7. Click **"Run"** — you should see "Success"
8. Go to **Settings → API** and copy:
   - **Project URL** (looks like: https://xxxx.supabase.co)
   - **anon / public key** (long text starting with eyJ...)

---

## STEP 2 — Configure your credentials

Open the file **`js/config.js`** in any text editor (Notepad is fine) and fill in:

```javascript
supabase: {
  url:     'paste your Project URL here',
  anonKey: 'paste your anon key here'
},
googleMaps: {
  apiKey: 'paste your Google Maps API key here'
},
ghl: {
  orderNew:       'paste GHL webhook URL here',
  orderAccepted:  'paste GHL webhook URL here',
  orderRejected:  'paste GHL webhook URL here',
  orderPickedUp:  'paste GHL webhook URL here',
  orderInTransit: 'paste GHL webhook URL here',
  orderDelivered: 'paste GHL webhook URL here'
}
```

Save the file.

---

## STEP 3 — Get your Google Maps API Key (~10 minutes)

1. Go to **console.cloud.google.com**
2. Create a new project called "flypal"
3. Go to **APIs & Services → Enable APIs**
4. Enable: **Maps JavaScript API**
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy the key and paste it in `js/config.js`

---

## STEP 4 — Set up GHL Webhooks (one per event)

You need to create **6 separate workflows** in GHL:

1. In GHL: **Automation → Workflows → New Workflow**
2. Set Trigger: **"Inbound Webhook"**
3. Add your actions (send email, send SMS, etc.)
4. Copy the webhook URL and paste it in `js/config.js`
5. Repeat for all 6 events:
   - `orderNew` — fires when FBO places an order
   - `orderAccepted` — fires when you press Accept
   - `orderRejected` — fires when you press Reject
   - `orderPickedUp` — fires when you mark as Picked Up
   - `orderInTransit` — fires when you start delivery (includes GPS tracking link)
   - `orderDelivered` — fires when you complete delivery sign-off

---

## STEP 5 — Deploy to hosting (Railway, ~10 minutes)

1. Go to **railway.app** and create a free account
2. Click **"New Project" → "Deploy from GitHub"**
3. Upload this entire `flypal` folder to a GitHub repo first
4. Railway will auto-detect it and deploy
5. You get a free URL like: **flypal.railway.app**

**OR** for the absolute simplest option:
- Use **Netlify Drop**: go to **app.netlify.com/drop**
- Drag and drop the entire `flypal` folder
- You get a live URL instantly — no account needed to test

---

## FILES IN THIS PROJECT

```
flypal/
├── index.html          ← The entire app (open this to run it)
├── css/
│   └── app.css         ← All styles
├── js/
│   ├── config.js       ← YOUR CREDENTIALS GO HERE
│   ├── db.js           ← Database + webhook logic
│   └── app.js          ← All app logic
├── supabase_setup.sql  ← Run this once in Supabase
└── README.md           ← This file
```

---

## QUICK TEST (before setting up everything)

You can open `index.html` directly in your browser right now to see the app running. The database won't work until you add your Supabase credentials, but the design and navigation will be fully visible.

---

## SUPPORT

Questions: easy2crew@gmail.com | (305) 306-0888
