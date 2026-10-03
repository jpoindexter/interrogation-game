# Responsive source corrections

Three concrete source gaps were corrected after checking the original UX-05, UX-10 and UX-24 criteria. This is not completion of their browser/contrast acceptance gates.

## Changes

- **Briefing leads:** the completed briefing now includes a compact labelled lead list inside its existing scrollable paper document below the `lg` breakpoint. The original desktop sticky notes remain. Complementary `lg:hidden` and `hidden lg:flex` display rules expose one presentation at a time; neither duplicates accessible content at the same breakpoint. Leads follow the existing completed-text/Skip reveal boundary. The empty state adds no heading.
- **Paper contrast:** the expanded case-card description now carries `data-surface="paper"`. Its threshold label therefore uses the existing dark-ink high-contrast override instead of inheriting the global white gray-text override. Its accent uses the existing dark paper token. No new palette or global selector was introduced.
- **Preference scaling:** literal 8, 9, 10 and 11 pixel type was converted to 0.5, 0.5625, 0.625 and 0.6875 rem. Scope: CaseTabs, LogPage, CaseFilePage, PolaroidCard, BriefingDialog, cases/page, ShareModal, ClueNotification, TapePlayer, EvidencePage, SuspectZone, BriefingScreen, SettingsPanel and the tooltip text rule in styles/controls.css. At the usual 16px root these preserve the original sizes, while allowing the existing Small/Medium/Large root-font preference to affect them. This does not claim that the original base sizes are sufficient for screen sharing.

## Executed checks

[One focused existing-harness check](evidence/responsive-source-focused.txt) rendered the actual BriefingDialog component with React server rendering. It confirmed both lead strings in the narrow semantic list, complementary desktop visibility markup, placement in the scrollable body, no premature list during partial text, and no empty list. No source-string test or browser automation was used.

Scoped strict lint and size/complexity checks passed for the changed UI modules and affected test file. A final app-wide text-size scan found no remaining literal pixel font sizes in text utilities, inline fontSize properties or font-size declarations; image, geometry, border and art pixel values were preserved. The remaining numeric SVG fontSize in the aria-hidden ClueMarker is a viewBox-scaled decorative glyph, not CSS-pixel interface typography, and remains unchanged. The additional conversion introduced no new tests. TypeScript and `git diff --check` passed. No provider, voice, network, full test suite or production build ran for this scoped change. Root owns integrated validation.

## Limits

Actual responsive layout, CSS visibility in the accessibility tree, focus, rendered contrast and preference changes at 390px/200% zoom remain unexecuted. The source now supplies the previously missing narrow content and correct styling hooks, but rendered acceptance remains user-owned. No broader settings, panel-dragging or audible screen-share claim follows from these corrections.

Skills applied: dec-accessibility, dec-css-architecture, dec-quality-testing.
