import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().optional(),

  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(120),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(3600).default(604800),
  ADMIN_REGISTRATION_KEY: Joi.string().allow('').optional(),

  MONGODB_URI: Joi.when('NODE_ENV', {
    is: 'test',
    then: Joi.string().optional(),
    otherwise: Joi.string()
      .uri({ scheme: [/mongodb/, /mongodb\+srv/] })
      .required(),
  }),
  MONGODB_DB_NAME: Joi.string().default('lms'),
  MONGODB_RETRY_ATTEMPTS: Joi.number().integer().min(0).default(5),
  MONGODB_RETRY_DELAY_MS: Joi.number().integer().min(100).default(2000),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(500)
    .default(5000),
  MONGODB_AUTO_INDEX: Joi.boolean().default(false),
  MONGODB_LAZY_CONNECTION: Joi.boolean().optional(),

  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: Joi.string().default('lms'),
});
