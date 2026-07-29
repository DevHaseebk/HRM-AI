export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNewPassword(
  password: string,
  confirm: string
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (password !== confirm) {
    errors.push("Passwords do not match");
  }

  return { valid: errors.length === 0, errors };
}
