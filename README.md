# Job Assistant — personal job assistant

A local-first job search workspace built with Next.js, React, and TypeScript.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. The dashboard first fetches real jobs from enabled sources. If the API fails or returns no jobs, it shows fictional demo jobs with an explanatory banner and retry action. In **Sources**, add a company name, provider, and board slug; click **Sync jobs** to collect live engineering jobs.

Initial providers: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html) and [Lever Postings API](https://github.com/lever/postings-api). A URL such as `https://jobs.lever.co/example` uses the slug `example`. No API keys are required for public boards. Sources are manually configured, and synchronization runs on page load and on demand.

## Included

- Search by title, company, and skill; location, technology, seniority, and eligibility filters; sorting by match or date.
- Explainable scores based on skill coverage, seniority, frontend/full-stack focus, and location fit.
- Conservative eligibility classification: vague remote/APAC/EMEA listings require verification. Relocation evidence is shown verbatim. Classification is heuristic and requires reviewing the original listing.
- Saved jobs, application stages, hidden jobs, editable profile, source management, per-source sync errors, and deduplication by provider ID or exact original URL.
- Local persistence in `data/store.json`, with serialized writes and atomic replacement. Tracking states survive collection updates.

## Validation

```sh
npm test
npm run typecheck
npm run build
```

## Scope and deployment

This is a single-user MVP intended to run locally. There is no authentication: do not expose its write APIs publicly. JSON persistence requires a writable persistent disk and a single Node process; it is not suitable for ephemeral serverless hosting or multiple instances. Use PostgreSQL plus authentication before deploying a shared service.

Scheduled workers, email alerts, CV parsing, company blocking, country filters, and cross-provider fuzzy duplicate detection remain future work. Current year-of-experience settings are stored but not used in scoring. Jobs missing source publication dates use their first collection date; expired listings are not automatically removed. Sync does not send applications or contact employers.

## Career sources and Bangladesh

**Sources → Add Career Page** accepts public HTTPS career URLs. Registration detects direct Greenhouse, Lever (including EU), and Ashby URLs, or a supported ATS linked/embedded in the career page. Other URLs remain on the watchlist with a detection explanation. An enabled source is rechecked on sync; pause it to skip collection. Existing slug-based sources remain compatible and appear under Global.

Bangladesh and Global are source categories, independent of the actual job location. The dashboard tabs are Bangladesh, Global Remote, Relocation / Visa, and All. A Bangladesh company’s overseas role is not automatically classified as Bangladesh-eligible.

Tekarsh has a dedicated adapter for the JSON endpoint used by its public career page; only active, non-expired engineering jobs are imported. Arbitrary custom API URLs are not accepted.

Optional HTML fallback must be enabled when registering a page whose terms permit collection. Job Assistant checks robots.txt, parses schema.org JobPosting data, and supports detail links for Cefalo and Vivasoft. It does not run JavaScript or bypass authentication/anti-bot controls. Unknown layouts produce actionable errors. Company parsers inspect at most 25 detail pages per sync. Bdjobs is linked for manual browsing; no public integration has been verified.

For Adzuna, copy `.env.example` to `.env.local`, supply your developer app ID/key, and restart the server. Add a Direct API source with provider Adzuna and a supported country code (e.g. `gb`, `de`, `us`, `sg`). The adapter fetches the first 50 software-engineer search results per sync. Credentials stay on the server. Bangladesh uses company sources rather than Adzuna. API documentation: [Adzuna](https://developer.adzuna.com/overview), [Ashby](https://developers.ashbyhq.com/docs/public-job-posting-api).

Outbound collection is restricted to public HTTPS destinations with DNS validation and pinned IPv4 connections, private/reserved address blocking, bounded redirects, 20-second request deadlines, and 5 MB response limits. IPv6-only hosts are not supported. HTML redirects are checked against the target robots policy before fetching. This does not replace authentication or rate limiting for an internet-facing deployment.

The Discover feed uses only job IDs returned by the latest successful collection, excluding stored demo and stale listings. Partial failures retain real results with a warning. Saved jobs and application history remain available; demo interactions are session-only. No active sources, empty results, timeouts, HTTP failures, and invalid responses receive distinct feedback. Search/filter empty states never trigger demo fallback.

WSD careers URLs are recognized automatically and connected to its public BambooHR careers endpoints. This source is scoped to **Development department + Dhaka city**; roles in other departments or cities are excluded. All titles and languages within that scope are accepted, including Java roles, and descriptions are used by the existing match engine. The current source configuration appears under Bangladesh. Each matching opening is rechecked for Open status, department, and city before import. WSD's robots-disallowed legacy embed endpoint is not used.

Optimizely search URLs are recognized and scoped to **Senior Software Engineer titles in Dhaka**. Collection reads public search-result rows, follows pagination (up to 10 pages), and imports descriptions from matching job pages. Both title and location are checked locally, since the website's keyword search can return unrelated senior roles. Zero matching openings is a successful empty result, not a source failure. The adapter runs through the same Sync jobs flow as the other sources.

BRAC IT's Engineering career page is supported through the shared HTML collector. Its supplied HTTP URL is upgraded to the canonical HTTPS page. Engineering-category roles are included regardless of title (including database administrator roles); application deadlines are checked through the end of the stated Bangladesh calendar day. The collector verifies the category and deadline again in each job's structured description and preserves its original link and publication date. A future paginated layout fails visibly rather than silently collecting an incomplete list.
