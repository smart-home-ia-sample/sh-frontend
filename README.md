# sh-frontend

React 19 + Vite SPA (Dashboard + AG-UI assistant). All requests are `/api`-relative
and go to the BFF.

`npm run build` -> `dist/`. On a `vX.Y.Z` tag, CI attaches `dist.tar.gz` to the
GitHub Release; `sh-bff` consumes that URL as `FRONT_DIST_URL` at
image-build time.

Local dev: `npm run dev` with Vite proxying `/api` to a running BFF (see
`vite.config.ts`).
