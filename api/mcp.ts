import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createMcpServer } from '../mcp/server'

export default async function handler(req: any, res: any) {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Bearer token required' })
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = createMcpServer({ baseUrl: process.env.SELF_REMINDER_API_URL ?? 'https://self-reminder.vercel.app/api/v1', token })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
