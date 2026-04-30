#!/usr/bin/env node
/* eslint-disable */

/**
 * Script to add a new teacher via the LMS Backend API
 * Usage: node add-teacher.js [options]
 * 
 * Options:
 *   --name       Teacher name (e.g., "John Doe")
 *   --email      Teacher email (e.g., "john@school.edu")
 *   --employeeNo Employee number (min 8 chars recommended for login password)
 *   --subject    Subject to teach (e.g., "Mathematics")
 *   --classes    Comma-separated class names (e.g., "10-A,10-B")
 *   --gender     Gender (Male/Female/Other)
 *   --qualification  Qualification (e.g., "M.Sc Mathematics, B.Ed")
 */

const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Parse command line arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].substring(2);
      args[key] = process.argv[i + 1];
      i++;
    }
  }
  return args;
}

async function getAdminToken(adminEmail, adminPassword) {
  const email = adminEmail || process.env.ADMIN_EMAIL || 'admin@school.edu';
  const password = adminPassword || process.env.ADMIN_PASSWORD || 'Admin@123456';

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function main() {
  console.log('Not implemented');
}

main().catch(console.error);