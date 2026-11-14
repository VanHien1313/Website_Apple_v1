import type { CreateOrderInput } from '../types/order';
export function validateCheckout(input: CreateOrderInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.customer.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.customer.email ?? '').trim())) errors.email = 'Vui lòng nhập email hợp lệ';
  if (!/^(0\d{9}|\+84\d{9})$/.test(input.customer.phone.replace(/[\s.-]/g, ''))) errors.phone = 'Vui lòng nhập số điện thoại hợp lệ';
  if (!input.shippingAddress.address.trim()) errors.address = 'Vui lòng nhập địa chỉ nhận hàng chi tiết';
  if (!input.shippingAddress.province.trim()) errors.province = 'Vui lòng nhập tỉnh hoặc thành phố';
  if (!input.shippingAddress.ward.trim()) errors.ward = 'Vui lòng nhập phường hoặc xã';
  if (!['standard', 'express'].includes(input.shippingMethod)) errors.shippingMethod = 'Phương thức giao hàng không hợp lệ';
  if (!['cod', 'vnpay', 'momo'].includes(input.paymentMethod)) errors.paymentMethod = 'Phương thức thanh toán không hợp lệ';
  if (!input.items.length) errors.items = 'Giỏ hàng đang trống';
  return errors;
}
