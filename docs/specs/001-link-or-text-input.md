# Feature Specification: Enter a Link or Text to Turn Into a QR Code

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
| Feature ID      | 001                                                                   |
| Status          | Draft                                                                 |
| Author          | Roald Neuteboom                                                       |
| Created         | 2026-10-20                                                            |
| Last updated    | 2026-10-20                                                            |
| Epic / Parent   | "Add Your Content" — `docs/product/story-map.md`, story 001           |
| Arc42 reference | Not yet established — arc42 docs are placeholder-only; see Section 9.3 |

### 1.1 Problem Statement

Small business owners and sports clubs want to turn a link or a piece of text into a QR code quickly, without technical knowledge. Existing tools gate this basic step behind signups, ads, upsells, or cluttered interfaces, adding friction to something that should be instant.

### 1.2 Goal

A user can type or paste a link or plain text into a single input field and immediately see a valid QR code that encodes that content — no account, no extra clicks, no gatekeeping. Input is trimmed of leading/trailing whitespace, classified as `Link` or `Text` via regex, and, by default, a missing `https://` scheme is automatically added to inputs classified as `Link`. This scheme addition is toggleable off (and back on), and the preview always shows the exact content that will be encoded, so the user can see precisely what's happening — nothing is ever silently hidden.

### 1.3 Non-Goals

- Other content types (Email, Call, SMS, vCard, WhatsApp, WiFi, PDF, App, Images, Video, Social Media, Event, 2D Barcode, Apple Wallet) — candidates for new stories, not covered here.
- Uploading a file/image as content (story 002).
- Tracking-parameter stripping, link shortening, or any other input cleanup (story 003).
- Visual/design customization — logo, colors, shapes, format (stories 005–008).
- Templates and saved designs (stories 009–012).
- Export/download (stories 013–015).
- Validating that a URL is reachable/resolves — only format classification, not a network check.

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: Turn a link or text into a QR code instantly

**As a** small business owner,
**I want** to type or paste a link or some text into a single input field and see a QR code appear right away,
**so that** I can get a usable code for my menu, flyer, or team material without signing up, configuring anything, or clicking through extra steps.

### US-002: Confirm exactly what will be encoded

**As a** small business owner,
**I want** to see whether my input was recognized as a Link or as Text, along with the literal content that will be encoded,
**so that** I can trust that nothing was silently changed before I print or share the code.

### US-003: See a clear empty state before entering content

**As a** small business owner,
**I want** the preview area to show an empty state instead of a QR code when the input field is blank,
**so that** I don't mistake a placeholder or stale code for a real, scannable one.

### US-004: Get warned before my content exceeds QR capacity

**As a** small business owner,
**I want** to see a warning as my text or link approaches or exceeds the QR code's data capacity,
**so that** I understand why the code might stop working or fail to generate, instead of being silently blocked or producing an unscannable code.

### US-005: Control automatic scheme addition

**As a** small business owner,
**I want** to turn off automatic `https://` addition (and turn it back on),
**so that** I can choose between a working clickable link and an exact literal encoding of what I typed.

### US-006: Get warned about insecure link schemes

**As a** small business owner,
**I want** to be warned if my link explicitly uses `http://` or `ftp://` instead of `https://`,
**so that** I don't unknowingly distribute a QR code pointing at an unencrypted destination.

### US-007: Test the link before printing

**As a** small business owner,
**I want** the preview to show my link as a clickable, openable hyperlink,
**so that** I can verify it goes to the right destination before exporting or printing the code.

### US-008: Easily switch to a secure link

**As a** small business owner,
**I want** to test and optionally apply a secure (`https`) version of an insecure link with one click,
**so that** I can quickly fix a mistake without retyping the whole URL.

### US-009: Get warned about look-alike spoofed domains

**As a** small business owner,
**I want** to be warned if my link's domain mixes look-alike characters from different scripts (e.g. a Cyrillic `а` instead of Latin `a`), with those characters highlighted,
**so that** I don't unknowingly distribute a QR code that leads people to an impersonation/phishing site instead of my intended destination.

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                                                                                                                                              | Priority | User Story   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------| -------- | ------------- |
| FR-001 | The system shall accept text input (link or plain text) via a single input field.                                                                                       | Must     | US-001        |
| FR-002 | The system shall render a QR code encoding the final content (after trimming and scheme handling), updating as the user types or pastes.                               | Must     | US-001        |
| FR-003 | The system shall trim leading and trailing whitespace from the input before classification and encoding.                                                               | Must     | US-001        |
| FR-004 | The system shall classify the trimmed input as `Link` or `Text` using a regex that detects web-page-like strings, with or without a scheme.                            | Must     | US-001, US-002|
| FR-005 | The system shall, by default, prepend `https://` to input classified as `Link` that lacks a URL scheme, before encoding.                                                | Must     | US-005        |
| FR-006 | The system shall provide a toggle to disable/re-enable automatic scheme addition; when disabled, the encoded content has no system-added scheme.                       | Must     | US-005        |
| FR-007 | The system shall display the detected classification (`Link` or `Text`) next to the live preview.                                                                       | Must     | US-002        |
| FR-008 | The system shall display the exact final content that will be encoded (post-trim, post-scheme-handling) next to the live preview.                                       | Must     | US-002        |
| FR-009 | The system shall show an empty state (no QR code rendered) when the trimmed input is empty.                                                                             | Must     | US-003        |
| FR-010 | The system shall warn the user and suggest content-reduction actions (e.g. removing extraneous whitespace) once the final encoded content reaches 75% or more of the QR code's data capacity for the active error-correction level, while still allowing further input up to the absolute maximum. | Should | US-004 |
| FR-011 | The system shall block further input once the final encoded content reaches the absolute maximum capacity for the active error-correction level.                       | Must     | US-004        |
| FR-012 | The system shall warn the user when the encoded content contains an explicit non-secure URI scheme (e.g. `http://`, `ftp://`), without altering the content.           | Must     | US-006        |
| FR-013 | The system shall render the preview's content as a clickable, openable hyperlink when classified as `Link`; `Text` content is shown as plain, non-clickable text.       | Must     | US-007        |
| FR-014 | When the encoded content uses the `http` scheme, the system shall offer a suggested secure alternative (scheme swapped to `https`) as a separate clickable **test** link that opens in a new tab, without modifying the encoded content. | Must | US-008 |
| FR-015 | The system shall provide a separate **Apply** action for the suggested secure alternative that, when activated, replaces the scheme in the input with `https`, updating the encoded content and QR code. | Must | US-008 |
| FR-016 | The system shall detect when a `Link`'s hostname mixes characters from different Unicode scripts within the same label (e.g. Latin mixed with Cyrillic/Greek look-alikes) and warn that the domain may be an impersonation attempt. | Must | US-009 |
| FR-017 | The system shall visually highlight the specific mixed-script characters within the displayed link content next to the preview.                                        | Must     | US-009        |

Default assumption: error-correction level is fixed to **Medium (M)** for this story's capacity calculations (FR-010, FR-011), since error-correction level selection is story 008's responsibility and not yet specced.

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: Typing content renders a live QR code (FR-001, FR-002)

```gherkin
Given the input field is empty and no QR code is shown
When the user types "https://example.com/menu"
Then a QR code appears encoding "https://example.com/menu"
  And the QR code updates as each character is typed
```

### SC-002: Editing input updates the QR code (FR-002)

```gherkin
Given a QR code is already shown for "Team practice at 6pm"
When the user deletes part of the text, leaving "Team practice"
Then the QR code re-renders to encode "Team practice" only
```

### SC-003: Leading/trailing whitespace is trimmed before encoding (FR-003)

```gherkin
Given the input field is empty
When the user types "  https://example.com  " with leading/trailing spaces
Then the encoded content is "https://example.com" with the surrounding whitespace removed
  And no internal whitespace is altered
```

### SC-004: A URL-like string is classified as Link (FR-004)

```gherkin
Given the input field is empty
When the user pastes "www.shop.com/specials"
Then the input is classified as "Link"
```

### SC-005: A non-URL string is classified as Text (FR-004)

```gherkin
Given the input field is empty
When the user types "Contact us at info@example.com for a quote"
Then the input is classified as "Text"
```

### SC-006: Input without a scheme gets https auto-added by default (FR-005)

```gherkin
Given scheme auto-add is enabled (the default)
When the user enters "example.com", classified as Link with no scheme
Then the encoded content is "https://example.com"
```

### SC-007: Disabling scheme auto-add reverts to the literal input (FR-006)

```gherkin
Given the input "example.com" is currently encoded as "https://example.com"
When the user disables scheme auto-add
Then the encoded content reverts to exactly "example.com", with no scheme
```

### SC-008: Classification and literal content are shown next to the preview (FR-007, FR-008)

```gherkin
Given the user has entered "example.com"
Then the preview area shows the classification label "Link"
  And the preview area shows the final encoded content next to the preview
```

### SC-009: Empty input shows an empty state (FR-009)

```gherkin
Given the input field has no content
Then the preview area shows an empty state
  And no QR code is rendered
```

### SC-010: Clearing input reverts to the empty state (FR-009)

```gherkin
Given a QR code is shown for "Hello"
When the user deletes all the text
Then the preview area reverts to the empty state
```

### SC-011: Whitespace-only input is treated as empty (FR-009)

```gherkin
Given the input field is empty
When the user enters only whitespace characters
Then the preview area shows the empty state, as if no input were entered
```

### SC-012: Warning and suggestions appear at 75% capacity (FR-010)

```gherkin
Given the active error-correction level is Medium
When the input reaches 75% or more of that level's data capacity
Then a capacity warning is shown
  And a suggestion is offered (e.g. "remove extra whitespace to save space")
  And the QR code is still generated normally
```

### SC-013: No warning below the capacity threshold (FR-010)

```gherkin
Given the active error-correction level is Medium
When the input is below 75% of that level's data capacity
Then no capacity warning is shown
```

### SC-014: Input is blocked at the absolute maximum capacity (FR-011)

```gherkin
Given the input is already at the absolute maximum capacity for the active error-correction level
When the user attempts to type or paste additional characters
Then the additional characters are not accepted
  And the existing content remains unchanged
```

### SC-015: Insecure scheme triggers a warning (FR-012)

```gherkin
Given the user enters "http://example.com"
When the QR code is generated
Then a warning is shown that the link uses an insecure scheme
  And the encoded content remains "http://example.com" unchanged
```

### SC-016: No warning for a secure (https) scheme (FR-012)

```gherkin
Given the encoded content is "https://example.com" (typed or auto-added)
Then no insecure-scheme warning is shown
```

### SC-017: Link content is rendered as a clickable preview link (FR-013)

```gherkin
Given the input is classified as Link
Then the preview displays the content as a clickable link
  And clicking it opens the destination
```

### SC-018: Text content is rendered as plain, non-clickable text (FR-013)

```gherkin
Given the input is classified as Text
Then the preview displays the content as plain, non-clickable text
```

### SC-019: Suggested secure link can be tested without altering content (FR-014)

```gherkin
Given the encoded content is "http://example.com"
Then a suggested secure link "https://example.com" is shown as a separate "test" link
When the user clicks the test link
Then "https://example.com" opens in a new tab
  And the encoded content remains "http://example.com" unchanged
```

### SC-020: Applying the secure suggestion updates the input and QR code (FR-015)

```gherkin
Given the encoded content is "http://example.com" with a suggested secure alternative shown
When the user activates "Apply" on the suggestion
Then the input updates to "https://example.com"
  And the QR code re-renders to encode "https://example.com"
  And the insecure-scheme warning is no longer shown
```

### SC-021: Insecure ftp scheme warns without offering a suggested swap (FR-012, FR-014 scope limit)

```gherkin
Given the encoded content uses the "ftp://" scheme
Then the insecure-scheme warning is shown
  And no secure-scheme suggestion or apply action is offered
```

### SC-022: Mixed-script domain triggers a look-alike warning with highlighting (FR-016, FR-017)

```gherkin
Given the user enters "https://аpple.com" where the "а" is Cyrillic, visually resembling Latin "a"
When the QR code is generated
Then a warning is shown that the domain may contain look-alike characters
  And the mixed-script character is visually highlighted in the displayed link content
```

### SC-023: Pure-Latin domain shows no look-alike warning (FR-016)

```gherkin
Given the user enters "https://apple.com" using only Latin characters
Then no look-alike-domain warning is shown
```

### SC-024: Legitimate single-script (non-Latin) domain shows no false-positive warning (FR-016)

```gherkin
Given the user enters a link whose hostname is written entirely in a single non-Latin script (e.g. all Cyrillic)
Then no look-alike-domain warning is shown, since no script mixing is present within the label
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### QrContent

Represents the current content being encoded into the live QR code. Mutated in place as the user edits the input, toggles scheme auto-add, or applies a secure-scheme suggestion — not persisted anywhere (no save step in this story; that comes later in stories 009–012).

| Attribute                 | Type                  | Constraints                                   | Description                                                                 |
| -------------------------- | --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| rawInput                   | string                | may be empty                                   | Exactly what the user has typed or pasted, including whitespace              |
| trimmedInput                | string                | derived; leading/trailing whitespace removed   | Basis for classification, encoding, and capacity checks                      |
| contentType                 | ContentType (enum)    | derived via regex                              | `Link` or `Text` — surfaced to the user and to later features (e.g. story 003) |
| schemeAutoAddEnabled        | boolean               | default `true`                                 | User-controlled toggle (FR-006)                                              |
| encodedContent              | string                | derived — see Domain Rules                     | Final string actually encoded into the QR code and shown in the preview      |
| hasInsecureSchemeWarning    | boolean               | derived                                        | True when `encodedContent` has an explicit non-`https` scheme (FR-012)       |
| suggestedSecureAlternative  | string, nullable      | derived; only set when scheme is exactly `http`| `https`-swapped version offered for test/apply (FR-014, FR-015)              |
| hasMixedScriptWarning       | boolean               | derived                                        | True when the hostname contains a mixed-script label (FR-016)                |
| highlightedCharacterRanges  | list of (start, end)  | derived                                        | Character positions of mixed-script characters to highlight (FR-017)         |

### 5.2 Relationships

- A **QrContent** has exactly one derived **CapacityStatus**, recomputed whenever `encodedContent` changes.

### 5.3 Value Objects

#### CapacityStatus

Derived and recalculated on every change to `encodedContent`; carries no identity of its own.

| Attribute             | Type                      | Constraints                                                  |
| ---------------------- | ------------------------- | -------------------------------------------------------------- |
| errorCorrectionLevel   | enum [L, M, Q, H]          | fixed to `M` for this story (superseded once story 008 exists) |
| capacityUsedBytes      | integer                   | ≥ 0                                                            |
| capacityMaxBytes       | integer                   | fixed per `errorCorrectionLevel`                               |
| status                 | enum [ok, warning, blocked]| `ok` < 75%, `warning` ≥ 75% and ≤ max, `blocked` > max         |

#### ContentType (enum)

`Link | Text` today. Modeled as an **open enum** — stories for other content types (Email, SMS, vCard, WiFi, etc.) are expected to add values here without changing `QrContent`'s other attributes.

### 5.4 Domain Rules and Invariants

- **Encoding is a pure function**: `encodedContent = schemeAutoAddEnabled && contentType == Link && trimmedInput has no scheme ? "https://" + trimmedInput : trimmedInput`. No other transformation is ever applied automatically.
- **User-typed schemes are untouchable by auto-add**: if `trimmedInput` already has a URL scheme (e.g. `http://`, `ftp://`), `schemeAutoAddEnabled` has no effect either way.
- **Trim is unconditional**: `rawInput` is always trimmed before classification, encoding, and capacity calculation.
- **Whitespace-only input counts as empty**: `trimmedInput == ""` triggers the empty state (FR-009), same as no input.
- **Capacity governs the final content, not keystrokes**: the 75% warning and absolute-max block (FR-010, FR-011) are evaluated against `encodedContent`, so toggling scheme auto-add can push content across a threshold.
- **ContentType never silently alters content**: classification only ever affects encoding through the explicit scheme-addition rule above.
- **Insecure scheme warning is independent of auto-add**: it triggers whenever `encodedContent` has an explicit non-`https` scheme; since auto-add only ever introduces `https`, this can only ever be caused by a scheme the user typed themselves.
- **Clickability is scheme-restricted**: only `http`/`https` schemes are ever rendered as a clickable `href`; any other scheme (`javascript:`, `data:`, `vbscript:`, `file:`, etc.) is classified as `Text` and is never clickable, even though it is still encoded into the QR code as typed.
- **Secure suggestion is `http → https` only**: no swap is offered for other insecure schemes (e.g. `ftp`) — just the warning (FR-012), with no suggested alternative.
- **Apply mutates the source, not just the output**: activating Apply (FR-015) rewrites the scheme in `rawInput`/`trimmedInput` itself, so later edits build on the corrected value rather than a one-off override.
- **Mixed-script detection is per-label, not per-script**: a hostname label is flagged only when it mixes characters from more than one script (e.g. Latin + Cyrillic) within that label; a label written entirely in one non-Latin script is never flagged.

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category     | Requirement                                                                                                                   |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------|
| NFR-001 | Performance  | The live preview (classification, scheme handling, capacity check, QR render) shall update with a ~150ms debounce after the user stops typing or pasting, to avoid jank on rapid input. |
| NFR-002 | Security     | Clickable preview links (including the secure-suggestion test link) shall only be rendered for `http:`/`https:` schemes; any other scheme is classified as `Text` and never set as an `href`. |
| NFR-003 | Security     | Clickable preview links shall open with `rel="noopener noreferrer"` and `target="_blank"` to prevent reverse tabnabbing.      |
| NFR-004 | Reliability  | If QR encoding fails for any reason, the system shall show an inline error state in the preview area rather than crashing or leaving a stale QR code. |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                                                                                                        | Expected Behavior                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------|
| EC-1 | User pastes a block of text that, in one action, already exceeds the absolute max capacity (not reached incrementally via typing) | The pasted text is truncated to fit the absolute max capacity (in bytes, after trim/scheme handling) rather than rejecting the entire paste. |
| EC-2 | Input is multi-byte (emoji, CJK, accented characters) — capacity is a byte budget, not a character count          | Capacity warning/block (FR-010, FR-011) is evaluated on encoded byte length, not character count, so a short string of emoji can trigger the warning/block well before it "looks" long. |
| EC-3 | User toggles scheme auto-add (FR-006) while already near the capacity threshold, pushing `encodedContent` from under 75% to over the max, or vice versa | `CapacityStatus` recomputes immediately on toggle; warning/block state updates accordingly (toggling on could trigger a block, toggling off could clear one). |
| EC-4 | User pastes a `javascript:` or `data:` URI                                                                        | Classified as `Text` per NFR-002 — encoded into the QR as typed, but never rendered as a clickable link in the preview.              |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------|
| SC-001 | All acceptance scenarios in Section 4 (SC-001–SC-024) pass in automated and/or manual testing.                                  |
| SC-002 | Generated QR codes successfully scan with standard smartphone camera apps across the full supported capacity range at the default (Medium) error-correction level. |
| SC-003 | No encoded content is ever rendered as a clickable link unless its scheme is `http` or `https`, verified by test coverage and security review. |
| SC-004 | A user can go from the content-entry step to a visually confirmed, scannable QR code with zero required clicks beyond typing/pasting — no "generate" button, no signup gate. |

## 9. Dependencies and Constraints

### 9.1 Dependencies

- A QR code encoding library capable of configurable error-correction levels and reporting remaining/used capacity (specific library TBD at implementation time).
- Story 008 (guided error-correction recommendation) is expected to eventually override the fixed Medium error-correction default used here.
- Story 003 (input cleanup toggles) and future content-type stories are expected to reuse the `ContentType` concept defined in this spec.

### 9.2 Constraints

- Fully client-side: no backend, no network calls, no server-side validation — per the project-wide goal in `docs/product/story-map.md`.
- No account creation or signup may be required to use this feature.

### 9.3 Architecture References

_Arc42 documentation (`docs/architecture/`) is currently placeholder-only. The references below describe intended relevance; the arc42 sections themselves still need to be filled in._

| Arc42 Section                      | Relevance to This Feature                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 3. System Scope & Context          | This feature has no external communication partner — it is entirely within-browser, no backend.             |
| 5. Building Block View             | Introduces an input/classification component and a preview/QR-render component; not yet decomposed in arc42.|
| 8. Crosscutting Concepts           | Safe-link rendering (scheme allowlist, `noopener noreferrer`) and mixed-script detection should be promoted to project-wide crosscutting concepts once reused by other content-type stories. |
| 10. Quality Requirements           | NFR-001–NFR-004 are feature-specific for now; promote debounce timing and link-safety patterns to project-wide quality requirements if they recur. |

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
