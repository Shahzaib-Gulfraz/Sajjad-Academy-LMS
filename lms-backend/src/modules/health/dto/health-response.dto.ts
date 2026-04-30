import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'lms-backend' })
  service!: string;

  @ApiProperty()
  environment!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty()
  uptimeSeconds!: number;
}
