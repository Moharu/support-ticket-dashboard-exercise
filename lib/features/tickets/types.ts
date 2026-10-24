export type TicketStatus = 'open' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
}
export type UiTicket = {
  ticket: Ticket;
  saveStatus: 'idle' | 'pending' | 'succeeded' |'failed';
  previousStatus: TicketStatus | null;
  saveError: string | null;
}
