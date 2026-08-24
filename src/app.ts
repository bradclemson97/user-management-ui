import express from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import type { Client } from 'openid-client'
import config from './config'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { profileRouter } from './routes/profile'

export function createApp(oidcClient: Client): express.Application {
  const app = express()

  // Trust one hop of reverse proxy (Nginx) so secure cookies and X-Forwarded-Proto work
  app.set('trust proxy', 1)

  // Static assets — GOV.UK Frontend
  app.use(
    '/govuk',
    express.static(path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk')),
  )
  app.use(
    '/assets',
    express.static(
      path.join(__dirname, '../node_modules/govuk-frontend/dist/govuk/assets'),
    ),
  )

  // Nunjucks
  nunjucks.configure(
    [
      path.join(__dirname, '../views'),
      path.join(__dirname, '../node_modules/govuk-frontend/dist'),
    ],
    {
      autoescape: true,
      express: app,
      watch: process.env.NODE_ENV !== 'production',
    },
  )
  app.set('view engine', 'njk')

  // Body parsing
  app.use(express.urlencoded({ extended: false }))
  app.use(express.json())

  // Session
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      },
    }),
  )

  // Proactively refresh the access token when it is within 60 seconds of expiry.
  // Runs after session is loaded so the refresh token is available. If the refresh
  // token is also expired, tokens are cleared so requireAuth redirects to login.
  app.use(async (req, _res, next) => {
    if (req.session.accessToken && req.session.refreshToken) {
      const parts = req.session.accessToken.split('.')
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { exp?: number }
          const exp = payload.exp
          if (exp && exp < Math.floor(Date.now() / 1000) + 60) {
            const tokenSet = await oidcClient.refresh(req.session.refreshToken)
            req.session.accessToken = tokenSet.access_token
            if (tokenSet.refresh_token) req.session.refreshToken = tokenSet.refresh_token
            if (tokenSet.id_token) req.session.idToken = tokenSet.id_token
          }
        } catch {
          req.session.accessToken = undefined
          req.session.refreshToken = undefined
        }
      }
    }
    next()
  })

  // Routes
  app.use('/auth', authRouter(oidcClient))
  app.use('/users', usersRouter)
  app.use('/profile', profileRouter)
  // Main screen — user list
  app.use('/', usersRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).render('users/list.njk', {
      errorMessage: 'Page not found.',
      users: [],
      totalPages: 0,
      currentPage: 0,
      totalElements: 0,
      searchName: '',
    })
  })

  return app
}
