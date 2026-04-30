# 🎧 Mixtape Feature Refactor — Seamless + Emotional UX

Refactor the existing Mixtape feature into a **single-flow, handcrafted experience**.

This should feel like creating something personal — not filling a form.

---

## ❗ CORE CHANGE (IMPORTANT)

REMOVE the separate:

👉 "Create Spotify Playlist" button

---

## 🎯 NEW FLOW

When user clicks:

👉 "+ save mixtape"

The system should:

1. Save mixtape to database
2. If Spotify is connected:
   - Automatically create a Spotify playlist
   - Add all tracks to the playlist
   - Save the playlist URL in the database

No extra clicks. No extra steps.

---

## 🧠 DATA FLOW

After playlist creation:

Update `mixtapes` table:

- `spotify_playlist_url = playlist.external_urls.spotify`

---

## 🧩 ADMIN UI (Editor)

In `MixtapeEditor.tsx`:

### REMOVE:
- "Create Spotify Playlist" button completely

### UPDATE:
- Save button now handles:
  - DB save
  - Spotify playlist creation

### ADD:
- Loading state:
  → "recording your tape..."

### OPTIONAL:
- If Spotify not connected:
  → still allow save
  → show subtle message:
    "saved locally — connect Spotify to bring it to life"

---

## 🎨 PUBLIC VIEW — CASSETTE DESIGN

Mixtapes should be displayed as **cassette tape cards**

---

## 🎞️ VISUAL REFERENCE

![cassette reference](https://raw.githubusercontent.com/blkluv/mixt-ape/master/public/images/mixtape-btc.png)

---

### ⚠️ IMPORTANT DESIGN RULES

Use the image ONLY for inspiration.

Focus on:
- cassette structure (body, reels, label area)
- layout proportions
- playful nostalgic feel

DO NOT:
- copy pixel art style directly
- use harsh edges or retro pixel fonts
- replicate exact colors

---

## 💿 CASSETTE CARD CONTENT

Each cassette should display:

- mixtape title
- optional description
- number of songs

---

## ▶️ PLAY BUTTON (CRITICAL FEATURE)

Each cassette must include a **play button (bottom-right)**

### Behavior:

If `spotify_playlist_url` exists:
→ open playlist in new tab

If not:
→ show disabled state

---

## 🧠 INTERACTION DESIGN

- hover → slight lift + soft shadow
- click → smooth interaction
- overall feel → soft, romantic, scrapbook-like

---

## 🧩 COMPONENT UPDATE

Update:

`src/components/mixtape/MixtapeCassette.tsx`

Add:

- `handleOpen()` → opens Spotify link
- conditional play button

---

## 🧱 ARCHITECTURE RULES

- reuse existing Spotify API logic
- do NOT duplicate playlist logic
- keep components modular
- do NOT break scrapbook editor or other features

---

## ✅ EXPECTED RESULT

### Admin:

1. Add songs
2. Arrange them
3. Click save
4. Done — playlist automatically created

---

### Public:

1. Sees cassette tapes
2. Clicks play button
3. Spotify playlist opens

---

## 🎯 GOAL

This should feel like:

👉 “I made you something”  
—not—  
👉 “I configured a playlist”

---

## 📦 OUTPUT

Show:

1. Updated save logic (combined flow)
2. Removed playlist button
3. Updated cassette UI component
4. How playlist URL is stored and used

---

## ✨ FINAL NOTE

Keep everything minimal, emotional, and intentional.

This is not a tool.

This is a **memory object**.