import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UserRole } from '../../common/auth/roles.enum';
import {
  AuthSuccessResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import {
  ApiCommonErrorResponses,
  ApiConflictErrorResponse,
  ApiUnprocessableErrorResponse,
} from '../../common/swagger/api-error-responses.decorator';

@ApiTags('auth')
@ApiCommonErrorResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, role: string, accessToken: string, refreshToken: string) {
    const prefix = role.toLowerCase();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };
    res.cookie(`${prefix}_access_token`, accessToken, cookieOptions);
    res.cookie(`${prefix}_refresh_token`, refreshToken, cookieOptions);
  }

  private clearAuthCookies(res: Response, role: string) {
    const prefix = role.toLowerCase();
    res.clearCookie(`${prefix}_access_token`, { path: '/' });
    res.clearCookie(`${prefix}_refresh_token`, { path: '/' });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ type: AuthSuccessResponseDto })
  @ApiConflictErrorResponse('User with this email already exists.')
  @ApiUnprocessableErrorResponse('Registration payload failed domain rules.')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, ...data } = await this.authService.register(dto);
    this.setAuthCookies(res, data.user.role, accessToken, refreshToken);
    return { data };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with identifier and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthSuccessResponseDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, ...data } = await this.authService.login(dto.identifier, dto.password);
    this.setAuthCookies(res, data.user.role, accessToken, refreshToken);
    return { data };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ type: AuthSuccessResponseDto })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Try to get token from header or cookie
    const portalRole = req.headers['x-portal-role'] as string;
    const cookieToken = portalRole && req.cookies ? req.cookies[`${portalRole.toLowerCase()}_refresh_token`] : null;
    const tokenToUse = dto.refreshToken || cookieToken;

    const { accessToken, refreshToken, ...data } = await this.authService.refresh(tokenToUse);
    this.setAuthCookies(res, data.user.role, accessToken, refreshToken);
    return { data };
  }

  @Post('password-reset-request')
  @ApiOperation({ summary: 'Queue password reset request' })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiOkResponse({
    schema: {
      properties: {
        data: {
          type: 'object',
          properties: {
            queued: { type: 'boolean', example: true },
            requestedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T10:00:00.000Z',
            },
          },
        },
      },
    },
  })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    const data = await this.authService.requestPasswordReset(dto);
    return { data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('password-reset-requests')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List pending password reset requests' })
  async listPasswordResetRequests() {
    const data = await this.authService.listPasswordResetRequests();
    return { data };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('password-reset-requests/:requestId/reset')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Reset password for a pending request and resolve it',
  })
  async resetRequestedPassword(
    @Param('requestId') requestId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.authService.resolvePasswordResetRequest(
      requestId,
      user.sub,
    );
    return { data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Logout current user session' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.logout(user.sub);
    this.clearAuthCookies(res, user.role);
    return { data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change password for current user' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
  })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.changePassword(user.sub, dto);
    this.clearAuthCookies(res, user.role);
    return { data };
  }
}
