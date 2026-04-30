import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  publicId!: string;

  @IsEnum(['image', 'raw'])
  resourceType!: 'image' | 'raw';

  @IsString()
  secureUrl!: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  bytes!: number;
}
