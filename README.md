# 🔖 Twitter Bookmarks Canvas

An infinite canvas to explore all your Twitter/X bookmarks — automatically categorized by topic.

## Setup

### 1. Get Twitter API Credentials

1. Go to [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app (Free tier works)
3. In your app settings, set **Type of App** to "Web App, Automated App or Bot"
4. Under **User authentication settings**, enable OAuth 2.0
5. Set **Callback URI** to: `http://localhost:3001/auth/callback`
6. Set **Website URL** to: `http://localhost:5173`
7. Scopes needed: `bookmark.read`, `tweet.read`, `users.read`, `offline.access`
8. Copy your **Client ID** and **Client Secret**

### 2. Configure the Server

Edit `server/.env`:
```
TWITTER_CLIENT_ID=your_client_id_here
TWITTER_CLIENT_SECRET=your_client_secret_here
TWITTER_REDIRECT_URI=http://localhost:3001/auth/callback
SESSION_SECRET=any_random_string
PORT=3001
```

### 3. Run the App

**Terminal 1 — Start the server:**
```bash
cd server
node index.js
```

**Terminal 2 — Start the client:**
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your Twitter account!

## Features

- **Infinite Canvas** — All bookmarks float on a draggable, zoomable canvas
- **Auto-categorized** — AI categorizes bookmarks into Design, Tech, Music, Writing, Food, Travel, Fitness, Art, Business, Learning, and Entertainment
- **Search** — Full-text search across all bookmarks
- **Category Filters** — Filter by category with pill buttons
- **Drag Cards** — Rearrange bookmarks freely on the canvas
- **One-click Sync** — Fetch new bookmarks from Twitter anytime

## Controls

- **Drag** on empty space to pan
- **Scroll** to zoom in/out
- **Double-click** to reset view
- **Drag cards** to rearrange them
- **Click ↗** on a card to open the original tweet
