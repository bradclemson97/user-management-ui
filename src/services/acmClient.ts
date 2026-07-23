import axios from 'axios'
import config from '../config'
import type { RoleResponse, UserRoleDto } from '../types'

function client(accessToken: string) {
  return axios.create({
    baseURL: config.acm.baseUrl,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function getPermissionRoles(accessToken: string): Promise<RoleResponse[]> {
  const res = await client(accessToken).get<RoleResponse[]>('/v1/roles', {
    params: { typeCode: 'PERMISSION' },
  })
  return res.data
}

export async function getUserRoles(accessToken: string, systemUserId: string): Promise<UserRoleDto[]> {
  const res = await client(accessToken).get<UserRoleDto[]>(`/v1/userRoles/${systemUserId}/roles`)
  return res.data
}

export async function saveUserRoles(
  accessToken: string,
  systemUserId: string,
  roleIds: number[],
): Promise<UserRoleDto[]> {
  const body = {
    userRoleRequestList: roleIds.map(roleId => ({ roleId })),
  }
  const res = await client(accessToken).post<UserRoleDto[]>(`/v1/userRoles/${systemUserId}/roles`, body)
  return res.data
}
