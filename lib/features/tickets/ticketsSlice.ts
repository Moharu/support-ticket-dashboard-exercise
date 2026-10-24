import { createAppSlice } from "@/lib/createAppSlice";
import { fetchTicketList } from "../../mockApi";
import type { UiTicket } from "./types";
import type { RootState } from "@/lib/store";

export type TicketsSliceState = {
  tickets: UiTicket[];
  fetchStatus: "idle" | "pending" | "succeeded" | "failed";
  errorMessage: string | null;
};

const initialState: TicketsSliceState = {
  tickets: [],
  fetchStatus: "idle",
  errorMessage: null,
};


export const ticketsSlice = createAppSlice({
  name: "tickets",
  initialState,
  reducers: (create) => ({
    fetchTickets: create.asyncThunk(
      () => fetchTicketList(),{
        options: {
          condition: (_, { getState }): boolean => {
            const state = getState() as RootState;
            const status = state.tickets.fetchStatus;

            return status === "idle" || status === "failed";
          },
        },
        pending: (state) => {
          state.fetchStatus = "pending";
          state.errorMessage = null;
        },
        fulfilled: (state, action) => {
          state.fetchStatus = "succeeded";
          state.tickets = action.payload.map((ticket) => ({
            ticket,
            saveStatus: "idle",
            saveError: null,
          }));
        },
        rejected: (state, action) => {
          state.fetchStatus = "failed";
          state.errorMessage = action.error.message || "Failed to fetch tickets";
        },
      }
    ),
  }),
  selectors: {
    selectTickets: (state) => state.tickets,
    selectFetchStatus: (state) => state.fetchStatus,
    selectErrorMessage: (state) => state.errorMessage,
  },
});

// Action creators are generated for each case reducer function.
export const { fetchTickets } =
  ticketsSlice.actions;

// Selectors returned by `slice.selectors` take the root state as their first argument.
export const { selectTickets, selectFetchStatus, selectErrorMessage } = ticketsSlice.selectors;
