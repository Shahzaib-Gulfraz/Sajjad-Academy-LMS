import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GradebookEntry,
  GradebookEntrySchema,
} from './schemas/gradebook-entry.schema';
import { GradebookService } from './gradebook.service';
import { GradebookController } from './gradebook.controller';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GradebookEntry.name,
        schema: GradebookEntrySchema,
      },
    ]),
    StudentsModule,
  ],
  providers: [GradebookService],
  controllers: [GradebookController],
  exports: [GradebookService],
})
export class GradebookModule {}
