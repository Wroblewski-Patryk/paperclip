# App Lifecycle Standard

This standard keeps Paperclip focused on useful application delivery without
heavy ceremony. It applies to active sellable apps such as Soar and Roost, and
to future apps only after the board explicitly activates them.

## Purpose

Every app must move through a visible lifecycle before agents create broad
implementation work. The lifecycle prevents three common failures:

- agents fix backend code while the user flow remains broken in the browser;
- agents create product work for parked projects;
- agents start a new app without business, architecture, release, or proof
  boundaries.

## Entry Paths

| Path | When to use | First output |
| --- | --- | --- |
| `takeover` | Existing app is unclear, partially broken, or inherited from previous work. | Known-state map and app-completion index. |
| `repair` | App is mapped and the gaps are known. | One-owner repair/proof lanes from the gap register. |
| `greenfield` | App does not exist yet or is being rebuilt from first principles. | Lifecycle brief and first release slice. |

Do not mix paths in one issue. A takeover issue may discover repair work, and a
greenfield brief may create implementation lanes, but each child issue should
name one path and one proof contract.

## Takeover Minimum

A takeover lane is complete only when it records:

- target user and current version goal;
- repo/docs/source-control state;
- architecture/module map;
- route/component/API/data/integration map;
- auth, subscription, configuration, and secrets boundaries;
- user-flow app-completion index;
- browser/screenshot proof status for primary flows;
- tests, smoke commands, release/deploy state, and blockers;
- smallest next owner lanes for `works`, `fails`, and `unknown`.

Unknown is a valid output. It must become a named map/proof lane, not a broad
"fix the app" task.

## Repair Minimum

A repair lane starts from known evidence and ends with review evidence:

- affected user flow and architecture entities;
- exact broken layer: frontend, backend, data, auth, entitlement,
  configuration, integration, tests, docs, deploy, or browser proof;
- smallest changed files/entities;
- local verification command or explicit blocker;
- browser/clickthrough/screenshot proof when user-visible;
- handoff reviewer and next owner.

If a backend function works but the frontend displays it badly, the lane is not
done. If the frontend exists but API keys, subscription, exchange configuration,
or backend behavior are missing, the lane is also not done.

## Greenfield Minimum

A greenfield app may start coding only after a short lifecycle brief exists:

- owner intent: why the app should exist now;
- target user and primary job-to-be-done;
- first paid/free boundary and subscription expectation;
- first release slice: one useful workflow, not the whole dream;
- data model and integration boundaries;
- auth/account/configuration requirements;
- UX route map and primary browser path;
- test/smoke/release expectations;
- security, privacy, live-money, and irreversible-action risks;
- acceptance owner and first review gate.

The first release slice should be small enough for agents to prove end to end:
login if required, configure if required, perform the primary user action, see
the correct result, and know what remains outside the slice.

## Active And Parked Apps

Current active apps:

- `Soar`: first active sellable lane.
- `Roost`: second active sellable lane for V1 local completion and later V2.1
  Paperclip/Roost integration.

Parked apps stay quiet until the board activates them. Preparation may read
docs or preserve existing knowledge, but routines must not create new
implementation/controller work for parked apps by default.

## Required Handoff

Every lifecycle issue ends with one durable disposition:

- `done`: evidence-backed and reviewed or ready for review;
- `in_review`: named reviewer has the proof packet;
- `delegated`: child issue exists with one owner and proof contract;
- `blocked`: exact blocker, owner, and unblock action;
- `deferred`: parked by board or out of current release slice.

The final comment should name the app, lifecycle path, changed or inspected
files, proof, gaps, next owner, and whether docs/indexes were updated.
