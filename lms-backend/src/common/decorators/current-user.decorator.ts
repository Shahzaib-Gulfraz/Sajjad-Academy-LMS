import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../auth/roles.enum';

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) return undefined;
    return data ? user[data] : user;
  },
);

export type RequestUser = {
  sub: string;
  role: UserRole;
  email: string;
};
