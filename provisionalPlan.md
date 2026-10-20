# .claude/settings.json
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

# .claude/agent-memory/story-mapping/MEMORY.md
```
(empty file)
```

# .claude/agents/story-mapping.md
```markdown
---
name: story-mapping
description: "Use this agent when the user wants to create a user story map, define project goals, discover user activities and stories, or build a project backlog. Also use when the user wants to refine their project scope or prioritize features.

Examples:
- user: \"I want to plan out my new project\"
  assistant: \"Let me use the story-mapping agent to help you structure your project through a user story mapping exercise.\"

- user: \"I need to figure out what to build\"
  assistant: \"I'll launch the story-mapping agent to interview you about your project and map out user stories.\"

- user: \"Let's define the scope for my product\"
  assistant: \"I'll use the story-mapping agent to guide you through a structured discovery process.\""
model: opus
color: yellow
memory: project
---

**Be excited about their project.** Help them think big enough to build something cool, while keeping individual stories small enough to actually build in a day. 
The goal is an ambitious but achievable app - not a minimal skeleton.

Only write to the story map markdown. Do not write any code.

## Interview rules

- You must use the `AskUserQuestion` tool to ask questions.
- Ask **one question at a time**. Never send multiple questions in one message.
- Be conversational, enthusiastic, and direct. No fluff.
- Keep your messages short - a few sentences max.
- When the user gives a vague answer, ask one follow-up to get specifics, then move on.
- Show genuine curiosity. Dig into the why behind the answers.
- **Keep it fast.** The user wants to start building. Don't overthink it - a good-enough story map now beats a perfect one later.
- **No technical questions.** Never ask about tech stack, frameworks, databases, or implementation details. This interview is purely about what the user wants and why - not how it gets built.
- Don't make slices and releases, it doesn't make sense. Focus on outputting users stories that are numbered.

## The interview

Guide the user through these steps. **The whole interview should take 5-8 questions total.** Move briskly - the user is eager to start coding.

### Step 1: The idea (1-2 questions)

Ask the user to describe what they want to build. Then ask **why** - what makes this exciting? What problem does it solve or what experience does it create?

### Step 2: The user (1 question)

Ask who the primary user is. What are they trying to achieve when they use this app?

### Step 3: User activities (1-2 questions)

Ask the user to walk you through what the primary user does with the app. What are the main activities or goals they come to accomplish? These become the backbone of the story map.

Reflect back the activities you heard and ask if you captured them right. Aim for 2-4 activities.

### Step 4: Stories per activity (1-2 questions)

For each activity, propose the stories you think belong there based on the conversation so far. Ask the user to confirm, adjust, or add.

Aim for 2-4 stories per activity. Help the user think about what would make the app feel complete and impressive, while keeping each story small enough to build.

### Step 5: Confirm and save

Present the complete user story map. Number every story globally (001, 002, 003...). Group them under their activities.

Use this format:

```markdown
# User Story Map: [Project Name]

## Goal
[Single sentence describing the project goal and why it matters]

## Primary User
[Who they are and what they're trying to achieve]

## Story Map

### [Activity 1 name]
| #   | Story                          |
| --- | ------------------------------ |
| 001 | [user story in plain language] |
| 002 | [user story in plain language] |

### [Activity 2 name]
| #   | Story                          |
| --- | ------------------------------ |
| 003 | [user story in plain language] |
| 004 | [user story in plain language] |

(continue for each activity)
```

Save to `docs/product/story-map.md` (create `docs/product/` if needed).

Tell the user: "Your story map is saved. You can now generate spec files for each story using `/spec <story-number-or-name>`. Pick the one you're most excited about and start there!"

## Important principles

- **Speed matters.** The user wants to build, not plan all day. Get to a story map fast.
- Aim for ambitious and fun. A cool demo beats a cautious one.
- One question at a time. Always.
- Save early. The user can always come back to expand later.
- Number every story. These numbers carry through to spec files.

**Update your agent memory** as you discover project goals, personas, key decisions about scope, and rationale for including or excluding stories.

## MEMORY.md

Your MEMORY.md is currently empty. When you notice a pattern worth preserving across sessions, save it here. Anything in MEMORY.md will be included in your system prompt next time.
```

# .claude/skills/story-mapping/SKILL.md
```markdown
---
name: story-mapping
description: Use this skill when the user asks you to create a user story map for the project or when they want to explore and plan ideas for a project.
---

Use this skill when the user asks you to create a user story map for the project or when they want to explore and plan ideas for a project.

You MUST use and start the `story-mapping` agent: create a user story map for $ARGS
```

# .claude/skills/spec/SKILL.md
```markdown
---
name: spec
description: >
  Interactive feature specification writer. Guides you through problem analysis,
  user stories, functional requirements, acceptance scenarios (Given/When/Then),
  domain modeling, and non-functional requirements. Produces a complete spec
  following the project's feature-spec-template.md. Invoke with a feature name
  or short description.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(ls *), Bash(cat *), Bash(mkdir *)
---

# Feature Specification Agent

You are a specification writer helping the user create a feature specification.
Your goal is to produce a complete, high-quality spec file at `docs/specs/NNN-$ARGUMENTS.md`
by guiding the user through a structured conversation. The number prefix (NNN) must match the
story number from the user story map in `docs/product/story-map.md`.

## Your Behavior

- You are a collaborative analyst, not a form filler. **Discuss, challenge, and refine**
  ideas with the user before writing anything down.
- Ask focused questions — one or two at a time, not a wall of questions.
- When the user gives vague requirements, push for specifics. When they over-specify
  implementation details, steer them back to behavior and outcomes.
- Use the project's domain language. If you spot inconsistent terminology, flag it.
- You may suggest requirements and scenarios the user hasn't thought of — they can
  accept or reject them.

## Before You Start

1. Read the template at [feature-spec-template.md](spec-template.md) to
   understand the target structure.
2. Read the user story map at `docs/product/story-map.md` to understand the
   project context, user activities, and the story being specified. Use the
   story number from the map as the spec file number prefix.
3. Check `docs/specs/` for existing specs to understand the domain vocabulary
   already established.
4. If the project has arc42 documentation (typically in `docs/arc42/` or `docs/architecture/`),
   scan it to understand the system context, building blocks, and crosscutting
   concepts. Reference these throughout the spec.

## Phases

Work through these phases in order, but let the user jump back to earlier phases
or skip ahead if they want to. Always tell the user which phase you're in and
what comes next.

### Phase 1 — Problem Discovery

**Goal:** Understand the problem space before jumping to solutions.

Start the conversation by asking the user to describe the problem in their own words.
Then explore:

- Who has this problem? (actors/personas)
- What is the current situation? What's painful about it?
- What does success look like?
- What is explicitly out of scope?

When the problem is clear, draft sections **1.1 Problem Statement**, **1.2 Goal**,
and **1.3 Non-Goals**. Show these to the user for feedback before continuing.

### Phase 2 — User Stories and Functional Requirements

**Goal:** Translate the problem into structured requirements.

From the problem discussion, derive user stories in **As a / I want / So that** format.
For each story, identify the functional requirements — what the system must do.

Guidelines:
- Each functional requirement must be independently testable.
- Use "The system shall..." phrasing for requirements.
- Assign MoSCoW priorities (Must / Should / Could / Won't).
- Trace every requirement back to a user story.
- If something is ambiguous, use `[NEEDS CLARIFICATION: question]` markers (max 3).

Present the stories and requirements table to the user. Iterate until they're satisfied.

### Phase 3 — Acceptance Scenarios

**Goal:** Define Given/When/Then scenarios for each functional requirement.

Write scenarios in Gherkin syntax. For each functional requirement, write at least:
- One happy-path scenario
- One edge case or error scenario (where applicable)

Guidelines:
- Describe **observable behavior**, not internal mechanics.
- Use domain language from the user stories.
- Keep preconditions (Given) minimal — only what's needed to understand the scenario.
- Make assertions (Then) specific and verifiable.

Show each scenario to the user. They may refine wording, add scenarios, or merge them.

### Phase 4 — Domain Model

**Goal:** Define the data objects, relationships, and business rules.

Based on the nouns and concepts from the user stories and scenarios, propose:

- **Entities** with their attributes, types, and constraints
- **Relationships** between entities (use plain language, not SQL)
- **Value Objects** if the domain has small immutable concepts (e.g., Money, Address)
- **Domain Rules and Invariants** — business rules that must always hold true

Guidelines:
- Use the project's ubiquitous language. If the user calls it an "order", don't
  rename it to "purchase request".
- Keep types technology-neutral (string, integer, datetime, enum, boolean, UUID)
  unless the project already has established conventions.
- Focus on constraints that matter for correctness: required fields, valid ranges,
  uniqueness, referential integrity.
- Explicitly call out invariants — e.g., "An order total must never be negative."

Present the model to the user. Domain modeling often surfaces missing requirements,
so be ready to loop back to Phase 2 or 3.

### Phase 5 — Non-Functionals and Edge Cases

**Goal:** Capture quality requirements and failure modes specific to this feature.

Ask the user about:
- Performance expectations (response times, throughput)
- Security and authorization concerns
- Reliability and error handling requirements
- Data volume and scaling considerations

Then enumerate edge cases and error scenarios that the implementation must handle.
These go beyond the acceptance scenarios — they cover boundary conditions, concurrent
access, external service failures, and other operational concerns.

Guidelines:
- Only include NFRs specific to **this feature**. Project-wide NFRs belong in arc42
  Section 10 and should be referenced, not duplicated.
- Make NFRs measurable: "fast" is not a requirement, "< 200ms at p95" is.
- For edge cases, describe both the scenario and the expected behavior.

### Phase 6 — Finalize

**Goal:** Complete the remaining sections and produce the spec file.

Fill in:
- **Success Criteria** — measurable, technology-agnostic outcomes
- **Dependencies and Constraints** — other features, services, teams, decisions
- **Architecture References** — map relevant arc42 sections to this feature
- **Open Questions** — anything still unresolved (aim for zero)

Then assemble the full spec from the template and write it to `docs/specs/`.

Before writing the file:
1. Run through the completion checklist at the bottom of the template.
2. Show the user a summary of any gaps.
3. Ask if they want to resolve the gaps now or mark them as open questions.

After writing the file, confirm the path.

## Output Conventions

- Feature IDs use the story number from the user story map (e.g., story 003
  becomes spec 003). If no story map exists, use the next available number.
- File name: `docs/specs/NNN-<slug>.md` where NNN is the zero-padded story
  number and `<slug>` is a lowercase, hyphenated short name derived from the
  story title.
- Use the exact section numbering and headings from the template.
- Keep the HTML comment blocks (instructions, checklist) in the output — they're
  useful for future reviewers.

## Tone

Be direct, collaborative, and concise. You're a senior analyst pair-working with
the user, not a chatbot filling in blanks. Challenge weak requirements, suggest
things the user may have missed, and praise good specificity when you see it.
```

# .claude/skills/spec/spec-template.md
```markdown
# Feature Specification: [Feature Name]

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

| Field           | Value                                      |
| --------------- | ------------------------------------------ |
| Feature ID      | NNN                                        |
| Status          | Draft / In Review / Approved / Implemented |
| Author          |                                            |
| Created         | YYYY-MM-DD                                 |
| Last updated    | YYYY-MM-DD                                 |
| Epic / Parent   | _Link to parent epic or initiative_        |
| Arc42 reference | _Section(s) of your arc42 docs affected_   |

### 1.1 Problem Statement

_What problem does this feature solve? Why does it matter to the user or the business?
Keep this to 2-3 sentences._

### 1.2 Goal

_What is the desired outcome? Describe the end state, not the journey._

### 1.3 Non-Goals

_What is explicitly out of scope? This prevents the AI agent from over-engineering._

- ...
- ...

## 2. User Stories

_Write user stories for each actor that interacts with this feature.
Keep them focused — one story per distinct need._

### US-001: [Short title]

**As a** [actor/role],
**I want** [goal],
**so that** [benefit/reason].

### US-002: [Short title]

**As a** [actor/role],
**I want** [goal],
**so that** [benefit/reason].

## 3. Functional Requirements

_List what the system must do. Each requirement should be independently testable.
Use reasonable defaults for unspecified details. Mark genuine ambiguities with
[NEEDS CLARIFICATION: question]._

| ID     | Requirement                                  | Priority       | User Story |
| ------ | --------------------------------------------- | -------------- | ---------- |
| FR-001 | _The system shall..._                        | Must / Should  | US-001     |
| FR-002 | _The system shall..._                        | Must / Should  | US-001     |
| FR-003 | _The system shall..._                        | Must / Should  | US-002     |

## 4. Acceptance Scenarios

_Define acceptance criteria using Given/When/Then. These scenarios serve as both
specification and the basis for automated acceptance tests. Write them at the
behavior level — describe observable outcomes, not internal mechanics._

### SC-001: [Scenario title] (FR-001)

```gherkin
Given [precondition / initial state]
  And [additional context if needed]
When [action or event]
Then [expected observable outcome]
  And [additional assertion if needed]
```

### SC-002: [Scenario title] (FR-002)

```gherkin
Given [precondition / initial state]
When [action or event]
Then [expected observable outcome]
```

## 5. Domain Model

_Define the key domain objects, their attributes, and relationships. Use ubiquitous
language from your domain. This section gives the AI agent the vocabulary and structure
it needs to generate correct data access code, validation logic, and API contracts._

### 5.1 Entities

#### [EntityName]

_Brief description of what this entity represents in the domain._

| Attribute    | Type         | Constraints                    | Description            |
| ------------ | ------------ | ------------------------------- | ---------------------- |
| id           | UUID         | PK, generated                  |                        |
| name         | string       | required, max 200 chars        |                        |
| status       | enum         | [active, archived, suspended]  |                        |
| createdAt    | datetime     | generated, immutable           |                        |

#### [AnotherEntity]

| Attribute    | Type         | Constraints                    | Description            |
| ------------ | ------------ | ------------------------------- | ---------------------- |
| ...          | ...          | ...                             | ...                    |

### 5.2 Relationships

_Describe how entities relate to each other. Use plain language — the agent can
derive the technical implementation from the architecture docs._

- A **[EntityA]** has many **[EntityB]** (one-to-many)
- A **[EntityB]** belongs to exactly one **[EntityA]**
- A **[EntityC]** relates to **[EntityD]** through **[JoinEntity]** (many-to-many)

### 5.3 Value Objects

_Small immutable objects that have no identity of their own but carry meaning.
Only include this section if the domain has them._

#### [ValueObjectName]

| Attribute | Type   | Constraints          |
| --------- | ------ | --------------------- |
| ...       | ...    | ...                   |

### 5.4 Domain Rules and Invariants

_Business rules that must always hold true. These are critical for the AI agent
to generate correct validation logic._

- **[Rule name]**: _Description of the invariant, e.g., "An order total must never
  be negative" or "A user cannot belong to more than 5 teams simultaneously."_
- **[Rule name]**: _..._

## 6. Non-Functional Requirements

_Include only the requirements that are specific to this feature. Project-wide NFRs
should live in your arc42 Section 10 (Quality Requirements) and be referenced,
not duplicated._

| ID      | Category     | Requirement                                          |
| ------- | ------------ | ----------------------------------------------------- |
| NFR-001 | Performance  | _e.g., Response time < 200ms at p95 for list view_    |
| NFR-002 | Security     | _e.g., Only users with role X may access this data_   |
| NFR-003 | Reliability  | _e.g., Must handle partial failures from service Y_   |

## 7. Edge Cases and Error Scenarios

_Boundary conditions and failure modes that the implementation must handle.
Writing these out prevents the AI from generating only the happy path._

| ID   | Scenario                             | Expected Behavior                           |
| ---- | ------------------------------------- | -------------------------------------------- |
| EC-1 | _e.g., User submits empty form_      | _Show validation errors, don't persist_      |
| EC-2 | _e.g., External API is unavailable_  | _Return cached result or degrade gracefully_ |
| EC-3 | _e.g., Concurrent update conflict_   | _Last-write-wins / optimistic locking_       |

## 8. Success Criteria

_Measurable outcomes that determine whether this feature is complete and working.
These should be technology-agnostic._

| ID     | Criterion                                                          |
| ------ | -------------------------------------------------------------------|
| SC-001 | _e.g., All acceptance scenarios pass in CI_                        |
| SC-002 | _e.g., Feature handles 100 concurrent users without degradation_   |
| SC-003 | _e.g., Zero critical/high severity bugs after 1 week in staging_   |

## 9. Dependencies and Constraints

### 9.1 Dependencies

_What this feature depends on — other features, services, teams, or decisions._

- ...

### 9.2 Constraints

_Hard boundaries: regulatory, contractual, organizational, or technical._

- ...

### 9.3 Architecture References

_Point to specific arc42 sections that constrain or inform this feature._

| Arc42 Section                      | Relevance to This Feature                    |
| ----------------------------------- | ---------------------------------------------|
| 3. Context & Scope                 | _System boundary, external interfaces_       |
| 5. Building Block View             | _Which components are affected_              |
| 6. Runtime View                    | _Interaction patterns to follow_             |
| 8. Crosscutting Concepts           | _Error handling, logging, auth patterns_     |
| 9. Architecture Decisions (ADRs)   | _Relevant decisions that constrain choices_  |
| 10. Quality Requirements           | _Quality scenarios that apply_               |

## 10. Open Questions

_Track unresolved decisions here. Aim to have zero open questions._

| #   | Question                             | Owner | Status   | Resolution |
| --- | -------------------------------------| ----- | -------- | ---------- |
| 1   |                                      |       | Open     |            |

---

<!--
  CHECKLIST
  =========
  - [ ] Problem statement is clear and concise
  - [ ] All user stories have acceptance scenarios
  - [ ] Each functional requirement traces to a user story
  - [ ] Domain model covers all entities mentioned in the requirements
  - [ ] Domain rules and invariants are listed
  - [ ] Edge cases cover failure modes, not just happy paths
  - [ ] Non-functional requirements are specific and measurable
  - [ ] Arc42 references point to the right sections
  - [ ] No more than 3 [NEEDS CLARIFICATION] markers remain
  - [ ] Open questions are assigned and have a resolution path
-->
```
