<!--
Thanks for the PR. A few quick checks before you submit:
- Branch is descriptive (fix/foo, feat/bar, docs/baz)
- Commit messages follow conventional-commit prefixes (feat:, fix:, docs:, chore:, release:)
- No `Co-Authored-By` trailers unless a real human collaborator
-->

## Summary

<!-- What does this change, and why? Link any related issues. -->

## Test plan

<!-- Check the boxes you've actually verified locally. -->

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — ESM + CJS + types build clean
- [ ] `npm test` — live mainnet integration suite passes (or note why skipped)
- [ ] Manual smoke test of the changed surface (note what you ran)
- [ ] For ABI changes: diffed against the canonical r12 JSON, no signature drift

## Breaking changes

<!--
List any source-breaking changes here with before/after snippets.
If none, write "None".
Example:

- `client.events.getCollateralReturnedEvents` renamed to `getExcessCollateralReturnedEvents`.
  Field shape changed:
  ```typescript
  // before
  event.amountReturned // bigint
  // after
  event.collateralReturned // bigint
  ```
-->

## Codex review

<!--
For non-trivial changes (anything touching ABIs, payable functions, or
zero-address logic), run /codex review and /codex challenge. Paste a
one-line summary of any findings.

If the change is a typo / docs / trivial, skip this section.
-->

## Checklist

- [ ] CHANGELOG.md updated under the next planned version
- [ ] Migration guide updated if breaking
- [ ] GitBook docs updated if user-facing surface changed
- [ ] No `Co-Authored-By` trailers (unless a real collaborator)
