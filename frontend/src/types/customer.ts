export interface CustomerAddress { address: string; province: string; ward: string }
export interface CustomerProfile { id: string; fullName: string; email: string; phone: string; createdAt: string; credentialVersion: number; shippingAddress?: CustomerAddress }
export interface CustomerRegistration { fullName: string; email: string; phone: string; password: string; shippingAddress: CustomerAddress }
