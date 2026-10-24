import type { TicketStatus, Ticket } from './features/tickets/types';

export function fetchTicketList(randomFunction = Math.random, randomChance = 0.2, timeoutFunction = setTimeout): Promise<Ticket[]> {
  const isSuccessful = randomFunction() >= randomChance;
  return new Promise((resolve, reject) => {
    timeoutFunction(() => {
      if (isSuccessful) {
        resolve([
          { id: 1, title: 'Ticket 1', description: 'Description for Ticket 1', status: 'open' },
          { id: 2, title: 'Ticket 2', description: 'Description for Ticket 2', status: 'closed' },
          { id: 3, title: 'Ticket 3', description: 'Description for Ticket 3', status: 'open' },
        ]);
      } else {
        reject(new Error('Failed to fetch ticket list'));
      }
    }, 750);
  }); 
}

export function editTicketStatus(ticketId: number, newStatus: TicketStatus, randomFunction = Math.random, randomChance = 0.2, timeoutFunction = setTimeout): Promise<{ id: number; status: TicketStatus }> {
  const isSuccessful = randomFunction() >= randomChance;
  return new Promise((resolve, reject) => {
    timeoutFunction(() => {
      if (isSuccessful) {
        resolve({ id: ticketId, status: newStatus });
      } else {
        reject(new Error(`Failed to update ticket ${ticketId} status`));
      }
    }, 750);
  });
}