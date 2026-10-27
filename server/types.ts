export type AgentStatus =
  | 'THINKING'
  | 'CODING'
  | 'READING'
  | 'TERMINAL'
  | 'SEARCHING'
  | 'WAITING_USER'
  | 'IDLE_LOUNGE'
  | 'OFFLINE';

export type AgentSource = 'antigravity' | 'claude' | 'simulation';
export type OfficeRoom = 'antigravity' | 'claude';

export interface ActivityLogItem {
  id: string;
  agentId: string;
  agentName: string;
  source?: AgentSource;
  office?: OfficeRoom;
  timestamp: string;
  status: AgentStatus;
  icon: string;
  summary: string;
  detail?: string;
  isSimulated?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  model: string;
  source: AgentSource;
  office: OfficeRoom;
  workspace?: string;
  status: AgentStatus;
  bubbleIcon: string;
  bubbleText: string;
  lastActiveAt: string;
  createdAt: string;
  lastUserRequest?: string;
  currentTool?: string;
  currentThinking?: string;
  inputTokens: number;
  outputTokens: number;
  stepCount: number;
  deskIndex: number;
  avatarSeed: number;
}

export interface MonitorConfig {
  enableAntigravity: boolean;
  antigravityPath: string;
  enableClaude: boolean;
  claudePath: string;
  enableSimulation: boolean;
  idleLoungeMinutes: number;
  activeWindowMinutes: number;
}

export interface SourceStats {
  antigravitySessions: number;
  claudeSessions: number;
  simSessions: number;
}

export interface OfficeSnapshot {
  agents: AgentInfo[];
  activities: ActivityLogItem[];
  config: MonitorConfig;
  stats: SourceStats;
  serverTime: string;
}
