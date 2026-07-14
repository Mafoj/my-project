# ADR-001: Keep React, but build it properly

**Status:** Accepted · **Date:** 2026-07-14

## Context

The prototype (`PMO_PM_PipelineF.html`) is a 3,033-line single file: React +
Babel-standalone + Chart.js + XLSX.js, all from public CDNs, JSX compiled in the
browser at page load. It must move to `dhl.ghe.com` and be served from a server.

The question asked was "is it OK to continue as HTML, or is there a better option?"

## Decision

Keep React. Discard the single-file delivery mechanism. Build with Vite + TypeScript.

## Why not rewrite as server-rendered templates (Jinja2 + HTMX)?

That approach was recommended for the sibling *External Orders* app, so the
divergence needs justifying. The two apps differ in kind:

- **External Orders** is a transactional CRUD/approval app — forms, writes, roles.
  Server-rendered templates fit that shape well.
- **This** app is a read-only analytical dashboard: 4+ tabs, cross-tab filter sync,
  multi-selects, sortable tables, drill-down drawers, and many Chart.js canvases.
  This is precisely where HTMX starts fighting the developer, and where client-side
  state management earns its cost.

Additionally: **the React already exists and works.** Rewriting it as templates
would be motion without progress.

## Why not stay a single HTML file?

Four blockers, all disqualifying for a server-deployed app:

1. **Babel in the browser.** Every user's machine recompiles 3k lines of JSX per
   page load, and the page loads React's *development* build. This is explicitly
   not a production configuration.
2. **Public CDNs.** Likely blocked on the DHL network, and an external runtime
   dependency for an internal tool is both an availability and a supply-chain risk.
3. **Unreviewable diffs.** A 3,033-line file cannot be code-reviewed or merged by
   two people without conflicts. This is a GitHub project now; that matters.
4. **No tests possible.** Nothing in the file is importable or unit-testable.

## Consequences

- (+) ~47 KB gzipped production bundle; no external runtime deps; no browser compile.
- (+) Modules can be tested, reviewed, and worked on in parallel.
- (+) TypeScript catches contract drift against the backend at compile time.
- (−) A Node toolchain is now required — **but only in CI**. The production server
  needs no Node at all; it serves static files built by GitHub Actions.
- (−) The existing tabs must be ported file-by-file (Sprint 2). The chart and table
  logic transfers nearly unchanged; only the data-loading layer is genuinely new.
