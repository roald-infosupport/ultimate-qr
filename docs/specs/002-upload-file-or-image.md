# Feature Specification: Upload a File or Image as the Content to Encode

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
| Feature ID      | 002                                                                   |
| Status          | Implemented                                                           |
| Author          | Roald Neuteboom                                                       |
| Created         | 2026-10-20                                                            |
| Last updated    | 2026-10-20                                                            |
| Epic / Parent   | "Add Your Content" — `docs/product/story-map.md`, story 002           |
| Arc42 reference | Not yet established — arc42 docs are placeholder-only; see Section 9.3 |

### 1.1 Problem Statement

Many QR tools either falsely imply "upload any file" and silently fail or degrade past a certain size, or secretly host the file on their own servers — introducing exactly the privacy/backend dependency this project avoids. Users who have a genuinely small, self-contained file (a tiny icon, a calendar invite, a contact card) have no honest, transparent way to embed it directly into a QR code with clear limits and no hidden hosting.

### 1.2 Goal

A user can upload a file in one of the accepted small formats (`.ics`, `.ico`, `.svg`, `.vcf`) and have it embedded directly into the QR code as a base64 `data:` URI — no hosting, nothing leaves the browser. If the file doesn't fit within capacity, the system attempts to minify applicable text-based formats (`.ics`, `.svg`, `.vcf` — stripping whitespace/comments/unnecessary structure) before rejecting; `.ico` is binary and can't be minified this way. When a file still can't be made to fit, the user gets a clear, specific message (not a vague "too large" error).

### 1.3 Non-Goals

- Raster photo/image uploads (`.jpg`, `.png`, etc.) — physically impossible within QR capacity, not attempted.
- Video, PDF, Apple Wallet passes, or any other large/signed file format — not supported. Apple Wallet passes specifically require a private signing credential (unsafe to hold client-side), exceed capacity even minimally, and expect HTTPS-hosted distribution — a structural mismatch with this project's architecture, not just a size problem.
- Hosting uploaded files anywhere — everything is embedded directly; no backend, no third-party storage.
- Structured form-based builders for V-card or Event content (fill in name/phone/email, or title/date/location fields) — strong candidates for separate future stories; this story only covers uploading a file the user already has.
- Visual logo/image embedding on the QR code's design (story 005) — that's decoration layered on top of the code, not the encoded payload; unrelated concept.
- Format conversion (e.g. turning a `.png` into a `.svg`) — only accepts files already in a supported format.
- Compressing or re-encoding files to help larger ones fit (e.g. lossy image re-encoding, binary compression schemes) — this story only covers basic whitespace/structure minification for text-based formats. Deliberately deferred as a possible future enhancement, not ruled out.

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: Embed a small file directly into a QR code

**As a** small business owner,
**I want** to upload a small file in a supported format (`.ics`, `.ico`, `.svg`, `.vcf`) and have it embedded directly into the QR code,
**so that** I can share things like a calendar invite, a contact card, or a tiny icon without needing any hosting or account.

### US-002: Know immediately if my file is too large

**As a** small business owner,
**I want** to be told clearly and specifically if my uploaded file is too big to fit,
**so that** I understand the problem instead of getting a generic error or a broken QR code.

### US-003: Get automatic help fitting a borderline-sized file

**As a** small business owner,
**I want** the system to try minifying my file automatically if it's slightly too big,
**so that** I don't have to manually edit the file myself to make it fit.

### US-004: Be guided toward supported formats

**As a** small business owner,
**I want** to be told which file types are supported if I upload something else,
**so that** I understand why an unsupported file (like a `.jpg`) was rejected.

### US-005: Visually confirm what will be encoded

**As a** small business owner,
**I want** to see a preview of my uploaded file's actual content (a thumbnail for images, the text content for calendar/contact files) next to the QR preview,
**so that** I can confirm what's really being embedded before sharing it.

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                                                                                                                             | Priority | User Story |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------| -------- | ------------ |
| FR-001 | The system shall accept file uploads (via file picker and/or drag-and-drop) restricted to `.ics`, `.ico`, `.svg`, `.vcf`.                               | Must     | US-001       |
| FR-002 | The system shall reject any file whose type is not in the accepted list, with a message naming the supported formats.                                   | Must     | US-004       |
| FR-003 | The system shall base64-encode an accepted file and embed it as a `data:` URI (with correct MIME type) as the QR code's encoded content.                 | Must     | US-001       |
| FR-004 | The system shall classify file-based content as `ContentType.File` (extending the enum from spec 001).                                                   | Must     | US-001       |
| FR-005 | The system shall check the resulting `data:` URI's size against the active error-correction level's capacity before finalizing the encode.               | Must     | US-002       |
| FR-006 | If the encoded size exceeds capacity and the format is text-based (`.ics`, `.svg`, `.vcf`), the system shall attempt to minify the file's contents (strip unnecessary whitespace/comments/structure) and re-check capacity. | Must | US-003 |
| FR-007 | If minification brings the content within capacity, the system shall use the minified version and inform the user that minification was applied.        | Must     | US-003       |
| FR-008 | If the file still exceeds capacity after minification (or immediately, for `.ico`, which can't be minified this way), the system shall reject the upload with a message stating the file's size, the capacity limit, and the amount it's over by. | Must | US-002 |
| FR-009 | The system shall display the classification (`File`) and the file type next to the live preview.                                                         | Must     | US-005       |
| FR-010 | For `.ico` and `.svg` files, the system shall render a visual thumbnail of the image next to the live preview.                                           | Must     | US-005       |
| FR-011 | For `.ics` and `.vcf` files, the system shall display the (possibly minified) text content next to the live preview.                                     | Must     | US-005       |

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: Accepted file type is embedded directly (FR-001, FR-003, FR-004)

```gherkin
Given the user has no content entered
When the user uploads "invite.ics" (a small calendar file)
Then the QR code encodes a "data:" URI containing the base64-encoded file content
  And the content is classified as "File"
```

### SC-002: Unsupported file type is rejected (FR-002)

```gherkin
Given the user has no content entered
When the user uploads "photo.jpg"
Then the upload is rejected
  And a message lists the supported formats (.ics, .ico, .svg, .vcf)
```

### SC-003: Oversized file is rejected with a specific message (FR-005, FR-008)

```gherkin
Given the user uploads "icon.ico" that, once base64-encoded, exceeds the active capacity limit
  And the file cannot be minified (binary format)
Then the upload is rejected
  And the message states the file's size, the capacity limit, and the amount it's over by
```

### SC-004: Borderline text-based file is minified to fit (FR-006, FR-007)

```gherkin
Given the user uploads "event.ics" that slightly exceeds capacity due to extra whitespace/comments
When the system attempts minification
Then the minified version fits within capacity
  And the QR code encodes the minified content
  And the user is informed that minification was applied
```

### SC-005: Text-based file still too large after minification is rejected (FR-006, FR-008)

```gherkin
Given the user uploads "contact.vcf" that still exceeds capacity even after minification
Then the upload is rejected
  And the message states the file's size, the capacity limit, and the amount it's over by
```

### SC-006: Image thumbnail preview is shown (FR-009, FR-010)

```gherkin
Given the user uploads "logo.svg" within capacity
Then the preview area shows a thumbnail rendering of the image
  And the classification label "File" is shown
```

### SC-007: Text content preview is shown (FR-009, FR-011)

```gherkin
Given the user uploads "invite.ics" within capacity
Then the preview area shows the (possibly minified) text content of the file
  And the classification label "File" is shown
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### UploadedFile

Represents the file the user has uploaded, through the encoding pipeline.

| Attribute      | Type                        | Constraints                                                | Description                                                                 |
| ---------------- | ----------------------------- | -------------------------------------------------------------| ------------------------------------------------------------------------------ |
| fileName         | string                        | required                                                     | Original file name as uploaded                                               |
| extension        | enum [ics, ico, svg, vcf]      | restricted to accepted list                                  | Determines acceptance and whether minification applies                       |
| mimeType         | string                        | derived from extension                                       | e.g. `text/calendar`, `image/x-icon`, `image/svg+xml`, `text/vcard`           |
| rawBytes         | bytes                         | required                                                     | Original uploaded file content, unmodified                                   |
| minifiedBytes    | bytes, nullable               | derived; only set for text-based formats when minification was attempted | Result of whitespace/structure minification                 |
| finalBytes       | bytes                         | derived                                                      | The bytes actually base64-encoded into the QR (`rawBytes` or `minifiedBytes`, whichever fits) |
| isMinified       | boolean                       | derived                                                      | True if `finalBytes` came from minification rather than the raw upload       |

### 5.2 Relationships

- `QrContent` (from spec 001) now derives `encodedContent` from **one of two mutually exclusive sources**: typed `rawInput` (the `Link`/`Text` path) or an **UploadedFile** (the `File` path, this story). Uploading a file clears any typed input, and vice versa.
- `QrContent` continues to have exactly one derived `CapacityStatus` (spec 001's value object, unchanged) — regardless of whether the source is typed input or an `UploadedFile`, the same capacity thresholds and evaluation apply.

### 5.3 Value Objects

No new value objects — this story reuses spec 001's `CapacityStatus` for capacity evaluation and `ContentType` (extended with a `File` value) for classification.

### 5.4 Domain Rules and Invariants

- **Mutually exclusive input sources**: a `QrContent` has either typed `rawInput` or an `UploadedFile`, never both at once.
- **Fixed format allowlist**: only `.ics`, `.ico`, `.svg`, `.vcf` are accepted; anything else is rejected before any encoding or minification is attempted.
- **Minification is format-restricted**: only the text-based formats (`.ics`, `.svg`, `.vcf`) may be minified; `.ico` (binary) either fits as-is or is rejected.
- **Minification must be structurally non-lossy**: it may only strip whitespace/comments/non-semantic structure — it must never alter the actual meaning or data of the file (e.g. never drop real calendar/contact fields just to save space).
- **The preview always reflects `finalBytes`**: whatever is actually encoded (post-minification if applied) is what's shown in the thumbnail/text preview — consistent with spec 001's "never silently hide what's encoded" principle.
- **Capacity evaluation is uniform**: file-sourced content is checked against the same `CapacityStatus` thresholds as typed input — no special-cased rules.

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category     | Requirement                                                                                                                                 |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-001 | Performance   | File processing (read, optional minification, base64 encode, capacity check) shall complete within ~200ms for files within the accepted size range. |
| NFR-002 | Security      | SVG and ICO thumbnail previews shall be rendered using a non-script-executing method (e.g. an `<img>` element) — never inline DOM injection, `<object>`, or `<iframe>` — so embedded scripts in a malicious SVG can never execute. |
| NFR-003 | Security      | ICS and VCF text previews shall be rendered as escaped plain text, never interpreted as HTML, to prevent XSS via crafted field values.          |
| NFR-004 | Reliability   | The system shall check the raw file size against a sanity limit immediately upon selection (before reading file contents into memory), rejecting absurdly large files early rather than attempting to process them. |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                                                                                              | Expected Behavior                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------|
| EC-1 | File has an accepted extension but invalid/corrupt content (e.g. a `.svg` that isn't valid XML, a `.vcf` missing `BEGIN:VCARD`) | Rejected with a validation error message — never embedded as garbage.                                 |
| EC-2 | User selects an extremely large file (e.g. hundreds of MB) that happens to have an accepted extension  | Rejected immediately based on raw file size (NFR-004), before attempting to read or process it — no browser freeze.      |
| EC-3 | Minification of an already-minimal `.ics`/`.vcf`/`.svg` file yields no meaningful size reduction        | Treated the same as "still over capacity after minification" (FR-008) — no special-cased "minification failed" message. |
| EC-4 | User uploads a new file while one is already loaded                                                    | The new `UploadedFile` entirely replaces the old one, same as typing new text replaces old (mutually-exclusive-source rule). |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------|
| SC-001 | All acceptance scenarios in Section 4 (SC-001–SC-007) pass in automated and/or manual testing.                    |
| SC-002 | 100% of malicious-SVG test files (containing embedded `<script>` or event-handler attributes) render as static images with zero script execution, verified via security testing. |
| SC-003 | Users receive a specific, actionable rejection message (stating size vs. limit) for 100% of oversized-file test cases, never a generic/unhelpful error. |
| SC-004 | A user can go from file upload to a visually confirmed, scannable QR code with zero required clicks beyond selecting the file. |

## 9. Dependencies and Constraints

### 9.1 Dependencies

- Spec 001's `QrContent`/`ContentType` model (extended with a `File` value) and `CapacityStatus` value object, reused unchanged for capacity evaluation.
- Browser File API (`File`, `FileReader`/`arrayBuffer()`) for reading uploaded file bytes; base64 encoding via built-in browser APIs.
- A minification routine for each text-based format (`.ics`, `.svg`, `.vcf`) — specific library/approach TBD at implementation time.

### 9.2 Constraints

- Fully client-side: the file is never uploaded to any server; all reading, minification, and encoding happen locally in the browser.
- Hard QR capacity ceiling (shared with spec 001) fundamentally limits which files can ever fit — a physical constraint, not a configurable setting.
- Advanced compression/re-encoding of larger files is explicitly out of scope for now (see Non-Goals) but intentionally left open as a future enhancement.

### 9.3 Architecture References

_Arc42 documentation (`docs/architecture/`) is currently placeholder-only. The references below describe intended relevance; the arc42 sections themselves still need to be filled in._

| Arc42 Section                      | Relevance to This Feature                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 5. Building Block View             | Introduces a file-upload/validation component and a minification component; not yet decomposed in arc42.    |
| 8. Crosscutting Concepts           | The "never execute embedded scripts in user content" rule (NFR-002/003) extends the safe-rendering crosscutting concept already flagged in specs 001 and 003 — should be consolidated into one project-wide rule once arc42 is filled in. |
| 10. Quality Requirements           | NFR-001 (processing speed) and NFR-004 (early size check) are feature-specific for now.                      |

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
