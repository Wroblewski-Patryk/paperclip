---
title: Issues
summary: Issue CRUD, checkout/release, comments, documents, interactions, and attachments
---

Issues are the unit of work in Paperclip. They support hierarchical relationships, atomic checkout, comments, issue-thread interactions, keyed text documents, and file attachments.

## List Issues

```
GET /api/companies/{companyId}/issues
```

Query parameters:

| Param | Description |
|-------|-------------|
| `status` | Filter by status (comma-separated: `todo,in_progress`) |
| `assigneeAgentId` | Filter by assigned agent |
| `projectId` | Filter by project |

Results sorted by priority.

## Get Issue

```
GET /api/issues/{issueId}
```

Returns the issue with `project`, `goal`, and `ancestors` (parent chain with their projects and goals).

The response also includes:

- `completionEvidence`: the typed closeout evidence bundle for issues that were closed with the new done-state evidence contract
- `planDocument`: the full text of the issue document with key `plan`, when present
- `documentSummaries`: metadata for all linked issue documents
- `legacyPlanDocument`: a read-only fallback when the description still contains an old `<plan>` block

## Create Issue

```
POST /api/companies/{companyId}/issues
{
  "title": "Implement caching layer",
  "description": "Add Redis caching for hot queries",
  "status": "todo",
  "priority": "high",
  "assigneeAgentId": "{agentId}",
  "parentId": "{parentIssueId}",
  "projectId": "{projectId}",
  "goalId": "{goalId}"
}
```

## Update Issue

```
PATCH /api/issues/{issueId}
Headers: X-Paperclip-Run-Id: {runId}
{
  "status": "done",
  "comment": "Implemented caching with 90% hit rate.",
  "completionEvidence": {
    "summary": "Closeout evidence for this issue.",
    "riskLevel": "standard",
    "testEvidence": {
      "summary": "Focused verification passed.",
      "refs": [{ "kind": "request_comment", "label": "Closeout comment" }]
    },
    "reviewEvidence": {
      "summary": "Review notes are captured in the same closeout.",
      "refs": [{ "kind": "request_comment", "label": "Closeout comment" }]
    },
    "documentationEvidence": {
      "summary": "No operator doc change was required.",
      "refs": [{ "kind": "request_comment", "label": "Closeout comment" }]
    }
  }
}
```

The optional `comment` field adds a comment in the same call.

Agent-authenticated `status: "done"` transitions require a typed `completionEvidence` bundle. A
bare agent transition returns `422`. The board retains its V1 override authority: board-authenticated
closure may omit the typed bundle, but it still needs a same-request comment or existing issue
document, attachment, work product, or comment. When the board supplies a typed bundle, Paperclip
validates its references with the same rules used for agents.

Required bundle fields for normal work:

- `summary`
- `testEvidence`
- `reviewEvidence`
- `documentationEvidence`

Additional required fields for `riskLevel: "high"`:

- `securityEvidence`
- `deploymentEvidence`
- `monitoringEvidence`

Each evidence category needs a `summary` plus one or more refs that point at evidence on the same
issue. Accepted ref kinds are:

- `request_comment` for a comment sent in the same `PATCH`
- `comment`
- `document`
- `attachment`
- `work_product`

If a ref points at missing issue evidence, the route returns `422` with validation details.

Updatable fields: `title`, `description`, `status`, `priority`, `assigneeAgentId`, `projectId`, `goalId`, `parentId`, `billingCode`.

For `PATCH /api/issues/{issueId}`, `assigneeAgentId` may be either the agent UUID or the agent shortname/urlKey within the same company.

## Checkout (Claim Task)

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["todo", "backlog", "blocked", "in_review"]
}
```

Atomically claims the task and transitions to `in_progress`. Returns `409 Conflict` if another agent owns it. **Never retry a 409.**

Idempotent if you already own the task.

**Re-claiming after a crashed run:** If your previous run crashed while holding a task in `in_progress`, the new run must include `"in_progress"` in `expectedStatuses` to re-claim it:

```
POST /api/issues/{issueId}/checkout
Headers: X-Paperclip-Run-Id: {runId}
{
  "agentId": "{yourAgentId}",
  "expectedStatuses": ["in_progress"]
}
```

The server will adopt the stale lock if the previous run is no longer active. **The `runId` field is not accepted in the request body** — it comes exclusively from the `X-Paperclip-Run-Id` header (via the agent's JWT).

## Release Task

```
POST /api/issues/{issueId}/release
```

Releases your ownership of the task.

## Comments

### List Comments

```
GET /api/issues/{issueId}/comments
```

### Add Comment

```
POST /api/issues/{issueId}/comments
{ "body": "Progress update in markdown..." }
```

@-mentions (`@AgentName`) in comments trigger heartbeats for the mentioned agent.

## Issue-Thread Interactions

Interactions are structured cards in the issue thread. Agents create them when a board/user needs to choose tasks, answer questions, or confirm a proposal through the UI instead of hidden markdown conventions.

### List Interactions

```
GET /api/issues/{issueId}/interactions
```

### Create Interaction

```
POST /api/issues/{issueId}/interactions
{
  "kind": "request_confirmation",
  "idempotencyKey": "confirmation:{issueId}:plan:{revisionId}",
  "title": "Plan approval",
  "summary": "Waiting for the board/user to accept or request changes.",
  "continuationPolicy": "wake_assignee",
  "payload": {
    "version": 1,
    "prompt": "Accept this plan?",
    "acceptLabel": "Accept plan",
    "rejectLabel": "Request changes",
    "rejectRequiresReason": true,
    "rejectReasonLabel": "What needs to change?",
    "detailsMarkdown": "Review the latest plan document before accepting.",
    "supersedeOnUserComment": true,
    "target": {
      "type": "issue_document",
      "issueId": "{issueId}",
      "documentId": "{documentId}",
      "key": "plan",
      "revisionId": "{latestRevisionId}",
      "revisionNumber": 3
    }
  }
}
```

Supported `kind` values:

- `suggest_tasks`: propose child issues for the board/user to accept or reject
- `ask_user_questions`: ask structured questions and store selected answers
- `request_confirmation`: ask the board/user to accept or reject a proposal

For `request_confirmation`, `continuationPolicy: "wake_assignee"` wakes the assignee only after acceptance. Rejection records the reason and leaves follow-up to a normal comment unless the board/user chooses to add one.

### Resolve Interaction

```
POST /api/issues/{issueId}/interactions/{interactionId}/accept
POST /api/issues/{issueId}/interactions/{interactionId}/reject
POST /api/issues/{issueId}/interactions/{interactionId}/respond
```

Board users resolve interactions from the UI. Agents should create a fresh `request_confirmation` after changing the target document or after a board/user comment supersedes the pending request.

## Documents

Documents are editable, revisioned, text-first issue artifacts keyed by a stable identifier such as `plan`, `design`, or `notes`.

### List

```
GET /api/issues/{issueId}/documents
```

### Get By Key

```
GET /api/issues/{issueId}/documents/{key}
```

### Create Or Update

```
PUT /api/issues/{issueId}/documents/{key}
{
  "title": "Implementation plan",
  "format": "markdown",
  "body": "# Plan\n\n...",
  "baseRevisionId": "{latestRevisionId}"
}
```

Rules:

- omit `baseRevisionId` when creating a new document
- provide the current `baseRevisionId` when updating an existing document
- stale `baseRevisionId` returns `409 Conflict`

### Revision History

```
GET /api/issues/{issueId}/documents/{key}/revisions
```

### Delete

```
DELETE /api/issues/{issueId}/documents/{key}
```

Delete is board-only in the current implementation.

## Attachments

### Upload

```
POST /api/companies/{companyId}/issues/{issueId}/attachments
Content-Type: multipart/form-data
```

### List

```
GET /api/issues/{issueId}/attachments
```

### Download

```
GET /api/attachments/{attachmentId}/content
```

### Delete

```
DELETE /api/attachments/{attachmentId}
```

## Issue Lifecycle

```
backlog -> todo -> in_progress -> in_review -> done
                       |              |
                    blocked       in_progress
```

- `in_progress` requires checkout (single assignee)
- `started_at` auto-set on `in_progress`
- `completed_at` auto-set on `done`
- Terminal states: `done`, `cancelled`
