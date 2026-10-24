import { beforeEach, describe, expect, it, vi } from "vitest";
import { editTicketStatus, fetchTicketList } from "@/lib/mockApi";
import { makeStore } from "@/lib/store";
import type { Ticket, TicketStatus } from "./types";
import {
  fetchTickets,
  selectVisibleTickets,
  setStatusFilter,
  setTitleSearch,
  updateTicketStatus,
} from "./ticketsSlice";

vi.mock("@/lib/mockApi", () => ({
  fetchTicketList: vi.fn(),
  editTicketStatus: vi.fn(),
}));

const fixtures: Ticket[] = [
  { id: 1, title: "Login problem", description: "Account access", status: "open" },
  { id: 2, title: "Login timeout", description: "Connection issue", status: "closed" },
  { id: 3, title: "Billing question", description: "Login mentioned only here", status: "open" },
];

// Keep requests pending until the test explicitly resolves or rejects them.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type SaveResult = Awaited<ReturnType<typeof editTicketStatus>>;

async function loadedStore() {
  const store = makeStore();
  vi.mocked(fetchTicketList).mockResolvedValue(fixtures);
  await store.dispatch(fetchTickets()).unwrap();
  return store;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("ticket filtering", () => {
  it.each([
    ["all", "", [1, 2, 3]],
    ["open", "", [1, 3]],
    ["closed", "", [2]],
    ["all", "  LOGIN  ", [1, 2]],
    ["open", "login", [1]],
    ["closed", "billing", []],
    ["all", "unknown", []],
  ] satisfies ["all" | TicketStatus, string, number[]][])(
    "filters status=%s and search=%s",
    async (status, search, expectedIds) => {
      const store = await loadedStore();
      store.dispatch(setStatusFilter(status));
      store.dispatch(setTitleSearch(search));
      expect(selectVisibleTickets(store.getState()).map(({ ticket }) => ticket.id))
        .toEqual(expectedIds);
    },
  );
});

describe("ticket fetching", () => {
  it("exposes loading and prevents duplicate fetches", async () => {
    const request = deferred<Ticket[]>();
    vi.mocked(fetchTicketList).mockReturnValue(request.promise);
    const store = makeStore();
    const first = store.dispatch(fetchTickets());
    await store.dispatch(fetchTickets());
    expect(store.getState().tickets.fetchStatus).toBe("pending");
    expect(fetchTicketList).toHaveBeenCalledTimes(1);
    request.resolve(fixtures);
    await first.unwrap();
    expect(store.getState().tickets.fetchStatus).toBe("succeeded");
    expect(store.getState().tickets.tickets.map(({ ticket }) => ticket)).toEqual(fixtures);
  });

  it("records fetch errors and allows retry with an empty result", async () => {
    vi.mocked(fetchTicketList).mockRejectedValueOnce(new Error("Network unavailable"));
    const store = makeStore();
    await store.dispatch(fetchTickets());
    expect(store.getState().tickets).toMatchObject({
      fetchStatus: "failed", errorMessage: "Network unavailable",
    });
    vi.mocked(fetchTicketList).mockResolvedValueOnce([]);
    const retry = store.dispatch(fetchTickets());
    expect(store.getState().tickets.errorMessage).toBeNull();
    await retry.unwrap();
    expect(store.getState().tickets).toMatchObject({
      fetchStatus: "succeeded", errorMessage: null, tickets: [],
    });
  });
});

describe("optimistic ticket updates", () => {
  it.each([
    [1, "open", "closed"],
    [2, "closed", "open"],
  ] satisfies [number, TicketStatus, TicketStatus][])(
    "updates ticket %i optimistically from %s to %s and confirms success",
    async (id, previousStatus, newStatus) => {
      const store = await loadedStore();
      const request = deferred<SaveResult>();
      vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
      const update = store.dispatch(updateTicketStatus({ id, newStatus }));
      const item = () => store.getState().tickets.tickets.find(({ ticket }) => ticket.id === id);
      expect(editTicketStatus).toHaveBeenCalledWith(id, newStatus);
      expect(item()).toMatchObject({
        ticket: { status: newStatus }, previousStatus, saveStatus: "pending", saveError: null,
      });
      request.resolve({ id, status: newStatus });
      await update.unwrap();
      expect(item()).toMatchObject({
        ticket: { status: newStatus }, previousStatus: null, saveStatus: "succeeded", saveError: null,
      });
    },
  );

  it("rolls back failure, restores filtered visibility, and clears the error on retry", async () => {
    const store = await loadedStore();
    store.dispatch(setStatusFilter("open"));
    const request = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
    const update = store.dispatch(updateTicketStatus({ id: 1, newStatus: "closed" }));
    expect(selectVisibleTickets(store.getState()).map(({ ticket }) => ticket.id)).toEqual([3]);
    request.reject(new Error("Save failed"));
    await update;
    expect(store.getState().tickets.tickets[0]).toMatchObject({
      ticket: { status: "open" }, previousStatus: null, saveStatus: "failed", saveError: "Save failed",
    });
    expect(selectVisibleTickets(store.getState()).map(({ ticket }) => ticket.id)).toEqual([1, 3]);
    const retryRequest = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(retryRequest.promise);
    const retry = store.dispatch(updateTicketStatus({ id: 1, newStatus: "closed" }));
    expect(store.getState().tickets.tickets[0]).toMatchObject({ saveStatus: "pending", saveError: null });
    retryRequest.resolve({ id: 1, status: "closed" });
    await retry.unwrap();
    expect(store.getState().tickets.tickets[0].saveStatus).toBe("succeeded");
  });

  it("blocks duplicate saves without overwriting the rollback value", async () => {
    const store = await loadedStore();
    const request = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
    const first = store.dispatch(updateTicketStatus({ id: 1, newStatus: "closed" }));
    await store.dispatch(updateTicketStatus({ id: 1, newStatus: "open" }));
    expect(editTicketStatus).toHaveBeenCalledTimes(1);
    expect(store.getState().tickets.tickets[0]).toMatchObject({
      ticket: { status: "closed" }, previousStatus: "open", saveStatus: "pending",
    });
    request.reject(new Error("Save failed"));
    await first;
    expect(store.getState().tickets.tickets[0].ticket.status).toBe("open");
  });

  it("keeps concurrent updates independent when one fails and the other succeeds", async () => {
    const store = await loadedStore();
    const firstRequest = deferred<SaveResult>();
    const secondRequest = deferred<SaveResult>();
    vi.mocked(editTicketStatus)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const first = store.dispatch(updateTicketStatus({ id: 1, newStatus: "closed" }));
    const second = store.dispatch(updateTicketStatus({ id: 2, newStatus: "open" }));
    secondRequest.resolve({ id: 2, status: "open" });
    await second.unwrap();
    expect(store.getState().tickets.tickets[0].saveStatus).toBe("pending");
    firstRequest.reject(new Error("Ticket 1 failed"));
    await first;
    expect(store.getState().tickets.tickets[0]).toMatchObject({
      ticket: { status: "open" }, saveStatus: "failed", saveError: "Ticket 1 failed",
    });
    expect(store.getState().tickets.tickets[1]).toMatchObject({
      ticket: { status: "open" }, saveStatus: "succeeded", saveError: null, previousStatus: null,
    });
    expect(store.getState().tickets.tickets[2].ticket).toEqual(fixtures[2]);
  });

  it("skips unknown ticket IDs", async () => {
    const store = await loadedStore();
    const before = store.getState().tickets;
    await store.dispatch(updateTicketStatus({ id: 999, newStatus: "closed" }));
    expect(editTicketStatus).not.toHaveBeenCalled();
    expect(store.getState().tickets).toBe(before);
  });
});
