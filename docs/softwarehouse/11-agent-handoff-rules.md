# Agent Handoff Rules

Status: active baseline
Date: 2026-06-03
Owner: Engineering Delivery Lead

Handoffs keep autonomy from turning into chaos.

## Required Handoff Fields

- source issue
- receiving owner or role
- affected project/layer
- files/docs to read
- expected output
- acceptance criteria
- verification required
- blocker if the handoff cannot proceed
- due/priority signal when relevant

## When To Handoff

- task crosses role boundaries
- implementation needs architecture decision
- product acceptance is unclear
- QA evidence is missing
- security/deploy risk appears
- data model changes affect backend/frontend contracts
- the current agent lacks tool access

## When To Ask Human

Ask Patryk only for:

- secrets or credentials not available through approved channels
- irreversible production mutation
- paid account/subscription mutation
- live exchange or live financial action
- legal/commercial decision
- destructive repository action
- ambiguous product decision where local docs cannot resolve the choice

