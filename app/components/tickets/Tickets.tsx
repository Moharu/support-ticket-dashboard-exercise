"use client";
import { 
  fetchTickets,
  updateTicketStatus,
  selectNumberOfTickets,
  selectVisibleTickets,
  selectTitleSearch,
  selectStatusFilter,
  selectFetchStatus,
  selectErrorMessage,
  setStatusFilter,
  setPriorityFilter,
  setTitleSearch,
  selectPriorityFilter
} from "@/lib/features/tickets/ticketsSlice";
import TicketList from "./TicketList";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import styles from "./Tickets.module.css";

export const Tickets = () => {
  const ticketList = useAppSelector(selectVisibleTickets);
  const numberOfTickets = useAppSelector(selectNumberOfTickets);
  const statusFilter = useAppSelector(selectStatusFilter);
  const priorityFilter = useAppSelector(selectPriorityFilter)
  const titleSearch = useAppSelector(selectTitleSearch);
  const fetchStatus = useAppSelector(selectFetchStatus);
  const errorMessage = useAppSelector(selectErrorMessage);

  const isLoading = fetchStatus === "pending";
  const isSuccess = fetchStatus === "succeeded";
  const isError = fetchStatus === "failed";

  const dispatch = useAppDispatch();

  useEffect(() => {
    if(fetchStatus === "idle") {
      dispatch(fetchTickets());
    }
  }, [dispatch, fetchStatus]);

  if (isError) {
    return (
      <div>
        <h1>{errorMessage}</h1>
        <button onClick={() => dispatch(fetchTickets())}>Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    );
  }

  
  if (isSuccess) {
    if (numberOfTickets === 0) {
      return (
        <div>
          <h1>No tickets found.</h1>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div>
          <label htmlFor="statusFilter">Filter by status:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              const selectedStatus = e.target.value as "all" | "open" | "closed";
              dispatch(setStatusFilter(selectedStatus));
            }}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <label htmlFor="priorityFilter">Filter by priority:</label>
          <select
            id="priorityFilter"
            value={priorityFilter}
            onChange={(e) => {
              const selectedPriority = e.target.value as "all" | "low" | "medium" | "high";
              dispatch(setPriorityFilter(selectedPriority));
            }}
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <label htmlFor="titleSearch">Search by title:</label>
          <input
            id="titleSearch"
            type="text"
            placeholder="Enter ticket title..."
            value={titleSearch}
            onChange={(e) => {
              const searchTerm = e.target.value;
              dispatch(setTitleSearch(searchTerm));
            }}
          />
        </div>
        {ticketList.length === 0 ? <p>No tickets match the current filters.</p> : 
          <TicketList ticketList={ticketList} onChangeStatus={(id, newStatus) => {
            dispatch(updateTicketStatus({ id, newStatus }));
          }} />
        }
      </div>
    );
  }

  return null;
};
