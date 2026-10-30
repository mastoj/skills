---
name: progressive-shell-adoption
description: >
  Adopt cold-to-warm progressive shells in a Next.js App Router application:
  serve an immediate fallback on a cold URL, stream its content, then include
  reusable content in subsequent cached shells while live content stays dynamic.
  Use when migrating this pattern to another repository, fixing shells that never
  upgrade, or verifying caching across route, locale, and feature-flag variants.
---

# Progressive shell adoption

Compose the maintained Next.js skills with a cold-to-warm acceptance contract.
Upstream owns framework migrations and optimization mechanics; this skill owns
cache identity, route variants, and proof that the server shell actually grows.

## 1. Define the contract

Choose one real route and its source link. Record in the project's existing test
rig notes (or `instant-nav.rig.md`):

- **Cold:** meaningful navigation/layout and focused loading states appear before
  the slow work finishes; completed content streams afterward.
- **Warm:** the same URL's reusable content is in the initial server-rendered
  shell, not merely a fast streamed patch or browser-router cache hit.
- **Live:** request-specific regions still execute and stream after navigation.
- **Variants:** relevant locale, tenant, authentication, and feature-flag states;
  which values should share data and which must stay isolated.
- **Prefetch:** which source links load only the shared shell, resolve
  URL-specific content, or disable prefetching for a cold-path comparison.

**Done:** each region has an agreed freshness policy, cache identity, and expected
cold/warm/live behavior. Keep reads dynamic when their safe reuse is unknown.

## 2. Select the upstream workflow

Inspect the target app directory, installed Next.js version, hosting/cache
configuration, and existing tests. App Router is required; a Pages Router
migration is separate work. Meet the chosen upstream skill's prerequisites.

Before setting up or reusing the test rig, read
[references/verification.md](references/verification.md). It distinguishes
immediate UI from shell upgrades and documents the testing-API trap.

Load the installed skill when available. Otherwise read its linked `SKILL.md`
and the references it requires; a URL alone is not an executed workflow.

| Target state | Standard skill to run |
| --- | --- |
| Cache Components is not adopted | [next-cache-components-adoption](https://github.com/vercel/next.js/blob/canary/skills/next-cache-components-adoption/SKILL.md) |
| Partial Prefetching is not adopted | [next-partial-prefetching-adoption](https://github.com/vercel/next.js/blob/canary/skills/next-partial-prefetching-adoption/SKILL.md) |
| The available shell blocks or hides useful UI | [next-cache-components-optimizer](https://github.com/vercel/next.js/blob/canary/skills/next-cache-components-optimizer/SKILL.md) |
| A selected link should include more URL-specific content | [next-partial-prefetching-optimizer](https://github.com/vercel/next.js/blob/canary/skills/next-partial-prefetching-optimizer/SKILL.md) |

Run only the workflows the target needs, preserving their baseline and regression
gates. Return here for the cold-to-warm checks; an upstream `instant()` pass alone
does not complete this contract. Handoffs do not require spawning subagents.

Use the target's bundled guides in `node_modules/next/dist/docs/`, resolved from
its Next.js package, for version-specific behavior. Relevant guides are
**ISR with Cache Components**, **Optimizing the static shell**, and **Optimizing
prefetching**. If unavailable, use the corresponding nextjs.org guides. Record
the installed version and upstream revision/date used; the links above track a
moving `canary`, not a compatibility guarantee.

**Done:** the target builds with the required features, and its selected upstream
workflows have verified the immediate-shell and link-navigation contracts.

## 3. Complete the cache and variant boundaries

Trace the selected route's reads and callers, including metadata and layouts.
Apply the framework's documented patterns rather than copying the demo's files:

- Cache reusable service results at their natural identity boundary. A shared
  product lookup may be keyed by SKU; tenant-specific or personalized pricing
  needs its additional isolation keys. Localized rendering can have a separate
  cache from the underlying shared data.
- Keep request-time work behind focused Suspense boundaries. Choose
  `navigation()` for prefetch-stage deferral and `connection()` for request-time
  rendering according to the installed APIs; use both only when both properties
  are required. Deferral is not authorization or cache invalidation.
- Inspect root and parent parameters before diagnosing a nested shell that never
  upgrades. Verify how the installed version handles unlisted parameter values.
  Seed relevant supported variants where needed, accounting for build cost;
  large or unbounded combinations need a different boundary or routing design,
  not an exhaustive Cartesian prerender.
- Opt individual link policies in deliberately. Preserve a usable fallback when
  prefetching has not completed, and account for work triggered by visible links.
- Connect cached mutable data to its existing writers and invalidation. Verify
  the deployment's cache lifetime, eviction, and cross-instance behavior instead
  of assuming a local process represents every hosting environment.

Synthetic SKUs, artificial delays, `/home2`, and `cacheLife("max")` are demo
choices, not adoption defaults. Preserve real data sources, access control,
error/status behavior, and freshness unless the user approves a change.

**Done:** each cache key and route variant satisfies the contract without leaking
data, changing freshness, or introducing unnecessary prefetch work.

## 4. Prove the progressive shell

Reuse the upstream test rig and keep the additional cold/warm regression tests
with the target repository. Demonstrate that removing only the adoption changes
breaks the relevant contract, then restore them and run the complete in-scope
suite. Verify mutation/invalidation where a writer exists and the required
authentication/locale/flag variants. Cover hard loads and the real source-link
click separately.

**Done:** cold fallback, streamed completion, upgraded warm shell, and live regions
are proven on production builds; the immediate-shell/link tests also pass, and
the tests distinguish the implementation from the unfixed baseline.

Report the verified route, prefetch policy, what appears immediately on cold and
warm visits, what remains live, and how to rerun the tests. State unverified
deployment/cache assumptions and any deferred variants explicitly.
