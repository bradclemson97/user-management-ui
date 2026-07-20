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
  active: 'YES' | 'NO'
  userDetails: UserDetailsDto
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
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

// Augment express-session
declare module 'express-session' {
  interface SessionData {
    accessToken?: string
    idToken?: string
    state?: string
    nonce?: string
    codeVerifier?: string
    currentUser?: UserDto
    returnTo?: string
  }
}
