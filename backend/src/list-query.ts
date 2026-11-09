import { ApiError } from './auth/service.ts';
/** Only SQL fragments defined by the caller may enter a query; never interpolate request text. */
export function queryChoice(value: unknown, choices: Record<string, string>, fallback: string): string {
  const key = value === undefined || value === '' ? fallback : value;
  if (typeof key !== 'string' || !Object.hasOwn(choices, key)) throw new ApiError(422, 'INVALID_QUERY', 'Giá trị sắp xếp hoặc bộ lọc không hợp lệ.');
  return choices[key]!;
}
export const datedSorts = { newest: 'created_at DESC,id', oldest: 'created_at,id' };
export const namedSorts = { ...datedSorts, name_asc: 'name,id', name_desc: 'name DESC,id' };
