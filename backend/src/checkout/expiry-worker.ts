import type { Database } from '../db/database.ts';
import { expirePendingOrders } from './orders.ts';

export function startExpiryWorker(db: Database) {
  let running: Promise<void> | undefined, stopped = false;
  const tick = () => {
    if (stopped || running) return;
    running = expirePendingOrders(db).then((count) => {
      if (count) console.log(JSON.stringify({ event: 'orders_expired', count }));
    }).catch(() => { console.error(JSON.stringify({ event: 'order_expiry_failed' })); }).finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, 60000); timer.unref(); tick();
  return async () => { stopped = true; clearInterval(timer); await running; };
}
