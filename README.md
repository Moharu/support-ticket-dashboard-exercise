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
The original counter and quotes examples remain in the repository.

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

The dashboard was implemented through coached checkpoints; test implementation
was delegated to the assistant and reviewed through explanations of the cases
and assertions.
