export const AGENT_PROTOCOL_VERSION = 1 as const

export interface AgentRuntimeHello {
  type: 'hello'
  protocolVersion: 1
  agentId: string
  publicKey: string
  nonce: string
}

export interface AgentRuntimeHeartbeat {
  type: 'heartbeat'
  agentId: string
  timestamp: number
  capabilities: { runtime: 'rootless-docker'; mcp: boolean }
}

export interface AgentRuntimeWorkspaceRequest {
  type: 'workspace.create' | 'workspace.stop' | 'workspace.destroy'
  requestId: string
  workspaceId: string
  limits?: { cpu: number; memoryMb: number; diskMb: number; timeoutSeconds: number }
}

export interface AgentRuntimeToolRequest {
  type: 'tool.execute'
  requestId: string
  taskId: string
  workspaceId: string
  tool: string
  arguments: Record<string, unknown>
}

export interface AgentRuntimeResponse {
  type: 'response'
  requestId: string
  ok: boolean
  content?: string
  data?: Record<string, unknown>
  error?: string
}

export type AgentFrame =
  | AgentRuntimeHello
  | AgentRuntimeHeartbeat
  | AgentRuntimeWorkspaceRequest
  | AgentRuntimeToolRequest
  | AgentRuntimeResponse

export function encodeFrame(frame: AgentFrame): string { return JSON.stringify(frame) + '\n' }
export function decodeFrame(raw: string): AgentFrame { return JSON.parse(raw) as AgentFrame }
