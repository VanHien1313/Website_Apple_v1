import { MOCK_PRODUCTS } from '../../data/mockProducts';
import { calculateTotals, createCartItem, validQuantity } from '../../domain/cart';
import { validateCheckout } from '../../domain/checkout';
import type { OrderService } from '../contracts';
import type { Order } from '../../types/order';
import { createOrderRepository } from './orderRepository';
import { catalogRepository } from './catalogRepository';
import { customerService } from '../customerService';
import type { CustomerProfile } from '../../types/customer';

/** Browser-local demo only; no payment, email, stock reservation or server authorization. */
export function createMockOrderService(repository = createOrderRepository(), products?: typeof MOCK_PRODUCTS, currentCustomer: () => CustomerProfile | null = () => typeof window === 'undefined' ? null : customerService.current()): OrderService {
  return {
    async quoteCart(lines, shippingMethod, options) {
      const currentProducts = products ?? catalogRepository.read().products;
      options?.signal?.throwIfAborted();
      const issues: string[] = [];
      const items = lines.map((line) => {
        const product = currentProducts.find((item) => item.id === line.product.id);
        const variant = product?.variants.find((item) => item.id === line.variant.id);
        const color = product?.colors.find((item) => item.id === line.color.id);
        if (!product || !variant || !color || !variant.inStock || !validQuantity(line.quantity)) {
          issues.push(`${line.product.name}: cấu hình không còn khả dụng. Hãy xóa sản phẩm khỏi giỏ hoặc chọn lại.`);
          return line;
        }
        return createCartItem(product, variant, color, line.quantity);
      });
      return { items, issues, ...calculateTotals(items, shippingMethod) };
    },
    async getOrder(id, options) {
      options?.signal?.throwIfAborted();
      const order = repository.find(id);
      if (order?.customerId && order.customerId !== currentCustomer()?.id) return null;
      return order;
    },
    async createOrder(input, options) {
      const customer = currentCustomer();
      if (input.customerId !== customer?.id) throw new Error('Phiên khách hàng đã thay đổi. Hãy tải lại trang đặt hàng.');
      const currentProducts = products ?? catalogRepository.read().products;
      options?.signal?.throwIfAborted();
      if (Object.keys(validateCheckout(input)).length) throw new Error('Thông tin đặt hàng chưa hợp lệ');
      const lineKeys = input.items.map((line) => JSON.stringify([line.productId, line.variantId, line.colorId]));
      if (new Set(lineKeys).size !== lineKeys.length) throw new Error('Giỏ hàng có cấu hình trùng lặp. Vui lòng kiểm tra lại.');
      const { requestId, expectedTotal, ...content } = input;
      const fingerprint = JSON.stringify(content);
      if (requestId) {
        const existing = repository.findRequest(requestId);
        if (existing) {
          if (existing.fingerprint !== fingerprint) throw new Error('Yêu cầu đã được sử dụng cho nội dung khác. Vui lòng tải lại trang đặt hàng.');
          return existing.order;
        }
      }
      const items = input.items.map((line) => {
        const product = currentProducts.find((item) => item.id === line.productId);
        const variant = product?.variants.find((item) => item.id === line.variantId);
        const color = product?.colors.find((item) => item.id === line.colorId);
        if (!product || !variant || !color || !variant.inStock || !validQuantity(line.quantity)) {
          throw new Error('Sản phẩm hoặc số lượng không còn hợp lệ. Vui lòng kiểm tra giỏ hàng.');
        }
        return createCartItem(product, variant, color, line.quantity);
      });
      const totals = calculateTotals(items, input.shippingMethod);
      if (expectedTotal !== undefined && expectedTotal !== totals.grandTotal) throw new Error('Giá đã thay đổi. Vui lòng kiểm tra lại tổng tiền trước khi đặt hàng.');
      const id = crypto.randomUUID();
      const order: Order = {
        ...(customer ? { customerId: customer.id } : {}),
        id, orderCode: `APL-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`,
        customer: { ...input.customer }, shippingAddress: { ...input.shippingAddress },
        shippingMethod: input.shippingMethod, paymentMethod: input.paymentMethod,
        status: 'PENDING', paymentStatus: 'PENDING', createdAt: new Date().toISOString(),
        subtotal: totals.subtotal, discount: totals.totalDiscount, shippingFee: totals.shippingFee, total: totals.grandTotal,
        items: items.map((item) => ({ productId: item.product.id, productName: item.product.name,
          productImage: item.color.image, variantId: item.variant.id, colorName: item.color.name,
          storage: item.variant.storage || item.variant.screenSize, quantity: item.quantity, unitPrice: item.variant.price,
          totalPrice: item.variant.price * item.quantity })),
      };
      options?.signal?.throwIfAborted();
      repository.save({ order, requestId, fingerprint });
      return order;
    },
  };
}
export const mockOrderService = createMockOrderService();
