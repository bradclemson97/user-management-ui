export interface UserDetailsDto {
  userDetailId: string
  title: string | null
  firstName: string
  middleName: string | null
  lastName: string
  primaryEmail: string
  knownFromDate: string
  knownToDate: string | null
}

export interface UserDto {
  systemUserId: string
  active: boolean
  locked: boolean
  failedLoginAttempts: number
  userDetails: UserDetailsDto
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface CreateUserResponse {
  systemUserId: string
  password: string
}

export interface CreateUserBody {
  firstName: string
  middleName?: string
  lastName: string
  email: string
}

export interface UpdateUserBody {
  title?: string
  firstName: string
  middleName?: string
  lastName: string
  primaryEmail: string
}

export interface RoleResponse {
  id: number
  roleName: string
  roleTypeCode: 'PERMISSION' | 'CAPABILITY'
  description: string
}

export interface UserRoleDto {
  roleResponse: RoleResponse
}

export interface ResetPasswordResponse {
  password: string
}

export interface UserAuditRecord {
  validFrom: string
  validTo: string | null
  lockedUserInd: string
  activeInd: string
  failedLoginAttempts: number
  modifiedBy: string | null
  modifiedDate: string | null
}

export interface UserRoleAuditRecord {
  userRoleId: number
  roleName: string
  roleTypeCode: string
  validFrom: string
  validTo: string | null
  assignedBy: string | null
  assignedAt: string | null
}

// Augment express-session
declare module 'express-session' {
  interface SessionData {
    accessToken?: string
    idToken?: string
    refreshToken?: string
    state?: string
    nonce?: string
    codeVerifier?: string
    currentUser?: UserDto
    currentUserRoles?: string[]
    returnTo?: string
  }
}
