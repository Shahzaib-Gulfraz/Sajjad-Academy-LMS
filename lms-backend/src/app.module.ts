import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { CloudinaryModule } from './integrations/cloudinary/cloudinary.module';
import { FilesModule } from './modules/files/files.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { GradebookModule } from './modules/gradebook/gradebook.module';
import { FeesModule } from './modules/fees/fees.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { MaterialsModule } from './modules/materials/materials.module';

const logger = new Logger('Database');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('security.throttleTtlMs') ?? 60_000,
          limit: configService.get<number>('security.throttleLimit') ?? 120,
        },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv =
          configService.get<string>('app.nodeEnv') ?? 'development';
        const mongoUri =
          nodeEnv === 'test'
            ? 'mongodb://127.0.0.1:27017/lms_test'
            : configService.get<string>('mongodb.uri');

        if (!mongoUri) {
          throw new Error('MONGODB_URI is required for non-test environments.');
        }

        return {
          uri: mongoUri,
          dbName: configService.get<string>('mongodb.dbName') ?? 'lms',
          retryAttempts:
            configService.get<number>('mongodb.retryAttempts') ?? 5,
          retryDelay:
            configService.get<number>('mongodb.retryDelayMs') ?? 2_000,
          autoIndex: configService.get<boolean>('mongodb.autoIndex') ?? false,
          serverSelectionTimeoutMS:
            configService.get<number>('mongodb.serverSelectionTimeoutMs') ??
            5_000,
          lazyConnection:
            configService.get<boolean>('mongodb.lazyConnection') ??
            nodeEnv === 'test',
          connectionFactory: (connection: { name: string }) => {
            logger.log(`MongoDB connected: ${connection.name}`);
            return connection;
          },
        };
      },
    }),
    HealthModule,
    CloudinaryModule,
    FilesModule,
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    AttendanceModule,
    QuizzesModule,
    AssignmentsModule,
    GradebookModule,
    FeesModule,
    LeavesModule,
    AnnouncementsModule,
    ReportsModule,
    NotificationsModule,
    TimetableModule,
    MaterialsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
