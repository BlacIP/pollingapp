# Development Log (Week in Review)

### Day 1 – Friday
- Project setup, repo hygiene, npm install, Vite dev server sanity check – **1.0 hr**
- Sketched baseline data model for polls (options, votes, security states) – **0.5 hr**
- Implemented starter localStorage CRUD helpers and UID generator – **1.0 hr**
- Built basic poll creation form in vanilla JS, wiring DOM inputs → localStorage – **1.5 hr**
- Read up on QRCode.js + Chart.js CDN usage for a no-build prototype – **0.5 hr**

### Day 2 – Saturday
- Added vote submission flow with per-session/device security guards – **1.5 hr**
- Integrated Chart.js bar chart + CSV export logic – **1.0 hr**
- Implemented `ValidationError` pattern and inline error messaging – **0.8 hr**
- Recursive nested options support (`tallyNested`, `renderOptionsTree`) with DOM rendering – **1.2 hr**
- Styling polish in `starter/style.css` (cards, buttons, modal) – **1.0 hr**

### Day 3 – Monday
- Bootstrapped React app with Vite + Tailwind configuration – **1.5 hr**
- Ported poll creation UI to React (component decomposition + validation reuse) – **2.0 hr**
- Hooked up optimistic poll creation + local cache management (`setUserPollsCache`) – **1.5 hr**
- Researched Google Apps Script web app deployments and quotas – **0.7 hr**

### Day 4 – Tuesday
- Wrote Apps Script endpoints for poll CRUD, voting, and OTP security – **3.0 hr**
- Tested Apps Script against sample spreadsheet, fixed schema mismatches – **1.0 hr**
- Wired React `api.js` client to the Apps Script endpoints with retry + caching – **1.5 hr**
- Added sharing flow (public URL, QR code, social links) – **0.8 hr**

### Day 5 – Wednesday
- Built public voting page with optimistic UI, local/session storage checks – **2.0 hr**
- Added vote success screen + results recap for public voters – **1.0 hr**
- Implemented background sync + cache invalidation for owner dashboard – **1.5 hr**
- Debugged cross-tab cache inconsistency; dispatched custom events and storage pings – **1.2 hr**

### Day 6 – Thursday
- Introduced per-poll live results toggle and 5s refresh loop – **1.5 hr**
- Throttled auto-refresh when tab hidden, ensured fallbacks to 10-minute sync – **1.0 hr**
- Refined device security UX in React form and voting components – **0.8 hr**
- Extensive manual QA: multi-select votes, close times, nested options, CSV exports – **1.5 hr**
- Captured demo footage and updated README with final instructions – **1.0 hr**

### Day 7 – Friday
- Final regression testing across starter and React builds – **1.0 hr**
- Cleaned lint warnings, ran production build, verified bundle output – **0.7 hr**
- Reviewed code for template compliance and logged requirements checklist – **0.8 hr**
- Wrote detailed README + LOG documentation and published to GitHub/Netlify – **1.0 hr**
- Buffer for fixes discovered during review (minor style tweaks, copy edits) – **0.5 hr**

**Total Time Invested:** ~29.0 hours
