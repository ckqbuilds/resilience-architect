# TUI Multi-View Redesign

## Summary

Evolve the Ink-based terminal UI from a single chat view into a multi-view application with four full-screen views (Chat, Resources, Experiments, Config), inline tool call status, and a quick-peek overlay for glancing at data without leaving chat.

## Views

### Navigation

A persistent tab bar at the top of every view shows the active view, current operation mode, and AWS region.

**Switching views:**
- Keyboard: `1` (Chat), `2` (Resources), `3` (Experiments), `4` (Config)
- Slash commands: `/chat`, `/resources`, `/experiments`, `/config`
- Each view is full-screen — only one view visible at a time

**Quick-peek overlay:**
- Hold `Tab` from the chat view to overlay a compact summary of the last active data view
- Use `←` `→` while holding to switch between Resources and Experiments panels
- Release `Tab` to dismiss

### View 1: Chat

The existing chat view, with two changes:

**Inline tool status:** While the agent is working, a single line appears at the bottom of the assistant's response area showing a spinner, the tool name, and the operation (e.g., `⠋ use_aws → ecs.describe_clusters`). Each new tool call overwrites the previous line. When the agent finishes, the status line disappears and the final response renders.

**Remove ActionLog component.** The backtick toggle and expandable action log are replaced entirely by the inline status line.

Existing slash commands (`/help`, `/info`, `/clear`, `/quit`, `/mode`) continue to work. New view-switching commands are added.

### View 2: Resources

A filterable flat table showing all AWS resources discovered by the discovery agent.

**Columns:** Service, Resource Name, Status, Region, Tags

**Data source:** Cached results from the discovery agent. Not live API calls. The frontend parses `use_aws` tool results from agent responses and stores them in a `ResourceStore`.

**Filtering:** Press `/` to open a filter bar. Supports:
- `service:ecs` — filter by AWS service
- `tag:key=value` — filter by resource tag
- `status:active` — filter by status
- Free text — search across all columns

**Navigation:**
- `↑` `↓` to move between rows
- `Enter` to view resource details
- `r` to re-run discovery (sends a message to the agent)
- `s` to cycle sort column
- `Esc` to return to chat

**Empty state:** If no resources have been discovered yet, show a prompt: "No resources discovered. Switch to Chat and ask the agent to scan your infrastructure."

### View 3: Experiments

A table merging two data sources:

1. **Local plans** from `~/.experiment_plans/` (loaded via the existing plan management API)
2. **Live FIS experiments** from AWS (fetched via the agent when the view is opened or refreshed)

**Columns:** Source (Local/AWS), Name, Status, Risk Level, Targets, Duration

**Sub-tabs:** All | Local Plans | AWS Experiments (switch with `Tab`)

**Status values and colors:**
- Draft (yellow) — local plan, not yet exported
- Ready (green) — local plan, exported as FIS template
- Running (red, animated) — live FIS experiment in progress
- Completed (gray) — finished experiment
- Failed (red) — experiment that errored

**Navigation:**
- `↑` `↓` to move between rows
- `Enter` to view full experiment/plan details (targets, actions, stop conditions, cost estimate, results)
- `f` to filter
- `r` to refresh live experiment status
- `Esc` to return to chat

### View 4: Config

A form-style settings screen with arrow-key navigation.

**Settings:**
- LLM Provider — cycle through: Anthropic, Bedrock, Gemini, OpenAI
- Model — cycle through available models for the selected provider
- AWS Profile — cycle through profiles from `~/.aws/credentials`
- AWS Region — editable text field
- Operation Mode — Planning, Action, Execution (display only, shows current mode)

**Navigation:**
- `↑` `↓` to move between settings
- `←` `→` to cycle values
- `Enter` to confirm a change (calls existing API endpoints: `/api/models/switch`, `/api/profiles/switch`)
- `Esc` to return to chat

**Changes apply immediately** through the existing backend API.

## Data Flow

```
Agent response (via /api/chat)
  ├── text content → Chat view (messages)
  ├── tool events → Chat view (inline status line, one at a time)
  ├── use_aws results (describe_*, list_*) → ResourceStore → Resources view
  └── interrupt → Mode transition dialog (existing)

Plan management (via agent tools)
  └── ~/.experiment_plans/ → PlanStore → Experiments view (local plans)

FIS live status (via agent on-demand)
  └── use_aws fis.list_experiments → Experiments view (AWS experiments)

Config changes (via existing API endpoints)
  └── /api/models/switch, /api/profiles/switch → Config view
```

### ResourceStore

A new frontend state module that:
- Parses agent tool call results for AWS resource data (service, resource ID, name, status, region, tags)
- Stores resources in a flat array
- Exposes filter/sort methods for the Resources view
- Persists for the session lifetime (in-memory)

### PlanStore

A new frontend state module that:
- Fetches saved plans via the agent's `list_experiment_plans` / `load_experiment_plan` tools
- Caches plan metadata for the Experiments view
- Refreshes on demand when the view is opened

## Component Changes

### New Components
- `TabBar.tsx` — persistent navigation bar with view indicators, mode, and region
- `ResourcesView.tsx` — filterable resource table
- `ExperimentsView.tsx` — merged experiment/plan table with sub-tabs
- `ConfigView.tsx` — form-style settings editor
- `QuickPeek.tsx` — overlay component triggered by holding Tab
- `InlineToolStatus.tsx` — single-line spinner + tool name for chat view
- `FilterBar.tsx` — reusable filter input with syntax parsing (service:, tag:, status:)

### Modified Components
- `App.tsx` — add view state management, tab switching logic, ResourceStore/PlanStore integration
- `ChatDisplay.tsx` — integrate InlineToolStatus, remove ActionLog references
- `Footer.tsx` — may be simplified or merged into TabBar

### Removed Components
- `ActionLog.tsx` — replaced by InlineToolStatus

## Keyboard Shortcuts Summary

| Key | Context | Action |
|-----|---------|--------|
| `1` `2` `3` `4` | Any view | Switch to Chat/Resources/Experiments/Config |
| `Tab` (hold) | Chat | Quick-peek overlay |
| `←` `→` | Quick-peek | Switch between Resources/Experiments panels |
| `/` | Resources/Experiments | Open filter bar |
| `↑` `↓` | Table views | Navigate rows |
| `Enter` | Table views | View details |
| `r` | Resources/Experiments | Refresh data |
| `s` | Resources | Cycle sort column |
| `f` | Experiments | Open filter |
| `Tab` | Experiments | Switch sub-tabs |
| `Esc` | Any non-chat view | Return to chat |

## Backend Changes

No backend API changes required. All new functionality uses existing endpoints:
- `/api/chat` — agent communication (tool results parsed by frontend)
- `/api/models/switch` — model switching from Config view
- `/api/profiles/switch` — profile switching from Config view
- `/api/models/providers` — populate Config view options
- `/api/profiles` — populate Config view options
- `/api/info` — current state for Config view

## Out of Scope

- Live/streaming resource updates (resources are cached from agent results)
- Persistent resource cache across sessions (in-memory only)
- Resource detail editing from the Resources view
- Creating new experiments from the Experiments view (use chat for this)
- Custom keybinding configuration
