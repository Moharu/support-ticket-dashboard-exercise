import { createAppSlice } from "@/lib/createAppSlice";
import { fetchTicketList, editTicketStatus } from "../../mockApi";
import { createSelector } from "@reduxjs/toolkit";
import type { TicketPriority, TicketStatus, UiTicket } from "./types";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/store";

export type TicketsSliceState = {
  tickets: UiTicket[];
  statusFilter: "all" | TicketStatus;
  priorityFilter: "all" | TicketPriority;
  titleSearch: string;
  fetchStatus: "idle" | "pending" | "succeeded" | "failed";
  errorMessage: string | null;
};

const initialState: TicketsSliceState = {
  tickets: [],
  statusFilter: 'all',
  priorityFilter: 'all',
  titleSearch: '',
  fetchStatus: "idle",
  errorMessage: null,
};


export const ticketsSlice = createAppSlice({
  name: "tickets",
  initialState,
  reducers: (create) => ({
    setStatusFilter: create.reducer((state, action: PayloadAction<"all" | TicketStatus>) => {
      state.statusFilter = action.payload;
    }),
    setTitleSearch: create.reducer((state, action: PayloadAction<string>) => {
      state.titleSearch = action.payload;
    }),
    setPriorityFilter: create.reducer((state, action: PayloadAction<"all" | TicketPriority>) => {
      state.priorityFilter = action.payload;
    }),
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
            previousStatus: null,
            saveError: null,
          }));
        },
        rejected: (state, action) => {
          state.fetchStatus = "failed";
          state.errorMessage = action.error.message || "Failed to fetch tickets";
        },
      }
    ),
    updateTicketStatus: create.asyncThunk(
      ({ id, newStatus }: { id: number; newStatus: TicketStatus }) => editTicketStatus(id, newStatus), {
        options: {
          condition: ({ id }, { getState }): boolean => {
            const state = getState() as RootState;
            const ticketItem = state.tickets.tickets.find(({ ticket }) => ticket.id === id);
            if(!ticketItem || ticketItem.saveStatus === "pending") {
              return false;
            }
            return true;
          },
        },
        pending: (state, action) => {
          const ticketItem = state.tickets.find(({ ticket }) => ticket.id === action.meta.arg.id);
          if (ticketItem) {
            ticketItem.saveStatus = "pending";
            ticketItem.previousStatus = ticketItem.ticket.status;
            ticketItem.ticket.status = action.meta.arg.newStatus;
            ticketItem.saveError = null;
          }
        },
        fulfilled: (state, action) => {
          const ticketItem = state.tickets.find(({ ticket }) => ticket.id === action.payload.id);
          if (ticketItem) {
            ticketItem.ticket.status = action.payload.status;
            ticketItem.saveStatus = "succeeded";
            ticketItem.previousStatus = null;
            ticketItem.saveError = null;
          }
        },
        rejected: (state, action) => {
          const { id } = action.meta.arg;
          const ticketItem = state.tickets.find(({ ticket }) => ticket.id === id);
          if (ticketItem) {
            ticketItem.saveStatus = "failed";
            ticketItem.ticket.status = ticketItem.previousStatus ?? ticketItem.ticket.status;
            ticketItem.previousStatus = null;
            ticketItem.saveError = action.error.message || `Failed to update ticket ${id} status`;
          }
        },
      }
    ),
  }),
  selectors: {
    selectNumberOfTickets: (state) => state.tickets.length,
    selectVisibleTickets: createSelector(
      [
        (state: TicketsSliceState) => state.tickets,
        (state: TicketsSliceState) => state.statusFilter,
        (state: TicketsSliceState) => state.priorityFilter,
        (state: TicketsSliceState) => state.titleSearch
      ],
      (tickets, statusFilter, priorityFilter, titleSearch) => {
        const search = titleSearch.toLowerCase().trim();
        return tickets.filter(({ ticket: { status, title, priority } }) => {
          const matchesStatus =
            statusFilter === "all" || status === statusFilter;
          const matchesPriority =
            priorityFilter === "all" || priority === priorityFilter;
          const matchesTitle = title
            .toLowerCase()
            .includes(search);
          return matchesStatus && matchesTitle && matchesPriority;
        });
      }
    ),
    selectTitleSearch: (state) => state.titleSearch,
    selectStatusFilter: (state) => state.statusFilter,
    selectPriorityFilter: (state) => state.priorityFilter,
    selectFetchStatus: (state) => state.fetchStatus,
    selectErrorMessage: (state) => state.errorMessage,
  },
});

export const { fetchTickets, updateTicketStatus, setStatusFilter, setPriorityFilter, setTitleSearch } =
  ticketsSlice.actions;

export const { 
  selectNumberOfTickets,
  selectFetchStatus,
  selectErrorMessage,
  selectVisibleTickets,
  selectTitleSearch,
  selectPriorityFilter,
  selectStatusFilter
} = ticketsSlice.selectors;
