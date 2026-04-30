import { ApiProperty } from '@nestjs/swagger';

class UploadSignatureDataDto {
  @ApiProperty()
  cloudName!: string;

  @ApiProperty()
  apiKey!: string;

  @ApiProperty()
  folder!: string;

  @ApiProperty()
  timestamp!: number;

  @ApiProperty()
  signature!: string;

  @ApiProperty({ type: [String] })
  allowedFormats!: string[];

  @ApiProperty({ required: false })
  publicId?: string;

  @ApiProperty()
  resourceType!: string;
}

class UploadSignatureMetaDto {
  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;
}

export class UploadSignatureResponseDto {
  @ApiProperty({ type: UploadSignatureDataDto })
  data!: UploadSignatureDataDto;

  @ApiProperty({ type: UploadSignatureMetaDto })
  meta!: UploadSignatureMetaDto;
}

class ConfirmUploadDataDto {
  @ApiProperty()
  publicId!: string;

  @ApiProperty()
  resourceType!: string;

  @ApiProperty()
  secureUrl!: string;

  @ApiProperty({ required: false })
  format?: string;

  @ApiProperty()
  bytes!: number;

  @ApiProperty({ format: 'date-time' })
  confirmedAt!: string;
}

class ConfirmUploadMetaDto {
  @ApiProperty()
  persisted!: boolean;

  @ApiProperty()
  message!: string;
}

export class ConfirmUploadResponseDto {
  @ApiProperty({ type: ConfirmUploadDataDto })
  data!: ConfirmUploadDataDto;

  @ApiProperty({ type: ConfirmUploadMetaDto })
  meta!: ConfirmUploadMetaDto;
}
