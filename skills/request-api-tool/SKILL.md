---
name: request-api-tool
description: Use this skill whenever the user wants to call, test, inspect, or debug an HTTP API through the Request API Tool MCP server, especially for endpoint checks, login flows, bearer-token reuse, cookies, headers, base URL setup, or repeated API requests. This skill teaches the correct use of `new_request_session`, `set_request_base`, `get_request_base`, and `send_request`, with `send_request` as the main tool for actual API calls.
---

# Request API Tool

Use this skill to operate the Request API Tool MCP server in this project.

This MCP server exposes four tools:

- `new_request_session`
- `get_request_base`
- `set_request_base`
- `send_request`

`send_request` is the main tool. The other three exist to prepare or reset the request session.

## When to use this skill

Use this skill when the user wants to:

- call a live HTTP endpoint
- test an API route
- run a login flow and then hit protected endpoints
- inspect API responses, headers, or status codes
- set or verify the API base URL
- reset cookies or stored auth and try again

Do not use this skill for:

- pure code reading or refactoring tasks
- APIs that require file upload, multipart form data, raw binary payloads, or non-object request bodies

The current `send_request` tool accepts a JSON object body and string headers. It is designed for standard JSON API traffic.

## Tool reference

### `set_request_base`

Use this before making requests when the target host is not already configured.

Input:

```json
{ "url": "http://localhost:[PORT]" }
```

**NOTE**: Port can be empty and just omit the colon, ":"

Behavior:

- stores the base URL for later calls
- future requests use `base URL + endpoint`

### `get_request_base`

Use this to confirm the current base URL.

Use it when:

- you are unsure which API host is active
- a prior request may have targeted the wrong server
- you want to verify state before reporting back

### `new_request_session`

Use this to reset Request API Tool session state.

Behavior:

- clears stored bearer token
- clears cookies by creating a fresh cookie jar
- starts a new request session

Use it when:

- starting a fresh auth flow
- switching users
- cookies or auth state appear stale
- a previous login polluted the current session

### `send_request`

Use this for every real API call.

Input:

```json
{
  "endpoint": "/api/auth/me",
  "method": "GET",
  "useStoredAuth": true,
  "headers": {
    "Accept": "application/json"
  },
  "body": {
    "example": "value"
  }
}
```

Input rules:

- `endpoint`: path such as `/api/auth/me`
- `method`: any HTTP method string; it is uppercased internally
- `useStoredAuth`: whether to attach the stored bearer token
- `headers`: optional string-to-string map
- `body`: optional JSON object

Operational facts:

- the request URL is `current base URL + endpoint`
- the request body is JSON-stringified by the server
- cookies persist across requests inside the current session
- if `useStoredAuth` is `true` and a token was stored earlier, the server adds `Authorization: Bearer <token>`
- if you set an `Authorization` header manually and also set `useStoredAuth: true`, the stored bearer token wins

## Auth model

The MCP server stores bearer auth automatically only in one case:

- a successful response body contains the substring `"access_token":"..."`

That means the correct auth flow is usually:

1. `new_request_session`
2. `set_request_base`
3. `send_request` to the login endpoint with `useStoredAuth: false`
4. if login succeeds and returns `access_token`, use `send_request` with `useStoredAuth: true` for protected endpoints

Important:

- do not set `useStoredAuth: true` for the login request unless you intentionally want to reuse an older token
- a successful request may report `authStored: true` in the response object, but actual token reuse only works if an `access_token` was found and saved

## Standard workflow

Follow this order unless the user asks for something more specific:

1. If base URL is unknown, ask for it or confirm it.
2. Call `set_request_base`.
3. If the task involves fresh auth, call `new_request_session`.
4. Use `send_request` for the target endpoint.
5. If the endpoint is protected, first obtain a token with a login request, then retry with `useStoredAuth: true`.
6. If results look inconsistent, call `get_request_base` and, if needed, `new_request_session`, then retry.

## Response interpretation

`send_request` returns text containing pretty-printed JSON. Read and interpret that text.

Expected fields in the JSON payload:

- `status_code`: HTTP status code
- `raw_body`: parsed JSON object or plain text body
- `raw_headers`: response headers
- `network_error`: present on transport failure
- `authStored`: success-path flag; not proof that a bearer token was actually captured

Interpretation rules:

- if `network_error` exists, treat the call as a transport failure
- if `status_code` is 400 or higher, treat the call as an HTTP failure even if a body exists
- inspect `raw_body` for the actual API result or error details
- when debugging auth, check whether the login response body actually included `access_token`

## Recommended patterns

### Public endpoint

Use `send_request` with `useStoredAuth: false`.

### Login request

Use `send_request` with `useStoredAuth: false`.

Example:

```json
{
  "endpoint": "/api/auth/login",
  "method": "POST",
  "useStoredAuth": false,
  "body": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

### Protected endpoint after login

Use `send_request` with `useStoredAuth: true`.

Example:

```json
{
  "endpoint": "/api/auth/me",
  "method": "GET",
  "useStoredAuth": true
}
```

### Recover from stale state

If cookies or auth look wrong:

1. call `new_request_session`
2. call `set_request_base` again if needed
3. redo login
4. retry the protected request

## Reporting back to the user

When you use this skill, report the result plainly.

Prefer this structure:

- `Base URL:` current target host
- `Request:` method and endpoint
- `Auth mode:` stored auth on or off
- `Result:` status code or network error
- `Body:` short summary of `raw_body`

If the request failed, say whether it was:

- wrong base URL
- HTTP error from the API
- missing or stale auth
- transport failure

## Key rule

Use `send_request` for actual endpoint work.

Use `set_request_base`, `get_request_base`, and `new_request_session` only to support `send_request`.
