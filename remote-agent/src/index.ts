import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { encodeFrame, decodeFrame } from '@appserver/agent-protocol'
import type { AgentRuntimeWorkspaceRequest, AgentRuntimeToolRequest } from '@appserver/agent-protocol'

const execFileAsync = promisify(execFile)
const endpoint = process.env.APPSERVER_AGENT_ENDPOINT
const registrationToken = process.env.APPSERVER_AGENT_TOKEN
if (!endpoint || !registrationToken) throw new Error('APPSERVER_AGENT_ENDPOINT and APPSERVER_AGENT_TOKEN are required')

const ws = new WebSocket(endpoint, { headers: { Authorization: `Bearer ${registrationToken}` } })
const handles = new Map<string, string>()

ws.on('open', () => {
  ws.send(encodeFrame({ type: 'hello', protocolVersion: 1, agentId: process.env.APPSERVER_AGENT_ID || randomUUID(), publicKey: '', nonce: randomUUID() }))
})
ws.on('message', async (raw) => {
  const frame = decodeFrame(String(raw)) as AgentRuntimeWorkspaceRequest | AgentRuntimeToolRequest
  try {
    if (frame.type === 'workspace.create') {
      const name = `appserver-agent-${frame.workspaceId}`
      const { stdout } = await execFileAsync('docker', ['run', '-d', '--name', name, '--user', '0:0', '--read-only', '--cap-drop=ALL', '--security-opt', 'no-new-privileges', '--network', 'none', '--pids-limit', '128', 'python:3.12-slim', 'sleep', 'infinity'])
      handles.set(frame.workspaceId, stdout.trim() || name)
      ws.send(encodeFrame({ type: 'response', requestId: frame.requestId, ok: true, data: { handle: handles.get(frame.workspaceId)! } }))
    } else if (frame.type === 'workspace.stop' || frame.type === 'workspace.destroy') {
      const handle = handles.get(frame.workspaceId)
      if (handle) await execFileAsync('docker', [frame.type === 'workspace.stop' ? 'stop' : 'rm', '--force', handle])
      if (frame.type === 'workspace.destroy') handles.delete(frame.workspaceId)
      ws.send(encodeFrame({ type: 'response', requestId: frame.requestId, ok: true }))
    } else if (frame.type === 'tool.execute') {
      const handle = handles.get(frame.workspaceId)
      if (!handle) throw new Error('Workspace is not running')
      const command = String(frame.arguments.command || '')
      if (!command || command.length > 2000) throw new Error('Invalid command')
      const result = await execFileAsync('docker', ['exec', handle, 'sh', '-lc', command], { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 })
      ws.send(encodeFrame({ type: 'response', requestId: frame.requestId, ok: true, content: result.stdout }))
    }
  } catch (error) {
    ws.send(encodeFrame({ type: 'response', requestId: frame.requestId, ok: false, error: error instanceof Error ? error.message : 'Agent operation failed' }))
  }
})
