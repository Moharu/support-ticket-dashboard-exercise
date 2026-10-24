# Support Ticket Dashboard Exercise

An interview practice project built with Next.js App Router, TypeScript, and
Redux Toolkit, starting from the Next.js `with-redux` example. The goal was to
practice component design, state ownership, asynchronous requests, optimistic
updates, and meaningful tests.

## Run locally

Use Node.js 24 and npm:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/tickets](http://localhost:3000/tickets).
The home route redirects to `/tickets`. The unused starter demos have been removed.

## Features

- Fetch tickets from a mock asynchronous API with loading, error/retry, and empty states.
- Combine a status filter with case-insensitive title search; surrounding search whitespace is ignored.
- Resolve and reopen tickets optimistically, updating the UI before the API responds.
- Show per-ticket saving and error feedback, and restore the previous status when a save fails.
- Disable actions for a saving ticket and block duplicate requests in the thunk, while allowing different tickets to save independently.

The mock API simulates a 750 ms delay and a 20% failure probability. It has no
persistence: refreshing the page restores the initial fixtures. Randomness and
scheduling can be injected for testing.

## What was learned

### Component boundaries and state ownership

`Tickets` coordinates fetching, Redux state, and controlled filter inputs.
`TicketList` receives visible tickets and a status-change callback through props,
keeping it independent of Redux. A separate component for each card was unnecessary
for this scope.

The API's `Ticket` type contains domain data. `UiTicket` adds client-only save
status, error information, and the previous status needed for rollback. Keeping
that state per ticket prevents concurrent saves from interfering with each other.

### Async Redux flows

Redux Toolkit thunks model pending, fulfilled, and rejected request lifecycles.
Original request arguments are available through `action.meta.arg`; successful
API results are available through `action.payload`.

Optimistic updates preserve the previous status before changing it. Success
confirms the API result and clears rollback data; failure restores the previous
status and records an error. Redux remains the source of truth for both rendering
and filtering.

Thunk conditions check current store state before starting requests. They prevent
duplicate fetches during React Strict Mode's development effect replay and prevent
a second save from overwriting a ticket's rollback state.

### Derived state and TypeScript

Visible tickets are derived rather than stored as a second list. A memoized
`createSelector` combines tickets, status, and search, returning the cached array
when those inputs have not changed. Controlled inputs keep the displayed filters
consistent with Redux when the component remounts.

TypeScript unions restrict ticket and request statuses. Type-only imports keep
shared contracts separate from runtime dependencies. Explicit return annotations
can break circular type inference between a slice and the store. The nullish
coalescing operator (`??`) provides a fallback specifically for missing values.

### Testing async behavior

Tests use a real Redux store and mock the API boundary. Deferred promises let tests
hold requests pending, assert the optimistic state or disabled button, then trigger
success or failure without randomness or real delays.

Selector and thunk tests cover combined filtering, title normalization, fetching
and retry, resolve/reopen success, rollback, duplicate submissions, independent
concurrent saves, and unknown ticket IDs.

Component tests use React Testing Library, user-event, and jsdom to verify loading,
retry, empty states, filter interactions and remounting, disabled actions, and save
feedback. They also verify that a ticket hidden by an optimistic status change
returns with its error after rollback. Queries use labels, headings, and button
names rather than CSS classes. These tests check behavior, not visual layout.

## Conclusions and tradeoffs

This was primarily a React, asynchronous state management, and testing exercise
hosted inside Next.js. It used App Router routes and the server/client component
boundary, but the dashboard's data flow runs in the browser. The mock client API
left little reason to explore server-side data fetching, caching, or backend route
handlers as part of the ticket implementation.

Redux Toolkit made optimistic updates, per-ticket request tracking, rollback, and
testing explicit. However, the store, provider, typed hooks, slices, selectors, and
thunks introduced substantial structure for a small dashboard. Before cleanup, the
starter examples also made the project noisier to navigate.

Redux was a useful learning choice, rather than a requirement imposed by this
scope. Local state with `useReducer` could handle these interactions; a query
library would be another option for managing data fetched from a real API. The
choice should reflect how widely state is shared and how the application is
expected to grow.

## Possible follow-ups

- Rebuild the same dashboard with `useReducer`, preserving the behavior and test
  cases, then compare navigation, code volume, and ownership of async logic.
- Build a separate Next.js exercise around server-fetched data, persistence, and
  server-side mutations. Explore loading/error boundaries and cache revalidation
  so the framework plays a more substantial role.
- Connect the dashboard to a real API and compare explicit thunk lifecycles with
  a query library's fetching, mutation, and optimistic-update model.

## Validation

```bash
npm test               # Watch mode
npm run test:run       # Run all 23 tests once
npm run typecheck      # Check TypeScript separately
npm run build          # Production build
```

Test files:

- `lib/features/tickets/ticketsSlice.test.ts`: selector and async Redux behavior.
- `app/components/tickets/Tickets.test.tsx`: component interactions with Redux.

The dashboard was implemented through coached checkpoints. The initial selector,
thunk, and component tests were implemented by the assistant, with explanations
of the test cases and assertions. The subsequent priority-filter coverage was
written by the project author, with assistant review and feedback.
