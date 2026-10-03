# Dependency remediation follow-up

Checked 2026-10-03. **Five high development dependency findings remain; production audit reports zero.** No package or lockfile changes were applied during this check. This does not claim an advisory-free project.

## Current releases and dependency path

The installed path is `eslint-config-next@16.3.8 → @next/eslint-plugin-next@16.3.8 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`.

Registry checks still identify `braces@3.0.3`, `micromatch@4.0.8`, and `eslint-config-next@16.3.8` as latest. The [reviewed braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) identifies deeply nested patterns as the stack-exhaustion trigger and lists no patched version. `fast-glob@3.3.3` is newer than Next's exact pin, but retains the same vulnerable micromatch/braces dependency, so upgrading it would not remediate this finding.

The five npm findings describe propagation of this one underlying advisory. npm's proposed `eslint-config-next@14.2.35` downgrade would break the paired Next 16 baseline and was not applied.

## Replacement tested and rejected

An isolated temporary install tested a **Next-plugin-scoped** npm alias from `fast-glob` to `tinyglobby@0.2.17`. That installation reported zero audit findings, but the actual Next `getRootDirs` function failed behavioral parity:

| Input | Existing fast-glob result | Replacement result |
| --- | --- | --- |
| `rootDir: 'apps/store'`, containing `pages/` | `['apps/store']` | `['apps/store/', 'apps/store/pages/']` |

Next's plugin calls `globSync(pattern, { onlyDirectories: true })`. Tinyglobby also expands literal directory paths by default. Its [migration guide](https://superchupu.dev/tinyglobby/migration#switching-from-fast-glob) explicitly requires `expandDirectories: false` when migrating from fast-glob. An alias cannot insert that option into Next's call. Removing Next's lint plugin would also remove framework checks. Neither approach satisfies compatibility.

The candidate was rejected after this first disconfirming check; no broad suite or downstream lint run was needed. A maintained Next plugin migration or a reviewed upstream braces fix is the preferred next remediation. A custom compatibility package/fork would add a new maintained dependency surface and has not been implemented or verified.

## Exposure and evidence

The inspected Next plugin uses this glob function only for `settings.next.rootDir`, consumed by `no-html-link-for-pages`. This repository does not configure that setting; the default uses ESLint's current working directory. That source observation narrows the currently exercised path, but does not remove the installed vulnerable package or prove absence of all exploitation paths.

- [Full audit](evidence/dependency-followup-audit.json): executed with Node 24.21.0 / npm 11.21.0; five high findings.
- [Production audit](evidence/dependency-followup-production.json): executed with the same versions; zero findings.
- [Replacement check](evidence/dependency-replacement-check.json): registry versions, candidate scope, exact failed Next root-discovery result, and rejection.

ARCH-02 and ARCH-14 remain open for this dependency criterion. Existing build/browser/provider evidence is separate; none was rerun or implied by this package investigation.

## Compatibility module experiment — not adopted

A temporary private wrapper added `expandDirectories: false` around tinyglobby. With pinned Node24.21/npm11.21, the scoped local `file:` override installed a link relative to the Next plugin directory instead of the repository root. The actual plugin import failed with `MODULE_NOT_FOUND` before behavioral comparison. A root dependency plus npm `$` override reference was also tried in existing and fresh isolated directories; that follow-up used the machine's Node22.23.2/npm10.9.8 and reproduced the broken link. It is not a pinned-runtime acceptance result.

[Retained follow-up result](evidence/dependency-compatibility-rejected.json) records the exact recipe, versions and lock entries. Both candidate install audits reported zero, but neither provides working-plugin acceptance. Zero of the planned root-discovery/rule comparisons executed. No wrapper, dependency override or lockfile modification was adopted. The prior five development findings remain visible; no additional package experiments are needed for the local interview path.
