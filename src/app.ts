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
