import type { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.accessToken) {
    req.session.returnTo = req.originalUrl
    res.redirect('/auth/login')
    return
  }
  next()
}
