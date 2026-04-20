import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Password strength requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 */
@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments): boolean {
    if (!password) return false;

    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const isLongEnough = password.length >= minLength;

    return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and 1 number';
  }
}

/**
 * Decorator to validate password strength
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsStrongPasswordConstraint,
    });
  };
}
