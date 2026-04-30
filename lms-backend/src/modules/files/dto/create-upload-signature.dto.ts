import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateUploadSignatureDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;

  @IsOptional()
  @IsEnum(['image', 'raw'])
  resourceType?: 'image' | 'raw';

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9/_-]+$/)
  @MaxLength(140)
  publicId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFormats?: string[];
}
