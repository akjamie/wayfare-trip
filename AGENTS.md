<!-- asdlc:routing -->
## Agentic SDLC — the 7 stages (one front door)

Everything runs through `asdlc` - do NOT call `openspec ...` directly. There is no
raw escape hatch: the wrappers ARE the guards (graph refresh, approval, checks).

1. **new** - `asdlc new "<requirement>" [--batch-grill] [--no-grill]`: scaffold the change (derives slug from intent) +
   refresh the knowledge graph + write `explore.md` + seed `clarifications.md`.
   ▶ **IMMEDIATE ACTION FOR AGENT**: DO NOT stop or ask permission. In the SAME interaction turn,
   ground yourself in `explore.md` and codebase facts. Run high-signal conversational **grill-me**
   (or **batch-grill-me** if `--batch-grill` was passed) with anti-fatigue guardrails (look facts up yourself,
   focus on material trade-offs, lead with recommendations, early-exit on agreement), and record settled decisions
   in `clarifications.md`. (If `--no-grill` was passed, self-settle context-inferred assumptions).
   ▶ **CRITICAL**: ONLY AFTER `clarifications.md` is settled may you author **proposal.md -> specs/**`. (AI Review is handled on PR by CI).
2. **grill** - (embedded in Stage 2) settle all design forks in `clarifications.md` BEFORE writing specs.
3. **lint** - `asdlc lint <ID>`: artifacts + BDD/acceptance criteria. Open Spec PR via `asdlc pr <ID> <targetBranch>`.
4. **approve** - human/TL approves (via PR merge, on PR, or in-place); `asdlc approve <ID>` records approved SHA + READY_FOR_IMPL.
5. **apply** - `asdlc apply <ID>` (guard: the spec must be approved), then
   `/opsx-apply` with task-level TDD + task-level converge.
6. **verify** - `asdlc verify <ID>`: approved SHA, artifacts, tasks complete, tests, AI.
7. **archive** - `asdlc archive <ID>`: sync specs to openspec/specs/ + update README.md (updates AGENTS.md only for constitutional changes).

Need orientation? `asdlc status <ID>` (where am I / next command) and `asdlc doctor`
(environment health). A bad spec is never edited: close it and `asdlc new` again.

<!-- asdlc:system-status -->
## System status (from the knowledge graph, generated - do not hand-edit)

God nodes (most connected):
  1. recommend() - 22 edges
  2. loadConfig() - 19 edges
  3. vitest - 18 edges
  4. t() - 17 edges
  5. createApp() - 17 edges
  6. Requirements - 17 edges
  7. AmapClient - 16 edges
  8. makeFetch() - 15 edges
  9. AppError - 13 edges
  10. happyRoutes() - 13 edges

_Architectural hubs = the most-connected modules. Run `asdlc new <change>`
to query the graph for detail._
