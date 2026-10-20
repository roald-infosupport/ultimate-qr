---
name: project-qrmaker-scope
description: qrMaker project goal, primary user, and scope decisions made during initial story-mapping interview (2026-10-20)
metadata:
  type: project
---

qrMaker is a fully client-side ("no backend, nothing leaves the browser") QR code
generator, positioned as the "ultimate" free alternative to existing paywalled/gimmicky
QR tools. Story map saved at `docs/product/story-map.md` (15 stories across 4
activities: Add Your Content, Design Your Code, Manage Designs, Export & Share).

**Why:** The user explicitly rejected existing QR tools for paywalls, clunky UI, and
"silly" (gimmicky, not meaningful) customization options. The differentiators are:
free/unlocked, clean interface, meaningful customization, smooth custom asset
(logo/image) uploads.

**Primary user:** Small business owners and sports clubs, little to no technical
knowledge, branding their own QR codes (menus, flyers, team materials).

**Scope decisions worth preserving:**
- Input cleanup (stripping tracking params, shortening links) must be **toggleable
  per-option**, not one all-or-nothing "auto-clean" step. User pushed back on this
  explicitly when first proposed as automatic.
- Error-correction guidance must factor in **intended physical use-case** (curved
  surfaces, very small print, outdoor/weathering exposure) in addition to
  logo/content size — not just a technical calculation.
- "Reuse previous design settings" was deliberately split out into its own activity,
  **Manage Designs** (aka "Templates"), rather than folded into "Design Your Code" —
  confirmed only after being asked twice.
- Template sharing is meant to work by encoding settings (and possibly small assets)
  into a shareable link/format. The user flagged this only works if embedded assets
  (e.g. logo images) are small — large assets will break a link-encoding approach.
  This is a known constraint for whoever specs story 012.
- "Formats" in Design Your Code means stylized/alternative matrix-code styles, not
  just classic square QR — this was an explicit ambition, not a stretch goal.

**How to apply:** When specing or prioritizing qrMaker stories (e.g. via `/spec`),
honor these constraints rather than simplifying back to an all-or-nothing cleanup
step, a logo-only error-correction heuristic, or merging Manage Designs into Design
Your Code.
