import express from 'express'
import session from 'express-session'
import nunjucks from 'nunjucks'
import path from 'path'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import type { Client } from 'openid-client'
import config from './config'
import { authRouter } from './routes/auth'
import { usersRouter } from './routes/users'
import { profileRouter } from './routes/profile'
import { isTokenExpiringSoon } from './utils/token'
import { csrfMiddleware } from './middleware/csrf'

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

  // Local JS assets (e.g. GOV.UK init module)
  app.use('/js', express.static(path.join(__dirname, '../public/js')))

  // HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
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
  app.use(async (req, _res, next) => {
    if (req.session.accessToken && req.session.refreshToken) {
      if (isTokenExpiringSoon(req.session.accessToken, 60)) {
        try {
          const tokenSet = await oidcClient.refresh(req.session.refreshToken)
          req.session.accessToken = tokenSet.access_token
          if (tokenSet.refresh_token) req.session.refreshToken = tokenSet.refresh_token
          if (tokenSet.id_token) req.session.idToken = tokenSet.id_token
        } catch {
          req.session.accessToken = undefined
          req.session.refreshToken = undefined
        }
      }
    }
    next()
  })

  // CSRF protection for all state-changing requests
  app.use(csrfMiddleware)

  // Move flash message from session to res.locals for one-time display
  app.use((req, res, next) => {
    if (req.session.flashMessage) {
      res.locals.flashMessage = req.session.flashMessage
      req.session.flashMessage = undefined
    }
    next()
  })

  // Rate-limit the OIDC login initiation endpoint
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
  app.use('/auth/login', loginLimiter)

  // Routes
  app.use('/auth', authRouter(oidcClient))
  app.use('/users', usersRouter)
  app.use('/profile', profileRouter)
  // Main screen — user list
  app.use('/', usersRouter)

  // 404
  app.use((_req, res) => {
    res.status(404).render('errors/404.njk', {
      pageHeading: 'Page not found',
    })
  })

  // 500
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).render('errors/500.njk', {
      pageHeading: 'Sorry, there is a problem with the service',
    })
  })

  return app
}
