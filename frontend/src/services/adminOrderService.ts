import { getAdminSession } from './adminService';
import { createOrderRepository } from './mock/orderRepository';
import { catalogRepository } from './mock/catalogRepository';
import { changeOrder, queryOrders, reportRevenue, type OrderQuery, type ReportPeriod } from '../domain/orders';
import type { AdminOrderService } from './contracts';
const authorize = () => {
  const user = getAdminSession();
  if (!user || !catalogRepository.read().users.some((u) => u.id === user.id && u.active)) throw new Error('Phiên demo đã hết hạn. Hãy đăng nhập lại.');
  return user.name;
};
export function createAdminOrderService(repository = createOrderRepository(), actor = authorize, now = () => new Date().toISOString()): AdminOrderService {
  return {
    async list(query: OrderQuery = {}) { actor(); return queryOrders(repository.list(), query); },
    async get(id: string) { actor(); return repository.find(id); },
    async update(id: string, revision: number, kind: 'status' | 'payment', target: string, note: string) {
      const name = actor(); return repository.update(id, revision, (order) => changeOrder(order, kind, target, note, name, now()));
    },
    async report(from: string, to: string, period: ReportPeriod) { actor(); return reportRevenue(repository.list(), from, to, period); },
  };
}
export const adminOrderService = createAdminOrderService();
