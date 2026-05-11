#!/usr/bin/env node
/* eslint-disable */
require('ts-node/register/transpile-only');

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'lms';

  if (!mongoUri) {
    console.error('MONGODB_URI is missing. Check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    const collection = mongoose.connection.collection('teachers');
    const result = await collection.updateMany(
      { subject: { $exists: true } },
      { $unset: { subject: '' } },
    );

    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to cleanup teacher subject field:');
  console.error(error?.message || error);
  process.exit(1);
});
