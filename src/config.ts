import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  sessionSecret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  app: {
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  },
  keycloak: {
    baseUrl: process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:9000',
    realm: process.env.KEYCLOAK_REALM ?? 'system',
    clientId: process.env.KEYCLOAK_CLIENT_ID ?? 'user-management-ui',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
  },
  ums: {
    baseUrl: process.env.UMS_BASE_URL ?? 'http://localhost:8080',
  },
}

export default config
