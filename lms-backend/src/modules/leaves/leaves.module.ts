import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './schemas/leave-request.schema';
import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      {
        name: LeaveRequest.name,
        schema: LeaveRequestSchema,
      },
    ]),
  ],
  providers: [LeavesService],
  controllers: [LeavesController],
  exports: [LeavesService],
})
export class LeavesModule {}
