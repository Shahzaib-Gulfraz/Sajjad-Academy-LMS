#!/usr/bin/env node
/* eslint-disable */
require('ts-node/register/transpile-only');

const path = require('path');
const mongoose = require('mongoose');
const argon2 = require('argon2');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { UserSchema } = require('../src/modules/users/schemas/user.schema');
const { UserRole } = require('../src/common/auth/roles.enum');

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const nextValue = argv[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      args[key] = nextValue;
      index += 1;
    } else {
      args[key] = 'true';
    }
  }

  return args;
}

function printUsage() {
  console.log('Usage: npm run create:admin -- --name "Admin User" --email admin@example.com --password "StrongPassword123"');
  console.log('Optional: --dbName lms');
}

async function main() {
  const args = parseArgs(process.argv);
  const name = args.name?.trim() || 'Admin User';
  const email = args.email?.trim().toLowerCase() || 'admin@example.com';
  const password = args.password || '@dminpassworD123';
  const systemId = args.systemId?.trim() || 'AdminAsas';
  const dbName = args.dbName?.trim() || process.env.MONGODB_DB_NAME || 'lms';
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI is missing. Check your .env file.');
    process.exit(1);
  }

  if (!name || !email || !password || !systemId) {
    printUsage();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

  await mongoose.connect(mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const passwordHash = await argon2.hash(password);
    const existingUser = await UserModel.findOne({ email }).exec();

    if (existingUser) {
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      existingUser.role = UserRole.ADMIN;
      existingUser.isActive = true;
      existingUser.systemId = systemId;
      existingUser.refreshTokenHash = undefined;
      existingUser.lastLoginAt = undefined;
      await existingUser.save();

      console.log(`Updated existing user and promoted to admin: ${existingUser.email}`);
    } else {
      const createdUser = await UserModel.create({
        name,
        email,
        passwordHash,
        role: UserRole.ADMIN,
        systemId,
        isActive: true,
      });

      console.log(`Created admin user: ${createdUser.email}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to create admin user:');
  console.error(error?.message || error);
  process.exit(1);
});
