// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "@/lib/store";
import { editTicketStatus, fetchTicketList } from "@/lib/mockApi";
import type { Ticket } from "@/lib/features/tickets/types";
import { Tickets } from "./Tickets";

vi.mock("@/lib/mockApi", () => ({
  fetchTicketList: vi.fn(),
  editTicketStatus: vi.fn(),
}));

const fixtures: Ticket[] = [
  { id: 1, title: "Login problem", description: "Account access", status: "open", priority: 'low' },
  { id: 2, title: "Login timeout", description: "Connection issue", status: "closed", priority: 'medium' },
  { id: 3, title: "Billing question", description: "Login mentioned only here", status: "open", priority: 'high' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type SaveResult = Awaited<ReturnType<typeof editTicketStatus>>;

function renderTickets(store = makeStore()) {
  return render(<StrictMode><Provider store={store}><Tickets /></Provider></StrictMode>);
}

// Scope queries to one card without depending on CSS class names.
function card(title: string) {
  return within(screen.getByRole("heading", { name: title }).parentElement!);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchTicketList).mockResolvedValue(fixtures);
});
afterEach(cleanup);

describe("Tickets", () => {
  it("shows loading then tickets, fetching only once under Strict Mode", async () => {
    const request = deferred<Ticket[]>();
    vi.mocked(fetchTicketList).mockReturnValue(request.promise);
    renderTickets();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(fetchTicketList).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve(fixtures));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("shows a fetch error and retries through the button", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchTicketList).mockRejectedValueOnce(new Error("Network unavailable"));
    renderTickets();
    expect(await screen.findByText("Network unavailable")).toBeInTheDocument();
    const request = deferred<Ticket[]>();
    vi.mocked(fetchTicketList).mockReturnValueOnce(request.promise);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Network unavailable")).not.toBeInTheDocument();
    await act(async () => request.resolve(fixtures));
    expect(screen.getByRole("heading", { name: "Login problem" })).toBeInTheDocument();
    expect(fetchTicketList).toHaveBeenCalledTimes(2);
  });

  it("shows the empty-data state after a successful empty fetch", async () => {
    vi.mocked(fetchTicketList).mockResolvedValueOnce([]);
    renderTickets();
    expect(await screen.findByText("No tickets found.")).toBeInTheDocument();
    expect(screen.queryByText("No tickets match the current filters.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("combines filters and recovers from no matches when search is cleared", async () => {
    const user = userEvent.setup();
    renderTickets();
    await screen.findByRole("heading", { name: "Login problem" });
    const search = screen.getByRole("textbox", { name: "Search by title:" });
    const status = screen.getByRole("combobox", { name: "Filter by status:" });
    const priority = screen.getByRole("combobox", { name: "Filter by priority:" });
    await user.type(search, "  LOGIN  ");
    await user.selectOptions(status, "closed");
    await user.selectOptions(priority, "medium")
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Login timeout" })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "billing");
    expect(screen.getByText("No tickets match the current filters.")).toBeInTheDocument();
    expect(screen.queryByText("No tickets found.")).not.toBeInTheDocument();
    await user.clear(search);
    await user.selectOptions(status, "all");
    await user.selectOptions(priority, "all");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
  });

  it("correctly filters by priority", async () => {
    const user = userEvent.setup();
    renderTickets();
    await screen.findByRole("heading", { name: "Billing question" });
    const search = screen.getByRole("textbox", { name: "Search by title:" });
    const status = screen.getByRole("combobox", { name: "Filter by status:" });
    const priority = screen.getByRole("combobox", { name: "Filter by priority:" });
    await user.clear(search);
    await user.selectOptions(status, "all");
    await user.selectOptions(priority, "high");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Billing question" })).toBeInTheDocument();
    await user.selectOptions(priority, "low");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Login problem" })).toBeInTheDocument();
  });

  it("restores filter controls and results when remounted with the same store", async () => {
    const user = userEvent.setup();
    const store = makeStore();
    const view = renderTickets(store);
    await screen.findByRole("heading", { name: "Login problem" });
    await user.selectOptions(screen.getByLabelText("Filter by status:"), "closed");
    await user.selectOptions(screen.getByLabelText("Filter by priority:"), "medium");
    await user.type(screen.getByLabelText("Search by title:"), "timeout");
    view.unmount();
    renderTickets(store);
    expect(screen.getByLabelText("Filter by status:")).toHaveValue("closed");
    expect(screen.getByLabelText("Filter by priority:")).toHaveValue("medium");
    expect(screen.getByLabelText("Search by title:")).toHaveValue("timeout");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Login timeout" })).toBeInTheDocument();
    expect(fetchTicketList).toHaveBeenCalledTimes(1);
  });

  it("resolves optimistically, disables only that ticket, and permits reopening after success", async () => {
    const user = userEvent.setup();
    renderTickets();
    await screen.findByRole("heading", { name: "Login problem" });
    const request = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
    await user.click(card("Login problem").getByRole("button", { name: "Resolve Ticket" }));
    expect(editTicketStatus).toHaveBeenCalledWith(1, "closed");
    expect(card("Login problem").getByText("Status: closed")).toBeInTheDocument();
    expect(card("Login problem").getByText("Saving...")).toBeInTheDocument();
    const disabled = card("Login problem").getByRole("button", { name: "Reopen Ticket" });
    expect(disabled).toBeDisabled();
    expect(card("Billing question").getByRole("button", { name: "Resolve Ticket" })).toBeEnabled();
    await user.click(disabled);
    expect(editTicketStatus).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve({ id: 1, status: "closed" }));
    expect(card("Login problem").queryByText("Saving...")).not.toBeInTheDocument();
    expect(card("Login problem").getByRole("button", { name: "Reopen Ticket" })).toBeEnabled();
    vi.mocked(editTicketStatus).mockResolvedValueOnce({ id: 1, status: "open" });
    await user.click(card("Login problem").getByRole("button", { name: "Reopen Ticket" }));
    expect(editTicketStatus).toHaveBeenLastCalledWith(1, "open");
    expect(card("Login problem").getByText("Status: open")).toBeInTheDocument();
  });

  it("rolls back a failed save, shows its error, and clears feedback on retry", async () => {
    const user = userEvent.setup();
    renderTickets();
    await screen.findByRole("heading", { name: "Login problem" });
    const request = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
    await user.click(card("Login problem").getByRole("button", { name: "Resolve Ticket" }));
    await act(async () => request.reject(new Error("Save unavailable")));
    expect(card("Login problem").getByText("Status: open")).toBeInTheDocument();
    expect(card("Login problem").getByText("Error: Save unavailable")).toBeInTheDocument();
    expect(card("Billing question").queryByText(/Error:/)).not.toBeInTheDocument();
    const retry = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(retry.promise);
    await user.click(card("Login problem").getByRole("button", { name: "Resolve Ticket" }));
    expect(card("Login problem").queryByText(/Error:/)).not.toBeInTheDocument();
    expect(card("Login problem").getByText("Saving...")).toBeInTheDocument();
    await act(async () => retry.resolve({ id: 1, status: "closed" }));
    expect(card("Login problem").getByRole("button", { name: "Reopen Ticket" })).toBeEnabled();
  });

  it("returns a ticket with its error when a filtered optimistic save fails", async () => {
    const user = userEvent.setup();
    renderTickets();
    await screen.findByRole("heading", { name: "Login problem" });
    await user.selectOptions(screen.getByLabelText("Filter by status:"), "open");
    const request = deferred<SaveResult>();
    vi.mocked(editTicketStatus).mockReturnValueOnce(request.promise);
    await user.click(card("Login problem").getByRole("button", { name: "Resolve Ticket" }));
    expect(screen.queryByRole("heading", { name: "Login problem" })).not.toBeInTheDocument();
    await act(async () => request.reject(new Error("Save failed")));
    expect(card("Login problem").getByText("Status: open")).toBeInTheDocument();
    expect(card("Login problem").getByText("Error: Save failed")).toBeInTheDocument();
  });
});
