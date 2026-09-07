# SUPER AGENT RUN — User Guide

A **Super Mario-style benchmark AI-learning game** for customer meetings and workshops.

Players run through a level, meet work pain points (as enemies and bosses), and defeat them by choosing the **"manual way vs. AI way"** — always picking the AI way — while collecting coins. Every correct answer reveals a real Salesforce product screen (Agentforce, Slack, Sales Cloud, Tableau, Data Cloud, and more), and final scores compete on a live leaderboard.

The game makes an abstract pitch — *"AI beats manual work"* — physical and memorable: the audience *feels* the difference instead of just hearing it, and walks away having seen the actual product for each of their own pain points.

This guide is organized around three roles:

- **① Admin** — sets up and deploys the game before the meeting and prepares questions and images
- **② Host** — runs the game live on stage and shows the leaderboard on the big screen
- **③ Player** — the workshop attendee who actually plays

Screen URLs (assuming the deployment lives at `https://super-agent-run.vercel.app`):

| Role | Screen | URL |
|---|---|---|
| Player | Game | `/index-general7` |
| Host | Live leaderboard | `/admin` |
| Admin | Question & image back office | `/backoffice` |

---

## ① Admin — Setup Before the Meeting

### A. Deployment (one time)
1. Deploy this folder to a Vercel account. (Vercel CLI: from the folder, `npm install` → `npx vercel` → `npx vercel --prod`.)
2. **Connect storage (Upstash Redis) — required.** Vercel dashboard → project → **Storage** → **Create Database** → **Upstash Redis (KV)** → connect it to the project → **redeploy once**.
   - Connecting it auto-injects the `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables.
   - Without storage, the game still plays, but **question edits, image uploads, and the leaderboard will not persist.**
3. (Optional) To change the admin password, set the Vercel env var `RESET_PIN`. If unset, the default is **`salesforce`**. (It is shared by back-office login and leaderboard reset.)

### B. Pre-meeting checklist
- [ ] In `/backoffice`, **review and tailor the question wording** for this audience (see ⑥ below).
- [ ] In `/backoffice`, swap in the latest **product-screen images** per category (see ⑦ below).
- [ ] In `/admin`, **reset the leaderboard** to clear test scores (see ⑧ below).
- [ ] Prepare a **QR code / short link** for players (pointing to the `/index-general7` URL).
- [ ] Confirm `/admin` loads on the host laptop / big screen.

---

## ② Host — Running It Live

### Put the leaderboard on the big screen
1. On the host laptop, open `/admin` → full screen (F11).
2. The leaderboard **auto-refreshes every 1.5 seconds** — no reloading needed, player scores climb in real time.
3. The **category poll** at the bottom also displays live (players vote for the pain point that resonated most after finishing).

### Suggested script for players
> "From now on you run like Mario. As you run, you meet **work pain points (the enemies)**. When you do, two choices pop up — **'the manual way vs. the AI way.'** Pick the **AI way** to defeat the pain point and earn coins. Get it right and a real Salesforce screen appears. You have ~10 minutes to retry as much as you like, and your **personal best** is what shows up on the ranking screen up front!"

### Operating tips
- Give players **one game URL only** (`/index-general7`) for fair score comparison.
- Retries are unlimited. Replaying under the same nickname keeps **only the highest score** on the ranking.
- On desktop (laptop, landscape screen), a **Salesforce product-screen panel** appears on the right. It is the key device for building product familiarity, so encourage laptop players to open the window wide.

---

## ③ Player — How to Play

1. Open the game URL → **enter a nickname** → start.
2. Your character **runs automatically.** All you do is **jump.**
   - **Jump:** **tap** the screen (mobile) or **click / Space / ↑** (PC). **Tap repeatedly** to jump multiple times.
3. Grab **coins**, and hit the floating **? blocks** from below to get **items** (mushroom, flower, star).
4. **Stomp enemies from above** to defeat them and earn coins. Bumping them from the side hurts you.
5. When you meet a **work pain point (boss)**, a question appears. Pick **"✅ AI way"** — the correct answer → defeat the pain point, earn coins, and reveal the real Salesforce screen. **"✖ Manual way"** is wrong.
6. Reach the flag for **COURSE CLEAR!** Your final score is posted to the leaderboard.

---

## ④ Game Rules

- **Goal:** run to the flag at the end of the course, collect as many coins as possible, and solve every work pain point the AI way.
- **Controls:** auto-run + tap/click/Space/↑ to jump (multi-jump allowed). There are no other controls.
- **Lives (❤):** start with 3.
  - Hit by an enemy while big (mushroom/flower) → shrink to small (keep the life)
  - Hit while small → lose 1 life
  - Lives reach 0 → **GAME OVER**
  - Eat a **star** for brief invincibility
  - **+1 life every 100 coins**
- **Questions per run:** **7.** One question from each of the 6 categories (My Work Automation, Collaboration, Sales, Market & Account Research, Data Analytics, Data Integration) **plus 1 random bonus**, so every category shows up each run.
- **Question format:** at each boss, a two-choice "manual way (wrong) vs. AI way (correct)." Choosing the correct answer defeats the boss and reveals that category's Salesforce product screen in the desktop panel.
- **End conditions:** reach the flag (finish) or run out of lives (game over). There is no time limit.

---

## ⑤ Scoring

### Coins earned during play
| Action | Points |
|---|---|
| Pick up 1 coin | **+1 🪙** |
| Collect an item (mushroom/flower/star) | **+2 🪙** |
| Stomp an enemy (Goomba/Koopa) | **+2 🪙** |
| Pain-point question **correct (AI way)** | **+8 🪙** |
| Pain-point question wrong (manual way) | 0 (boss disappears but no coins) |

### End-of-game bonuses
| Item | Points |
|---|---|
| Finish bonus (reach the flag) | **+20 🪙** (none on game over) |
| Remaining-lives bonus | **remaining ❤ × 10 🪙** |

### Final score
```
Final score = (coins collected during play) + finish bonus + (remaining lives × 10)
```

- The final score is submitted to the leaderboard. **Only the personal best per nickname (per device)** is kept on the ranking.
- During play, the current coin total is sent about every 2 seconds, so progress shows live on the host screen.
- The leaderboard shows up to 50 players, highest first.

---

## ⑥ Editing Questions in the Back Office

1. Open `/backoffice` → enter the admin password (**`salesforce`**, or your `RESET_PIN`).
2. The 18 questions appear **grouped by category.** For each question you can edit:
   - **Scene** — the short setup shown as "⚠ Scene" in the game
   - **Question** — the work pain-point question
   - **✅ AI way (correct)** — the choice that must be the correct answer
   - **✖ Manual way (wrong)** — the choice that is the wrong answer
   - **Category / Enemy character** — change via dropdown
3. The **💾 Save** button at the bottom → takes effect in the game immediately (applied from the next play).
4. The **Restore Defaults** button → discards your saved edits and returns to the default 18 questions.

> Saving requires connected storage (Upstash Redis). Without it, a warning shows at the top and only preview is available.

---

## ⑦ Changing Product-Screen Images in the Back Office

You can swap the **Salesforce product-screen image** that appears in the right-hand desktop panel on a correct answer, per category.

1. Open `/backoffice` (same as above).
2. In each category's **"🖥️ Product screen shown on a correct answer"** slot:
   - **Upload / Replace** — pick an image file (PNG/JPEG/WebP). On upload, the browser **automatically resizes (long edge 1400px) and compresses** it before saving, so any size works. **Landscape (16:10) recommended.**
   - **Delete** — removing an uploaded image brings back the **temporary mockup (SVG).**
3. Uploads take effect in the game immediately. Display priority is **uploaded image → temporary mockup → color fallback.**
4. Images are managed **per category** and shared across every question in that category.

Category and default product mapping:

| Code | Category | Featured products |
|---|---|---|
| PROD | My Work Automation | Agentforce / Slack |
| COL | Collaboration | Slack |
| SALES | Sales | Sales Cloud |
| MKT | Market & Account Research | Agentforce / Sales Cloud |
| DA | Data Analytics | Tableau |
| DF | Data Integration | Data Cloud / MuleSoft / Informatica |

---

## ⑧ Resetting the Leaderboard

1. Open `/admin`.
2. Click the **🗑 Reset Leaderboard** button in the admin area at the bottom.
3. Enter the admin password (**`salesforce`**, or your `RESET_PIN`) in the **PIN prompt**.
4. Once confirmed, the leaderboard is cleared immediately.

> Resetting once before a fresh meeting/workshop clears prior test and practice scores. A reset cannot be undone.

---

## Appendix — File Overview

| File | Role |
|---|---|
| `index-general7.html` | **Main game** (player screen + desktop product panel) |
| `admin.html` | Live leaderboard (host / big screen) |
| `backoffice.html` | Question & image editor (admin) |
| `api/questions.js` | Store/fetch questions |
| `api/images.js` | Store/fetch per-category product images |
| `api/score.js` | Submit scores, leaderboard, reset |
| `api/vote.js` | Post-game category poll |
| `products/*.svg` | 6 temporary product-screen mockups |

> To take over the game and edit/deploy the code yourself, see `HANDOFF.md`.
