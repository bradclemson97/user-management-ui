import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole } from '../middleware/requireRole'
import * as ums from '../services/umsClient'
import * as acm from '../services/acmClient'
import * as km from '../services/kmClient'
import type { UserDto } from '../types'
import { isAxiosError } from 'axios'

export const usersRouter = Router()

function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (err.response?.status === 401) {
      return 'Your session has expired. <a href="/auth/login" class="govuk-link">Sign in again</a> to continue.'
    }
    if (err.response?.status === 403) {
      return 'You do not have permission to perform this action. Please contact your system administrator.'
    }
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? err.message
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred'
}

function templateVars(req: { session: { currentUser?: UserDto; currentUserRoles?: string[] } }, extra: Record<string, unknown>) {
  return { currentUser: req.session.currentUser, currentUserRoles: req.session.currentUserRoles ?? [], ...extra }
}

// User list + search
usersRouter.get('/', requireAuth, async (req, res) => {
  const name = (req.query.name as string) ?? ''
  const page = parseInt((req.query.page as string) ?? '0', 10)
  const hasUserCoreAccess = req.session.currentUserRoles?.includes('User Core Access') ?? false

  const emptyState = (extra: Record<string, unknown> = {}) =>
    templateVars(req, { users: [], totalPages: 0, currentPage: 0, totalElements: 0, searchName: name, ...extra })

  if (name.length === 0) {
    if (!hasUserCoreAccess) {
      return res.render('users/list.njk', emptyState({
        infoMessage: 'Enter a name to search for users.',
      }))
    }
    try {
      const pageData = await ums.getAllUsers(req.session.accessToken!, page)
      return res.render('users/list.njk', templateVars(req, {
        users: pageData.content,
        totalPages: pageData.totalPages,
        currentPage: pageData.number,
        totalElements: pageData.totalElements,
        searchName: '',
      }))
    } catch (err) {
      return res.render('users/list.njk', emptyState({ errorMessage: errorMessage(err) }))
    }
  }

  if (name.length < 2) {
    return res.render('users/list.njk', emptyState({
      infoMessage: 'Enter at least 2 characters to search.',
    }))
  }

  try {
    const pageData = await ums.searchUsers(req.session.accessToken!, name, page)
    res.render('users/list.njk', templateVars(req, {
      users: pageData.content,
      totalPages: pageData.totalPages,
      currentPage: pageData.number,
      totalElements: pageData.totalElements,
      searchName: name,
    }))
  } catch (err) {
    res.render('users/list.njk', emptyState({ errorMessage: errorMessage(err) }))
  }
})

// Create user — form
usersRouter.get('/create', requireAuth, requireRole('User Administration'), (req, res) => {
  res.render('users/create.njk', templateVars(req, {}))
})

// Create user — submit
usersRouter.post('/create', requireAuth, requireRole('User Administration'), async (req, res) => {
  const { firstName, middleName, lastName, email } = req.body as Record<string, string>
  try {
    const result = await ums.createUser(req.session.accessToken!, {
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.trim(),
    })
    res.render('users/create.njk', templateVars(req, {
      createdUser: { systemUserId: result.systemUserId, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password: result.password },
    }))
  } catch (err) {
    res.render('users/create.njk', templateVars(req, {
      errorMessage: errorMessage(err),
      formValues: { firstName, middleName, lastName, email },
    }))
  }
})

// Manage user roles — form
usersRouter.get('/:id/roles', requireAuth, requireRole('User Administration'), async (req, res) => {
  try {
    const [user, allRoles, userRoles] = await Promise.all([
      ums.getUser(req.session.accessToken!, req.params.id),
      acm.getPermissionRoles(req.session.accessToken!),
      acm.getUserRoles(req.session.accessToken!, req.params.id),
    ])
    const assignedRoleIds = new Set(userRoles.map(ur => ur.roleResponse.id))
    res.render('users/roles.njk', templateVars(req, { user, allRoles, assignedRoleIds: [...assignedRoleIds] }))
  } catch (err) {
    res.render('users/roles.njk', templateVars(req, {
      user: null,
      allRoles: [],
      assignedRoleIds: [],
      errorMessage: errorMessage(err),
    }))
  }
})

// Manage user roles — submit
usersRouter.post('/:id/roles', requireAuth, requireRole('User Administration'), async (req, res) => {
  const rawRoleIds = req.body.roleIds
  const roleIds: number[] = rawRoleIds
    ? (Array.isArray(rawRoleIds) ? rawRoleIds : [rawRoleIds]).map(Number)
    : []
  try {
    await acm.saveUserRoles(req.session.accessToken!, req.params.id, roleIds)
    res.redirect(`/users/${req.params.id}`)
  } catch (err) {
    try {
      const [user, allRoles] = await Promise.all([
        ums.getUser(req.session.accessToken!, req.params.id),
        acm.getPermissionRoles(req.session.accessToken!),
      ])
      res.render('users/roles.njk', templateVars(req, {
        user,
        allRoles,
        assignedRoleIds: roleIds,
        errorMessage: errorMessage(err),
      }))
    } catch {
      res.render('users/roles.njk', templateVars(req, {
        user: null,
        allRoles: [],
        assignedRoleIds: roleIds,
        errorMessage: errorMessage(err),
      }))
    }
  }
})

// Reset password — confirmation page
usersRouter.get('/:id/reset-password', requireAuth, requireRole('User Administration'), async (req, res) => {
  try {
    const user = await ums.getUser(req.session.accessToken!, req.params.id)
    res.render('users/reset-password.njk', templateVars(req, { user }))
  } catch (err) {
    res.render('users/reset-password.njk', templateVars(req, { user: null, errorMessage: errorMessage(err) }))
  }
})

// Reset password — execute
usersRouter.post('/:id/reset-password', requireAuth, requireRole('User Administration'), async (req, res) => {
  try {
    const user = await ums.getUser(req.session.accessToken!, req.params.id)
    const result = await km.resetPassword(req.session.accessToken!, user.userDetails.primaryEmail)
    res.render('users/reset-password.njk', templateVars(req, { user, newPassword: result.password }))
  } catch (err) {
    try {
      const user = await ums.getUser(req.session.accessToken!, req.params.id)
      res.render('users/reset-password.njk', templateVars(req, { user, errorMessage: errorMessage(err) }))
    } catch {
      res.render('users/reset-password.njk', templateVars(req, { user: null, errorMessage: errorMessage(err) }))
    }
  }
})

// Lock user
usersRouter.post('/:id/lock', requireAuth, requireRole('User Administration'), async (req, res) => {
  try {
    await ums.lockUser(req.session.accessToken!, req.params.id)
    res.redirect(`/users/${req.params.id}`)
  } catch (err) {
    try {
      const user = await ums.getUser(req.session.accessToken!, req.params.id)
      res.render('users/detail.njk', templateVars(req, { user, errorMessage: errorMessage(err) }))
    } catch {
      res.render('users/detail.njk', templateVars(req, { user: null, errorMessage: errorMessage(err) }))
    }
  }
})

// Unlock user
usersRouter.post('/:id/unlock', requireAuth, requireRole('User Administration'), async (req, res) => {
  try {
    await ums.unlockUser(req.session.accessToken!, req.params.id)
    res.redirect(`/users/${req.params.id}`)
  } catch (err) {
    try {
      const user = await ums.getUser(req.session.accessToken!, req.params.id)
      res.render('users/detail.njk', templateVars(req, { user, errorMessage: errorMessage(err) }))
    } catch {
      res.render('users/detail.njk', templateVars(req, { user: null, errorMessage: errorMessage(err) }))
    }
  }
})

// View / edit user
usersRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await ums.getUser(req.session.accessToken!, req.params.id)
    res.render('users/detail.njk', templateVars(req, { user }))
  } catch (err) {
    res.render('users/detail.njk', templateVars(req, {
      user: null,
      errorMessage: errorMessage(err),
    }))
  }
})

// Update user — submit
usersRouter.post('/:id', requireAuth, requireRole('User Administration'), async (req, res) => {
  const { title, firstName, middleName, lastName, primaryEmail } = req.body as Record<string, string>
  try {
    await ums.updateUser(req.session.accessToken!, req.params.id, {
      title: title?.trim() || undefined,
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      primaryEmail: primaryEmail.trim(),
    })
    res.redirect(`/users/${req.params.id}`)
  } catch (err) {
    try {
      const user = await ums.getUser(req.session.accessToken!, req.params.id)
      res.render('users/detail.njk', templateVars(req, {
        user,
        errorMessage: errorMessage(err),
        formValues: { title, firstName, middleName, lastName, primaryEmail },
      }))
    } catch {
      res.render('users/detail.njk', templateVars(req, {
        user: null,
        errorMessage: errorMessage(err),
      }))
    }
  }
})
