# User Management UI

A server-side rendered web application for managing users. Built with Node.js, Express, TypeScript, and the GOV.UK Frontend design system. Handles OIDC authentication via Keycloak and delegates data operations to the User Management Service (UMS).

## Prerequisites

- Node.js 18+
- A running Keycloak instance with the `system` realm configured (see [Keycloak Setup](#keycloak-setup))
- A running [User Management Service](https://github.com/bradclemson97/user-management-service) instance

## Configuration

Create a `.env` file in the project root (copy from `.env.example` if present):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | `dev-secret-change-me` | Secret used to sign session cookies — generate with `openssl rand -base64 32` in production |
| `APP_BASE_URL` | `http://localhost:3000` | Public base URL of this application |
| `KEYCLOAK_BASE_URL` | `http://localhost:9000` | Keycloak server URL |
| `KEYCLOAK_REALM` | `system` | Keycloak realm name |
| `KEYCLOAK_CLIENT_ID` | `user-management-ui` | OIDC client ID registered in Keycloak |
| `KEYCLOAK_CLIENT_SECRET` | *(required)* | Client secret — obtain from Keycloak Admin Console after registering the client |
| `UMS_BASE_URL` | `http://localhost:8080` | Base URL of the User Management Service |
| `ACM_BASE_URL` | `http://localhost:8130` | Base URL of the Access Control Manager |
| `KM_BASE_URL` | `http://localhost:8210` | Base URL of the Keycloak Manager |

## Running

```bash
npm install
```

**Development** (hot-reload via nodemon + ts-node):

```bash
npm run dev
```

**Production** (compile then run):

```bash
npm run build
npm start
```

The UI will be available at `http://localhost:3000`.

## Routes

| Path | Description | Auth required |
|---|---|---|
| `/auth/login` | Redirects to Keycloak login | No |
| `/auth/callback` | Handles OIDC callback and establishes session | No |
| `/auth/logout` | Ends session and redirects to Keycloak logout | No |
| `/users` | User list | Yes |
| `/users/create` | Create user form | Yes |
| `/users/:id` | View user profile | Yes |
| `/users/:id/roles` | Manage user role assignments | Yes |
| `/users/:id/roles/confirm` | Two-step role assignment confirmation | Yes |
| `/users/:id/history` | Audit history — account changes and role assignments | Yes |
| `/profile` | Current user profile | Yes |

## Session Handling

`express-session` stores OIDC tokens server-side. The browser only holds a session cookie. On each UMS API call, the server reads the access token from the session and forwards it as a `Bearer` header, so UMS and ACM can authenticate and authorise the request.

## Keycloak Setup

The `user-management-ui` OIDC client must be registered in Keycloak before the application can authenticate users, and a protocol mapper must be in place to include `systemUserId` as a JWT claim.

Full setup instructions are in the User Management Service README:

- **Section 9.3** — Register the `user-management-ui` client (redirect URIs, client secret)
- **Section 9.4** — Add the `systemUserId` protocol mapper to the client

Without the protocol mapper, authenticated users will receive a 401 from ACM because the `systemUserId` claim will be absent from the JWT.

## Tech Stack

| Concern | Library |
|---|---|
| HTTP server | Express 4 |
| OIDC / OAuth2 | openid-client 5 |
| Session | express-session |
| Templates | Nunjucks |
| Design system | GOV.UK Frontend 6 |
| Language | TypeScript 5 |
