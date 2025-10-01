# Research

## Date
2025-09-30

## Context
Investigating why provider/user settings fail to persist to Supabase and client receives `Unauthorized: Invalid or missing token`.

## Findings so far
- Client calls `/api/provider-settings` via `fetchApi`, which adds the saved `appAccessToken` value as `X-Access-Token`. Failure 401 surfaces the observed error string.
- Middleware (`src/middleware.ts`) validates the token by mapping it through `getUserIdentifier` from `src/lib/utils/tokenUtils.ts`, using the `ACCESS_TOKENS` JSON from env. When token missing/invalid, middleware responds 401 with same message observed.
- Provider settings persistence uses Supabase via `getServiceSupabaseClient` when available; otherwise it falls back to local JSON store. Supabase client initialization expects `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars.
- Need to verify whether middleware runs in an environment where `ACCESS_TOKENS` is correctly parsed, and whether the client actually stores the expected token string (must match keys in `ACCESS_TOKENS`).
- Next step: reproduce middleware token parsing in runtime and confirm tokens loaded as expected. Also validate Supabase writes with current credentials.

## Open Questions
- Does middleware runtime have access to `ACCESS_TOKENS` or is the value undefined in deployed environment?
- Are tokens stored with expected keys, or did the format change (e.g., switched to mapping from identifier to token)?
- Does Supabase table `provider_settings` enforce RLS requiring auth? Need to confirm using service key.

## Additional Notes (2025-09-30)
- Manual Supabase upsert using the service role credentials succeeded, confirming the backend credentials remain valid.
- The `ACCESS_TOKENS` JSON maps access-token strings to user identifiers. Tokens must match the keys (e.g., `sample-token` → `user1`). Identifiers themselves (e.g., `user1`) are not valid tokens, producing a 401 via middleware.
- If the UI stores an identifier instead of the access token in localStorage (e.g., copying the right-hand value from the JSON), subsequent API calls surface the observed `Unauthorized: Invalid or missing token.` error and provider settings never reach Supabase.
- Regression likely coincides with the April security hardening (`src/middleware.ts` + `src/lib/utils/tokenUtils.ts`), which tightened token validation to exact token-string matches.

## Update (2025-10-01)
- Discovered that Next.js does not pick up `src/middleware.ts` during production builds; the generated `middleware-manifest.json` was empty and requests skip the auth guard entirely.
- Copying the file to the project root as `middleware.ts` causes Next to emit a middleware bundle (`ƒ Middleware` in build output) and requests authenticated with the same `X-Access-Token` (`jovy`) succeed.
- Conclusion: the regression stems from the middleware being placed under `src/` instead of the project root, so deployed builds never run it. Without the middleware, the API routes see no `X-User-Identifier` header and respond with `401 Missing user identifier`, which bubbles up as `Unauthorized: Invalid or missing token.`
- Recommended fix: move `src/middleware.ts` to the repository root (or re-export it from a root-level `middleware.ts`) so production builds include it.
- Applied fix on 2025-10-01 by relocating `middleware.ts` to the project root; build output now shows `ƒ Middleware` and authenticated requests succeed.
