# Feature Specification: Live Preview That Updates in Real Time

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
| Feature ID      | 004                                                                   |
| Status          | Draft                                                                 |
| Author          | Roald Neuteboom                                                       |
| Created         | 2026-10-20                                                            |
| Last updated    | 2026-10-20                                                            |
| Epic / Parent   | "Design Your Code" — `docs/product/story-map.md`, story 004           |
| Arc42 reference | Not yet established — arc42 docs are placeholder-only; see Section 9.3 |

### 1.1 Problem Statement

Spec 001 already makes the preview react instantly to content changes. But "Design Your Code" (stories 005–008) is about to add a growing set of visual customizations — logo placement, colors/shapes, code format, error-correction level — each of which can independently change whether the code still scans. Without a single, consistent contract for how the preview reacts to *any* change (content or design), each design story would have to reinvent update timing, loading feedback, and scannability safeguards on its own, and users would have no reliable way to trust a heavily customized code before printing or sharing it.

### 1.2 Goal

The preview is a single surface that updates live in response to a change in content (spec 001) or any active design parameter, with no manual "generate" or "apply" step. Changes that are cheap to apply (e.g. swapping a color) feel instant; changes that are more expensive to compute (e.g. processing an uploaded logo image) show a brief, non-blocking "updating" indicator rather than appearing frozen. As design parameters are layered on, the system continuously estimates whether the current combination (contrast, logo coverage, etc.) puts scannability at risk, and surfaces a clear warning — without blocking generation, since the estimate is a heuristic, not a guarantee. A zoom control lets the user inspect fine visual detail before trusting the result.

### 1.3 Non-Goals

- The content-entry pipeline itself (trimming, classification, scheme handling, capacity checks) — fully specified in story 001; this story only extends the *update contract* to cover design parameters as they're added.
- The specific design parameters themselves — logo placement (005), color/shape customization (006), code format (007), error-correction recommendation (008). This story defines the generic contract those stories plug into, not their individual controls.
- Guaranteeing scannability — no client-side heuristic can replace an actual scan test; this story only warns based on known risk factors (contrast, logo coverage), it never asserts a code will or won't scan.
- Blocking export on a scannability warning — exporting is story 013–015's responsibility; this story only surfaces the warning.
- Any actual scan-simulation/decoding of the generated code to verify it — out of scope; the warning is based on static heuristics, not a round-trip decode.

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: See every change reflected immediately

**As a** small business owner,
**I want** the preview to update as soon as I change anything — content or design — without clicking a button,
**so that** I can freely experiment and immediately see the result of each choice.

### US-002: Know the preview is working, not frozen

**As a** small business owner,
**I want** a brief visual cue when a change takes a moment to process (like uploading a logo),
**so that** I don't think the app has crashed or double-click/retry unnecessarily.

### US-003: Be warned before a design choice risks an unscannable code

**As a** small business owner,
**I want** to be warned if my color or logo choices put the code's scannability at risk,
**so that** I can fix it before printing or sharing, instead of finding out from a customer that it doesn't scan.

### US-004: Inspect fine detail before trusting the result

**As a** small business owner,
**I want** to zoom into the preview,
**so that** I can check small details (logo clarity, dot style, corner shape) that are hard to judge at normal size.

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                                                                                                                             | Priority | User Story |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------| -------- | ------------ |
| FR-001 | The system shall re-render the preview whenever content (spec 001) or any active design parameter changes, with no manual trigger required.             | Must     | US-001       |
| FR-002 | The system shall apply cheap design changes (e.g. color swap, shape/style selection) with the same ~150ms debounce as content (spec 001, NFR-001), so they feel effectively instant. | Must | US-001 |
| FR-003 | The system shall show a lightweight, non-blocking "updating" indicator whenever a change's processing time exceeds 300ms (e.g. logo image processing, format switch). | Must | US-002 |
| FR-004 | The system shall clear the "updating" indicator as soon as the new preview is ready, and shall never leave a stale preview visible once a new render completes. | Must | US-002 |
| FR-005 | The system shall compute a scannability-risk estimate from known risk factors (foreground/background contrast ratio, logo coverage percentage of the code area) whenever they change. | Must | US-003 |
| FR-006 | The system shall display a clear, non-blocking warning banner when the scannability-risk estimate crosses a risk threshold, naming the contributing factor(s) (e.g. "contrast is too low", "logo covers too much of the code"). | Must | US-003 |
| FR-007 | The system shall continue generating and displaying the QR code even when a scannability warning is active — the warning never blocks rendering. | Must | US-003 |
| FR-008 | The system shall provide a zoom control (e.g. +/- buttons or pinch/scroll) to magnify the preview, up to a level that makes individual dot/corner detail clearly visible. | Must | US-004 |
| FR-009 | The system shall continue to display spec 001's classification label and final encoded content next to the preview regardless of which design parameters are active. | Must     | US-001       |
| FR-010 | If a render fails for any reason (content, design parameter, or their combination), the system shall show an inline error state in the preview area, consistent with spec 001's NFR-004, rather than crashing or showing a stale/partial result. | Must | US-002 |

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: A cheap design change updates the preview without a button (FR-001, FR-002)

```gherkin
Given a QR code is already shown with a black foreground color
When the user selects a blue foreground color
Then the preview updates to show the blue foreground within ~150ms
  And no "generate" or "apply" action was required
```

### SC-002: An expensive change shows an updating indicator (FR-003, FR-004)

```gherkin
Given a QR code is already shown with no logo
When the user uploads a logo image that takes noticeably longer than 300ms to process
Then an "updating" indicator appears while processing is in progress
  And the indicator disappears as soon as the new preview (with the logo) is ready
```

### SC-003: No indicator flashes for fast changes (FR-003)

```gherkin
Given a QR code is already shown
When the user makes a change that completes well within 300ms
Then no "updating" indicator is shown
```

### SC-004: Low contrast triggers a scannability warning (FR-005, FR-006, FR-007)

```gherkin
Given the user sets a foreground/background color combination with a very low contrast ratio
Then a warning banner appears naming low contrast as the risk factor
  And the QR code is still generated and displayed
```

### SC-005: Oversized logo triggers a scannability warning (FR-005, FR-006, FR-007)

```gherkin
Given the user adds a logo that covers an unusually large percentage of the code's area
Then a warning banner appears naming excessive logo coverage as the risk factor
  And the QR code is still generated and displayed
```

### SC-006: Safe design choices show no warning (FR-005, FR-006)

```gherkin
Given the user's current colors have sufficient contrast and any logo is within the safe coverage range
Then no scannability warning is shown
```

### SC-007: Zooming reveals fine detail (FR-008)

```gherkin
Given a QR code is displayed with a custom dot style and a logo
When the user increases the zoom level
Then the preview magnifies, making individual dots, corners, and the logo clearly visible
```

### SC-008: Classification and content labels persist across design changes (FR-009)

```gherkin
Given the content is classified as "Link" with a visible encoded-content label
When the user changes the color scheme or dot style
Then the "Link" classification label and encoded-content text remain visible and unchanged
```

### SC-009: A failing render shows an inline error, not a crash (FR-010)

```gherkin
Given the user has selected a combination of content and design parameters that causes rendering to fail
Then an inline error state is shown in the preview area
  And the rest of the application remains usable
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### PreviewState

Represents the current rendering state of the preview surface. Derived from `QrContent` (spec 001) plus whatever design parameters later stories (005–008) introduce; not persisted.

| Attribute            | Type                                            | Constraints                                   | Description                                                                 |
| ---------------------- | -------------------------------------------------| ------------------------------------------------| ------------------------------------------------------------------------------ |
| renderStatus           | enum [idle, rendering, ready, error]             | derived                                         | `idle` before any content exists (spec 001 empty state); `rendering` while an in-flight update exceeds the indicator threshold (FR-003); `ready` once the current content+design combination has rendered; `error` on render failure (FR-010) |
| isUpdating             | boolean                                          | derived; true only while `renderStatus == rendering` | Drives the "updating" indicator (FR-003, FR-004)                             |
| zoomLevel              | number                                           | default `1.0`, bounded to a min/max range        | Current magnification applied to the preview (FR-008)                        |
| scannabilityRisk       | ScannabilityRisk (value object)                  | derived; recomputed whenever contributing design parameters change | Drives the warning banner (FR-005, FR-006)             |

### 5.2 Relationships

- `PreviewState` always reflects exactly one `QrContent` (spec 001) combined with whatever set of design parameters are currently active (introduced by stories 005–008) — the preview has no independent state of its own beyond zoom and render status.
- `PreviewState.scannabilityRisk` is recomputed from design-parameter attributes owned by later stories (e.g. foreground/background colors from story 006, logo dimensions from story 005) — this story defines the contract and the two risk factors known today; future design stories are expected to feed their relevant attributes into the same `ScannabilityRisk` computation rather than introducing separate warning mechanisms.

### 5.3 Value Objects

#### ScannabilityRisk

Derived and recalculated on every change to a contributing design parameter; carries no identity of its own.

| Attribute            | Type                          | Constraints                                                  |
| ---------------------- | -------------------------------| -------------------------------------------------------------- |
| contrastRatio          | number, nullable                | computed from active foreground/background colors; null until story 006 introduces color customization |
| logoCoveragePercent    | number, nullable                | computed from active logo size relative to code area; null until story 005 introduces logo upload |
| isAtRisk               | boolean                        | true if `contrastRatio` is below the safe threshold or `logoCoveragePercent` is above the safe threshold |
| riskFactors            | list of enum [lowContrast, excessiveLogoCoverage] | names which specific factor(s) triggered `isAtRisk`, for the warning message (FR-006) |

### 5.4 Domain Rules and Invariants

- **No manual trigger, ever**: `PreviewState` recomputes automatically on any change to `QrContent` or an active design parameter — there is no "generate" or "apply" action anywhere in the live-preview path (consistent with spec 001's zero-extra-click principle).
- **Debounce applies uniformly**: the ~150ms debounce from spec 001 (NFR-001) is the default for all cheap changes, content or design alike; only changes that empirically exceed 300ms processing time additionally surface the `isUpdating` indicator (FR-003) — debounce and the indicator are independent mechanisms, not alternatives.
- **The indicator never implies failure**: `isUpdating` only ever reflects "still computing," never an error; errors are communicated exclusively through `renderStatus == error`.
- **Warnings are advisory, not blocking**: `scannabilityRisk.isAtRisk` never prevents rendering or interaction — it only adds a visible banner (FR-007). This mirrors spec 001's capacity *warning* (as opposed to its hard capacity *block*, which has no analog here since scannability is a heuristic, not a measurable limit).
- **Risk factors degrade gracefully as design stories land incrementally**: before story 005/006 exist, `contrastRatio`/`logoCoveragePercent` stay `null` and contribute no risk — this story's warning mechanism must not assume either factor is always present.
- **Zoom is presentation-only**: changing `zoomLevel` never affects `encodedContent`, the rendered QR data, or any exported output (stories 013–015) — it only changes how the existing preview is displayed.

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category     | Requirement                                                                                                                                 |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-001 | Performance   | Cheap design-parameter changes shall apply within the same ~150ms debounce window as spec 001's content updates (NFR-001), so the whole preview feels uniformly responsive. |
| NFR-002 | Performance   | The "updating" indicator (FR-003) shall appear only after processing exceeds 300ms, to avoid flicker on fast changes that would otherwise flash the indicator for a single frame. |
| NFR-003 | Usability     | The scannability warning banner shall be dismissible visually (e.g. collapsible) without discarding the underlying design choice — dismissing the banner never reverts the color/logo change that triggered it. |
| NFR-004 | Reliability   | Zooming (FR-008) shall never trigger a re-render of the underlying QR code — it is a pure view-layer transform (e.g. CSS/canvas scale), to keep it instant regardless of render cost. |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                                                                                              | Expected Behavior                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------|
| EC-1 | The user changes multiple design parameters in rapid succession (e.g. drags a color slider) before the debounce window elapses | Only the final combination after the user pauses is rendered — intermediate values during active dragging are not each individually rendered. |
| EC-2 | A design change completes just under the 300ms indicator threshold on one device but just over it on a slower device | Expected and acceptable — the threshold is a fixed time budget, not a guarantee of identical behavior across all hardware; no special-casing required. |
| EC-3 | Both low contrast and excessive logo coverage are true at the same time                                | The warning banner lists both risk factors together (FR-006), not just the first one detected. |
| EC-4 | The user zooms in, then a live content/design change triggers a re-render                              | The re-render happens at the existing zoom level; zoom is not reset by unrelated preview updates (NFR-004). |
| EC-5 | A design parameter that contributes to `scannabilityRisk` is removed entirely (e.g. logo deleted)       | That factor's value reverts to `null`/not-contributing and `isAtRisk` is recomputed without it — same as its pre-introduction state. |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| SC-001 | All acceptance scenarios in Section 4 (SC-001–SC-009) pass in automated and/or manual testing.                   |
| SC-002 | No user action in the "Design Your Code" epic (stories 005–008) ever requires a manual "generate"/"apply" click to see its effect in the preview, once each is implemented against this contract. |
| SC-003 | 100% of changes exceeding the 300ms threshold in test scenarios show the updating indicator; 0% of changes completing under 300ms show any indicator flicker. |
| SC-004 | Users can identify, without documentation, that a scannability warning is advisory (code still renders) rather than blocking. |

## 9. Dependencies and Constraints

### 9.1 Dependencies

- Spec 001's `QrContent`, live-update pipeline, and ~150ms debounce (NFR-001), reused as the baseline update mechanism this story extends to design parameters.
- Stories 005 (logo), 006 (colors/shapes), 007 (format), and 008 (error-correction) are expected to feed their respective parameters into this story's `PreviewState`/`ScannabilityRisk` contract rather than building their own independent update or warning mechanisms.
- A QR rendering approach capable of fast re-renders and, ideally, incremental/partial updates for performance (specific library/approach TBD at implementation time — same library dependency noted in spec 001).

### 9.2 Constraints

- Fully client-side: no backend, no network calls — all rendering, debouncing, and risk computation happen locally in the browser, per the project-wide goal in `docs/product/story-map.md`.
- The scannability heuristic is necessarily approximate; it is explicitly a judgment aid, not a certification that a code will scan (see Non-Goals, 1.3).

### 9.3 Architecture References

_Arc42 documentation (`docs/architecture/`) is currently placeholder-only. The references below describe intended relevance; the arc42 sections themselves still need to be filled in._

| Arc42 Section                      | Relevance to This Feature                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 5. Building Block View              | Establishes the preview/render component as a shared surface consumed by stories 001 and 005–008; not yet decomposed in arc42. |
| 8. Crosscutting Concepts            | The "no manual trigger, debounce + indicator threshold" update pattern and the advisory-warning pattern should be promoted to project-wide crosscutting concepts, since every future design story builds on them. |
| 10. Quality Requirements            | NFR-001–NFR-004 are feature-specific for now; promote the debounce/indicator timing constants if they recur unchanged across design stories. |

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
