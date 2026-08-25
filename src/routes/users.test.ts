import { errorMessage } from './users'

jest.mock('axios', () => ({
  isAxiosError: (e: unknown) => (e as any).isAxiosError === true,
}))

const makeAxiosError = (status: number, message?: string) => ({
  isAxiosError: true,
  response: { status, data: message ? { message } : undefined },
  message: 'Request failed',
})

describe('errorMessage', () => {
  it('returns session expired message for 401', () => {
    const result = errorMessage(makeAxiosError(401))
    expect(result).toContain('session has expired')
    expect(result).toContain('/auth/login')
  })

  it('returns permission message for 403', () => {
    const result = errorMessage(makeAxiosError(403))
    expect(result).toContain('do not have permission')
  })

  it('returns data.message from axios error body', () => {
    const result = errorMessage(makeAxiosError(400, 'Email already in use'))
    expect(result).toBe('Email already in use')
  })

  it('returns err.message from axios error with no body', () => {
    const result = errorMessage(makeAxiosError(500))
    expect(result).toBe('Request failed')
  })

  it('returns err.message for plain Error', () => {
    const result = errorMessage(new Error('Something broke'))
    expect(result).toBe('Something broke')
  })

  it('returns fallback for unknown value', () => {
    const result = errorMessage('some string')
    expect(result).toBe('An unexpected error occurred')
  })
})
