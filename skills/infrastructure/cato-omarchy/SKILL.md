---
name: cato-omarchy
description: Ensure Cato VPN runs on Omarchy. Use when installing or starting Cato, checking VPN connectivity, enabling startup at boot, troubleshooting cato-sdp daemon/FIFO errors or posture-report disconnects, or investigating Azure Key Vault firewall errors while using Cato.
---

# Cato on Omarchy

Treat package installation, daemon health, authenticated VPN connectivity, and
access to the target service as separate checks. A running daemon is not proof
of a connected tunnel; a connected tunnel is not proof of Azure access.

## 1. Inspect before changing anything

Load the `omarchy` skill when available for system changes and privilege rules.
Run these read-only checks independently:

```bash
pacman -Q cato-client-bin
systemctl status cato-client.service --no-pager
systemctl is-enabled cato-client.service
cato-sdp status
journalctl -u cato-client.service -n 40 --no-pager
```

Missing commands, a stopped service, or a disabled unit can produce nonzero exit
codes; interpret the output rather than treating every exit as a tool failure.
If `cato-sdp` hangs, bound the check with `timeout 15s cato-sdp status`.

Complete this step with a fresh classification: package missing, daemon stopped
or failed, daemon running but VPN disconnected, or VPN authenticated. Record
boot enablement separately. For a status-only request, report this and stop.

## 2. Restore the missing layer

Only make changes within the user's request. Commands below are for a visible
user terminal; use `pkexec` for privileged agent execution without an interactive
terminal. Leave browser authentication to the user.

| Finding | Action |
| --- | --- |
| Package missing | Install with `omarchy pkg aur add cato-client-bin`. |
| Daemon stopped | Run `sudo systemctl start cato-client.service`. |
| Daemon failed | Inspect the journal and `systemctl cat cato-client.service`; fix the evidenced cause before retrying. |
| Daemon running, VPN disconnected | Run `cato-sdp start` and have the user complete any browser sign-in. |
| VPN authenticated | Keep the existing connection; proceed to verification. |

After starting the service, confirm it is active before running `cato-sdp start`.
If a running daemon cannot communicate with the CLI, read
[troubleshooting.md](troubleshooting.md) before proposing a restart.

After `cato-sdp start` reports a successful connection, run:

```bash
npx t3 service restart
```

Then verify the tunnel with the fresh status checks below. Run this only after
Cato has connected successfully.

When the user requests boot startup, run:

```bash
sudo systemctl enable cato-client.service
```

This enables the **daemon**, not guaranteed unattended VPN authentication or
reconnection. Verify with `systemctl is-enabled cato-client.service`.

## 3. Verify the tunnel and requested access

```bash
systemctl is-active cato-client.service
cato-sdp status
ip -4 rule show
ip -4 route show table all
```

Require a fresh `STATE_AUTHENTICATED` result and an assigned tunnel interface/IP
before claiming the VPN is connected. Inspect the interface named by the client
with `ip address show dev <interface>`; use the actual name, not a hardcoded `tun0`.
Routing can be split-tunnel: the default route alone does not prove VPN failure.

If the user's goal is a particular service, verify that service separately using
an authorized, non-mutating request or have the user retry their original command.
Avoid displaying secrets or saving retrieved Key Vault values in diagnostics.
For firewall errors or repeated disconnects, read
[troubleshooting.md](troubleshooting.md).

Finish with the observed daemon state, VPN state, boot enablement, and target
access result (or explicitly say it remains untested). Include the exact blocker
and next action if any layer is still failing.
