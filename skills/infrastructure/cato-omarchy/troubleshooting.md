# Cato troubleshooting

## Missing FIFO / cannot connect to daemon

Typical CLI output:

```text
error opening fifo "/var/run/cato-sdp.o" for input! (2)
Cannot open pipe (APP_TO_SERV), with error: -1
Failed to connect to Cato client daemon
```

First check `systemctl status cato-client.service --no-pager`. A stopped daemon
is a confirmed cause seen on this machine; start the service, then retry the CLI.

If the service is active, inspect recent logs, FIFO presence/permissions, and the
installed unit and binaries:

```bash
journalctl -u cato-client.service -n 60 --no-pager
ls -l /run/cato-sdp*
systemctl cat cato-client.service
pacman -Ql cato-client-bin
command -v cato-sdp cato-clientd
```

Let the daemon manage its FIFOs; do not create pipes manually or broaden their
permissions. If logs suggest an unhealthy daemon, explain that restarting drops
any existing VPN session and obtain authorization before:

```bash
sudo systemctl restart cato-client.service
```

Recheck service health, then connect and verify as in `SKILL.md`.

## Disconnect: ERR_POSTURE_REPORT_FAILED

This machine previously authenticated successfully, then disconnected after
about ten minutes with:

```text
session ended, duration: 00:10:10 (ERR_POSTURE_REPORT_FAILED)
```

This is evidence of a device-posture reporting problem, not proof of the precise
cause or a fixed ten-minute timeout. Inspect current logs and installed/client
versions (`pacman -Q cato-client-bin` and `cato-sdp version`). A one-time reconnect
can restore access temporarily; if it recurs, escalate to the organization's
Cato administrator with timestamps, versions, distro, and the exact error.
Ask them to check supported Linux clients and posture-report requirements.

Keep company posture controls intact; do not add automatic reconnect loops to
mask this failure. For an approved update, use Omarchy's AUR package workflow
(`omarchy pkg aur add cato-client-bin`) and verify the resulting version. Treat
the client's update notice as information, not permission to run its self-updater
outside the package manager.

## Azure Key Vault: ForbiddenByFirewall

`Client address is not authorized and caller is not a trusted service` with
`ForbiddenByFirewall` means the request reached Key Vault but its network policy
rejected it. It is not evidence of an expired Azure login, nor does it establish
whether the caller has the necessary data permissions.

1. Check Cato's current status. If disconnected, restore the tunnel and have the
   user retry; retain the client address from the new error if it still fails.
2. Resolve the actual vault hostname and inspect the route to each returned IPv4
   address with `getent ahostsv4 <vault-hostname>` and `ip -4 route get <address>`.
   Check IPv6 routing too if the application uses IPv6. Policy rules, proxies,
   and private endpoints can change the path; a route lookup is supporting
   evidence, not proof of the source IP Azure sees.
3. If rejection persists while authenticated, ask IT to check Cato split-tunnel
   policy, approved egress IPs, and the vault's firewall or private-endpoint DNS
   and routing. The IP reported by Azure is the source it saw for that request.

Cato only fixes access if it provides a network path approved by the vault.
Keep firewall and trust settings unchanged unless the responsible administrator
explicitly authorizes a change. Azure CLI callers are not made trusted services
merely by signing in.

## Diagnostics for escalation

Share only the necessary timestamps, error lines, service/VPN states, client
version, and target-access result. Redact account emails, tenant/object IDs,
internal addresses, and authentication URLs when posting publicly. Keep tokens,
certificates, and retrieved secrets out of reports.
