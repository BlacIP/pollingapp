# Overview

I built Polling App to stretch my skills as a software engineer by combining a modern React front end with an unconventional Google Apps Script backend. The goal was to deliver a responsive polling experience, explore real-time update patterns, and practice structuring a project that can scale from a simple prototype to a richer product.

The software lets creators compose polls, control voting security (session, device, or code), add rich descriptions and images, and watch results roll in on a dedicated owner dashboard. Voters receive a streamlined public page that enforces single votes per device/session, supports multi-select questions, and renders a live results recap after submitting. A “week-one” vanilla JavaScript starter is also included to demonstrate the same core ideas in a pure client-side setting.

My purpose in creating this project was to learn how to manage state across tabs, tame caching in a SPA, and integrate a lightweight spreadsheet-backed API without overloading it. The journey covered validation patterns, recursive UI rendering, background sync logic, and selectively enabling real-time updates on a per-poll basis.

[Software Demo Video](https://youtu.be/n1jiPmYv45M)

# Development Environment

- **Frameworks & Libraries**: React 19, Vite 7, Tailwind CSS, Chart.js, Day.js, QRCode.js
- **Language**: JavaScript/TypeScript-friendly toolchain running on Node.js 20
- **Backend**: Google Apps Script (REST endpoints backed by Google Sheets) with caching helpers
- **Tooling**: npm, eslint, Vite dev server, and a background sync harness for owner dashboards
- **Starter Module**: Vanilla HTML/CSS/JS demo (`starter/`) that uses localStorage + Chart.js via CDN

## Useful Websites

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Day.js Documentation](https://day.js.org/)
- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/webapps)

## Key Features

- Create polls with optional nested options, descriptions, and images
- Enforce voting security via session/local storage or code-based tokens
- Owner dashboard with per-poll live toggle (5-second refresh) and background sync (10-minute cycle)
- Public voting flow with optimistic updates and post-vote results summary
- Starter module showcasing recursion, custom errors, and chart rendering in pure JavaScript

## Getting Started

1. Install dependencies and run the React app:
   ```bash
cd polling-app
   npm install
   npm run dev
```
2. Deploy the Apps Script backend contained in `google-logic/` and update `src/api.js` with your web app URL.
3. Open `starter/index.html` directly in a browser to interact with the localStorage-only prototype.

## Future Enhancements

- WebSocket or SSE bridge for true push-based updates
- Role-based access for collaborators and readonly viewers
- Automated test coverage around vote submission, caching, and background sync events
- Migration tooling for moving data off spreadsheets into a relational store if needed
