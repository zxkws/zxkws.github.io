export const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

export const isValidPhone = (value: string) => /^\+?\d{6,20}$/.test(value);

export const isValidSmsCode = (value: string) => /^\d{4,8}$/.test(value);

export const isValidUsername = (value: string) => /^[a-zA-Z0-9#$%_-]{6,30}$/.test(value);

