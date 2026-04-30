import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-error-response.dto';

export function ApiCommonErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Request validation failed or malformed payload.',
      type: ApiErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Missing or invalid authentication credentials.',
      type: ApiErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions for this action.',
      type: ApiErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Requested resource was not found.',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiConflictErrorResponse(
  description = 'Resource conflict with current state.',
) {
  return ApiConflictResponse({
    description,
    type: ApiErrorResponseDto,
  });
}

export function ApiUnprocessableErrorResponse(
  description = 'Request payload is syntactically valid but semantically invalid.',
) {
  return ApiUnprocessableEntityResponse({
    description,
    type: ApiErrorResponseDto,
  });
}
