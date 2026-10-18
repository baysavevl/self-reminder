import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

type ApiOptions = { baseUrl: string; token: string }

async function callApi(options: ApiOptions, path: string, init: RequestInit = {}) {
  const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${options.token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.error?.message ?? `Self Reminder API returned ${response.status}`)
  return body?.data ?? body
}

export function createMcpServer(options: ApiOptions) {
  const server = new McpServer({ name: 'self-reminder', version: '1.0.0' })
  server.registerTool('list_reminders', {
    description: 'List reminders from Self Reminder.',
    inputSchema: { type: z.enum(['personal', 'birthday', 'food']).optional(), from: z.string().optional(), to: z.string().optional(), limit: z.number().int().min(1).max(100).optional() },
  }, async ({ type, from, to, limit }) => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (limit) params.set('limit', String(limit))
    const data = await callApi(options, `/reminders?${params}`)
    return { content: [{ type: 'text', text: JSON.stringify(data) }] }
  })
  server.registerTool('get_reminder', { description: 'Get one reminder.', inputSchema: { id: z.string().uuid() } }, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(await callApi(options, `/reminders/${id}`)) }] }))
  server.registerTool('create_reminder', { description: 'Create a reminder.', inputSchema: { title: z.string().min(1).max(200), type: z.enum(['personal', 'birthday', 'food']), starts_at: z.string(), notes: z.string().optional(), timezone: z.string().optional(), recurrence_kind: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(), recurrence_interval: z.number().int().min(1).optional() } }, async (input) => ({ content: [{ type: 'text', text: JSON.stringify(await callApi(options, '/reminders', { method: 'POST', body: JSON.stringify(input) })) }] }))
  server.registerTool('update_reminder', { description: 'Update a reminder.', inputSchema: { id: z.string().uuid(), title: z.string().min(1).max(200), type: z.enum(['personal', 'birthday', 'food']), starts_at: z.string(), notes: z.string().optional(), timezone: z.string().optional(), recurrence_kind: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(), recurrence_interval: z.number().int().min(1).optional() } }, async ({ id, ...input }) => ({ content: [{ type: 'text', text: JSON.stringify(await callApi(options, `/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(input) })) }] }))
  server.registerTool('complete_reminder', { description: 'Mark a reminder completed.', inputSchema: { id: z.string().uuid() } }, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(await callApi(options, `/reminders/${id}/complete`, { method: 'POST' })) }] }))
  server.registerTool('delete_reminder', { description: 'Cancel a reminder.', inputSchema: { id: z.string().uuid() } }, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(await callApi(options, `/reminders/${id}`, { method: 'DELETE' })) }] }))
  return server
}
