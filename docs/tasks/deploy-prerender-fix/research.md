# Research Notes

date: 2025-09-30

- Fly build logs fail during static prerender with `<Html> should not be imported outside of pages/_document` while local builds succeed.
- Codebase previously lacked custom `pages/404`, `pages/500`, and `_error`, so Next fell back to defaults that can break when the app router renders across both runtimes.
- Current custom error pages are marked `"use client"` and `_error` referenced `window.location.reload`, which forces the page through client rendering during prerendering.
- Local builds tolerate this setup, but the Paketo builder + Next 14.2.x combination appears stricter and aborts when client directives surface inside `pages` error routes.
- Removing client directives and browser APIs from the legacy error pages should keep SSR-only semantics and satisfy the buildpack.
- After switching the legacy pages to plain `<a>` links (no `next/link`), the local production build still succeeds. This removes any dependency on Next router context during static HTML generation.
- Running `NODE_ENV=development npm run build` locally reproduces Fly's failure, confirming the builder executes `next build` with `NODE_ENV` set to `development`. Next.js only supports `next build` with `NODE_ENV=production`, which is why the export step blows up.
- Forcing `NODE_ENV=production` inside the `build` script (via `cross-env`) should stabilize both local and Fly builds regardless of the outer environment variables.
- Added `[env] NODE_ENV="production"` to `fly.toml` so Fly deployments use the same runtime mode as local builds.
- Re-ran `fly launch --no-deploy` after removing the old config; Fly generated a Next.js-aware Dockerfile, entrypoint, and fly.toml that align with the app's launch manifest.
