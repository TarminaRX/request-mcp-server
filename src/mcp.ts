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

type SessionEntry = {
    server: McpServer;
    transport: WebStandardStreamableHTTPServerTransport;
    requestSession: XRest;
};

const sessions = new Map<string, SessionEntry>();

function textResult(text: string): CallToolResult {
    return {
        content: [{ type: 'text', text }]
    };
}

function createMcpServer(requestSession: XRest): McpServer {
    const server = new McpServer({
        name: 'hono-webstandard-mcp-server',
        version: '1.0.0'
    });

    server.registerTool(
        'new_request_session',
        {
            title: 'New Session for Request API tool',
            description: 'A refresher function to clear existing session. Clearing cookies and authStore.',
        },
        async (): Promise<CallToolResult> => {
            requestSession.createNewSession();
            return textResult('Success! Cleared current Request API session.');
        }
    );

    server.registerTool(
        'get_request_base',
        {
            title: 'Get Request API base URL',
            description: 'Returns the current base URL used for Request API calls.',
        },
        async (): Promise<CallToolResult> => {
            const baseUrl = requestSession.getApiBase();
            return textResult(
                baseUrl === undefined
                    ? 'Request API base URL is not set.'
                    : `Current Request API base URL: ${baseUrl}`
            );
        }
    );

    server.registerTool(
        'set_request_base',
        {
            title: 'Set Request API base URL',
            description: 'Sets the base URL used for future Request API calls.',
            inputSchema: z.object({
                url: z.string().url().describe('Base URL for API requests, such as http://localhost:3000')
            })
        },
        async ({ url }): Promise<CallToolResult> => {
            requestSession.setApiBase(url);
            return textResult(`Success! Request API base URL set to ${url}`);
        }
    );

    server.registerTool(
        'send_request',
        {
            title: 'Send Request API request',
            description: 'Sends an HTTP request using the current Request API session.',
            inputSchema: z.object({
                endpoint: z.string().min(1).describe('Endpoint path to request, such as /api/auth/me'),
                method: z.string().min(1).transform(value => value.toUpperCase()).describe('HTTP method, such as GET or POST'),
                useStoredAuth: z.boolean().default(false).describe('Whether to attach the stored bearer token'),
                headers: z.record(z.string(), z.string()).optional().describe('Optional request headers'),
                body: z.record(z.string(), z.unknown()).optional().describe('Optional JSON request body')
            })
        },
        async ({ endpoint, method, useStoredAuth, headers, body }): Promise<CallToolResult> => {
            const response = await requestSession.sendRequest({
                endpoint,
                method,
                useStoredAuth,
                headers,
                body
            });

            return textResult(JSON.stringify(response, null, 2));
        }
    );

    return server;
}

function createSessionEntry(): SessionEntry {
    const requestSession = new XRest();
    const server = createMcpServer(requestSession);
    let transport: WebStandardStreamableHTTPServerTransport;

    transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: sessionId => {
            sessions.set(sessionId, { server, transport, requestSession });
        },
        onsessionclosed: async sessionId => {
            sessions.delete(sessionId);
            await server.close();
        }
    });

    return { server, transport, requestSession };
}

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

app.all('/mcp', async c => {
    const sessionId = c.req.header('mcp-session-id');

    if (sessionId !== undefined) {
        const existingSession = sessions.get(sessionId);

        if (existingSession === undefined) {
            return c.json(
                {
                    jsonrpc: '2.0',
                    error: {
                        code: -32001,
                        message: 'Session not found'
                    },
                    id: null
                },
                404
            );
        }

        return existingSession.transport.handleRequest(c.req.raw);
    }

    const sessionEntry = createSessionEntry();

    await sessionEntry.server.connect(sessionEntry.transport);

    try {
        const response = await sessionEntry.transport.handleRequest(c.req.raw);

        if (sessionEntry.transport.sessionId === undefined) {
            await sessionEntry.server.close();
        }

        return response;
    } catch (error) {
        await sessionEntry.server.close();
        throw error;
    }
});

const PORT = process.env.MCP_PORT ? Number.parseInt(process.env.MCP_PORT, 10) : 9797;

console.log(`Starting Hono MCP server on port ${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);

export default { 
  port: PORT, 
  fetch: app.fetch, 
} 

