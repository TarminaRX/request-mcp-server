/**
 * Example MCP server using Hono with WebStandardStreamableHTTPServerTransport
 *
 * This example demonstrates using the Web Standard transport directly with Hono,
 * which works on any runtime: Node.js, Cloudflare Workers, Deno, Bun, etc.
 *
 * Run with: pnpm tsx src/honoWebStandardStreamableHttp.ts
 */
import type { CallToolResult } from '@modelcontextprotocol/server';
import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as z from 'zod/v4';
import { XRest } from '.';

const server = new McpServer({
    name: 'hono-webstandard-mcp-server',
    version: '1.0.0'
});

const currentSession = new XRest();

server.registerTool(
    'new_request_session',
    {
        title: 'New Session for Request API tool',
        description: 'A refresher function to clear existing session. Clearing cookies and authStore.',
    },
    async (): Promise<CallToolResult> => {
        currentSession.createNewSession()
        return {
            content: [{ type: 'text', text: `Success! Cleared current Request API session.` }]
        };
    }
);

// TODO: To implement other methods properly from XRest Class.
server.registerTool(
    'set_request_base',
    {
        title: 'New Session for Request API tool',
        description: 'A refresher function to clear existing session. Clearing cookies and authStore.',
        inputSchema: z.object(
          // something here
        )
    },
    async (): Promise<CallToolResult> => {
        currentSession.createNewSession()
        return {
            content: [{ type: 'text', text: `Success! Cleared current Request API session.` }]
        };
    }
);

const transport = new WebStandardStreamableHTTPServerTransport();

const app = new Hono();

app.use(
    '*',
    cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'mcp-session-id', 'Last-Event-ID', 'mcp-protocol-version'],
        exposeHeaders: ['mcp-session-id', 'mcp-protocol-version']
    })
);

app.get('/health', c => c.json({ status: 'ok' }));

app.all('/mcp', c => transport.handleRequest(c.req.raw));

const PORT = process.env.MCP_PORT ? Number.parseInt(process.env.MCP_PORT, 10) : 9797;

await server.connect(transport);

console.log(`Starting Hono MCP server on port ${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);

export default { 
  port: PORT, 
  fetch: app.fetch, 
} 

