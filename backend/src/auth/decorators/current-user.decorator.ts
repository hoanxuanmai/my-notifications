import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPublic } from '../../common/types/user.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPublic => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

