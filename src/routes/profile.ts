import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'

export const profileRouter = Router()

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) return {}
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

profileRouter.get('/', requireAuth, (req, res) => {
  const jwt = req.session.accessToken ? decodeJwtPayload(req.session.accessToken) : {}
  res.render('profile/index.njk', {
    currentUser: req.session.currentUser,
    currentUserRoles: req.session.currentUserRoles ?? [],
    jwtUser: {
      name: [jwt.given_name, jwt.family_name].filter(Boolean).join(' ') || jwt.preferred_username || 'Unknown',
      email: jwt.email ?? jwt.preferred_username ?? '—',
      systemUserId: jwt.systemUserId ?? '—',
    },
  })
})
