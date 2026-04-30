import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../../common/auth/roles.enum';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  PasswordResetRequest,
  PasswordResetRequestDocument,
} from './schemas/password-reset-request.schema';
import { StudentsService } from '../students/students.service';
import { TeachersService } from '../teachers/teachers.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(PasswordResetRequest.name)
    private readonly passwordResetRequestModel: Model<PasswordResetRequestDocument>,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly teachersService: TeachersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const role = dto.role ?? UserRole.STUDENT;
    const adminRegistrationKey = this.configService.get<string>(
      'security.adminRegistrationKey',
    );

    if (role === UserRole.ADMIN) {
      if (!adminRegistrationKey) {
        throw new ForbiddenException('Admin self-registration is disabled.');
      }

      if (dto.adminRegistrationKey !== adminRegistrationKey) {
        throw new ForbiddenException('Invalid admin registration key.');
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role,
    });

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.setRefreshTokenHash(
      user._id.toString(),
      await argon2.hash(tokens.refreshToken),
    );

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(identifier: string, password: string) {
    const user = await this.resolveUserForIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordCandidates = this.buildPasswordCandidates(
      password,
      user.systemId,
    );
    let passwordMatch = false;
    for (const candidate of passwordCandidates) {
      if (await argon2.verify(user.passwordHash, candidate)) {
        passwordMatch = true;
        break;
      }
    }
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );

    await Promise.all([
      this.usersService.setLastLogin(user._id.toString()),
      this.usersService.setRefreshTokenHash(
        user._id.toString(),
        await argon2.hash(tokens.refreshToken),
      ),
    ]);

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findById(payload.sub);

    if (!user.refreshTokenHash) {
      throw new UnauthorizedException('Session expired.');
    }

    const tokenMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokens = await this.generateTokens(
      user._id.toString(),
      user.email,
      user.role,
    );
    await this.usersService.setRefreshTokenHash(
      user._id.toString(),
      await argon2.hash(tokens.refreshToken),
    );

    return {
      user: this.usersService.sanitizeUser(user),
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const account = await this.resolveResetAccount(dto.identifier);
    if (!account) {
      throw new NotFoundException(
        'No student or teacher account found for this ID.',
      );
    }

    const requestedAt = new Date().toISOString();

    await this.passwordResetRequestModel.findOneAndUpdate(
      {
        identifier: account.identifier,
        status: 'PENDING',
      },
      {
        identifier: account.identifier,
        role: account.role,
        targetName: account.targetName,
        targetUserId: account.targetUserId,
        targetRecordId: account.targetRecordId,
        requestedAt,
        status: 'PENDING',
        resolvedAt: undefined,
        resolvedBy: undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return {
      queued: true,
      requestedAt,
    };
  }

  async listPasswordResetRequests() {
    const requests = await this.passwordResetRequestModel
      .find({ status: 'PENDING' })
      .sort({ requestedAt: -1 })
      .lean()
      .exec();

    return requests.map((request) => ({
      id: request._id.toString(),
      identifier: request.identifier,
      role: request.role,
      targetName: request.targetName,
      requestedAt: request.requestedAt,
      status: request.status,
    }));
  }

  async resolvePasswordResetRequest(requestId: string, adminUserId: string) {
    const request = await this.passwordResetRequestModel
      .findById(requestId)
      .exec();
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('Password reset request not found.');
    }

    const resetResult =
      request.role === UserRole.STUDENT
        ? await this.studentsService.resetPasswordByAdmissionNo(
            request.identifier,
          )
        : await this.teachersService.resetPasswordByEmployeeNo(
            request.identifier,
          );

    request.status = 'RESOLVED';
    request.resolvedAt = new Date().toISOString();
    request.resolvedBy = adminUserId;
    await request.save();

    return {
      requestId: request._id.toString(),
      identifier: request.identifier,
      defaultPassword: resetResult.defaultPassword,
      resolvedAt: request.resolvedAt,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const passwordMatch = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid current password.');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await this.usersService.updatePasswordHash(userId, newPasswordHash);

    // Logout from all devices
    await this.usersService.setRefreshTokenHash(userId, null);

    return { success: true };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const accessSecret = this.configService.get<string>(
      'security.jwtAccessSecret',
    );
    const refreshSecret = this.configService.get<string>(
      'security.jwtRefreshSecret',
    );
    const accessTtl =
      this.configService.get<number>('security.jwtAccessTtlSeconds') ?? 900;
    const refreshTtl =
      this.configService.get<number>('security.jwtRefreshTtlSeconds') ?? 604800;

    if (!accessSecret || !refreshSecret) {
      throw new ForbiddenException('JWT secrets are not configured.');
    }

    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshTtl,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtl,
      expiresAt: new Date(Date.now() + accessTtl * 1000).toISOString(),
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{
    sub: string;
    email: string;
    role: UserRole;
  }> {
    try {
      const secret = this.configService.get<string>(
        'security.jwtRefreshSecret',
      );
      if (!secret) {
        throw new Error('JWT refresh secret missing.');
      }

      return await this.jwtService.verifyAsync(refreshToken, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private async resolveUserForIdentifier(identifier: string) {
    const normalized = identifier.trim();
    if (!normalized) {
      return null;
    }

    const candidates = this.buildIdentifierCandidates(normalized);

    for (const candidate of candidates) {
      const existingUser = await this.usersService.findByIdentifier(candidate);
      if (existingUser) {
        return existingUser;
      }

      const student = await this.studentsService.findByAdmissionNo(candidate);
      if (student) {
        const linkedUser = await this.findOrRepairPortalUser({
          name: student.name,
          email: student.email,
          systemId: student.admissionNo,
          role: UserRole.STUDENT,
        });
        if (linkedUser) {
          return linkedUser;
        }
      }

      const teacher = await this.teachersService.findByEmployeeNo(candidate);
      if (teacher) {
        const linkedUser = await this.findOrRepairPortalUser({
          name: teacher.name,
          email: teacher.email,
          systemId: teacher.employeeNo,
          role: UserRole.TEACHER,
        });
        if (linkedUser) {
          return linkedUser;
        }
      }
    }

    return null;
  }

  private buildIdentifierCandidates(identifier: string) {
    const candidates = new Set<string>([identifier]);

    const portalLike = this.toPortalId(identifier);
    if (portalLike) {
      candidates.add(portalLike);
    }

    const digits = this.extractDigits(identifier);
    if (digits) {
      candidates.add(digits);
      candidates.add(this.toPortalId(digits, 'Ta')!);
      candidates.add(this.toPortalId(digits, 'Stu')!);
    }

    return Array.from(candidates);
  }

  private buildPasswordCandidates(password: string, systemId?: string) {
    const candidates = new Set<string>([password]);

    if (!systemId) {
      return Array.from(candidates);
    }

    const passwordPortal = this.toPortalId(password);
    const systemPortal = this.toPortalId(systemId);

    if (
      passwordPortal &&
      systemPortal &&
      passwordPortal.toLowerCase() === systemPortal.toLowerCase()
    ) {
      candidates.add(systemPortal);
    }

    return Array.from(candidates);
  }

  private toPortalId(value: string, forcedPrefix?: 'Ta' | 'Stu') {
    const trimmed = value.trim();
    const prefixed = /^([a-z]+)[-\s]?(\d+)$/i.exec(trimmed);
    const digitsOnly = this.extractDigits(trimmed);

    const prefix = forcedPrefix
      ? forcedPrefix
      : prefixed
        ? prefixed[1].toLowerCase().startsWith('ta')
          ? 'Ta'
          : prefixed[1].toLowerCase().startsWith('stu')
            ? 'Stu'
            : null
        : null;

    const digits = prefixed ? prefixed[2] : digitsOnly;
    if (!prefix || !digits) {
      return null;
    }

    const numeric = Number(digits);
    if (!Number.isInteger(numeric) || numeric <= 0) {
      return null;
    }

    return `${prefix}-${String(numeric).padStart(4, '0')}`;
  }

  private extractDigits(value: string) {
    const matches = value.match(/\d+/g);
    return matches ? matches.join('') : '';
  }

  private async resolveResetAccount(identifier: string): Promise<{
    identifier: string;
    role: UserRole.STUDENT | UserRole.TEACHER;
    targetName: string;
    targetUserId: string;
    targetRecordId: string;
  } | null> {
    const normalized = identifier.trim();
    if (!normalized) return null;

    const student = await this.studentsService.findByAdmissionNo(normalized);
    if (student) {
      const user = await this.findOrRepairPortalUser({
        name: student.name,
        email: student.email,
        systemId: student.admissionNo,
        role: UserRole.STUDENT,
      });
      if (!user) return null;
      return {
        identifier: student.admissionNo,
        role: UserRole.STUDENT,
        targetName: student.name,
        targetUserId: user._id.toString(),
        targetRecordId: student._id.toString(),
      };
    }

    const teacher = await this.teachersService.findByEmployeeNo(normalized);
    if (teacher) {
      const user = await this.findOrRepairPortalUser({
        name: teacher.name,
        email: teacher.email,
        systemId: teacher.employeeNo,
        role: UserRole.TEACHER,
      });
      if (!user) return null;
      return {
        identifier: teacher.employeeNo,
        role: UserRole.TEACHER,
        targetName: teacher.name,
        targetUserId: user._id.toString(),
        targetRecordId: teacher._id.toString(),
      };
    }

    return null;
  }

  private async findOrRepairPortalUser(args: {
    name: string;
    email: string;
    systemId: string;
    role: UserRole.STUDENT | UserRole.TEACHER;
  }) {
    const byId = await this.usersService.findByIdentifier(args.systemId);
    if (byId) {
      await this.usersService.updateIdentity(byId._id.toString(), {
        name: args.name,
        email: args.email,
        systemId: args.systemId,
      });
      return this.usersService.findById(byId._id.toString());
    }

    const byEmail = await this.usersService.findByEmail(args.email);
    if (byEmail) {
      await this.usersService.updateIdentity(byEmail._id.toString(), {
        name: args.name,
        email: args.email,
        systemId: args.systemId,
      });

      const defaultPasswordHash = await argon2.hash(args.systemId);
      await this.usersService.updatePasswordHash(
        byEmail._id.toString(),
        defaultPasswordHash,
      );
      await this.usersService.setRefreshTokenHash(byEmail._id.toString(), null);

      return this.usersService.findById(byEmail._id.toString());
    }

    const createdUser = await this.usersService.create({
      name: args.name,
      email: args.email,
      systemId: args.systemId,
      role: args.role,
      passwordHash: await argon2.hash(args.systemId),
    });

    return this.usersService.findById(createdUser._id.toString());
  }
}
