/**
 * Auth Custom Decorators
 * @summary a collection of decorators used for Auth Module
 * @module
 */
import { CookieSerializeOptions } from 'cookie';
import { Account, Wallet } from '@/model/entities';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAuth } from './auth.interface';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ProfanityUtil } from '@/common/sanitation/sanitation.pure';

/**
 * @decorator CurrentUser
 * @description decorate route handler parameters to get contextual user (UserAccounts)
 *              depends: AuthJwtGuard, returns null if not logged in
 * @return {Account | null} user
 */
export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): Account | null => {
    const ctx = context.switchToHttp();
    const request: RequestWithAuth = ctx.getRequest();
    return request.user || null;
  },
);

/**
 * @decorator CurrentWallet
 * @description decorate route handler parameters to get Wallet instance that is used to log in
 *              depends: AuthJwtGuard, returns null if not logged in
 * @return {Wallet | null} wallet
 */
export const CurrentWallet = createParamDecorator(
  (_, context: ExecutionContext): Wallet | null => {
    const ctx = context.switchToHttp();
    const request: RequestWithAuth = ctx.getRequest();
    return request.wallet || null;
  },
);

/**
 * @decorator FlexCookieOption
 * @description flexible cookie decorator to handle cross-domain cookies
 * @return {CookieSerializeOptions} options
 */
export const FlexCookieOption = createParamDecorator(
  (_): CookieSerializeOptions => {
    if (process.env?.AUTH_LOCAL_COOKIE === 'true')
      return {
        httpOnly: true,
        domain: 'localhost',
      };
    const cookieDomainVal =
      process.env.NODE_ENV === 'production' ? 'lootex.io' : 'lootex.dev';
    return {
      sameSite: 'none',
      httpOnly: true,
      domain: `.${cookieDomainVal}`,
      secure: true,
    } as CookieSerializeOptions;
  },
);

@ValidatorConstraint({ async: true })
export class ProfanityValidator implements ValidatorConstraintInterface {
  async validate(value: any) {
    const valueHasProfanity = ProfanityUtil.hasProfanity(value);
    return !valueHasProfanity;
  }

  defaultMessage() {
    return 'Value contains profanity';
  }
}

export function IsNotProfanity(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isNotProfanity',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ProfanityValidator,
    });
  };
}
