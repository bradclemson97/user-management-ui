import axios from 'axios'
import config from '../config'
import type { ResetPasswordResponse } from '../types'

function client(accessToken: string) {
  return axios.create({
    baseURL: config.km.baseUrl,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function resetPassword(accessToken: string, email: string): Promise<ResetPasswordResponse> {
  const res = await client(accessToken).put<ResetPasswordResponse>(`/v1/user/${encodeURIComponent(email)}/password`)
  return res.data
}
