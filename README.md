# Scrollipedia

Scroll through real Wikipedia topics, explore a connected mindmap, and save discoveries and paths. Built with Next.js App Router, React, TypeScript, Tailwind, shadcn-style Radix buttons, React Flow, and Lucide.

The layout extends the supplied Xikipedia reference: a 600px continuous feed, small bold titles, source summaries followed by inline images, thin post dividers, blue actions, desktop side navigation, and a flat mobile bottom bar. System light/dark preferences are respected. Explore and Library use the same visual language. Images open in a native dialog for closer viewing.

Discovery uses Wikipedia's random article generator and keeps all eligible articles from each batch for subsequent requests. Refresh takes a fresh selection from that buffer rather than replaying a fixed starter list. The browser sends recently seen article IDs to avoid duplicates. A bounded, hour-old source pool can supply unseen articles during a rate limit, with a visible notice. Graph navigation preserves already-fetched source summaries if Wikipedia temporarily fails; connections can be retried without losing the article. UI tests seed a reproducible selection with real Wikipedia articles; separate tests exercise the live random feed.

Explore route titles are decoded once before querying Wikipedia so multi-word and Unicode topics do not get double-encoded. Navigation tests cover Acceleration → Physical quantity.

Settings opens a modal from the desktop navigation or mobile bottom bar. Auto/Light/Dark themes and English/Simple English source-link preferences persist in this browser. Turning off Store data clears the persisted library (including its connected cloud copy) while keeping session saves available; display preferences remain stored. Reset discovery clears recent explorations and reloads the random feed while retaining saved topics and paths. Delete all data requires confirmation and clears the library and preferences. Cloud configuration is optional; deletion clears the library record's contents without deleting the anonymous Auth identity.

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

```powershell
npx vercel
```

Select this directory, keep the detected Next.js defaults, and add optional integration variables in Vercel's environment settings. Deploy with `npx vercel --prod` after checking the preview. Enable Vercel Deployment Protection for a hackathon demo that uses paid APIs. Never commit `.env.local`; only Supabase's public anonymous key belongs in the client bundle.

Provider routes require a same-origin POST and use a small per-instance request limit. This is suitable for a protected demo, not a global distributed quota: public production usage needs durable rate limiting and provider spend caps. Disable paid routes with `INTEGRATIONS_ENABLED=false`.

Text is sourced from Wikipedia under CC BY-SA 4.0; source links appear throughout. Lead images can have separate licensing: consult the Wikipedia image's Commons page for reuse attribution.

Only Scroll, Explore, and Library are product modes. No chatbot, social features, or separate audio mode.
