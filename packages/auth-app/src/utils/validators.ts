export const isValidEmail = (value: string) => /.+@.+\..+/.test(value);

export const isValidPhone = (value: string) => /^\+?\d{6,20}$/.test(value);

export const isValidSmsCode = (value: string) => /^\d{4,8}$/.test(value);

