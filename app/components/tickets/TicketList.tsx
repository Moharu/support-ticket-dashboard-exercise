import type { UiTicket, TicketStatus } from "@/lib/features/tickets/types";
import styles from "./Tickets.module.css";

export default function TicketList({ ticketList, onChangeStatus }: { ticketList: UiTicket[], onChangeStatus: (id: number, newStatus: TicketStatus) => void }) {
  return <div>
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
              { status === "open" && <button disabled={saveStatus === "pending"} onClick={() => onChangeStatus(id, "closed")}>Resolve Ticket</button> }
              { status === "closed" && <button disabled={saveStatus === "pending"} onClick={() => onChangeStatus(id, "open")}>Reopen Ticket</button> }
            </div>
          );
        })}
  </div>
}