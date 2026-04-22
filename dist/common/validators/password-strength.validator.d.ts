import { ValidationOptions, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(password: string, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): string;
}
export declare function IsStrongPassword(validationOptions?: ValidationOptions): (object: any, propertyName: string) => void;
