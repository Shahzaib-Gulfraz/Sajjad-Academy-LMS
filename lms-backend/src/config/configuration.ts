const parseCorsOrigins = (rawOrigins: string | undefined): string[] => {
  if (!rawOrigins) {
    return ['http://localhost:5173'];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  return {
    app: {
      nodeEnv,
      port: Number(process.env.PORT ?? 3000),
      apiPrefix: process.env.API_PREFIX ?? 'api/v1',
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    },
    security: {
      throttleTtlMs: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
      throttleLimit: Number(process.env.THROTTLE_LIMIT ?? 120),
      jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      jwtAccessTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900),
      jwtRefreshTtlSeconds: Number(
        process.env.JWT_REFRESH_TTL_SECONDS ?? 604800,
      ),
      adminRegistrationKey: process.env.ADMIN_REGISTRATION_KEY,
    },
    mongodb: {
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB_NAME ?? 'lms',
      retryAttempts: Number(process.env.MONGODB_RETRY_ATTEMPTS ?? 5),
      retryDelayMs: Number(process.env.MONGODB_RETRY_DELAY_MS ?? 2_000),
      serverSelectionTimeoutMs: Number(
        process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 5_000,
      ),
      autoIndex: parseBoolean(process.env.MONGODB_AUTO_INDEX, false),
      lazyConnection: parseBoolean(
        process.env.MONGODB_LAZY_CONNECTION,
        nodeEnv === 'test',
      ),
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'lms',
    },
  };
};
