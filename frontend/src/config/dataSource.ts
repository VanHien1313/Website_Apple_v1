// Vite replaces MODE at build time. Demo remains the default development mode.
export const isApiMode = import.meta.env.MODE === 'api';
