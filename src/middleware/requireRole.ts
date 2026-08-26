import type { Request, Response, NextFunction } from 'express'

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.currentUserRoles?.includes(role)) {
      res.status(403).render('errors/403.njk', {
        currentUser: req.session.currentUser,
        currentUserRoles: req.session.currentUserRoles ?? [],
        pageHeading: 'Access denied',
      })
      return
    }
    next()
  }
}
