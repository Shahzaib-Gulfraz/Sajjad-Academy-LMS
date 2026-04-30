import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../../common/auth/roles.enum';

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  systemId?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const existing = await this.userModel.exists({
      email: input.email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    const systemId =
      input.systemId?.trim() || this.generateSystemId(input.role);

    const existingSystemId = await this.userModel.exists({ systemId });
    if (existingSystemId) {
      throw new ConflictException('User with this ID already exists.');
    }

    return this.userModel.create({
      ...input,
      email: input.email.toLowerCase(),
      systemId,
    });
  }

  async findByIdentifier(identifier: string): Promise<UserDocument | null> {
    const normalized = identifier.trim();
    if (!normalized) return null;

    if (normalized.includes('@')) {
      return this.findByEmail(normalized);
    }

    const userBySystemId = await this.userModel
      .findOne({
        systemId: {
          $regex: `^${this.escapeRegex(normalized)}$`,
          $options: 'i',
        },
      })
      .exec();
    if (userBySystemId) {
      return userBySystemId;
    }

    if (Types.ObjectId.isValid(normalized)) {
      try {
        return await this.findById(normalized);
      } catch {
        return null;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found.');
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async updateProfile(
    id: string,
    updates: Partial<Pick<User, 'name'>>,
  ): Promise<UserDocument> {
    const user = await this.findById(id);
    if (updates.name) {
      user.name = updates.name;
    }
    await user.save();
    return user;
  }

  async updateIdentity(
    id: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'systemId'>>,
  ): Promise<UserDocument> {
    const user = await this.findById(id);

    if (updates.email && updates.email.toLowerCase() !== user.email) {
      const existingByEmail = await this.userModel.exists({
        _id: { $ne: user._id },
        email: updates.email.toLowerCase(),
      });
      if (existingByEmail) {
        throw new ConflictException('User with this email already exists.');
      }
      user.email = updates.email.toLowerCase();
    }

    if (updates.systemId && updates.systemId !== user.systemId) {
      const existingBySystemId = await this.userModel.exists({
        _id: { $ne: user._id },
        systemId: updates.systemId,
      });
      if (existingBySystemId) {
        throw new ConflictException('User with this ID already exists.');
      }
      user.systemId = updates.systemId;
    }

    if (updates.name) {
      user.name = updates.name;
    }

    await user.save();
    return user;
  }

  async setRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          refreshTokenHash: refreshTokenHash ?? undefined,
        },
      )
      .exec();
  }

  async setLastLogin(id: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          lastLoginAt: new Date(),
        },
      )
      .exec();
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        {
          passwordHash,
          isActive: true,
        },
      )
      .exec();
  }

  sanitizeUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      systemId: user.systemId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private generateSystemId(role: UserRole) {
    const prefix =
      role === UserRole.ADMIN
        ? 'ADM'
        : role === UserRole.TEACHER
          ? 'Ta'
          : 'Stu';
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    return `${prefix}-${randomNum}`;
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
