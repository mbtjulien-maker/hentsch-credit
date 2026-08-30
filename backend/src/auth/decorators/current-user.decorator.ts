import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../auth.service';

// À utiliser uniquement derrière @UseGuards(JwtAuthGuard), qui peuple req.user.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser;
  },
);
