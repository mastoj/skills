# Skills

Personal skills, grouped by workflow under `skills/`. Each skill keeps its own
scripts and templates alongside its `SKILL.md`.

## Available Skills

| Group          | Skill                                                                           | Purpose                                         |
| -------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| Apps           | [create-app-skill](skills/apps/create-app-skill/SKILL.md)                       | Scaffold apps using mastoj conventions.         |
| Next.js        | [progressive-shell-adoption](skills/nextjs/progressive-shell-adoption/SKILL.md) | Adopt and verify cold-to-warm Next.js shells with upstream skills. |
| Automation     | [setup-ralph](skills/automation/setup-ralph/SKILL.md)                           | Install Ralph planning prompts and runners.     |
| Automation     | [run-ralph](skills/automation/run-ralph/SKILL.md)                               | Start Ralph loops through OpenClaw.             |
| Infrastructure | [dnsimple-vercel-domain](skills/infrastructure/dnsimple-vercel-domain/SKILL.md) | Connect DNSimple subdomains to Vercel projects. |

## Installation

Browse or install selected skills using the [Skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add mastoj/skills --list
npx skills add mastoj/skills --skill setup-ralph run-ralph
```

For progressive Next.js shells, install the companion skill and the standard
Next.js workflows it selects as needed:

```bash
npx skills add mastoj/skills --skill progressive-shell-adoption
npx skills add vercel/next.js --skill next-cache-components-adoption next-partial-prefetching-adoption next-cache-components-optimizer next-partial-prefetching-optimizer
```

The companion adds cold-to-warm cache verification and variant/identity checks;
it references the upstream skills rather than copying their implementation rules.

The category folders organize this source repository; installed skills retain
their individual names. To check discovery from a local checkout:

```bash
npx skills add . --list
```

## Upstream Skills

This repository originally copied skills from [Matt Pocock](https://github.com/mattpocock/skills).
Those copies have been removed in favor of their maintained upstream workflows:

| Removed Local Skill | Current Upstream Alternative                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `grill-me`          | [grill-me](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me), backed by [grilling](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling) |
| `write-a-prd`       | [grilling](https://github.com/mattpocock/skills/tree/main/skills/productivity/grilling), then [to-spec](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-spec)         |
| `prd-to-issues`     | [to-tickets](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-tickets)                                                                                                 |
| `write-a-skill`     | [writing-for-agents](https://github.com/mattpocock/skills/tree/main/skills/productivity/writing-for-agents)                                                                                |
| `tdd`               | [tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd)                                                                                                               |
| `setup-pre-commit`  | [setup-pre-commit](https://github.com/mattpocock/skills/tree/main/skills/misc/setup-pre-commit)                                                                                            |

The PRD and skill-writing alternatives are evolved workflows, not drop-in renames.
The removed TDD reference files were also historical upstream copies.

Browse upstream before selecting replacements:

```bash
npx skills add mattpocock/skills --list
npx skills add mattpocock/skills --skill setup-matt-pocock-skills grilling to-spec to-tickets writing-for-agents tdd setup-pre-commit
```

The current upstream planning skills require project setup via
`setup-matt-pocock-skills`; install and invoke it when adopting that workflow.
