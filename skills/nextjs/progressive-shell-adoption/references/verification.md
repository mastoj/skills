# Verifying cold-to-warm shells

## Use the right build for each claim

Use production builds for the acceptance checks. Development can help debug, but
does not reproduce production prefetching and server-shell caching.

There are two distinct proofs:

| Claim | Verification |
| --- | --- |
| Useful UI is available before request-time work | Upstream `@next/playwright` `instant()` tests, with the testing API enabled only for the test build |
| A cold URL becomes a richer cached server shell | Normal production build, with the testing API disabled |

**Version-specific trap:** in Next.js 16.4.3, enabling
`experimental.exposeTestingApiInProductionBuild` disables background fallback-shell
upgrades even on requests outside an `instant()` callback. Check the target
version's docs/runtime; the observed guard lives in
`next/dist/build/templates/app-page-runtime.js`. An enabled testing API cannot be
used to disprove an upgrade it suppresses.

When that behavior applies, use two builds or sequential rebuilds, each with its
own output and a verified server lifecycle. Keep secrets/configuration consistent
between each build and its runtime. Exclude generated output from linting and git.
Retain the upstream lock-engagement checks for the `instant()` build.

## Normal production checks

Use an existing test fixture or controllable data boundary for the selected route.
Prove coldness by observing the underlying lookup or isolating a fresh supported
cache scope. A new browser, incognito session, or query parameter does not by
itself clear server caches. Keep caching enabled: disabling it tests a different
mechanism. Account for build-time seeds, other tests, and link prefetches that can
warm the chosen key before the test starts.

1. **Cold shell:** request an unvisited URL. Assert that meaningful shell markers
   and loading states arrive while the slow data boundary remains pending.
   Keep this proof independent of the test-enabled build's lock.
2. **Completion:** release/resolve the data boundary and assert the actual content
   replaces its fallback. Exercise the completed page, not just response status.
3. **Warm server shell:** request the same URL without browser-router reuse.
   Inspect the initial HTML before React's streamed patches, and assert the
   reusable content is present there. Finding text anywhere in the final response
   or merely seeing a fast second response is insufficient. Let any documented
   background completion finish; use an observable completion condition rather
   than an arbitrary sleep.
4. **Live work:** assert its marker is absent from the cached shell, and verify
   that the underlying request-time work executes on subsequent requests. Random
   recommendations can coincidentally match; content differences alone are not
   proof of freshness. Reuse an observable service boundary or a test-only probe.
5. **Variants and identity:** repeat the relevant locale/flag/authentication
   branches. Assert the right content as well as readiness. Shared data should
   reuse its lookup; distinct resource/tenant/user keys must remain isolated.
6. **Freshness:** when a writer exists, populate the cache, mutate the data, trigger
   the real invalidation path, and verify the next read observes the update.

Treat local timings as supporting measurements, not universal latency promises.
Prefer controlled pending/completion assertions to tight wall-clock thresholds;
reuse an existing delay fixture only when it represents the behavior being tested.

## Browser and link checks

Follow the upstream skills for initial-load and real-link `instant()` contracts.
Assert both the ready UI and the deferred regions, then verify completion after
the lock releases. Compare no-prefetch and URL-specific prefetch paths in separate
contexts; record which links can invoke server work before a click.

Keep JavaScript enabled to test normal React streaming and link prefetching.
Disabling it stops client prefetching but leaves server caches intact, and prevents
normal streamed Suspense reveal. Use a separate no-JavaScript check only when that
behavior is part of the application's own requirements.

For deployment claims, repeat the relevant checks on the target adapter/cache
topology. A single warm local worker does not prove reuse across serverless
instances or restarts. Record any such coverage gap instead of promising durable
cross-instance caching.
