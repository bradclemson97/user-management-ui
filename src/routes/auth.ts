import { Router } from 'express'
import { generators, type Client } from 'openid-client'
import { getCurrentUser } from '../services/umsClient'
import config from '../config'

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
        try {
          req.session.currentUser = await getCurrentUser(req.session.accessToken)
        } catch {
          // Non-fatal: user may not yet exist in UMS
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
