import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserRole } from '../../../common/auth/roles.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const extractFromCookie = (req: Request) => {
  const portalRole = req.headers['x-portal-role'] as string;
  if (portalRole && req.cookies) {
    return req.cookies[`${portalRole.toLowerCase()}_access_token`] || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('security.jwtAccessSecret') ??
        'fallback-secret',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
