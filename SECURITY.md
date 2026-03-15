# Security Policy

## Scope

This policy applies to this repository.

## Supported Versions

| Version | Supported |
| --- | --- |
| 2.0.x | Yes |
| < 2.0.0 | No |

## Reporting a Vulnerability

Please report security issues responsibly.

1. Do not post exploit details publicly first.
2. Open a security report through the repository's security/advisory channel if available.
3. If that channel is not available, use the default maintainer contact (GitHub public email): 116955+tomika@users.noreply.github.com.
4. Include reproduction steps, impact, affected files, and environment details.

Please avoid including secrets, personal data, or production credentials in reports.

## Response Targets

- Initial triage acknowledgement: within 5 business days
- Severity assessment and next steps: within 10 business days
- Fix timeline: depends on severity and release constraints

## Security Baseline

The default dependency baseline is expected to have:

- `0` high vulnerabilities
- `0` critical vulnerabilities

Reference command:

```bash
npm audit --json --workspaces=false
```

## Optional BLE Peripheral Module

BLE peripheral support is optional and not part of the default dependency baseline.

- Optional module: `@abandonware/bleno`
- Install only if needed for local BLE testing:

```bash
npm run install:ble-peripheral
```

When enabled, re-run security checks and validate platform-specific BLE behavior before release.
