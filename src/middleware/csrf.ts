import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex')
  }
  res.locals.csrfToken = req.session.csrfToken

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const submitted = req.body._csrf as string | undefined
    if (!submitted || submitted !== req.session.csrfToken) {
      res.status(403).render('errors/403.njk', {
        pageHeading: 'Forbidden',
        currentUser: req.session.currentUser,
        currentUserRoles: req.session.currentUserRoles ?? [],
      })
      return
    }
  }
  next()
}
