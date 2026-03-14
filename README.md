# req-mcp-server

`req-mcp-server` is a Bun-based MCP server that provides a persistent HTTP request toolset for testing and inspecting APIs.

It exposes a small set of MCP tools for setting a base URL, sending requests, reusing bearer auth across calls, and resetting request session state.

## What it does

- serves an MCP endpoint over HTTP using Hono
- maintains per-session request state
- persists cookies within a session
- can automatically capture and reuse bearer tokens from login responses
- supports JSON request bodies and custom headers for standard API workflows

## Exposed tools

The server registers four MCP tools:

- `new_request_session` — clears cookies and stored auth
- `get_request_base` — returns the current API base URL
- `set_request_base` — sets the API base URL used for later calls
- `send_request` — sends an HTTP request through the active session

`send_request` is the main operational tool. The other three manage session state.

## Runtime behavior

- MCP transport endpoint: `/mcp`
- health endpoint: `/health`
- default port: `9797`
- configurable via `MCP_PORT`

Each MCP session gets its own request client. Cookies are preserved across requests in that session, and bearer auth is reused when a successful response body includes an `access_token` field.

## Requirements

- [Bun](https://bun.com)

## Install

```bash
bun install
```

## Run locally

```bash
bun run src/mcp.ts
```

Once started, the server is available at:

- `http://localhost:9797/health`
- `http://localhost:9797/mcp`

If you want a different port:

```bash
MCP_PORT=8080 bun run src/mcp.ts
```

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

The container exposes port `9797` and starts the same MCP server entrypoint.

## Request model

`send_request` accepts:

- `endpoint` — request path such as `/api/auth/me`
- `method` — HTTP method such as `GET` or `POST`
- `useStoredAuth` — whether to attach the stored bearer token
- `headers` — optional string-to-string headers
- `body` — optional JSON object body

Current behavior is designed for standard JSON API traffic. Multipart uploads, binary payloads, and non-object request bodies are not the primary target of this server.

## Project structure

```text
src/
  mcp.ts      MCP server and HTTP transport
  xrest.ts    session-aware request client
  utils.ts    small string utility helpers
skills/
  request-api-tool/   companion skill guidance for using the MCP tools
```

## Development notes

- built with Bun and TypeScript
- HTTP server implemented with Hono
- request execution uses `impit`
- cookie persistence uses `tough-cookie`

## Health check

```bash
curl http://localhost:9797/health
```

Expected response:

```json
{"status":"ok"}
```
