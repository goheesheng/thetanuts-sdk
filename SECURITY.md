# Security Policy

## Reporting a Vulnerability

If you discover a security issue in `@thetanuts-finance/thetanuts-client`, please report it privately. **Do not open a public GitHub issue.**

### What counts as a security issue

- Code that signs or constructs transactions in a way that could leak funds, drain an option, or bypass intended access controls.
- ABI mismatches or input validation gaps that let a user reach a contract path the protocol's access controls did not anticipate.
- Dependency vulnerabilities that are reachable through the SDK's public surface.
- Anything that touches private keys, signatures, or the RFQ key encryption (`client.rfqKeys`).

The reverse: SDK ergonomics issues, broken docs, and non-security bugs go through normal [GitHub Issues](https://github.com/Thetanuts-Finance/thetanuts-sdk/issues).

### How to report

Email **security@thetanuts.finance** with:

- A description of the issue and its impact (what an attacker could do, who's affected).
- Steps to reproduce — minimal code snippet, chain ID, SDK version.
- Any suggested fix or mitigation if you have one.

Please use [GitHub's private vulnerability reporting](https://github.com/Thetanuts-Finance/thetanuts-sdk/security/advisories/new) as an alternative if you prefer.

### What to expect

- **Acknowledgment** within 3 business days.
- **Initial assessment** (severity, scope, fix path) within 7 business days.
- **Fix and disclosure timeline** depends on severity and the complexity of the fix. Critical issues get a same-week patch release; lower-severity issues land in the next planned release.
- We'll credit you in the release notes if you'd like (or keep it anonymous — your call).

## Supported versions

Only the latest minor on npm receives security fixes. Older minors are immutable on the registry and will not be patched. To stay in scope, pin to `^<latest-minor>`.

| Version | Supported |
|---------|-----------|
| `0.2.x` | ✅ |
| `0.1.x` | ❌ — pinned for legacy Base deployment, no further fixes |

## Scope

The SDK is a client wrapper around the Thetanuts Finance V4 protocol contracts. **The protocol contracts themselves are out of scope for this repository's security policy** — they live in a separate codebase with their own audits and disclosure channel. Report contract-level issues directly to the protocol team via the same security email.

What IS in scope:
- The SDK source under `src/`
- The published npm package surface
- Documentation under `docs/` (only in cases where docs would actively mislead a user into an unsafe action — typo-level issues go through normal channels)
- Build pipeline and `prepublishOnly` steps
- Dependency vulnerabilities in `package.json` `dependencies` (not `devDependencies`)

## Best practices for users

- Pin the SDK version (`@^0.2.1`, not `@latest`) so a future release can't silently change behavior.
- Run your own integration tests against your specific chain + token combinations.
- Always inspect transactions before signing. The SDK builds them, you sign them — don't outsource that step.
- For production deployments, see the [Production Checklist](https://docs.thetanuts.finance/sdk/guides/production-checklist) in the GitBook docs.
