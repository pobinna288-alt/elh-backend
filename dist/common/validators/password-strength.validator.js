"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPasswordConstraint = void 0;
exports.IsStrongPassword = IsStrongPassword;
const class_validator_1 = require("class-validator");
let IsStrongPasswordConstraint = class IsStrongPasswordConstraint {
    validate(password, args) {
        if (!password)
            return false;
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const isLongEnough = password.length >= minLength;
        return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
    }
    defaultMessage(args) {
        return 'Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, and 1 number';
    }
};
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint;
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'IsStrongPassword', async: false })
], IsStrongPasswordConstraint);
function IsStrongPassword(validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsStrongPasswordConstraint,
        });
    };
}
//# sourceMappingURL=password-strength.validator.js.map