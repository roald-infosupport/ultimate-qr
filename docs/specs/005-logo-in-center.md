# Feature Specification: Add a Logo/Image to the Center of the Code

<!--
  TEMPLATE INSTRUCTIONS
  =====================
  Fill in each section focusing on WHAT the feature does and WHY — not HOW it should
  be implemented.

  Usage:
  - One spec per feature or functional slice
  - Store in docs/specs/ and version-control alongside your code
  - Use [NEEDS CLARIFICATION: question] markers for unresolved decisions (max 3)
  - Remove optional sections that don't apply — don't leave them as N/A
  - Reference your arc42 architecture docs where relevant rather than duplicating them
-->

## 1. Overview

| Field           | Value                                                                 |
| --------------- | ---------------------------------------------------------------------|
| Feature ID      | 005                                                                   |
| Status          | Draft                                                                 |
| Author          | Roald Neuteboom                                                       |
| Created         | 2026-10-20                                                            |
| Last updated    | 2026-10-20                                                            |
| Epic / Parent   | "Design Your Code" — `docs/product/story-map.md`, story 005           |
| Arc42 reference | Not yet established — arc42 docs are placeholder-only; see Section 9.3 |

### 1.1 Problem Statement

A plain QR code looks anonymous and generic — small business owners and sports clubs want a code that's instantly recognizable as theirs, by placing their own logo at its center. Most free tools either don't support this at all, or let a logo be dropped in without accounting for how much it occludes the underlying data, silently producing a code that looks right on screen but fails to scan in practice.

### 1.2 Goal

A user can upload a small logo image (`.png`, `.jpg`/`.jpeg`, `.svg`) and have it rendered centered on top of the QR code by default, sized within a safe range, backed by a solid plate so it never blends into the surrounding modules. The logo can also be dragged to a different position within the code's bounds. Adding a logo automatically raises the error-correction level enough to tolerate the occlusion, and the logo's coverage feeds spec 004's live scannability-risk warning so the user sees, in real time, whether their chosen size is pushing into risky territory. The logo can be resized within the safe range, repositioned, or removed entirely, instantly reverting the code to its prior state.

### 1.3 Non-Goals

- Repeating/tiled logo placement, or placement outside the code's bounds — the logo defaults to center and can be dragged anywhere within the code, but always stays fully within its bounds.
- Using an uploaded file as the QR's actual encoded *content* (story 002) — this story is a purely visual overlay on top of whatever content is already encoded.
- Image editing tools (crop, rotate, filters, background removal) — the user must bring an already-suitable image; only centering, safe-range resizing, and backing-plate rendering are provided.
- Animated image formats (`.gif`, `.webp` animations) — a logo is always rendered as a single static frame; animated formats are rejected.
- Choosing the QR module/dot style, corner style, or color scheme — that's story 006; this story only concerns the logo overlay and its backing plate.
- Manually choosing the error-correction level — that's story 008's guided recommendation; this story only defines the safe-default bump needed to keep a logo-bearing code viable, which story 008 is expected to later supersede with a fuller recommendation.

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: Brand the code with my own logo

**As a** small business owner,
**I want** to upload my logo and have it appear centered on the QR code,
**so that** people recognize the code as coming from my business before they even scan it.

### US-002: Resize my logo within a safe range

**As a** small business owner,
**I want** to adjust how large my logo appears, within limits that keep the code reliably scannable,
**so that** I can balance brand visibility against a working code without guessing.

### US-003: Trust that my logo won't blend into the code

**As a** small business owner,
**I want** my logo to sit on a solid background plate rather than directly over the QR pattern,
**so that** a logo with transparent areas or busy edges doesn't visually merge with the surrounding modules.

### US-004: See a warning if my logo size is risky

**As a** small business owner,
**I want** to see a live warning if my logo is covering too much of the code,
**so that** I can shrink it before printing or sharing, rather than finding out it doesn't scan after the fact.

### US-005: Remove the logo and go back to a plain code

**As a** small business owner,
**I want** to remove my logo with one action,
**so that** I can quickly compare against a plain code or start over without re-entering my content.

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                                                                                                                             | Priority | User Story |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------| -------- | ------------ |
| FR-001 | The system shall accept a logo image upload (via file picker and/or drag-and-drop) restricted to `.png`, `.jpg`/`.jpeg`, `.svg`.                        | Must     | US-001       |
| FR-002 | The system shall reject any logo file whose type is not in the accepted list, with a message naming the supported formats.                              | Must     | US-001       |
| FR-003 | The system shall reject a logo file that fails to decode/load (corrupt or invalid image data) with a clear error message, without crashing the preview.  | Must     | US-001       |
| FR-004 | The system shall render an accepted logo centered on top of the QR code in the live preview (spec 004).                                                 | Must     | US-001       |
| FR-005 | The system shall render a solid-color backing plate behind the logo, sized slightly larger than the logo itself, so that transparent or irregular logo edges never expose the QR pattern underneath in a way that looks merged. | Must | US-003 |
| FR-006 | The system shall provide a size control, expressed as a percentage of the code's width, bounded to a safe range (default maximum 30%) that the user cannot exceed. | Must | US-002 |
| FR-007 | The system shall automatically raise the active error-correction level to at least Q whenever a logo is active, reverting to the prior level when the logo is removed, unless story 008's guided recommendation later overrides this default. | Must | US-002 |
| FR-008 | The system shall continuously report the logo's current coverage percentage of the code area to spec 004's `ScannabilityRisk.logoCoveragePercent`, so the live warning banner reflects the current logo size. | Must | US-004 |
| FR-009 | The system shall provide a one-action "remove logo" control that instantly reverts the preview to a plain code and restores the error-correction level that was active before the logo was added (unless the user has since changed it explicitly). | Must | US-005 |
| FR-010 | The system shall re-render the logo overlay live as the size control is adjusted, consistent with spec 004's update contract (debounce for the slider, indicator if processing exceeds the 300ms threshold). | Must | US-001, US-002 |
| FR-011 | The system shall default the logo's position to the code's center and allow the user to drag it to a different position, constrained so the logo (with its backing plate) always stays fully within the code's bounds. | Must | US-001, US-002 |

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: Uploading a supported logo renders it centered (FR-001, FR-004)

```gherkin
Given a QR code is already shown with no logo
When the user uploads "logo.png"
Then the logo appears centered on top of the QR code in the live preview
```

### SC-002: Unsupported logo format is rejected (FR-002)

```gherkin
Given a QR code is already shown with no logo
When the user attempts to upload "logo.gif"
Then the upload is rejected
  And a message lists the supported formats (.png, .jpg/.jpeg, .svg)
```

### SC-003: Corrupt image file is rejected gracefully (FR-003)

```gherkin
Given a QR code is already shown with no logo
When the user uploads a file with a ".png" extension but invalid/corrupt image data
Then the upload is rejected with a clear error message
  And the preview remains showing the plain code, unaffected
```

### SC-004: Logo renders on a solid backing plate (FR-005)

```gherkin
Given the user uploads a logo with transparent corners
Then the logo is displayed on a solid-color plate slightly larger than the logo
  And no QR modules are visible showing through the transparent areas
```

### SC-005: Logo size is bounded to the safe range (FR-006)

```gherkin
Given a logo is active
When the user attempts to increase the logo size control beyond the maximum (30%)
Then the size is capped at the maximum
  And the control does not allow exceeding it
```

### SC-006: Adding a logo raises the error-correction level (FR-007)

```gherkin
Given the active error-correction level is Medium (spec 001 default) and no logo is active
When the user adds a logo
Then the active error-correction level becomes at least Q
```

### SC-007: Removing a logo restores the prior error-correction level (FR-007, FR-009)

```gherkin
Given a logo is active and the error-correction level was automatically raised to Q
  And the user has not manually changed the error-correction level since
When the user removes the logo
Then the preview reverts to a plain code
  And the error-correction level reverts to the level that was active before the logo was added
```

### SC-008: Logo coverage drives the live scannability warning (FR-008)

```gherkin
Given a logo is active at a size near the safe maximum
Then spec 004's scannability-risk warning banner appears, naming excessive logo coverage as a factor
When the user reduces the logo size well below the risk threshold
Then the warning banner disappears
```

### SC-009: Resizing the logo updates the preview live (FR-010)

```gherkin
Given a logo is active
When the user drags the size control
Then the preview updates the logo size live, following spec 004's update contract (debounced, with an indicator only if processing exceeds 300ms)
```

### SC-010: Removing the logo reverts to a plain code (FR-009)

```gherkin
Given a logo is active
When the user activates "remove logo"
Then the preview immediately shows a plain code with no logo or backing plate
```

### SC-011: Dragging the logo repositions it within the code's bounds (FR-011)

```gherkin
Given a logo is active at its default centered position
When the user drags the logo to a new position within the code
Then the logo (with its backing plate) moves to follow the drag
  And it cannot be dragged beyond the code's bounds
When a new logo is uploaded, or the current logo is removed and re-added
Then its position resets to center
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### LogoConfiguration

Represents the logo overlay currently applied to the QR code, if any. Not persisted in this story (saving/loading as part of a template is story 009–011's responsibility).

| Attribute            | Type                        | Constraints                                                   | Description                                                                 |
| ---------------------- | -----------------------------| ----------------------------------------------------------------| ------------------------------------------------------------------------------ |
| isActive               | boolean                     | default `false`                                                 | Whether a logo is currently applied (FR-009)                                 |
| fileName               | string, nullable             | set only when `isActive`                                        | Original file name as uploaded                                               |
| extension              | enum [png, jpg, jpeg, svg], nullable | restricted to accepted list; set only when `isActive`     | Determines acceptance (FR-001, FR-002)                                       |
| imageData              | bytes, nullable              | set only when `isActive`; decoded/validated (FR-003)             | The logo image data used for rendering                                       |
| sizePercent            | number                      | 0 < value ≤ 30 (default maximum); only meaningful when `isActive` | Logo width as a percentage of the code's width (FR-006)                      |
| backingPlateColor      | string (color)               | derived; defaults to the code's current background color         | Solid color rendered behind the logo (FR-005)                                |
| positionPercent        | { x: number, y: number }     | each 0–100; default `{ x: 50, y: 50 }` (center); constrained so the logo+plate stays within the code's bounds | User-draggable position, as a percentage of the code's frame (FR-011)        |
| errorCorrectionLevelBeforeLogo | enum [L, M, Q, H], nullable | captured at the moment a logo is first added                | Used to restore the prior level on removal (FR-007, FR-009), unless the user has since changed it explicitly |

### 5.2 Relationships

- `LogoConfiguration` is an optional overlay on the code produced from `QrContent` (spec 001) — it never alters `encodedContent`, only the visual rendering layered on top of it.
- `LogoConfiguration.sizePercent` continuously feeds spec 004's `ScannabilityRisk.logoCoveragePercent` — this story is the first (and currently only) producer of that value object's logo-related field.
- Adding/removing a `LogoConfiguration` mutates the active error-correction level used by spec 001/004's capacity and rendering pipeline — a cross-cutting link that story 008 is expected to take over and generalize.

### 5.3 Value Objects

No new value objects — this story populates spec 004's existing `ScannabilityRisk.logoCoveragePercent` field rather than introducing a parallel one.

### 5.4 Domain Rules and Invariants

- **Logo is overlay-only**: a `LogoConfiguration` never changes `QrContent.encodedContent` (spec 001) — it is a rendering concern layered on top of an otherwise-unchanged encoded payload.
- **Size is always bounded**: `sizePercent` can never be set, via any control, above the safe maximum (default 30%) — there is no "advanced"/unsafe override in this story.
- **Error-correction bump is conditional on no manual override**: FR-007's automatic level change only applies if the user hasn't manually set a different level themselves since the logo was added; a manual choice is never silently overwritten by adding or removing a logo.
- **Backing plate always exists when a logo is active**: there is no mode in which a logo renders directly over QR modules without a backing plate — it exists unconditionally for correctness of scanning, not as a stylistic option.
- **Position is always bounded**: `positionPercent` can never be dragged, via any control, to a point where the logo+plate would extend beyond the code's bounds (FR-011).
- **Removal is a full revert**: removing a logo (FR-009) clears `imageData`, `fileName`, `extension`, `sizePercent`, `positionPercent` (reset to center), and `backingPlateColor`, and restores `errorCorrectionLevelBeforeLogo` (if no manual override occurred) — it never leaves partial logo state behind.
- **Coverage recomputation is live**: `logoCoveragePercent` (consumed by spec 004) is recalculated immediately whenever `sizePercent` changes, feeding the live scannability warning without any additional user action.

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category     | Requirement                                                                                                                                 |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-001 | Security      | SVG logo previews shall be rendered using a non-script-executing method (e.g. an `<img>` element), never inline DOM injection, `<object>`, or `<iframe>`, consistent with spec 002's NFR-002, so embedded scripts in a malicious SVG logo can never execute. |
| NFR-002 | Reliability   | The system shall check the raw logo file size against a sanity limit immediately upon selection, before reading its contents into memory, rejecting absurdly large files early, consistent with spec 002's NFR-004. |
| NFR-003 | Performance   | Logo resizing (FR-010) shall follow spec 004's update contract — cheap adjustments within the ~150ms debounce, with the "updating" indicator appearing only if processing exceeds 300ms. |
| NFR-004 | Usability     | The size control shall visually communicate the safe maximum (e.g. the slider has no travel past 30%), rather than allowing the user to attempt an invalid value and only then rejecting it. |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                                                                                              | Expected Behavior                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------|
| EC-1 | The uploaded logo has a non-square aspect ratio                                                       | The logo is scaled to fit within the sizePercent bounds on its longest dimension and centered as-is (no forced cropping to a square) — the backing plate is sized to fully contain it. |
| EC-2 | The user uploads a new logo while one is already active                                               | The new logo entirely replaces the old one (file, size, backing plate) — same replace-not-merge pattern as spec 002's `UploadedFile`. |
| EC-3 | The user manually changes the error-correction level while a logo is active, then removes the logo    | The manual level is preserved on removal — FR-007/FR-009's auto-revert does not apply once an explicit manual choice has been made (see Domain Rules, 5.4). |
| EC-4 | The logo's extreme-edge pixels are nearly transparent rather than fully transparent (soft/anti-aliased edges) | Treated the same as fully transparent for backing-plate purposes (FR-005) — the plate is sized with enough margin that soft edges never visually expose the QR pattern underneath. |
| EC-5 | The code's background color (from story 006, once it exists) changes while a logo is active            | `backingPlateColor` tracks the current background color going forward so the plate never looks like a mismatched patch; existing logo size/position are unaffected. |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------|
| SC-001 | All acceptance scenarios in Section 4 (SC-001–SC-010) pass in automated and/or manual testing.                    |
| SC-002 | 100% of malicious-SVG logo test files (containing embedded `<script>` or event-handler attributes) render as static images with zero script execution, verified via security testing. |
| SC-003 | Generated codes with a logo at or below the safe maximum coverage scan successfully with standard smartphone camera apps in manual testing. |
| SC-004 | A user can go from logo upload to a visually confirmed, branded, scannable QR code with zero required clicks beyond selecting the file and optionally adjusting size. |

## 9. Dependencies and Constraints

### 9.1 Dependencies

- Spec 001's `QrContent` and error-correction-level concept, extended here with an automatic logo-driven level bump.
- Spec 004's `PreviewState`/`ScannabilityRisk` contract — this story is the first to populate `logoCoveragePercent` and to rely on the update/indicator mechanism for a genuinely expensive operation (image decode + overlay render).
- Spec 002's file-handling conventions (accepted-format rejection messaging, early size-sanity check, non-script-executing SVG rendering) — reused here for logo uploads even though the underlying entity (`LogoConfiguration`) is distinct from `UploadedFile`.
- Story 008 (guided error-correction recommendation) is expected to eventually supersede this story's fixed "bump to Q" default with a fuller, context-aware recommendation.
- A QR rendering approach capable of compositing a backing plate and logo image centered over the generated code (specific library/approach TBD at implementation time).

### 9.2 Constraints

- Fully client-side: the logo file is never uploaded to any server; all reading, decoding, and compositing happen locally in the browser.
- The safe maximum coverage (default 30%) is a conservative, fixed default for this story; it is not user-configurable beyond the provided size control's range.

### 9.3 Architecture References

_Arc42 documentation (`docs/architecture/`) is currently placeholder-only. The references below describe intended relevance; the arc42 sections themselves still need to be filled in._

| Arc42 Section                      | Relevance to This Feature                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 5. Building Block View               | Introduces a logo-upload/validation component and a compositing (backing plate + overlay) step in the render pipeline; not yet decomposed in arc42. |
| 8. Crosscutting Concepts             | Extends the "never execute embedded scripts in user content" rule (spec 002) to a second upload surface — consolidate into one project-wide rule once arc42 is filled in. |
| 10. Quality Requirements             | NFR-001–NFR-004 are feature-specific for now; the 30% safe-maximum constant is a candidate for promotion once story 008 formalizes error-correction/logo-size tradeoffs project-wide. |

## 10. Open Questions

_Track unresolved decisions here. Aim to have zero open questions._

No open questions remain — all ambiguities identified during specification were resolved in discussion (see defaults and decisions recorded inline above).

---

<!--
  CHECKLIST
  =========
  - [x] Problem statement is clear and concise
  - [x] All user stories have acceptance scenarios
  - [x] Each functional requirement traces to a user story
  - [x] Domain model covers all entities mentioned in the requirements
  - [x] Domain rules and invariants are listed
  - [x] Edge cases cover failure modes, not just happy paths
  - [x] Non-functional requirements are specific and measurable
  - [x] Arc42 references point to the right sections (pending arc42 docs being filled in)
  - [x] No more than 3 [NEEDS CLARIFICATION] markers remain (zero used)
  - [x] Open questions are assigned and have a resolution path (none remain)
-->
