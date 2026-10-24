export type TicketStatus = 'open' | 'closed';
export type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
}
export type UiTicket = {
  ticket: Ticket;
  saveStatus: 'idle' | 'pending' | 'succeeded' |'failed';
  saveError: string | null;
}
