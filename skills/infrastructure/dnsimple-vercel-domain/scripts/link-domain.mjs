#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    ttl: 300,
    wait: false,
    dryRun: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    switch (arg) {
      case "--zone":
        args.zone = argv[++i];
        break;
      case "--subdomain":
        args.subdomain = argv[++i];
        break;
      case "--domain":
        args.domain = argv[++i];
        break;
      case "--project":
        args.project = argv[++i];
        break;
      case "--record-target":
        args.recordTarget = argv[++i];
        break;
      case "--ttl":
        args.ttl = Number(argv[++i]);
        break;
      case "--wait":
        args.wait = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/link-domain.mjs --zone <zone> --subdomain <name> --project <project> [options]
  node scripts/link-domain.mjs --domain <full-domain> --project <project> [options]

Options:
  --zone <zone>                 DNS zone, e.g. example.com
  --subdomain <name>            Subdomain label, e.g. app
  --domain <full-domain>        Full domain, e.g. app.example.com
  --project <name-or-id>        Vercel project name or id
  --record-target <value>       Manual DNS target override
  --ttl <seconds>               DNS TTL (default: 300)
  --wait                        Poll Vercel verification after DNS update
  --dry-run                     Print plan without changing anything
  --json                        Emit machine-readable JSON summary
  -h, --help                    Show help

Required env:
  DNSIMPLE_TOKEN
  DNSIMPLE_ACCOUNT_ID
  VERCEL_TOKEN

Optional env:
  VERCEL_TEAM_ID
`);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeDomainInput(args) {
  if (args.domain) {
    const domain = args.domain.trim().toLowerCase();
    const zone = args.zone?.trim().toLowerCase();

    if (zone && !domain.endsWith(`.${zone}`) && domain !== zone) {
      throw new Error(`Domain '${domain}' does not belong to zone '${zone}'`);
    }

    const inferredZone = zone ?? inferZoneFromDomain(domain);
    const relativeName = toRelativeRecordName(domain, inferredZone);

    return {
      domain,
      zone: inferredZone,
      relativeName,
      isApex: relativeName === "",
    };
  }

  if (!args.zone || typeof args.subdomain !== "string") {
    throw new Error("Provide either --domain or both --zone and --subdomain");
  }

  const zone = args.zone.trim().toLowerCase();
  const subdomain = args.subdomain.trim().toLowerCase();

  if (!zone) {
    throw new Error("--zone must not be empty");
  }

  const relativeName = subdomain === "@" ? "" : subdomain;
  const domain = relativeName ? `${relativeName}.${zone}` : zone;

  return {
    domain,
    zone,
    relativeName,
    isApex: relativeName === "",
  };
}

function inferZoneFromDomain(domain) {
  const parts = domain.split(".").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(`Could not infer zone from domain '${domain}'`);
  }

  return parts.slice(-2).join(".");
}

function toRelativeRecordName(domain, zone) {
  if (domain === zone) {
    return "";
  }

  const suffix = `.${zone}`;

  if (!domain.endsWith(suffix)) {
    throw new Error(`Domain '${domain}' is not inside zone '${zone}'`);
  }

  return domain.slice(0, -suffix.length);
}

function findNearestVercelLink(startDir = process.cwd()) {
  let current = startDir;

  while (true) {
    const repoLinkPath = path.join(current, ".vercel", "repo.json");
    const projectLinkPath = path.join(current, ".vercel", "project.json");

    if (fs.existsSync(repoLinkPath)) {
      return {
        kind: "repo",
        path: repoLinkPath,
        data: JSON.parse(fs.readFileSync(repoLinkPath, "utf8")),
      };
    }

    if (fs.existsSync(projectLinkPath)) {
      return {
        kind: "project",
        path: projectLinkPath,
        data: JSON.parse(fs.readFileSync(projectLinkPath, "utf8")),
      };
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function resolveVercelProjectInfo({ project }) {
  const linked = findNearestVercelLink();
  const explicitTeamId = process.env.VERCEL_TEAM_ID?.trim() || null;

  if (!linked) {
    return {
      projectRef: project,
      projectId: project,
      teamId: explicitTeamId,
      source: "env-or-arg-only",
    };
  }

  if (linked.kind === "repo") {
    const match = linked.data.projects?.find(
      (entry) => entry.name === project || entry.id === project
    );

    if (match) {
      return {
        projectRef: match.name,
        projectId: match.id,
        teamId: explicitTeamId ?? match.orgId ?? null,
        source: linked.path,
      };
    }
  }

  if (linked.kind === "project") {
    return {
      projectRef: project,
      projectId: linked.data.projectId ?? project,
      teamId: explicitTeamId ?? linked.data.orgId ?? null,
      source: linked.path,
    };
  }

  return {
    projectRef: project,
    projectId: project,
    teamId: explicitTeamId,
    source: linked.path,
  };
}

async function vercelRequest({ token, method = "GET", pathname, teamId, query, body }) {
  const url = new URL(`https://api.vercel.com${pathname}`);

  if (teamId) {
    url.searchParams.set("teamId", teamId);
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `${method} ${pathname} failed with status ${response.status}`;

    const error = new Error(message);
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function dnsimpleRequest({ token, accountId, method = "GET", pathname, query, body }) {
  const url = new URL(`https://api.dnsimple.com/v2/${accountId}${pathname}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.errors?.map?.((entry) => entry?.message).filter(Boolean).join(", ") ||
      `${method} ${pathname} failed with status ${response.status}`;

    const error = new Error(message);
    error.response = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

function safeJsonParse(input) {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

function extractRecordsFromVercel({ addResponse, configResponse, domain, zone, manualTarget }) {
  const records = [];

  for (const verification of normalizeVerificationRecords(addResponse?.verification, domain, zone)) {
    records.push(verification);
  }

  if (manualTarget) {
    records.push({
      type: "CNAME",
      name: toRelativeRecordName(domain, zone),
      content: normalizeRecordContent(manualTarget),
      source: "manual-target",
    });

    return dedupeRecords(records);
  }

  const configRecord = inferRoutingRecordFromConfig(configResponse, domain, zone);

  if (configRecord) {
    records.push(configRecord);
  }

  return dedupeRecords(records);
}

function normalizeVerificationRecords(verification, domain, zone) {
  if (!Array.isArray(verification)) {
    return [];
  }

  return verification
    .map((entry) => {
      const type = entry?.type?.toUpperCase?.();
      const targetDomain = entry?.domain || entry?.name || entry?.host;
      const value = entry?.value || entry?.target || entry?.content;

      if (!type || !targetDomain || !value) {
        return null;
      }

      const fqdn = String(targetDomain).replace(/\.$/, "").toLowerCase();
      const absolute = fqdn.endsWith(`.${zone}`) || fqdn === zone ? fqdn : `${fqdn}.${zone}`;

      return {
        type,
        name: toRelativeRecordName(absolute, zone),
        content: normalizeRecordContent(String(value)),
        source: "vercel-verification",
      };
    })
    .filter(Boolean);
}

function inferRoutingRecordFromConfig(config, domain, zone) {
  const relativeName = toRelativeRecordName(domain, zone);

  const candidates = [
    config?.cname,
    firstRecordLikeValue(config?.cnames),
    firstRecordLikeValue(config?.records),
    firstRecordLikeValue(config?.recommendedRecords),
    firstString(config?.misconfigured?.cnames),
  ].filter(Boolean);

  if (candidates.length > 0) {
    return {
      type: "CNAME",
      name: relativeName,
      content: normalizeRecordContent(candidates[0]),
      source: "vercel-config-cname",
    };
  }

  const ipv4 = [
    firstString(config?.a),
    firstString(config?.recommendedIPv4),
    firstString(config?.ips),
  ].filter(Boolean);

  if (ipv4.length > 0) {
    return {
      type: "A",
      name: relativeName,
      content: normalizeRecordContent(ipv4[0]),
      source: "vercel-config-a",
    };
  }

  if (relativeName && !config?.configuredBy) {
    return {
      type: "CNAME",
      name: relativeName,
      content: "cname.vercel-dns.com",
      source: "fallback-default-cname",
    };
  }

  return null;
}

function firstRecordLikeValue(value) {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];

    if (typeof first === "string") {
      return first;
    }

    if (first && typeof first === "object") {
      return first.value || first.content || first.target || first.data || null;
    }
  }

  return null;
}

function firstString(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

function normalizeRecordContent(value) {
  return String(value).replace(/\.$/, "");
}

function dedupeRecords(records) {
  const seen = new Set();
  const result = [];

  for (const record of records) {
    const key = `${record.type}:${record.name}:${record.content}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(record);
  }

  return result;
}

async function upsertDnsimpleRecord({ token, accountId, zone, record, ttl, dryRun }) {
  const existing = await dnsimpleRequest({
    token,
    accountId,
    pathname: `/zones/${zone}/records`,
    query: {
      name: record.name,
      type: record.type,
    },
  });

  const records = Array.isArray(existing?.data) ? existing.data : [];
  const match = records.find((entry) => normalizeRecordContent(entry.content) === record.content) ?? null;

  if (match) {
    return {
      action: "unchanged",
      recordId: match.id,
      record,
    };
  }

  const firstSameNameType = records[0] ?? null;

  if (dryRun) {
    return {
      action: firstSameNameType ? "would-update" : "would-create",
      recordId: firstSameNameType?.id ?? null,
      record,
    };
  }

  if (firstSameNameType) {
    await dnsimpleRequest({
      token,
      accountId,
      method: "PATCH",
      pathname: `/zones/${zone}/records/${firstSameNameType.id}`,
      body: {
        name: record.name,
        type: record.type,
        content: record.content,
        ttl,
      },
    });

    return {
      action: "updated",
      recordId: firstSameNameType.id,
      record,
    };
  }

  const created = await dnsimpleRequest({
    token,
    accountId,
    method: "POST",
    pathname: `/zones/${zone}/records`,
    body: {
      name: record.name,
      type: record.type,
      content: record.content,
      ttl,
    },
  });

  return {
    action: "created",
    recordId: created?.data?.id ?? null,
    record,
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyProjectDomain({ token, teamId, projectRef, domain }) {
  return vercelRequest({
    token,
    method: "POST",
    pathname: `/v9/projects/${encodeURIComponent(projectRef)}/domains/${encodeURIComponent(domain)}/verify`,
    teamId,
  });
}

async function waitForVerification({ token, teamId, projectRef, domain, timeoutMs = 120000 }) {
  const started = Date.now();
  let lastResponse = null;

  while (Date.now() - started < timeoutMs) {
    try {
      lastResponse = await verifyProjectDomain({ token, teamId, projectRef, domain });

      if (
        lastResponse?.verified === true ||
        lastResponse?.configured === true ||
        lastResponse?.accepted === true
      ) {
        return { verified: true, response: lastResponse };
      }
    } catch (error) {
      lastResponse = error.response ?? { message: error.message };
    }

    await sleep(5000);
  }

  return { verified: false, response: lastResponse };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.project) {
    throw new Error("Missing required argument: --project");
  }

  const domainInput = normalizeDomainInput(args);

  if (domainInput.isApex) {
    throw new Error(
      "This skill is intended for subdomains. Apex/root-domain automation is intentionally out of scope."
    );
  }

  const dnsimpleToken = requireEnv("DNSIMPLE_TOKEN");
  const dnsimpleAccountId = requireEnv("DNSIMPLE_ACCOUNT_ID");
  const vercelToken = requireEnv("VERCEL_TOKEN");

  const projectInfo = resolveVercelProjectInfo({ project: args.project });

  const summary = {
    domain: domainInput.domain,
    zone: domainInput.zone,
    relativeName: domainInput.relativeName,
    project: projectInfo.projectRef,
    projectId: projectInfo.projectId,
    teamId: projectInfo.teamId,
    projectInfoSource: projectInfo.source,
    dryRun: args.dryRun,
    steps: [],
  };

  let addResponse = null;

  if (args.dryRun) {
    summary.steps.push({
      step: "vercel-add-domain",
      action: "would-add-domain",
      project: projectInfo.projectRef,
      domain: domainInput.domain,
    });
  } else {
    try {
      addResponse = await vercelRequest({
        token: vercelToken,
        method: "POST",
        pathname: `/v10/projects/${encodeURIComponent(projectInfo.projectRef)}/domains`,
        teamId: projectInfo.teamId,
        body: {
          name: domainInput.domain,
        },
      });

      summary.steps.push({
        step: "vercel-add-domain",
        action: "added-domain",
      });
    } catch (error) {
      const message = error.message || "unknown vercel error";

      if (/already exists|already assigned|in use|conflict/i.test(message)) {
        summary.steps.push({
          step: "vercel-add-domain",
          action: "domain-already-present",
          message,
        });
      } else {
        throw error;
      }
    }
  }

  let configResponse = null;

  try {
    configResponse = await vercelRequest({
      token: vercelToken,
      pathname: `/v6/domains/${encodeURIComponent(domainInput.domain)}/config`,
      teamId: projectInfo.teamId,
      query: {
        projectId: projectInfo.projectId,
      },
    });
  } catch (error) {
    summary.steps.push({
      step: "vercel-fetch-config",
      action: "config-fetch-failed",
      message: error.message,
    });
  }

  const records = extractRecordsFromVercel({
    addResponse,
    configResponse,
    domain: domainInput.domain,
    zone: domainInput.zone,
    manualTarget: args.recordTarget,
  });

  if (records.length === 0) {
    throw new Error(
      "Could not infer required DNS records from Vercel. Re-run with --record-target or inspect the Vercel domain config manually."
    );
  }

  summary.records = records;

  for (const record of records) {
    const result = await upsertDnsimpleRecord({
      token: dnsimpleToken,
      accountId: dnsimpleAccountId,
      zone: domainInput.zone,
      record,
      ttl: args.ttl,
      dryRun: args.dryRun,
    });

    summary.steps.push({
      step: "dnsimple-upsert-record",
      ...result,
    });
  }

  if (args.wait && !args.dryRun) {
    const verifyResult = await waitForVerification({
      token: vercelToken,
      teamId: projectInfo.teamId,
      projectRef: projectInfo.projectRef,
      domain: domainInput.domain,
    });

    summary.steps.push({
      step: "vercel-verify-domain",
      action: verifyResult.verified ? "verified" : "not-yet-verified",
      response: verifyResult.response,
    });
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Domain: ${summary.domain}`);
  console.log(`Zone: ${summary.zone}`);
  console.log(`Project: ${summary.project}`);
  console.log(`Team ID: ${summary.teamId ?? "(not set)"}`);
  console.log(`Dry run: ${summary.dryRun ? "yes" : "no"}`);
  console.log("");

  for (const step of summary.steps) {
    const details = [step.action, step.message].filter(Boolean).join(" — ");
    console.log(`- ${step.step}: ${details}`);

    if (step.record) {
      const name = step.record.name || "@";
      console.log(`  ${step.record.type} ${name} -> ${step.record.content}`);
    }
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);

  if (error.response) {
    console.error(JSON.stringify(error.response, null, 2));
  }

  process.exit(1);
});
