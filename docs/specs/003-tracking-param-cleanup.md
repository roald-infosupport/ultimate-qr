# Feature Specification: Choose Which Cleanups Apply to the Input

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
| Feature ID      | 003                                                                   |
| Status          | Approved (amendment pending implementation)                          |
| Author          | Roald Neuteboom                                                       |
| Created         | 2026-10-20                                                            |
| Last updated    | 2026-10-20                                                            |
| Epic / Parent   | "Add Your Content" — `docs/product/story-map.md`, story 003           |
| Arc42 reference | Not yet established — arc42 docs are placeholder-only; see Section 9.3 |

### 1.1 Problem Statement

When a user creates a QR code from a real-world link, that link often carries tracking parameters (UTM tags, ad-platform click IDs, etc.) that have no value to the person scanning the code, and is sometimes wrapped by a platform's share/redirect mechanism (e.g. Facebook's link wrapper) or an opaque shortener that obscures the actual destination. A clean, trustworthy QR code should point as directly as possible to the intended page, without bundling in analytics artifacts the user never meant to distribute.

Additionally, the toggle list for controlling which parameters get stripped should only show parameters actually present in the entered link — showing toggles for every known parameter regardless of relevance clutters the UI with controls that do nothing, especially as the known-parameter catalog grows.

Further, users sometimes want to strip a query parameter that isn't on the known tracking catalog at all — an internal reference code, a table/booth number, a session id added by their own site, etc. Restricting toggles to only the known catalog means the user has no way to remove those via the UI; they'd have to edit the raw link by hand, which defeats the purpose of a toggle-based cleanup UI.

### 1.2 Goal

Building on story 001's `Link` classification, the user can strip known tracking parameters from a `Link` before it's encoded — each parameter individually toggleable, grouped by source/category in the UI (e.g. "Generic UTM," "Facebook," "Google Ads"), stripped by default. Separately, a single **Follow Link** action attempts to resolve the link's real destination: first by decoding known self-contained wrapper formats locally, then by a best-effort network redirect check for opaque shorteners. On success, the encoded content is instantly replaced with the resolved destination; on failure, the link is left unchanged with a clear explanation.

The tracking-parameter toggle list recomputes live as the user edits the input, using the same debounce as QR regeneration, and shows a toggle for every query parameter currently present in the link's query string — known tracking parameters grouped by category (e.g. "Generic UTM," "Facebook"), and any other, unrecognized parameter grouped under a catch-all "Other" category. Known tracking parameters are stripped by default; unrecognized parameters are kept by default, but the user can toggle either kind on or off. A parameter's toggle state (on/off) is remembered per parameter name even while it's not present — if the user removes a param and later re-adds it (directly, or by pasting a different link), its previously-chosen toggle state is restored rather than reset to the default for its kind.

### 1.3 Non-Goals

- Classifying input as `Link` or `Text` (story 001).
- Applying any cleanup to `Text`-classified content — these cleanups only apply to `Link`.
- Guaranteeing resolution of every shortened/opaque link — the network check is best-effort; it will fail for most real-world shorteners due to browser CORS restrictions, and that's expected, not a bug. There is no legitimate client-side-only way around this (see Constraints, 9.2): a server-side proxy or public CORS-proxy service would bypass it, but both require a backend or sending user data to a third party, which contradicts the project's "fully client-side, nothing leaves the browser" goal.
- Creating new shortened links — this story is about cleanup/transparency, not generating short links.
- Any disclosure/educational UI about what a specific tracking parameter does (e.g. explaining `fbclid`) — just strip/keep per toggle, no explanatory content.
- Persisting toggle preferences across browser sessions/reloads — this is in-session memory only, not storage (storage is covered by story 009's templates).

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: Strip tracking parameters from a link

**As a** small business owner,
**I want** known tracking parameters (UTM tags, ad-platform click IDs, etc.) automatically stripped from my link,
**so that** the QR code I share doesn't carry analytics baggage I never intended to distribute.

### US-002: Control which tracking parameters get stripped

**As a** small business owner,
**I want** to toggle individual tracking parameters on or off, grouped by source (UTM, Facebook, Google Ads, etc.),
**so that** I can keep a parameter if I actually need it for my own tracking, while still stripping the rest by default.

### US-003: Reveal and use a link's real destination

**As a** small business owner,
**I want** to click "Follow Link" and have it resolve wrapped or shortened links to their real destination, instantly updating the QR code when it succeeds,
**so that** I don't have to manually hunt down or guess the actual page I'm linking to.

### US-004: Understand when a link can't be verified

**As a** small business owner,
**I want** a clear message when "Follow Link" can't resolve a destination,
**so that** I know the link is left unchanged and understand why, rather than wondering if something's broken.

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                                                                                                             | Priority | User Story    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------| -------- | -------------- |
| FR-001 | The system shall maintain a known list of tracking query parameters, grouped by source/category (e.g. Generic UTM, Facebook, Google Ads, Microsoft Ads, Mailchimp, Instagram). | Must | US-001, US-002 |
| FR-002 | The system shall strip each known tracking parameter from a `Link`'s query string by default.                                           | Must     | US-001         |
| FR-003 | The system shall show a toggle for every query parameter currently present in the link's query string — known tracking parameters grouped by category, and unrecognized parameters grouped under a catch-all "Other" category. | Must | US-002 |
| FR-004 | The system shall preserve a query parameter — known or unrecognized — unless the user has toggled it to be stripped. Unrecognized parameters default to kept (not stripped); known tracking parameters default to stripped, per FR-002. | Must | US-002 |
| FR-010 | The system shall recompute the visible toggle list on input change, debounced identically to QR-code regeneration.                       | Must     | US-002         |
| FR-011 | The system shall remember each parameter's (known or unrecognized) last-set toggle state for the duration of the session, and reapply it if that parameter reappears in the input, rather than resetting to its kind's default. | Must | US-002 |
| FR-012 | The system shall allow toggling any currently-present query parameter, including ones not on the known tracking catalog, to be stripped or kept. | Must | US-002 |
| FR-005 | The system shall provide a single "Follow Link" action, available for any `Link`-classified content.                                     | Must     | US-003         |
| FR-006 | On activation, "Follow Link" shall first attempt to decode known self-contained wrapper formats (e.g. Facebook's `l.php?u=`) locally, without a network request. | Must | US-003 |
| FR-007 | If no wrapper pattern matches, "Follow Link" shall attempt a best-effort network check to resolve the link via an HTTP redirect.          | Must     | US-003         |
| FR-008 | If either resolution method succeeds, the system shall instantly replace the encoded content with the resolved destination.              | Must     | US-003         |
| FR-009 | If resolution fails (no wrapper match and the network check is blocked/fails), the system shall leave the content unchanged and show a message explaining that the destination couldn't be verified. | Must | US-004 |

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: Tracking parameters are grouped by category in the UI (FR-001)

```gherkin
Given the tracking-parameter toggle list is displayed
Then parameters are grouped under category headings (e.g. "Generic UTM", "Facebook", "Google Ads")
```

### SC-003a: Only present parameters show toggles (FR-003)

```gherkin
Given the user enters "https://shop.example.com/menu?utm_source=newsletter"
Then only a toggle for "utm_source" is shown
  And no toggles for "utm_campaign", "fbclid", "gclid", or any other known parameter are shown
```

### SC-003b: Unrecognized parameters get a toggle too, grouped under "Other" (FR-003, FR-012)

```gherkin
Given the user enters "https://shop.example.com/menu?table=12&utm_source=newsletter"
Then a toggle for "utm_source" is shown under "Generic UTM"
  And a toggle for "table" is shown under an "Other" group
```

### SC-012b: Toggling an unrecognized parameter strips it (FR-004, FR-012)

```gherkin
Given the user enters "https://shop.example.com/menu?table=12"
  And the user enables stripping for "table" (toggles it on)
When the QR code is generated
Then the encoded content is "https://shop.example.com/menu"
```

### SC-010: Toggle list recomputes live, debounced (FR-010)

```gherkin
Given the user is editing the link input
When the user types a new query parameter, e.g. appends "&fbclid=abc123"
Then a toggle for "fbclid" appears after the same debounce delay used for QR regeneration
  And no toggle appears while the debounce is still pending
```

### SC-011: Toggle state is remembered when a parameter disappears and reappears (FR-011)

```gherkin
Given the user enters "https://shop.example.com/menu?utm_source=newsletter"
  And disables stripping for "utm_source" (toggles it off)
When the user edits the link to remove "utm_source" entirely
Then the "utm_source" toggle is no longer shown
When the user edits the link again, re-adding "utm_source" (or pastes a different link containing it)
Then the "utm_source" toggle reappears in the off (not-stripped) state, matching the user's prior choice
```

### SC-012: Toggle state resets to default only on first-ever appearance (FR-011, edge case)

```gherkin
Given the user has never interacted with the "mc_cid" toggle before
When "mc_cid" first appears in the link's query string
Then its toggle shows the default state (stripped/on)

Given the user has never interacted with the "table" toggle before, and "table" is not a known tracking parameter
When "table" first appears in the link's query string
Then its toggle shows the default state for an unrecognized parameter (kept/off)
```

### SC-002: Known tracking parameters are stripped by default (FR-002)

```gherkin
Given the user enters "https://shop.example.com/menu?utm_source=newsletter&utm_campaign=spring"
When the QR code is generated
Then the encoded content is "https://shop.example.com/menu"
```

### SC-003: Toggling off a specific parameter keeps it (FR-003)

```gherkin
Given the user enters "https://shop.example.com/menu?utm_source=newsletter&utm_campaign=spring"
  And the user disables stripping for "utm_source" only
When the QR code is generated
Then the encoded content is "https://shop.example.com/menu?utm_source=newsletter"
  And "utm_campaign" remains stripped
```

### SC-004: Unrecognized query parameters are preserved by default (FR-004)

```gherkin
Given the user enters "https://shop.example.com/menu?table=12&utm_source=newsletter"
  And the user has not toggled "table"
When the QR code is generated
Then the encoded content is "https://shop.example.com/menu?table=12"
  And "utm_source" is stripped while "table" remains
```

### SC-005: Follow Link is available for Link content (FR-005)

```gherkin
Given the input is classified as Link
Then a "Follow Link" action is available
```

### SC-006: Follow Link is not shown for Text content (FR-005, edge case)

```gherkin
Given the input is classified as Text
Then no "Follow Link" action is shown
```

### SC-007: Local wrapper decoding succeeds without a network request (FR-006)

```gherkin
Given the user enters "https://l.facebook.com/l.php?u=https%3A%2F%2Fshop.example.com%2Fmenu%26h%3Dabc123"
When the user clicks "Follow Link"
Then the encoded content is instantly replaced with "https://shop.example.com/menu"
  And no network request was made
```

### SC-008: Best-effort network resolution succeeds (FR-007, FR-008)

```gherkin
Given the user enters an opaque shortened link whose target allows the redirect to be read cross-origin
When the user clicks "Follow Link"
Then the encoded content is instantly replaced with the resolved destination
```

### SC-009: Resolution fails gracefully (FR-009)

```gherkin
Given the user enters an opaque shortened link whose target does not support cross-origin redirect reading (the common case)
When the user clicks "Follow Link"
Then the encoded content remains unchanged
  And a message is shown explaining the destination could not be verified
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### TrackingParameterRule

A single known tracking query parameter and its current handling state.

| Attribute | Type   | Constraints                                                       | Description                                    |
| --------- | ------ | -------------------------------------------------------------------| ------------------------------------------------ |
| name      | string | required, e.g. `"utm_source"`                                     | Exact query parameter key to match               |
| category  | string (enum-like) | e.g. "Generic UTM", "Facebook", "Google Ads", "Microsoft Ads", "Mailchimp", "Instagram" | Used for UI grouping (FR-001) |
| enabled   | boolean | default `true` (stripped by default), session-scoped              | User-controlled toggle state; persists even while the parameter is absent from the current input (FR-011) |
| present *(derived)* | boolean, not stored | computed from current input's query string | A toggle is rendered if and only if `present == true` (FR-003) |

#### CustomParameterToggle

A query parameter present in the current link that is *not* on the known tracking catalog, but that the user can still toggle to strip (FR-012).

| Attribute | Type   | Constraints                                                       | Description                                    |
| --------- | ------ | -------------------------------------------------------------------| ------------------------------------------------ |
| name      | string | required, e.g. `"table"`                                          | Exact query parameter key, derived from the current input |
| category  | string (fixed) | always `"Other"`                                            | Catch-all UI group for any parameter with no matching `TrackingParameterRule` |
| enabled   | boolean | default `false` (kept by default), session-scoped                 | User-controlled toggle state; persists even while the parameter is absent from the current input (FR-011), same mechanics as `TrackingParameterRule.enabled` but opposite default |

Both entities are rendered and toggled identically in the UI — the only distinction is which catalog defines the name (known vs. derived-from-input) and the default `enabled` value.

### 5.2 Relationships

- `QrContent` (from spec 001) is extended by a set of **TrackingParameterRule** evaluations applied to its query string whenever `contentType == Link` — these run as part of deriving `encodedContent`, after trimming/scheme-handling and before the content is final.
- A `QrContent` has at most one **FollowLinkResult**, reflecting the outcome of the most recent "Follow Link" attempt.

### 5.3 Value Objects

#### FollowLinkResult

Derived and transient — reflects only the most recent attempt; no persisted identity.

| Attribute            | Type                                                             | Constraints                                                      |
| ---------------------- | ------------------------------------------------------------------| --------------------------------------------------------------------|
| outcome                | enum [notAttempted, localWrapperResolved, networkResolved, failed] |                                                                     |
| resolvedDestination    | string, nullable                                                  | set when outcome is `localWrapperResolved` or `networkResolved`     |
| failureMessage         | string, nullable                                                  | set when outcome is `failed`                                        |

### 5.4 Domain Rules and Invariants

- **Stripping is query-string-only**: tracking-parameter removal only ever touches the query string of `Link`-classified content; it never alters the path, hostname, or any `Text` content.
- **Toggle-driven removal**: a query parameter is removed if and only if its current toggle state is enabled — whether that toggle comes from a known `TrackingParameterRule` (default enabled) or a derived `CustomParameterToggle` for an unrecognized parameter (default disabled). There is no category of parameter that's unconditionally immune to removal; "preserved by default" just means its default toggle state is off (FR-004, FR-012).
- **Fixed resolution order**: "Follow Link" always attempts local wrapper decoding first; the network-based check only runs if no wrapper pattern matched.
- **Resolved destination re-enters the full pipeline**: on success, the resolved destination becomes the new `rawInput`, which is re-trimmed, re-classified, and has tracking-parameter stripping (per current toggle states) and scheme handling reapplied — so a resolved link that itself carries tracking params still gets cleaned, not just swapped in raw.
- **Failure changes nothing**: if "Follow Link" fails, `encodedContent`, `rawInput`, and all toggle states remain exactly as they were before the click — only `FollowLinkResult.failureMessage` is set, to surface the explanation.
- **Rules persist session-wide, independent of current visibility**: every parameter name's `enabled` state is well-defined for the whole session — its kind's default (`true` for a known `TrackingParameterRule`, `false` for a `CustomParameterToggle`) until the user explicitly toggles it, after which the explicit value is remembered regardless of whether the parameter is currently present; only the UI rendering is filtered by `present`.

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category         | Requirement                                                                                                                             |
| ------- | ------------------| ------------------------------------------------------------------------------------------------------------------------------------------|
| NFR-001 | Performance       | Local wrapper decoding (FR-006) resolves synchronously with no perceptible delay — no network involved.                                  |
| NFR-002 | Reliability       | The network-based Follow Link check (FR-007) shall time out after 5 seconds; a non-response is treated as a failed resolution (FR-009).   |
| NFR-003 | Security/Privacy  | Follow Link shall only ever be triggered by an explicit user click — never automatically — since it's the only feature in the app that sends a network request outside the browser, and users should always be aware when that happens. |
| NFR-004 | UX/Reliability    | While a network-based Follow Link check is in flight, the system shall show a pending/loading state and prevent duplicate concurrent clicks. |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                                                                                      | Expected Behavior                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------------------------------|
| EC-1 | The resolved destination is itself another wrapper or shortener (chained/nested)                 | Follow Link resolves only one layer per click; the user can click it again on the newly revealed content to resolve further layers. No automatic recursive resolution. |
| EC-2 | The target server has a redirect loop or excessively long redirect chain                         | The browser's built-in redirect limit causes the fetch to fail; treated as a standard Follow Link failure (FR-009).                  |
| EC-3 | The resolved destination is malformed or not a valid `Link` (e.g. an unusual scheme)             | Treated as a failure (FR-009) — original content stays unchanged rather than replacing it with something invalid.                   |
| EC-4 | A tracking parameter exists that isn't yet in the known list (new/unrecognized ad platform)       | Shown as a toggle under "Other", kept by default (FR-004, FR-012) — same handling as any other unrecognized parameter, e.g. `table`. |
| EC-5 | Parameter flashes present then removed before the debounce fires (fast typing)                    | No toggle is rendered for it — the toggle list only reflects the debounced/settled input, consistent with FR-010.                    |
| EC-6 | Same parameter name appears twice in the query string (duplicate key)                             | Single toggle controls both instances; both are stripped or both kept together.                                                     |
| EC-7 | Two distinct unrecognized parameters in the same link (e.g. `table` and `booth`)                   | Each gets its own toggle under "Other", independently toggleable, each defaulting to kept.                                           |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                                                                              |
| ------ | --------------------------------------------------------------------------------------------------------------------------|
| SC-001 | All acceptance scenarios in Section 4 (SC-001–SC-012, including SC-003a, SC-003b, SC-012b) pass in automated and/or manual testing. |
| SC-002 | Known tracking parameters across all listed categories are stripped by default from 100% of test links containing them, unless explicitly toggled off. |
| SC-003 | Follow Link correctly resolves 100% of self-contained wrapper formats included in the known-pattern list without any network request. |
| SC-004 | Users can identify, at a glance, every query parameter currently in their link and its toggle state — known or not — without seeing toggles for parameters absent from the input. |
| SC-005 | Users can strip any query parameter present in their link, including ones not on the known tracking catalog, by toggling it on. |

## 9. Dependencies and Constraints

### 9.1 Dependencies

- Spec 001's `QrContent`/`ContentType` model — cleanups only apply when `contentType == Link`.
- A maintained catalog of known tracking parameters and self-contained wrapper patterns (specific contents TBD at implementation time, expected to grow as new ad platforms/services emerge).
- The browser's native `fetch` API (or equivalent) for the best-effort network check.

### 9.2 Constraints

- Fully client-side: no backend, no network calls except the explicit, user-initiated Follow Link check — the sole deliberate exception to the project's "nothing leaves the browser" principle.
- The network check is fundamentally limited by CORS and cannot be made reliable for arbitrary third-party shorteners without violating the "no backend" constraint (see 1.3). A server-side proxy or public CORS-proxy service would work around this, but both were explicitly rejected in favor of staying fully client-side.

### 9.3 Architecture References

_Arc42 documentation (`docs/architecture/`) is currently placeholder-only. The references below describe intended relevance; the arc42 sections themselves still need to be filled in._

| Arc42 Section                      | Relevance to This Feature                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 3. System Scope & Context          | Follow Link's network request is this project's only outbound call to a third-party origin — worth documenting as a deliberate, scoped exception. |
| 8. Crosscutting Concepts           | The CORS/best-effort pattern and the "explicit user action required for any network call" rule should be promoted to a project-wide crosscutting concept, since any future story involving external requests should follow the same principle. |
| 10. Quality Requirements           | NFR-002 (timeout) and NFR-003 (explicit-trigger-only) are feature-specific for now; consider promoting if more network-touching features are added later. |

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
