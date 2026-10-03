# Generated identity alias consistency

3 October 2026. No assets were generated or changed; no visual gender inference or voice call was used.

## Confirmed defect

The public case in [disclosure-live-v4.json](evidence/disclosure-live-v4.json) records `suspect_name: Mira Venn`, `suspect_gender: woman`, and `portraitId: 09-m`. The mismatch is demonstrable from the authored **casting policy**, without interpreting the portrait pixels or inferring identity from a name or filename: the analyst rule in `src/lib/art/portraits.ts` explicitly chooses `06-f` for its `female` branch and `09-m` for its `other` branch. Only the exact string `female` reached that branch. `woman` therefore used `other`, despite expressing the same intended generated identity category.

`prepareCase` assigned and persisted that portrait after validation. The free-text `suspect_gender` schema accepts `woman`; validation merely trims the field. The voice function likewise chooses its authored female voice pool only for `female`, so a new case retaining `woman` selected the male voice pool. These are inconsistent alias handling defects, not evidence about anyone's gender from their appearance or voice.

## Correction and compatibility

`src/lib/character-identity.ts` normalizes explicit aliases only: woman/female, man/male, and the three supported spellings of nonbinary. Matching ignores surrounding whitespace and case. Unknown strings return no normalization; the code does not infer identity from names, roles, pronouns or artwork.

New-case preparation canonicalizes this field before selecting and persisting its portrait. Therefore a newly generated woman analyst receives the intended `06-f` portrait and the canonical `female` value consumed by the existing voice selector. The portrait selector also understands these aliases when called directly. Existing role pools, images and the authored Casey casting remain unchanged.

Existing saved sessions and generation checkpoints are not recast. Their explicit portrait IDs remain authoritative, and the voice function retains its prior behavior so existing voice receipt fingerprints do not silently change. Consequently the already captured Mira session keeps `09-m` and its legacy voice mapping; the correction applies to newly created cases. Historical evidence has not been rewritten to imply otherwise.

## Executed verification

- [Four focused art/alias checks](evidence/identity-consistency-checks.txt) passed: retained PNGs match authored dimensions; role choices and saved IDs remain stable; explicit woman/man aliases choose intended branches; actual `pickVoice` receives the canonical new identity and selects the expected configured pool. Names and unspecified identities are not normalized.
- [One actual generation-route check](evidence/identity-generation-route.txt) passed. The existing test file `tests/generated-case-contract.test.ts` supplies a controlled provider candidate with `woman` and a controlled valid review. Actual POST case creation returns `female`/`06-f`; direct durable-repository load contains the same identity; actual session GET recovers it. Repeating the creation request replays the same case after exactly two controlled provider calls (generation plus review). A separately persisted legacy woman/`09-m` session recovers unchanged with its old voice mapping.
- [Scoped strict ESLint](evidence/identity-consistency-lint.txt) and [size checks](evidence/identity-consistency-size.txt) exited zero. Root owns the combined final build after this source change.

The route test executes the real creation, persistence and public-recovery path, but uses controlled transports and makes no live inference or ElevenLabs call. It does not establish rendered portrait appearance, audio quality, or rights/provenance of the retained artwork. No full test suite, browser interaction or new image generation was needed for this correction.

Skills applied: dec-quality-testing, dec-software-principles.
