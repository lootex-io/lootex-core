import { ROLES_KEY } from './role.decorator';
import { Role } from './role.interface';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithAuth } from '../auth/auth.interface';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request: RequestWithAuth = context.switchToHttp().getRequest();
    const userRoles = request.user.roles;

    if (!userRoles) {
      return false;
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
