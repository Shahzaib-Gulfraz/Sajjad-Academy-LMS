import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

type UploadSignatureInput = {
  folder: string;
  resourceType: 'image' | 'raw';
  timestamp: number;
  publicId?: string;
};

@Injectable()
export class CloudinaryService {
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('cloudinary.cloudName');
    this.apiKey = this.configService.get<string>('cloudinary.apiKey');
    this.apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (this.cloudName && this.apiKey && this.apiSecret) {
      cloudinary.config({
        cloud_name: this.cloudName,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
        secure: true,
      });
    }
  }

  createUploadSignature(input: UploadSignatureInput) {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }

    const paramsToSign: Record<string, string | number> = {
      folder: input.folder,
      timestamp: input.timestamp,
    };

    if (input.publicId) {
      paramsToSign.public_id = input.publicId;
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.apiSecret,
    );

    return {
      signature,
      timestamp: input.timestamp,
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      folder: input.folder,
      resourceType: input.resourceType,
    };
  }
}
