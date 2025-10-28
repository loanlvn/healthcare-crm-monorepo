declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    TOKEN_TTL_ACCESS: string;
    TOKEN_TTL_REFRESH: string;
    NODE_ENV?: 'development' | 'test' | 'production';
    PORT?: string;
  }
}
