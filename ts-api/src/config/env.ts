/* eslint-disable prettier/prettier */
// C:\Projects\Job-Crawler\ts-api\src\config\env.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const ENV = {
  SERPAPI_KEY: requireEnv("SERPAPI_KEY"),
};
