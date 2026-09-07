# SUPER AGENT RUN — Handoff Guide

For anyone taking over the game to **edit and deploy it themselves**.
With this whole folder (`super-agent-run-eng-ver/`), you can modify the entire game and deploy it to a new Vercel account.

---

## 1. What to hand over

Hand over the **entire `super-agent-run-eng-ver/` folder.** Notes on the contents:

| Include | File/folder | Description |
|---|---|---|
| ✅ | `index-general7.html` | **The main game used in the workshop** (includes the desktop product-screen panel). This is the file to edit. |
| ✅ | `admin.html` | Admin leaderboard (for the big screen) |
| ✅ | `backoffice.html` | Question & product-image editor (change questions/images with no code) |
| ✅ | `api/` | 4 serverless functions (`questions.js` questions, `images.js` product images, `score.js` scores, `vote.js` poll) |
| ✅ | `products/` | 6 temporary product-screen mockups (SVG) + `preview.html` |
| ✅ | `package.json`, `vercel.json` | Dependencies & deploy config |
| ✅ | `title.png` | Optional splash image (see note below) |
| ❌ | `.vercel/` | **Do not hand this over.** It links to the original Vercel project; the recipient must connect their own account. (It is auto-created when you run `npx vercel`.) |
| ❌ | `node_modules/` | Exclude it if present. `npm install` regenerates it. |

> **Most important:** the **environment variables (Upstash Redis credentials) are not in the files.** They live in the Vercel project settings, so the recipient must **connect their own Upstash storage** for questions, images, and scores to persist. (Gameplay itself works without it.)

---

## 2. Deployment steps for the recipient

Prerequisites: Node.js, a free Vercel account.

```bash
# 1) Move into the folder and install dependencies
cd super-agent-run-eng-ver
npm install

# 2) Link to your own Vercel project + deploy
npx vercel            # After logging in, create a new project (Enter through the prompts)
npx vercel --prod     # Production deploy
```

### Connect storage (Upstash Redis) — required for saving questions/images/scores
Vercel dashboard → your project → **Storage** tab → **Create Database** → select **Upstash Redis (KV)** → connect it to the project.
Connecting it auto-injects the env vars below. Then **redeploy once** (`npx vercel --prod`).

- `KV_REST_API_URL` (or `UPSTASH_REDIS_REST_URL`)
- `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`)
- (Optional) `RESET_PIN` — the back-office/reset password. Defaults to `salesforce` if unset.

> Without storage, the game plays but question edits, image uploads, and the leaderboard won't work.

---

## 3. What you can change without code (after deploy, from the web)

- **Edit questions:** open `/backoffice.html` → password (`salesforce`) → edit the 18 question texts and save.
- **Product-screen images:** in the same back office, upload/replace/delete images per category. Uploads apply to the game immediately (replacing the temporary mockup).
- **Reset leaderboard:** enter the PIN on `/admin.html`.

---

## 4. To edit the game code itself (`index-general7.html`)

This single file contains **HTML + CSS + game logic (JS)** all together. There is no build step — open the file in a browser to test, then save and redeploy. Key locations:

- **Default questions (18):** the fallback used when there is no server-stored version is the `DEFAULTS` array in `api/questions.js`. (Day to day, edit in the back office.)
- **Category definitions:** the `CATS` / `CAT_ORDER` objects in `index-general7.html` and `backoffice.html` (6 codes: PROD/COL/SALES/MKT/DA/DF — colors, emoji, product names).
- **Questions per run:** the question-count constants near the top of the file.
- **Desktop product panel:** the `PANEL` controller and `prodImgCandidates()` function inside `index-general7.html`. Image priority is **uploaded image → `products/CAT.png` → `products/CAT.svg` → color fallback.**
- **Product-screen mockups:** `products/PROD.svg`, etc. The browser renders the SVGs directly, so they are editable by hand.
- **Title / splash screen:** the intro shows a **styled text title** ("SUPER AGENT RUN / SALESFORCE") built in HTML/CSS — the `#introFallback` block near the top of `index-general7.html`. This is the default so the branding is always correct and crisp. To use a custom splash image instead, add an `<img id="introImg" src="your-title.png">` inside the `#intro` splash (a placeholder comment marks the spot); the code hides the text title while your image loads and restores it if the image is missing. Make sure any custom image reads "SUPER AGENT RUN."

> Tip: to sanity-check syntax, open the file in a browser and confirm there are no errors in the dev-tools console.

---

## 5. Handoff checklist

- [ ] Deliver the `super-agent-run-eng-ver/` folder (excluding `.vercel/`, `node_modules/`)
- [ ] Tell them "the main game is `index-general7.html`"
- [ ] Explain "after deploy, connect Upstash Redis (KV) **to your own account** for saving to work"
- [ ] Share the back-office/reset password (`salesforce`, or a newly chosen `RESET_PIN`)
