import { isTokenExpiringSoon } from './token'

function makeJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('isTokenExpiringSoon', () => {
  it('returns true when token expires within the buffer window', () => {
    const exp = Math.floor(Date.now() / 1000) + 30
    expect(isTokenExpiringSoon(makeJwt(exp), 60)).toBe(true)
  })

  it('returns false when token expires well outside the buffer window', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    expect(isTokenExpiringSoon(makeJwt(exp), 60)).toBe(false)
  })

  it('returns true when token is already expired', () => {
    const exp = Math.floor(Date.now() / 1000) - 10
    expect(isTokenExpiringSoon(makeJwt(exp), 60)).toBe(true)
  })

  it('returns false for a non-JWT string', () => {
    expect(isTokenExpiringSoon('not.a.valid.jwt.at.all', 60)).toBe(false)
  })

  it('returns false when exp is missing from payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ sub: 'user' })).toString('base64url')
    expect(isTokenExpiringSoon(`${header}.${payload}.sig`, 60)).toBe(false)
  })
})
