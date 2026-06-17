/* eslint-disable prettier/prettier */
// ts-api/src/config/load-env.ts

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const cwd = process.cwd();

const envFiles = [
  resolve(cwd, '.env.local'),
  resolve(cwd, '.env'),
];

for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    config({
      path: envFile,
      override: false,
    });
  }
}