import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { UserSummary } from '@xq/shared-contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveSessionFromToken, SESSION_COOKIE_NAME } from './session-identity';

interface SessionRequest {
  cookies?: Record<string, unknown>;
  user?: UserSummary;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SessionRequest>();
    const user = await resolveSessionFromToken(request.cookies?.[SESSION_COOKIE_NAME], this.prisma);
    if (!user) throw new UnauthorizedException('Invalid or expired session');
    request.user = user;
    return true;
  }
}
