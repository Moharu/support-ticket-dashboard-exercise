"use client";
import { fetchTickets, selectTickets, selectFetchStatus, selectErrorMessage } from "@/lib/features/tickets/ticketsSlice";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import styles from "./Tickets.module.css";

export const Tickets = () => {
  const ticketList = useAppSelector(selectTickets);
  const fetchStatus = useAppSelector(selectFetchStatus);
  const errorMessage = useAppSelector(selectErrorMessage);

  const isLoading = fetchStatus === "pending";
  const isSuccess = fetchStatus === "succeeded";
  const isError = fetchStatus === "failed";

  const dispatch = useAppDispatch();
  const handleFetchTickets = () => { 
    dispatch(fetchTickets());
  }

  useEffect(() => {
    if(fetchStatus === "idle") {
      handleFetchTickets();
    }
  }, [dispatch, fetchStatus]);

  if (isError) {
    return (
      <div>
        <h1>{errorMessage}</h1>
        <button onClick={handleFetchTickets}>Retry</button>
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

  if (ticketList.length === 0) {
    return (
      <div>
        <h1>No tickets found.</h1>
        <button onClick={handleFetchTickets}>Retry</button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.container}>
        {ticketList.map((ticketItem) => {
          const { ticket, saveStatus, saveError } = ticketItem;
          const { id, title, description, status } = ticket;
          return (
            <div key={id} className={styles.ticketCard}>
              <h2>{title}</h2>
              <p>{description}</p>
              <p>Status: {status}</p>
              {saveStatus === "pending" && <p>Saving...</p>}
              {saveStatus === "failed" && (
                <p className={styles.error}>Error: {saveError}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};
