import 'dotenv/config'
import { Issuer } from 'openid-client'
import config from './config'
import { createApp } from './app'

async function start() {
  const issuerUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`

  console.log(`Discovering OIDC configuration from ${issuerUrl}`)
  const issuer = await Issuer.discover(issuerUrl)

  const oidcClient = new issuer.Client({
    client_id: config.keycloak.clientId,
    client_secret: config.keycloak.clientSecret,
    redirect_uris: [`${config.app.baseUrl}/auth/callback`],
    response_types: ['code'],
  })

  const app = createApp(oidcClient)

  app.listen(config.port, () => {
    console.log(`User Management UI running at ${config.app.baseUrl}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
