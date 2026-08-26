import axios from 'axios'
import config from '../config'
import type { UserDto, SpringPage, CreateUserBody, CreateUserResponse, UpdateUserBody, UserAuditRecord } from '../types'

function client(accessToken: string) {
  return axios.create({
    baseURL: config.ums.baseUrl,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function getAllUsers(
  accessToken: string,
  page = 0,
  size = 25,
): Promise<SpringPage<UserDto>> {
  const res = await client(accessToken).get<SpringPage<UserDto>>('/v1/user/all', {
    params: { pageNumber: page, pageSize: size },
  })
  return res.data
}

export async function searchUsers(
  accessToken: string,
  name: string,
  page = 0,
  size = 25,
): Promise<SpringPage<UserDto>> {
  const params: Record<string, string | number> = {
    sortBy: 'NAME',
    sortDirection: 'ASC',
    pageNumber: page,
    pageSize: size,
  }
  if (name) params.name = name
  const res = await client(accessToken).get<SpringPage<UserDto>>('/v1/user', { params })
  return res.data
}

export async function getUser(accessToken: string, systemUserId: string): Promise<UserDto> {
  const res = await client(accessToken).get<UserDto>(`/v1/user/${systemUserId}`)
  return res.data
}

export async function getCurrentUser(accessToken: string): Promise<UserDto> {
  const res = await client(accessToken).get<UserDto>('/v1/user/current')
  return res.data
}

export async function createUser(accessToken: string, body: CreateUserBody): Promise<CreateUserResponse> {
  const res = await client(accessToken).post<CreateUserResponse>('/v1/user', body)
  return res.data
}

export async function recordLogin(accessToken: string, systemUserId: string): Promise<void> {
  await client(accessToken).put(`/v1/user/${systemUserId}/login`)
}

export async function updateUser(
  accessToken: string,
  systemUserId: string,
  body: UpdateUserBody,
): Promise<UserDto> {
  const res = await client(accessToken).put<UserDto>(`/v1/user/${systemUserId}`, body)
  return res.data
}

export async function lockUser(accessToken: string, systemUserId: string): Promise<void> {
  await client(accessToken).put(`/v1/user/${systemUserId}/lock`)
}

export async function unlockUser(accessToken: string, systemUserId: string): Promise<void> {
  await client(accessToken).delete(`/v1/user/${systemUserId}/lock`)
}

export async function getUserHistory(accessToken: string, systemUserId: string): Promise<UserAuditRecord[]> {
  const res = await client(accessToken).get<UserAuditRecord[]>(`/v1/user/${systemUserId}/history`)
  return res.data
}
