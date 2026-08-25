export function isTokenExpiringSoon(accessToken: string, bufferSeconds: number): boolean {
  const parts = accessToken.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as { exp?: number }
    const exp = payload.exp
    return typeof exp === 'number' && exp < Math.floor(Date.now() / 1000) + bufferSeconds
  } catch {
    return false
  }
}
