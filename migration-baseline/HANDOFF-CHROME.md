# Handoff to Claude in Chrome: pre-cutover SEO crawl

The cloud session can't reach `911electrics.com` or the new Vercel deployment
(its network proxy refuses both hosts), so the two crawls run in the user's own
Chrome. The comparison, the write-up and the commit happen back in the cloud
session.

**Read-only.** Only GET requests, which the script makes itself. Don't submit a
form, don't sign in to Studio, and don't click anything on either site.

## What to run

The script is [`browser-crawl.js`](browser-crawl.js) on branch
`claude/adoring-goldberg-d583ag` of `911electrics/911electrics`. It's a browser
port of `scripts/seo-crawl.mjs crawl`. It fetches each path same-origin
(6 at a time, about 600 paths) and downloads a TSV in the same format.

1. **Live site.** Open a tab on `https://911electrics.com/`. Run the whole
   contents of `browser-crawl.js` in that tab, then run:

   ```js
   await seoCrawl('crawl-live')
   ```

   It downloads `crawl-live.tsv` and returns a summary object. Keep the summary.

2. **New deployment.** Open a tab on
   `https://911electrics-cntkjc49z-info911electrical-4885.vercel.app/`. The page
   itself may show Vercel's login screen. That's fine, because only the origin
   matters. Run the script contents again, then run:

   ```js
   await seoCrawl('crawl-new', '<bypass secret the user gives you>')
   ```

   The secret goes only into that call. Don't write it anywhere else.

3. **Spot checks.** In each tab, run:

   ```js
   await (await fetch('/robots.txt', { cache: 'no-store' })).text()
   ```

   Keep both outputs.

## What to bring back

Either of these works:

- **Upload the files to GitHub (preferred).** On github.com, open
  `911electrics/911electrics`. Switch to branch `claude/adoring-goldberg-d583ag`,
  go to `migration-baseline/` and choose **Add file → Upload files**. Upload
  `crawl-live.tsv` and `crawl-new.tsv`, and commit directly to that branch,
  never to `main`.
- **Or attach the files to the cloud session's chat.**

Also bring both summary objects and both `robots.txt` outputs, pasted into the
chat.

## Known differences from the Node crawler

Both runs share these limits, so the diff still compares like with like:

- **Redirects.** Browsers hide redirect responses. A redirect shows as status
  `3xx`, and `location` holds the final path after every hop. It doesn't
  distinguish 301 from 308 or show how long the chain is.
- **Inventory.** The paths are each origin's own sitemap, plus the legacy and
  ranking paths built into the script. The script doesn't use `--paths-from`.
  A live path missing from the new sitemap shows in the diff as `MISSING`, not
  as a 404.
