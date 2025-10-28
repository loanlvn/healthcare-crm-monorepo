
export function loadEnv() {
  const required = ['DATABASE_URL','JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','TOKEN_TTL_ACCESS','TOKEN_TTL_REFRESH'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env ${key}`);
  }
  return process.env as NodeJS.ProcessEnv;
}
