import { visitorAPI } from '../api';
import { readQueue, removeFromQueue } from './cache';

// Fires the queued check-in/out mutations one by one. Stops on network
// failure (keeps the queue intact), discards items that the server rejects
// as 4xx (bad data — e.g. already checked in).
export async function drainQueue({ onProgress } = {}) {
  const queue = readQueue();
  if (queue.length === 0) return { drained: 0, dropped: 0, remaining: 0 };

  let drained = 0;
  let dropped = 0;

  for (const action of queue) {
    try {
      if (action.type === 'checkIn')       await visitorAPI.checkIn(action.visitorId);
      else if (action.type === 'checkOut') await visitorAPI.checkOut(action.visitorId);
      else { removeFromQueue(action.id); continue; }
      removeFromQueue(action.id);
      drained++;
      onProgress?.({ drained, dropped, remaining: queue.length - drained - dropped });
    } catch (err) {
      // No response = network still down. Stop here, keep rest of queue.
      if (!err.response) break;
      // Server rejected — the action is stale/bad. Drop it so we don't loop.
      removeFromQueue(action.id);
      dropped++;
    }
  }

  return { drained, dropped, remaining: readQueue().length };
}
