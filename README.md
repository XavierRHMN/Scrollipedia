# Scrollipedia

Scroll through real Wikipedia topics, explore a connected mindmap, and save discoveries and paths. Built with Next.js App Router, React, TypeScript, Tailwind, shadcn-style Radix buttons, React Flow, and Lucide.

The layout extends the supplied Xikipedia reference: a 600px continuous feed, small bold titles, source summaries followed by inline images, thin post dividers, blue actions, desktop side navigation, and a flat mobile bottom bar. System light/dark preferences are respected. Explore and Library use the same visual language. Images open in a native dialog for closer viewing.

Discovery mixes illustrated random Wikipedia articles with source-linked candidates from chosen interests, saved topics, and recent explorations. Gemini ranks real candidates and rewrites their introductions in simple language; every post is capped at 45 words. At least two random discoveries are retained when available. English posts use matching Simple Wikipedia introductions found through Wikidata IDs; Arabic posts, articles, and mind maps use Arabic Wikipedia. Missing providers or source failures leave short source-based reads available. Recently seen IDs prevent repeats. The source pool retains unused candidates, shares concurrent refills, and can serve cached articles during a rate limit.

Each post has an options menu with Not interested and Undo. Hidden topics are excluded from later batches and help Gemini avoid similar recommendations. Loaded posts and scroll position stay in memory when navigating between pages; reloading the document starts a fresh feed. On phones, pull down at the top and release to refresh. Changing interests or resetting discovery also starts a new feed.

## Languages

Settings supports English, Arabic, and Bangla for both the interface and Wikipedia content. Arabic uses a right-to-left layout. Bangla uses Bengali Wikipedia and Bengali Gemini summaries; its narration uses Eleven v3 because Flash does not support Bengali (override with `ELEVENLABS_MODEL_BN`). Saved topics and caches include language in their identity; cross-language exploration resolves matching Wikipedia articles through interlanguage links. Add another language to `lib/languages.ts` with its Wikipedia host, Wikidata site, direction, default topic, and category anchors, then register its complete translation catalog in `lib/messages.ts`. The selector and API validation derive from that catalog; TypeScript requires every translated message for each registered language.

First-time readers see an intro with optional category pills, custom interests, and an NSFW warning. Gemini automatically tunes the feed; interests can be changed in Settings. Interests and a few saved/explored titles are sent to the server to select candidates; Gemini receives those titles and source extracts to rank and simplify posts. Source reads remain available if Gemini is unavailable or its request budget is exhausted. No account or other users' activity is used. The app requires internet access. Interests persist only with Store data enabled; welcome acknowledgement remains a display preference.

Explore route titles are decoded once before querying Wikipedia so multi-word and Unicode topics do not get double-encoded. Navigation tests cover Acceleration → Physical quantity.

Settings opens a modal from the desktop navigation or mobile bottom bar. Auto/Light/Dark/AMOLED themes and English/Simple English source-link preferences persist in this browser. Turning off Store data clears persisted library and interests while keeping session saves available; display preferences remain stored. Reset discovery clears chosen interests and recent explorations while retaining saved topics and paths, which can still guide recommendations. Delete all data requires confirmation and clears the library and preferences. Cloud configuration is optional; deletion clears the library record's contents without deleting the anonymous Auth identity.

Wikimedia API reads share a Bottleneck queue with one active request. A User-Agent containing a real contact email or project URL enables 400ms spacing; otherwise requests use conservative 6.5-second spacing. Identical in-flight reads coalesce, and up to 64 successful source responses are cached for their configured lifetime. HTTP 429/503 and Action API overload errors trigger a shared cooldown respecting Retry-After (five seconds if absent). Brief failures retry once; longer cooldowns surface a retry countdown in the feed. Narrating a feed summary uses the known summary or a single article request instead of loading its graph. These controls are per process; multi-instance deployment needs a shared limiter/cache such as Redis. Wikimedia image requests through Next Image are separate from this API queue.

## Run

Install Node.js 22 or newer, then:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. In this workspace a portable runtime also lives in `.tools`; add its directory to your PowerShell `$env:PATH` if Node is not installed globally.

## Integrations

- **Wikipedia & Wikidata:** work without credentials. Requests run server-side with timeouts and caching. Article HTML is converted to plain paragraphs; no external HTML is rendered. Images are served with Next Image from both Wikimedia upload and thumbnail hosts. Failed optimization retries the source; unavailable sources show a compact fallback. Set `WIKIMEDIA_USER_AGENT` to include a contact address before deployment.
- **Gemini:** add `GEMINI_API_KEY` to `.env.local`. Optional `GEMINI_MODEL` defaults to `gemini-2.5-flash`. Explore renders the source graph first, then asynchronously ranks source-linked concepts. Returned titles are checked against the candidate set, deduplicated, and capped at six. Missing keys or failures preserve the factual graph.
- **ElevenLabs:** add `ELEVENLABS_API_KEY` in `.env.local`, optionally `ELEVENLABS_VOICE_ID` and `ELEVENLABS_MODEL` (defaults to the faster `eleven_flash_v2_5`), then rebuild/restart a production server (or restart the dev server). Narration buttons play/pause real ElevenLabs audio. The server resolves the article/section itself and limits narration to 2,500 characters. Missing keys disable the button with a setup tooltip; provider failures show an error message. No browser speech fallback is presented as ElevenLabs.
- **Library:** saved topics, recent explorations, and named trails persist in localStorage. This works with no account. Saved paths reopen with shareable URLs that preserve the sequence of article titles, including after a refresh.
- **Supabase (optional):** apply `supabase/schema.sql`, enable anonymous sign-ins in Auth, and fill the two `NEXT_PUBLIC_SUPABASE_*` variables. An anonymous session syncs its library with row-level security. Local saves survive cloud errors. Anonymous identity is bound to this browser; cross-device accounts/sign-in are outside this MVP. Cloud data is loaded only when the local saved collection is empty. No service-role key is needed.

## Checks

```powershell
npm run typecheck
npm test
npm run build
npx playwright test
```

Demo: Scroll → Save → Explore → click two graph topics → Save path → Library → reopen a saved topic/path. Check at mobile and desktop widths. Narration and Gemini require configured provider keys.

## Vercel

Live app: https://scrollipedia.tech (also available at https://scrollipedia.vercel.app). DNS is managed through Namify, with HTTPS provided by Vercel. The production app has been checked at desktop and mobile widths. Deployments currently use the CLI; automatic deployments on GitHub pushes require connecting the GitHub account in Vercel.

```powershell
npx vercel
```

Select this directory, keep the detected Next.js defaults, and add optional integration variables in Vercel's environment settings. Deploy with `npx vercel --prod` after checking the preview. Enable Vercel Deployment Protection for a hackathon demo that uses paid APIs. Never commit `.env.local`; only Supabase's public anonymous key belongs in the client bundle.

Provider routes require a same-origin POST and use a small per-instance request limit. This is suitable for a protected demo, not a global distributed quota: public production usage needs durable rate limiting and provider spend caps. Disable paid routes with `INTEGRATIONS_ENABLED=false`.

Text is sourced from Wikipedia under CC BY-SA 4.0; source links appear throughout. Lead images can have separate licensing: consult the Wikipedia image's Commons page for reuse attribution.

Scroll, Explore, Library, and Stats are product modes. Explore grows circular graph branches in place; summaries and narration follow the selected topic.
