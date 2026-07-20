import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'

export const profileRouter = Router()

profileRouter.get('/', requireAuth, (req, res) => {
  res.render('profile/index.njk', {
    currentUser: req.session.currentUser,
  })
})
