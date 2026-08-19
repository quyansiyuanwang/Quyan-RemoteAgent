import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const command = process.env.MCP_COMMAND
if (!command) throw new Error('MCP_COMMAND is required')
const args = process.env.MCP_ARGS ? JSON.parse(process.env.MCP_ARGS) as string[] : []
const client = new Client({ name: 'appserver-remote-mcp-bridge', version: '1.0.0' })
const transport = new StdioClientTransport({ command, args, env: { ...process.env } as Record<string, string> })
await client.connect(transport)
const tools = await client.listTools()
process.stdout.write(JSON.stringify({ tools: tools.tools.map((tool) => ({ name: tool.name, description: tool.description })) }) + '\n')
