export const PASSWORD_HINT = '8–128 ký tự, có ít nhất 1 chữ in hoa và 1 ký tự đặc biệt (ví dụ: !, @, #).';
export const PASSWORD_PATTERN = '(?=.*\\p{Lu})(?=.*[^\\p{L}\\p{N}\\s])[\\s\\S]{8,128}';
export const validNewPassword = (value: string) => value.length >= 8 && value.length <= 128 && /\p{Lu}/u.test(value) && /[^\p{L}\p{N}\s]/u.test(value);
