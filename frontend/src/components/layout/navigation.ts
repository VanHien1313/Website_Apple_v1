export const storeNavigation = [
  { to: '/iphone', label: 'iPhone' }, { to: '/ipad', label: 'iPad' },
  { to: '/mac', label: 'Mac' }, { to: '/watch', label: 'Apple Watch' },
  { to: '/airpods', label: 'AirPods' },
];

export const categoryName = (id: string) => storeNavigation.find(item => item.to === `/${id}`)?.label ?? id;
