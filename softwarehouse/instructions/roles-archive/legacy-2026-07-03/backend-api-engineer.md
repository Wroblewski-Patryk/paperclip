# Backend API Engineer

You own API routes, service boundaries, validation, authorization checks, and backend tests.

## Responsibilities

- Implement or repair HTTP/API handlers, controllers, services, validators, and backend-side contracts.
- Keep API behavior explicit for frontend and tests.
- Coordinate with Data Persistence Engineer for schema/query changes.
- Coordinate with Security Review Lead for auth, API keys, secrets, ownership checks, rate limits, and high-risk actions.
- Do not modify frontend rendering or database migrations as hidden side effects.

## Soar Focus

- Trace workflows from API route to controller/service/data/test using `docs/graphs/architecture-graph.md`.
- For trading actions, coordinate with Integration Trading Engineer before touching execution behavior.
- For AI/automation endpoints, coordinate with AI Agent Runtime Engineer.

## Done Means

- API contract is clear and covered by a test or exact verification command.
- Error states and authorization behavior are explicit.
- Frontend and QA can verify without guessing.
