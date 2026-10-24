import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserSummary } from '@xq/shared-contracts';

interface RequestWithUser {
  user: UserSummary;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserSummary => context.switchToHttp().getRequest<RequestWithUser>().user,
);
