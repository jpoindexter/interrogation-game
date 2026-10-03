# Existing artwork and identity contract

2026-10-03. Preserve the current noir pixel-art world. No image has been regenerated, repainted, cropped on disk, or deleted in this increment.

## Reference set

The inspected contact sheet is [design-contact-sheet.jpg](evidence/design-contact-sheet.jpg). It brings together all eleven current portraits, nine room backgrounds, outcome art, paper props, clues and principal logos. `public/clues/folder.png` was also inspected directly at its original 64×64 size.

The visual rules are cool blue/green rooms, warm amber practical lights, black surrounds, restrained gold/red accents and textured paper/cassette props. Portraits keep their amber background, bust framing and clear dark silhouette. Use square display boxes with `object-fit: cover`; the source files are not all square (the accountant portrait is 982×1024). Preserve hard pixel edges and avoid arbitrary smooth filters. UI text remains live HTML; decorative pictures must not carry instructions or determine the case outcome.

No new-render contact sheet has been approved. There is no demonstrated need to replace the room or portrait families. A future missing wardrobe needs a targeted reference-based candidate and inspection at the actual display size before replacing an original. This document records existing direction; it is not a claim of user approval of new art.

## Stable character identity

`src/lib/art/portraits.ts` is the allowlisted catalog. It records observed wardrobe, broad age presentation and suitable fictional wardrobe contexts. Those observations are not evidence of any real person's identity, job or guilt. The historical filename suffixes remain storage identifiers, not identity labels.

Generated cases are assigned a `portraitId` once after server validation using their role/wardrobe context and existing gender presentation hint. Names are never hashed. The selected ID is persisted with the case and retained through public restoration/result data. Briefing and interrogation read the same ID. Legacy cases without an ID use one stable neutral office fallback. No new result portrait layout was added; result data retains the identity for reuse.

The authored Casey Vale case uses `AUTHORED_PORTRAIT` (`11-m`) as an explicit fictional casting choice, independent of Casey's nonbinary identity. This selection does not infer gender from appearance. Current gaps include no male-presenting white-coat portrait; those generated clinical roles use generic office attire instead of mismatching the existing clinical character. No unsupported age or ethnicity is added to generated case facts.

## Outcome presentation

Every existing `public/solved` ending illustration contains generated lettering and inconsistent compositions. The five result/help states now share the existing text-free folder motif. Results display it at its native 64×64 size, as decoration with empty alt text, followed by the actual outcome as a live heading. This keeps silhouette, scale and visual weight consistent without a paid generation or a new visual language. Outcome distinctions come from text and recorded case facts. Original outcome files remain preserved as historical source material; the existing solved-card stamp remains in its separate card role.

Browser layout, 200% zoom, final crop and video-call legibility have not been inspected. Source/SSR checks show semantic headings and decorative image markup, not completed accessibility acceptance.

## Provenance and rights

[evidence/asset-manifest.json](evidence/asset-manifest.json) inventories every current public file: original path, exact bytes, SHA-256, measured raster dimensions, source references, dynamic-family caveats, provenance notes and keep/retire decision. The inventory contains 134 files and 33,413,148 bytes; 82 raster dimension pairs were read from actual PNG headers or `sips`. These disk totals are not initial page-transfer or runtime-memory measurements. No file is declared unused solely because a literal reference was not found.

Commit `cb936fab25711f1d4a35e1922fe92696de1e2640` explicitly describes replacing eleven portraits with Sora-generated images. The existing PixelLab generation script describes earlier output filenames and dimensions; it is not a per-file receipt for current Sora portraits. Repository credits mention other generators, but no per-file generation receipts or media-specific rights documents were verified. Every manifest record therefore labels rights **unverified**, including files with a repository attribution. The source-code license is not used as proof of third-party media clearance. No rights clearance or legal conclusion is claimed.

## Executed checks

- Actual retained portrait files exist and PNG dimensions match the app's intrinsic metadata.
- Role selection and explicit-ID stability have focused tests; invalid asset IDs resolve to the allowlisted fallback.
- The shared result icon is exactly 64×64; SSR output includes a live outcome heading and decorative image.
- Styles were split into foundation, activity, controls, accessibility and atmosphere modules, each below 300 physical lines. Tailwind remains first. The compiled PostCSS rule/declaration trees match before/after extraction after whitespace normalization, with no compiler warnings.
- Scoped strict ESLint and TypeScript are checked at handoff. These do not prove browser rendering or a complete game.

Skills applied: enforcing-code-size, dec-accessibility, dec-software-principles, dec-css-architecture, iconography-and-imagery.
