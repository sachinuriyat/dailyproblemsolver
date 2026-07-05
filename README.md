# Relay — setup & hosting guide

A global Q&A board: anyone posts a problem in any field, anyone anywhere can answer it.
It's a static site (index.html + styles.css + app.js) that talks to a free Supabase database. No backend server to run yourself.

## Files
- `index.html` — page shell
- `styles.css` — design
- `app.js` — all the logic (routing, posting, loading, answering)
- `config.js` — **you edit this** with your own database keys
- `supabase-schema.sql` — run once to create your tables

## 1. Create the database (Supabase, free tier)
1. Go to https://supabase.com → sign up → **New project**. Pick any name/region, set a DB password (save it somewhere).
2. Wait ~2 min for it to spin up.
3. Left sidebar → **SQL Editor** → **New query** → paste the entire contents of `supabase-schema.sql` → **Run**.
4. Left sidebar → **Project Settings → API**. Copy:
   - **Project URL**
   - **anon public** key
5. Open `config.js` and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

That's the whole backend. Test locally first — just double-click `index.html`, or run a quick local server:
```bash
cd anysolve
python3 -m http.server 8080
```
Open `http://localhost:8080`, post a test question, check it shows up in Supabase's **Table Editor**.

## 2. Host it (pick one — all free)

### Option A: Netlify (easiest, drag-and-drop)
1. Go to https://app.netlify.com/drop
2. Drag the whole `anysolve` folder onto the page.
3. Done — you get a live URL like `random-name.netlify.app` in seconds.
4. To use your own domain: **Site settings → Domain management → Add a domain**.

### Option B: Vercel
1. `npm i -g vercel` (needs Node.js installed)
2. `cd anysolve && vercel` → follow prompts → it deploys and gives you a URL.
3. `vercel --prod` for the production URL.

### Option C: GitHub Pages (good if you want it tied to a repo you can keep improving)
1. Push the `anysolve` folder to a new GitHub repo.
2. Repo → **Settings → Pages** → Source: `main` branch, `/ (root)`.
3. Your site is live at `https://yourusername.github.io/reponame`.

### Option D: Cloudflare Pages
1. https://pages.cloudflare.com → connect your GitHub repo (or direct upload) → deploy.
2. Free, fast, easy custom domains later.

Any of these is fine for a first version — they're all static hosts, and this site has no server code, so it "just works" on all of them. Netlify or Vercel are the fastest to get live in the next 5 minutes.

## 3. Custom domain (optional, later)
Buy a domain (Namecheap, Porkbun, Cloudflare Registrar — cheap and no markup), then in your host's dashboard point it at your site (usually just adding a CNAME record). Each host above has a "Domains" section with exact steps once you're there.

## Current limitations (v1, on purpose — keep it simple first)
- No login — anyone can type any name. Fine for launch, but people can impersonate others.
- No edit/delete, no upvotes, no notifications, no image uploads.
- No spam protection.

Tell me which of these you want next (accounts/login, upvotes, email notifications when someone answers, image attachments, comment threads, reputation/badges, categories page, etc.) and I'll build it into these same files.
