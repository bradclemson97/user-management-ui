import { Router } from 'express'
import { generators, type Client } from 'openid-client'
import { getCurrentUser } from '../services/umsClient'
import { getUserRoles } from '../services/acmClient'
import config from '../config'

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) return {}
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

export function authRouter(oidcClient: Client): Router {
  const router = Router()

  router.get('/login', (req, res) => {
    const state = generators.state()
    const nonce = generators.nonce()
    const codeVerifier = generators.codeVerifier()
    const codeChallenge = generators.codeChallenge(codeVerifier)

    req.session.state = state
    req.session.nonce = nonce
    req.session.codeVerifier = codeVerifier

    const authUrl = oidcClient.authorizationUrl({
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    res.redirect(authUrl)
  })

  router.get('/callback', async (req, res) => {
    try {
      const params = oidcClient.callbackParams(req)
      const tokenSet = await oidcClient.callback(
        `${config.app.baseUrl}/auth/callback`,
        params,
        {
          state: req.session.state,
          nonce: req.session.nonce,
          code_verifier: req.session.codeVerifier,
        },
      )

      req.session.accessToken = tokenSet.access_token
      req.session.idToken = tokenSet.id_token
      req.session.state = undefined
      req.session.nonce = undefined
      req.session.codeVerifier = undefined

      if (req.session.accessToken) {
        const jwt = decodeJwtPayload(req.session.accessToken)
        const systemUserId = jwt.systemUserId as string | undefined

        try {
          req.session.currentUser = await getCurrentUser(req.session.accessToken)
        } catch {
          // Non-fatal: user may not yet exist in UMS
        }

        if (systemUserId) {
          try {
            const userRoles = await getUserRoles(req.session.accessToken, systemUserId)
            req.session.currentUserRoles = userRoles.map(ur => ur.roleResponse.roleName)
          } catch {
            req.session.currentUserRoles = []
          }
        } else {
          req.session.currentUserRoles = []
        }
      }

      const returnTo = req.session.returnTo ?? '/'
      req.session.returnTo = undefined
      res.redirect(returnTo)
    } catch (err) {
      console.error('OIDC callback error:', err)
      res.redirect('/auth/login')
    }
  })

  router.get('/logout', (req, res) => {
    const idToken = req.session.idToken
    req.session.destroy(() => {
      const issuerUrl = `${config.keycloak.baseUrl}/realms/${config.keycloak.realm}`
      const endSessionUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`)
      endSessionUrl.searchParams.set('client_id', config.keycloak.clientId)
      if (idToken) endSessionUrl.searchParams.set('id_token_hint', idToken)
      endSessionUrl.searchParams.set('post_logout_redirect_uri', config.app.baseUrl)
      res.redirect(endSessionUrl.toString())
    })
  })

  return router
}
