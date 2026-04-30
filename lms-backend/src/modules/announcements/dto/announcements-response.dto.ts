import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../common/auth/roles.enum';

export class AnnouncementItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  priority!: 'low' | 'medium' | 'high';

  @ApiProperty({ enum: ['all', 'classes', 'students'] })
  targetType!: 'all' | 'classes' | 'students';

  @ApiProperty({ type: [String] })
  targetClasses!: string[];

  @ApiProperty({ type: [String] })
  targetStudentIds!: string[];

  @ApiProperty()
  authorId!: string;

  @ApiProperty({ enum: UserRole })
  authorRole!: UserRole;

  @ApiProperty()
  authorName!: string;

  @ApiProperty()
  publishedAt!: string;
}

class DeleteAnnouncementDto {
  @ApiProperty()
  id!: string;
}

export class AnnouncementResponseDto {
  @ApiProperty({ type: AnnouncementItemDto })
  data!: AnnouncementItemDto;
}

export class AnnouncementsListResponseDto {
  @ApiProperty({ type: [AnnouncementItemDto] })
  data!: AnnouncementItemDto[];
}

export class DeleteAnnouncementResponseDto {
  @ApiProperty({ type: DeleteAnnouncementDto })
  data!: DeleteAnnouncementDto;
}
