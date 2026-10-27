import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {
  AgentInfo,
  AgentStatus,
  ActivityLogItem,
  MonitorConfig,
} from './types';

const DEFAULT_CONVERSATION_IDS = [
  'ab79e568-f716-45b4-ba38-c948b2712613',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

function cleanArgValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.replace(/^"+|"+$/g, '').trim();
}

function extractUserRequest(content: string): string {
  const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (match) return match[1].trim().replace(/\s+/g, ' ');
  return content.trim().replace(/\s+/g, ' ');
}

function extractModelSelection(content: string): string {
  const match = content.match(/changed setting `Model Selection` from .*? to ([^\n.]+)/);
  if (!match) return '';
  return match[1].trim();
}

function formatClaudeModelName(rawModel?: string): string {
  if (!rawModel) return 'Claude Code';
  const lower = rawModel.toLowerCase();
  if (lower.includes('opus-4')) return 'Claude Opus 4';
  if (lower.includes('sonnet-4')) return 'Claude Sonnet 4';
  if (lower.includes('3-7-sonnet')) return 'Claude 3.7 Sonnet';
  if (lower.includes('3-5-sonnet')) return 'Claude 3.5 Sonnet';
  if (lower.includes('haiku')) return 'Claude Haiku';
  return rawModel;
}

function extractThinkingHeadline(thinking: string): string {
  const match = thinking.match(/\*\*([^*]+)\*\*/);
  if (match) return match[1].trim();
  const firstLine = thinking.trim().split('\n')[0] || '';
  return firstLine.slice(0, 45);
}

export function mapToolToStatus(
  toolName: string,
  args: Record<string, unknown> = {}
): {
  status: AgentStatus;
  icon: string;
  text: string;
} {
  const norm = toolName.toLowerCase();

  // File write / edit tools (Antigravity + Claude Code)
  if (
    norm === 'write_file' ||
    norm === 'edit_file' ||
    norm === 'write' ||
    norm === 'edit' ||
    norm === 'multiedit' ||
    norm === 'notebookedit'
  ) {
    const filePath =
      cleanArgValue(args.Path) ||
      cleanArgValue(args.file_path) ||
      cleanArgValue(args.path) ||
      cleanArgValue(args.notebook_path);
    const base = filePath ? path.basename(filePath) : '코드 파일';
    return {
      status: 'CODING',
      icon: '✏️',
      text: `코드 수정: ${base}`,
    };
  }

  // File read / search tools (Antigravity + Claude Code)
  if (
    norm === 'read_file' ||
    norm === 'read' ||
    norm === 'glob' ||
    norm === 'grep' ||
    norm === 'ls'
  ) {
    const target =
      cleanArgValue(args.Path) ||
      cleanArgValue(args.file_path) ||
      cleanArgValue(args.pattern) ||
      cleanArgValue(args.path);
    const base = target ? path.basename(target) : toolName;
    return {
      status: 'READING',
      icon: '📖',
      text: `탐색/읽기: ${base.slice(0, 24)}`,
    };
  }

  // Terminal / Bash tools (Antigravity + Claude Code)
  if (
    norm === 'run_command' ||
    norm === 'manage_task' ||
    norm === 'bash'
  ) {
    const summary =
      cleanArgValue(args.toolSummary) ||
      cleanArgValue(args.description) ||
      cleanArgValue(args.command) ||
      cleanArgValue(args.CommandLine) ||
      '명령어 실행';
    return {
      status: 'TERMINAL',
      icon: '💻',
      text: `터미널: ${summary.slice(0, 28)}`,
    };
  }

  // Web search / fetch tools
  if (
    norm === 'search_web' ||
    norm === 'websearch' ||
    norm === 'webfetch'
  ) {
    const query =
      cleanArgValue(args.query) ||
      cleanArgValue(args.url) ||
      '웹 리서치';
    return {
      status: 'SEARCHING',
      icon: '🔍',
      text: `검색 중: ${query.slice(0, 25)}`,
    };
  }

  // User question / interactive prompt
  if (norm === 'ask_question' || norm === 'askuserquestion') {
    return {
      status: 'WAITING_USER',
      icon: '🙋',
      text: '질문 응답 대기 중...',
    };
  }

  // Subagent / Task delegation
  if (
    norm === 'invoke_subagent' ||
    norm === 'send_message' ||
    norm === 'task'
  ) {
    const desc =
      cleanArgValue(args.Role) ||
      cleanArgValue(args.description) ||
      '서브에이전트';
    return {
      status: 'THINKING',
      icon: '🤝',
      text: `협업 위임: ${desc.slice(0, 22)}`,
    };
  }

  if (norm === 'todowrite' || norm === 'todoread') {
    return {
      status: 'THINKING',
      icon: '📋',
      text: '작업 체크리스트 업데이트',
    };
  }

  return {
    status: 'THINKING',
    icon: '⚙️',
    text: `도구 실행: ${toolName}`,
  };
}

interface RawAntigravityStep {
  step_index?: number;
  source?: string;
  type?: string;
  status?: string;
  created_at?: string;
  content?: string;
  thinking?: string;
  input_tokens?: number;
  cache_read_tokens?: number;
  output_tokens?: number;
  tool_calls?: Array<{
    name: string;
    args?: Record<string, unknown>;
  }>;
}

interface RawClaudeLine {
  type?: string;
  sessionId?: string;
  isSidechain?: boolean;
  timestamp?: string;
  cwd?: string;
  customTitle?: string;
  agentName?: string;
  agentSetting?: string;
  aiTitle?: string;
  slug?: string;
  attributionAgent?: string;
  message?: {
    role?: string;
    model?: string;
    stop_reason?: string | null;
    content?:
      | string
      | Array<{
          type: string;
          text?: string;
          thinking?: string;
          name?: string;
          input?: Record<string, unknown>;
        }>;
    usage?: {
      input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
      output_tokens?: number;
    };
  };
}

export class MultiAgentLogWatcher {
  private config: MonitorConfig;
  private agents: Map<string, AgentInfo> = new Map();
  private activities: ActivityLogItem[] = [];
  private seenStepKeys: Set<string> = new Set();
  private agySubagentMeta: Map<
    string,
    { name: string; role: string; killed?: boolean }
  > = new Map();
  private onUpdate?: () => void;
  private pollTimer?: NodeJS.Timeout;

  constructor(config: MonitorConfig, onUpdate?: () => void) {
    this.config = config;
    this.onUpdate = onUpdate;
  }

  public updateConfig(nextConfig: MonitorConfig): void {
    this.config = nextConfig;
    // Remove disabled sources immediately
    for (const [id, agent] of this.agents.entries()) {
      if (agent.source === 'antigravity' && !this.config.enableAntigravity) {
        this.agents.delete(id);
      }
      if (agent.source === 'claude' && !this.config.enableClaude) {
        this.agents.delete(id);
      }
    }
    this.scanAll(true);
  }

  public start(): void {
    this.scanAll();
    this.pollTimer = setInterval(() => {
      this.scanAll();
    }, 1500);
  }

  public stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  public getAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).filter((a) => a.status !== 'OFFLINE');
  }

  public getActivities(): ActivityLogItem[] {
    return this.activities;
  }

  /**
   * Handles incoming real-time webhook event from Claude Code Hooks (`POST /api/hook/claude`)
   */
  public handleClaudeHookEvent(payload: Record<string, unknown>): void {
    if (!this.config.enableClaude) return;

    const sessionId = String(payload.session_id || payload.sessionId || 'claude-hook-live');
    const agentId = `claude:${sessionId}`;
    const shortId = sessionId.slice(0, 4);
    const seed = hashString(agentId);

    const hookEventName = String(payload.hook_event_name || payload.event || 'ToolUse');
    const toolName = String(payload.tool_name || payload.tool || '');
    const toolInput = (payload.tool_input as Record<string, unknown>) || {};
    const cwd = typeof payload.cwd === 'string' ? path.basename(payload.cwd) : undefined;
    const hookAgentName =
      typeof payload.agent_name === 'string' && payload.agent_name.trim()
        ? payload.agent_name.trim()
        : typeof payload.custom_title === 'string' && payload.custom_title.trim()
          ? payload.custom_title.trim()
          : cwd
            ? `${cwd}-${shortId}`
            : `claude-${shortId}`;

    let status: AgentStatus = 'THINKING';
    let bubbleIcon = '🤖';
    let bubbleText = 'Claude 작업 진행 중...';

    if (toolName) {
      const mapped = mapToolToStatus(toolName, toolInput);
      status = mapped.status;
      bubbleIcon = mapped.icon;
      bubbleText = mapped.text;
    } else if (hookEventName === 'Stop' || hookEventName === 'Notification') {
      status = 'WAITING_USER';
      bubbleIcon = '💬';
      bubbleText = '응답 완료 · 다음 지시 대기 중';
    } else if (hookEventName === 'UserPromptSubmit') {
      status = 'THINKING';
      bubbleIcon = '⚡';
      bubbleText = '프롬프트 분석 및 추론 중...';
    }

    const existing = this.agents.get(agentId);
    const nowIso = new Date().toISOString();

    const updated: AgentInfo = {
      id: agentId,
      name: existing?.name || hookAgentName,
      role: cwd ? `Claude Code (${cwd})` : 'Claude Code Agent',
      model: existing?.model || 'Claude Sonnet 4',
      source: 'claude',
      office: 'claude',
      workspace: cwd || existing?.workspace,
      status,
      bubbleIcon,
      bubbleText,
      lastActiveAt: nowIso,
      createdAt: existing?.createdAt || nowIso,
      lastUserRequest:
        typeof payload.prompt === 'string'
          ? payload.prompt
          : existing?.lastUserRequest || 'Claude Code 실시간 Hook 세션',
      currentTool: toolName || existing?.currentTool,
      inputTokens: (existing?.inputTokens || 4200) + 350,
      outputTokens: (existing?.outputTokens || 800) + 95,
      stepCount: (existing?.stepCount || 1) + 1,
      deskIndex: existing?.deskIndex ?? 0,
      avatarSeed: seed,
    };

    this.agents.set(agentId, updated);
    this.activities.unshift({
      id: `${agentId}-hook-${Date.now()}`,
      agentId,
      agentName: updated.name,
      source: 'claude',
      office: 'claude',
      timestamp: nowIso,
      status,
      icon: bubbleIcon,
      summary: bubbleText,
      detail: cwd ? `Workspace: ${cwd}` : undefined,
    });

    if (this.activities.length > 80) this.activities.length = 80;
    if (this.onUpdate) this.onUpdate();
  }

  public scanAll(forceEmit = false): void {
    let changed = forceEmit;
    const prevVisibleCount = this.getAgents().length;

    if (this.config.enableAntigravity) {
      const agyPaths = this.discoverAntigravityFiles();
      for (const filePath of agyPaths) {
        if (this.parseAntigravityFile(filePath)) {
          changed = true;
        }
      }
    }

    if (this.config.enableClaude) {
      const claudePaths = this.discoverClaudeFiles();
      const activeClaudeIds = new Set<string>();
      for (const filePath of claudePaths) {
        const res = this.parseClaudeFile(filePath);
        if (res.agentId) {
          activeClaudeIds.add(res.agentId);
        }
        if (res.changed) {
          changed = true;
        }
      }

      // Expire any previously tracked Claude agents that are no longer in recent files or timed out
      const offlineMs = this.config.activeWindowMinutes * 60 * 1000;
      for (const [id, agent] of this.agents.entries()) {
        if (agent.source === 'claude') {
          const ageMs = Math.max(0, Date.now() - new Date(agent.lastActiveAt).getTime());
          if (ageMs > offlineMs || (!id.includes('hook') && !activeClaudeIds.has(id))) {
            this.agents.delete(id);
            changed = true;
          }
        }
      }
    }

    // Prune all OFFLINE agents so dead sessions never linger in memory or UI
    for (const [id, agent] of this.agents.entries()) {
      if (agent.status === 'OFFLINE') {
        this.agents.delete(id);
        changed = true;
      }
    }

    if ((changed || this.getAgents().length !== prevVisibleCount) && this.onUpdate) {
      this.onUpdate();
    }
  }

  private discoverAntigravityFiles(): string[] {
    const brainDir = expandHome(this.config.antigravityPath);
    const ids = new Set<string>(DEFAULT_CONVERSATION_IDS);
    if (process.env.ANTIGRAVITY_CONVERSATION_ID) {
      ids.add(process.env.ANTIGRAVITY_CONVERSATION_ID);
    }

    try {
      const entries = fs.readdirSync(brainDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          ids.add(entry.name);
        }
      }
    } catch {
      // Fallback to known IDs if directory listing is restricted
    }

    const validPaths: string[] = [];
    for (const id of ids) {
      const transcriptPath = path.join(
        brainDir,
        id,
        '.system_generated',
        'logs',
        'transcript.jsonl'
      );
      try {
        if (fs.existsSync(transcriptPath)) {
          validPaths.push(transcriptPath);
        }
      } catch {
        // Ignore inaccessible paths
      }
    }
    return validPaths;
  }

  private discoverClaudeFiles(): string[] {
    const claudeRoot = expandHome(this.config.claudePath);
    const offlineMs = this.config.activeWindowMinutes * 60 * 1000;
    const subagentKeepMs = Math.min(
      offlineMs,
      Math.max(this.config.idleLoungeMinutes * 3 * 60 * 1000, 6 * 60 * 1000)
    );
    const now = Date.now();
    const candidates: Array<{ filePath: string; mtimeMs: number; isSubagent: boolean }> = [];

    const walk = (dir: string, depth: number) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            try {
              const st = fs.statSync(fullPath);
              const isSubagent =
                fullPath.includes(`${path.sep}subagents${path.sep}`) ||
                entry.name.startsWith('agent-');
              // Keep subagents during lounge rest period so they move to lounge instead of disappearing immediately
              const maxAge = isSubagent ? subagentKeepMs : offlineMs;
              if (now - st.mtimeMs <= maxAge) {
                candidates.push({ filePath: fullPath, mtimeMs: st.mtimeMs, isSubagent });
              }
            } catch {
              // Ignore stat error
            }
          }
        }
      } catch {
        // Ignore unreadable dir
      }
    };

    walk(claudeRoot, 0);

    // Pick top 14 most recently modified files, then return in ascending mtime order
    // so newer runs of the same named subagent naturally supersede older runs
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates
      .slice(0, 14)
      .reverse()
      .map((c) => c.filePath);
  }

  private resolveIdleOrOfflineStatus(
    ageMs: number,
    activeStatus: AgentStatus,
    activeIcon: string,
    activeText: string,
    isSubagent = false,
    isFinished = false
  ): { status: AgentStatus; icon: string; text: string } {
    const offlineMs = this.config.activeWindowMinutes * 60 * 1000;
    const loungeMs = this.config.idleLoungeMinutes * 60 * 1000;

    if (isSubagent) {
      const subagentOfflineMs = Math.min(
        offlineMs,
        Math.max(loungeMs * 3, 6 * 60 * 1000)
      );
      if (ageMs > subagentOfflineMs) {
        return { status: 'OFFLINE', icon: '🌙', text: '서브에이전트 퇴근' };
      }
      // Once a subagent finishes its task or waits > 8s, move it to the Shared Lounge to rest/wait
      if (
        isFinished ||
        ageMs > 20 * 1000 ||
        (activeStatus === 'WAITING_USER' && ageMs > 6 * 1000)
      ) {
        return {
          status: 'IDLE_LOUNGE',
          icon: '☕',
          text: '작업 완료 · 휴게실 대기 중',
        };
      }
      return { status: activeStatus, icon: activeIcon, text: activeText };
    }

    if (ageMs > offlineMs) {
      return { status: 'OFFLINE', icon: '🌙', text: '퇴근 (비활성)' };
    }
    // If the session already finished its turn (WAITING_USER) and has been idle for > 60s
    // or > loungeMs, move to the Shared Lounge instead of occupying a work desk
    const effectiveLoungeMs =
      activeStatus === 'WAITING_USER' ? Math.min(loungeMs, 60 * 1000) : loungeMs;
    if (ageMs > effectiveLoungeMs) {
      return { status: 'IDLE_LOUNGE', icon: '☕', text: '휴게실에서 휴식 중' };
    }
    return { status: activeStatus, icon: activeIcon, text: activeText };
  }

  private parseAntigravityFile(filePath: string): boolean {
    try {
      const stat = fs.statSync(filePath);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter((line) => line.trim().length > 0);
      if (lines.length === 0) return false;

      const parts = filePath.split(path.sep);
      const logsIdx = parts.lastIndexOf('.system_generated');
      const convId = logsIdx > 0 ? parts[logsIdx - 1] : path.basename(path.dirname(filePath));
      const agentId = `agy:${convId}`;
      const shortId = convId.slice(0, 4);
      const seed = hashString(convId);

      let workspace = '';
      try {
        const fullTranscriptPath = path.join(path.dirname(filePath), 'transcript_full.jsonl');
        if (fs.existsSync(fullTranscriptPath)) {
          const fd = fs.openSync(fullTranscriptPath, 'r');
          const buf = Buffer.alloc(6144);
          const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
          fs.closeSync(fd);
          const headText = buf.toString('utf-8', 0, bytesRead);
          const wsMatch = headText.match(/Active Workspaces:\s*(?:\\n|\n)-\s*([^\n\\"]+)/);
          if (wsMatch && wsMatch[1]) {
            workspace = path.basename(wsMatch[1].trim());
          }
        }
      } catch {
        // Ignore transcript_full read error
      }

      let model = 'Gemini 4 Argon';
      let lastUserRequest = '';
      let promptDefinedRole = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let createdAt = stat.birthtime.toISOString();
      let currentThinking = '';
      let currentTool = '';

      const parsedSteps: RawAntigravityStep[] = [];
      for (const line of lines) {
        try {
          parsedSteps.push(JSON.parse(line) as RawAntigravityStep);
        } catch {
          // Ignore malformed line
        }
      }
      if (parsedSteps.length === 0) return false;

      const spawnedInThisSession: string[] = [];

      for (let idx = 0; idx < parsedSteps.length; idx++) {
        const step = parsedSteps[idx];

        if (step.created_at && step.step_index === 0) {
          createdAt = step.created_at;
        }
        if (typeof step.input_tokens === 'number') {
          inputTokens += step.input_tokens + (step.cache_read_tokens || 0);
        }
        if (typeof step.output_tokens === 'number') {
          outputTokens += step.output_tokens;
        }

        if (step.type === 'USER_INPUT' && step.content) {
          const req = extractUserRequest(step.content);
          if (req) {
            lastUserRequest = req;
            if (idx === 0) {
              const roleMatch =
                req.match(/당신은\s*\*\*([^*]+)\*\*/) ||
                req.match(/\[(사원[^\]]+)\]/) ||
                req.match(/Role:\s*([^\n]+)/i);
              if (roleMatch && roleMatch[1]) {
                promptDefinedRole = roleMatch[1].trim();
              }
            }
          }
          const mod = extractModelSelection(step.content);
          if (mod) model = mod;
        }

        if (step.thinking) {
          const headline = extractThinkingHeadline(step.thinking);
          if (headline) currentThinking = headline;
        }

        if (step.tool_calls && step.tool_calls.length > 0) {
          const lastCall = step.tool_calls[step.tool_calls.length - 1];
          currentTool = lastCall.name;

          for (const call of step.tool_calls) {
            if (!workspace && call.args) {
              const rawPath =
                cleanArgValue(call.args.Path) ||
                cleanArgValue(call.args.CommandLine);
              const wsFromPath = rawPath.match(
                /\/Users\/[^/]+\/(?:Documents\/antigravity|IdeaProjects|Projects|workspace)\/([^/"'\s]+)/
              );
              if (wsFromPath && wsFromPath[1]) {
                workspace = wsFromPath[1].trim();
              }
            }

            if (call.name === 'invoke_subagent' && call.args) {
              const subRole = cleanArgValue(call.args.Role);
              const subType = cleanArgValue(call.args.TypeName);
              const nextStep = parsedSteps[idx + 1];
              if (nextStep?.content) {
                const cidMatch = nextStep.content.match(
                  /"conversationId"\s*:\s*"([0-9a-f-]+)"/
                );
                if (cidMatch && cidMatch[1]) {
                  const subId = cidMatch[1];
                  spawnedInThisSession.push(subId);
                  this.agySubagentMeta.set(subId, {
                    name: subRole || subType || `subagent-${subId.slice(0, 4)}`,
                    role: subType ? `Subagent (${subType})` : 'Antigravity Subagent',
                    killed: false,
                  });
                }
              }
            } else if (call.name === 'manage_subagents' && call.args) {
              const action = cleanArgValue(call.args.Action);
              const nextStep = parsedSteps[idx + 1];
              if (
                (action === 'kill_all' || action === 'kill') &&
                nextStep?.content?.includes('Successfully killed')
              ) {
                for (const subId of spawnedInThisSession) {
                  const meta = this.agySubagentMeta.get(subId);
                  if (meta) meta.killed = true;
                }
              }
            }
          }
        }

        if (step.type === 'GENERIC' && step.content) {
          const listMatch = step.content.match(
            /You have \d+ active subagent\(s\):\s*(\[[\s\S]*?\])/
          );
          if (listMatch && listMatch[1]) {
            try {
              const arr = JSON.parse(listMatch[1]) as Array<{
                role?: string;
                type?: string;
                conversationId?: string;
              }>;
              for (const item of arr) {
                if (item.conversationId) {
                  spawnedInThisSession.push(item.conversationId);
                  this.agySubagentMeta.set(item.conversationId, {
                    name: item.role || item.type || item.conversationId.slice(0, 8),
                    role: item.type ? `Subagent (${item.type})` : 'Antigravity Subagent',
                    killed: false,
                  });
                }
              }
            } catch {
              // Ignore JSON parse error
            }
          }
        }
      }

      const subMeta = this.agySubagentMeta.get(convId);
      const isSubagent = Boolean(subMeta || promptDefinedRole);
      if (subMeta?.killed) {
        if (this.agents.has(agentId)) {
          this.agents.delete(agentId);
          return true;
        }
        return false;
      }

      const agentName =
        subMeta?.name ||
        promptDefinedRole ||
        workspace ||
        `agy-${shortId}`;
      const roleLabel =
        subMeta?.role ||
        (promptDefinedRole
          ? 'Antigravity Subagent'
          : workspace
            ? `Antigravity (${workspace})`
            : 'Antigravity Agent');

      let newActivityAdded = false;
      for (let idx = 0; idx < parsedSteps.length; idx++) {
        const step = parsedSteps[idx];
        const stepKey = `${agentId}:${step.step_index ?? idx}`;
        if (!this.seenStepKeys.has(stepKey)) {
          this.seenStepKeys.add(stepKey);
          const activity = this.buildAntigravityActivity(agentId, agentName, step);
          if (activity) {
            this.activities.unshift(activity);
            newActivityAdded = true;
          }
        }
      }

      if (this.activities.length > 80) this.activities.length = 80;

      let lastStepTimeMs = stat.mtimeMs;
      const lastStep = parsedSteps[parsedSteps.length - 1];
      if (lastStep?.created_at) {
        const parsedTs = new Date(lastStep.created_at).getTime();
        if (!Number.isNaN(parsedTs)) {
          lastStepTimeMs = parsedTs;
        }
      }
      const ageMs = Math.max(0, Date.now() - lastStepTimeMs);
      const prevStep = parsedSteps.length > 1 ? parsedSteps[parsedSteps.length - 2] : undefined;

      let status: AgentStatus = 'THINKING';
      let bubbleIcon = '🤔';
      let bubbleText = '생각 중...';

      if (lastStep) {
        if (lastStep.type === 'PLANNER_RESPONSE' && lastStep.tool_calls && lastStep.tool_calls.length > 0) {
          const call = lastStep.tool_calls[lastStep.tool_calls.length - 1];
          const mapped = mapToolToStatus(call.name, call.args);
          status = mapped.status;
          bubbleIcon = mapped.icon;
          bubbleText = mapped.text;
        } else if (lastStep.type === 'GENERIC') {
          if (ageMs < 20000 && prevStep?.tool_calls && prevStep.tool_calls.length > 0) {
            const call = prevStep.tool_calls[prevStep.tool_calls.length - 1];
            const mapped = mapToolToStatus(call.name, call.args);
            status = mapped.status;
            bubbleIcon = mapped.icon;
            bubbleText = mapped.text;
          } else {
            status = 'THINKING';
            bubbleIcon = '🤔';
            bubbleText = currentThinking ? `생각 중: ${currentThinking.slice(0, 24)}` : '다음 작업 계획 중...';
          }
        } else if (lastStep.type === 'USER_INPUT') {
          status = 'THINKING';
          bubbleIcon = '⚡';
          bubbleText = '요청 분석 및 추론 중...';
        } else if (lastStep.type === 'PLANNER_RESPONSE') {
          status = 'WAITING_USER';
          bubbleIcon = '💬';
          bubbleText = '응답 완료 · 다음 지시 대기 중';
        }
      }

      const resolved = this.resolveIdleOrOfflineStatus(ageMs, status, bubbleIcon, bubbleText, isSubagent);
      const prevAgent = this.agents.get(agentId);

      if (resolved.status === 'OFFLINE') {
        if (prevAgent) {
          this.agents.delete(agentId);
          return true;
        }
        return false;
      }

      const nextAgent: AgentInfo = {
        id: agentId,
        name: agentName,
        role: roleLabel,
        model,
        source: 'antigravity',
        office: 'antigravity',
        workspace: workspace || undefined,
        status: resolved.status,
        bubbleIcon: resolved.icon,
        bubbleText: resolved.text,
        lastActiveAt: new Date(lastStepTimeMs).toISOString(),
        createdAt,
        lastUserRequest: lastUserRequest || '새로운 작업 세션',
        currentTool: currentTool || undefined,
        currentThinking: currentThinking || undefined,
        inputTokens,
        outputTokens,
        stepCount: parsedSteps.length,
        deskIndex: prevAgent ? prevAgent.deskIndex : 0,
        avatarSeed: seed,
      };

      const hasChanged =
        newActivityAdded ||
        !prevAgent ||
        prevAgent.name !== nextAgent.name ||
        prevAgent.status !== nextAgent.status ||
        prevAgent.bubbleText !== nextAgent.bubbleText ||
        prevAgent.stepCount !== nextAgent.stepCount;

      this.agents.set(agentId, nextAgent);
      return hasChanged;
    } catch {
      return false;
    }
  }

  private parseClaudeFile(filePath: string): { changed: boolean; agentId?: string } {
    try {
      const stat = fs.statSync(filePath);
      const sessionBase = path.basename(filePath, '.jsonl');
      let agentId = `claude:${sessionBase}`;
      const isSubagentPath =
        filePath.includes(`${path.sep}subagents${path.sep}`) ||
        sessionBase.startsWith('agent-');

      // Check if main session was deleted/released in Claude Desktop
      if (!isSubagentPath) {
        const releasedFile = path.join(
          path.dirname(filePath),
          `${sessionBase}.desktop-released.json`
        );
        if (fs.existsSync(releasedFile)) {
          if (this.agents.has(agentId)) {
            this.agents.delete(agentId);
            return { changed: true };
          }
          return { changed: false };
        }
      }

      // Check companion .meta.json for Claude Code subagents
      let subagentType = '';
      let subagentDesc = '';
      let subagentFinished = false;
      if (isSubagentPath) {
        const metaFile = filePath.replace(/\.jsonl$/, '.meta.json');
        if (fs.existsSync(metaFile)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8')) as {
              agentType?: string;
              description?: string;
              finished?: boolean;
            };
            if (meta.finished === true) {
              subagentFinished = true;
            }
            if (meta.agentType) subagentType = meta.agentType.trim();
            if (meta.description) subagentDesc = meta.description.trim();
          } catch {
            // Ignore meta parse error
          }
        }
      }

      // Check companion <sessionBase>/custom-title.json if present
      let customTitle = '';
      if (!isSubagentPath) {
        const titleFile = path.join(
          path.dirname(filePath),
          sessionBase,
          'custom-title.json'
        );
        if (fs.existsSync(titleFile)) {
          try {
            const parsedTitle = JSON.parse(
              fs.readFileSync(titleFile, 'utf-8')
            ) as { customTitle?: string };
            if (parsedTitle.customTitle) {
              customTitle = parsedTitle.customTitle.trim();
            }
          } catch {
            // Ignore title parse error
          }
        }
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) return { changed: false };

      const cleanId = sessionBase.replace(/^agent-/, '');
      const shortId = cleanId.slice(0, 4);

      const parentDir = path.dirname(filePath);
      const rawDirName =
        path.basename(parentDir) === 'subagents'
          ? path.basename(path.dirname(path.dirname(parentDir)))
          : path.basename(parentDir);
      const parentSessionKey =
        path.basename(parentDir) === 'subagents'
          ? path.basename(path.dirname(parentDir)).slice(0, 8)
          : rawDirName;

      let workspace = rawDirName.startsWith('-')
        ? rawDirName.split('-').filter(Boolean).pop() || rawDirName
        : rawDirName;

      let sessionAgentName = '';
      let customAgentSetting = '';
      let aiTitle = '';
      let slug = '';
      let attributionAgent = '';

      let model = 'Claude Sonnet 4';
      let lastUserRequest = subagentDesc || '';
      let inputTokens = 0;
      let outputTokens = 0;
      let createdAt = stat.birthtime.toISOString();
      let lastEventTimeMs = stat.mtimeMs;
      let isSidechain = isSubagentPath;
      let currentThinking = '';
      let currentTool = '';

      let lastActiveStatus: AgentStatus = 'THINKING';
      let lastBubbleIcon = '🤖';
      let lastBubbleText = 'Claude 작업 중...';
      let stepCount = 0;
      const pendingActivities: Array<
        Omit<ActivityLogItem, 'agentName' | 'agentId'> & { rawStepKey: string }
      > = [];

      for (let i = 0; i < lines.length; i++) {
        try {
          const entry = JSON.parse(lines[i]) as RawClaudeLine;
          stepCount++;

          if (entry.isSidechain) {
            isSidechain = true;
          }
          if (entry.customTitle && entry.customTitle.trim()) {
            customTitle = entry.customTitle.trim();
          }
          if (entry.agentName && entry.agentName.trim()) {
            sessionAgentName = entry.agentName.trim();
          }
          if (
            entry.agentSetting &&
            entry.agentSetting.trim() &&
            entry.agentSetting.trim().toLowerCase() !== 'claude' &&
            entry.agentSetting.trim().toLowerCase() !== 'default'
          ) {
            customAgentSetting = entry.agentSetting.trim();
          }
          if (entry.aiTitle && entry.aiTitle.trim()) {
            aiTitle = entry.aiTitle.trim();
          }
          if (entry.attributionAgent && entry.attributionAgent.trim()) {
            attributionAgent = entry.attributionAgent.trim();
          }
          if (entry.slug && entry.slug.trim()) {
            slug = entry.slug.trim();
          }

          if (entry.timestamp) {
            if (i === 0) createdAt = entry.timestamp;
            const ts = new Date(entry.timestamp).getTime();
            if (!Number.isNaN(ts)) {
              lastEventTimeMs = ts;
            }
          }
          if (entry.cwd) {
            workspace = path.basename(entry.cwd);
          }

          const msg = entry.message;
          if (!msg) continue;

          if (msg.model) {
            model = formatClaudeModelName(msg.model);
          }
          if (msg.usage) {
            inputTokens +=
              (msg.usage.input_tokens || 0) +
              (msg.usage.cache_read_input_tokens || 0) +
              (msg.usage.cache_creation_input_tokens || 0);
            outputTokens += msg.usage.output_tokens || 0;
          }

          if (entry.type === 'user' || msg.role === 'user') {
            if (typeof msg.content === 'string') {
              const cleaned = msg.content.trim().replace(/\s+/g, ' ');
              if (cleaned && !cleaned.startsWith('<')) {
                lastUserRequest = cleaned;
                lastActiveStatus = 'THINKING';
                lastBubbleIcon = '⚡';
                lastBubbleText = '프롬프트 분석 중...';
              }
            } else if (Array.isArray(msg.content)) {
              for (const block of msg.content) {
                if (block.type === 'text' && block.text) {
                  const cleaned = block.text.trim().replace(/\s+/g, ' ');
                  if (cleaned && !cleaned.startsWith('<')) {
                    lastUserRequest = cleaned;
                  }
                }
              }
            }
          } else if (entry.type === 'assistant' || msg.role === 'assistant') {
            if (Array.isArray(msg.content)) {
              let hasToolUse = false;
              for (const block of msg.content) {
                if (block.type === 'thinking' && block.thinking) {
                  currentThinking = extractThinkingHeadline(block.thinking);
                  lastActiveStatus = 'THINKING';
                  lastBubbleIcon = '🤔';
                  lastBubbleText = `생각 중: ${currentThinking.slice(0, 24)}`;
                } else if (block.type === 'tool_use' && block.name) {
                  hasToolUse = true;
                  currentTool = block.name;
                  const mapped = mapToolToStatus(block.name, block.input || {});
                  lastActiveStatus = mapped.status;
                  lastBubbleIcon = mapped.icon;
                  lastBubbleText = mapped.text;

                  const rawStepKey = `${sessionBase}:${i}:${block.name}`;
                  if (!this.seenStepKeys.has(rawStepKey)) {
                    this.seenStepKeys.add(rawStepKey);
                    pendingActivities.push({
                      id: rawStepKey,
                      rawStepKey,
                      source: 'claude',
                      office: 'claude',
                      timestamp: entry.timestamp || new Date(stat.mtimeMs).toISOString(),
                      status: mapped.status,
                      icon: mapped.icon,
                      summary: mapped.text,
                      detail: currentThinking || workspace,
                    });
                  }
                } else if (block.type === 'text' && block.text && !hasToolUse) {
                  lastActiveStatus = 'WAITING_USER';
                  lastBubbleIcon = '💬';
                  lastBubbleText = '응답 완료 · 대기 중';
                }
              }
            }
          }
        } catch {
          // Ignore malformed JSONL line
        }
      }

      const agentName = isSidechain
        ? subagentType ||
          attributionAgent ||
          sessionAgentName ||
          customTitle ||
          `subagent-${shortId}`
        : customTitle ||
          sessionAgentName ||
          customAgentSetting ||
          aiTitle ||
          slug ||
          (workspace ? `${workspace}-${shortId}` : `claude-${shortId}`);

      // Give named subagents a stable ID within their parent session so the same character
      // walks between the desk and the lounge across multiple invocations
      const namedSubRole = subagentType || attributionAgent || sessionAgentName;
      if (isSidechain && namedSubRole) {
        agentId = `claude:sub:${parentSessionKey}:${namedSubRole.toLowerCase()}`;
      }
      const seed = hashString(agentId);

      let newActivityAdded = false;
      for (const act of pendingActivities) {
        this.activities.unshift({
          id: act.id,
          agentId,
          agentName,
          source: act.source,
          office: act.office,
          timestamp: act.timestamp,
          status: act.status,
          icon: act.icon,
          summary: act.summary,
          detail: act.detail,
        });
        newActivityAdded = true;
      }
      if (this.activities.length > 80) this.activities.length = 80;

      const ageMs = Math.max(0, Date.now() - lastEventTimeMs);
      const resolved = this.resolveIdleOrOfflineStatus(
        ageMs,
        lastActiveStatus,
        lastBubbleIcon,
        lastBubbleText,
        isSidechain,
        subagentFinished
      );
      const prevAgent = this.agents.get(agentId);

      if (resolved.status === 'OFFLINE') {
        if (prevAgent) {
          this.agents.delete(agentId);
          return { changed: true };
        }
        return { changed: false };
      }

      const roleLabel = isSidechain
        ? subagentDesc
          ? `Subagent · ${subagentDesc.slice(0, 26)}`
          : `Subagent (${workspace})`
        : workspace
          ? `Claude Code (${workspace})`
          : 'Claude Code Agent';

      const nextAgent: AgentInfo = {
        id: agentId,
        name: agentName,
        role: roleLabel,
        model,
        source: 'claude',
        office: 'claude',
        workspace,
        status: resolved.status,
        bubbleIcon: resolved.icon,
        bubbleText: resolved.text,
        lastActiveAt: new Date(lastEventTimeMs).toISOString(),
        createdAt: prevAgent ? prevAgent.createdAt : createdAt,
        lastUserRequest: lastUserRequest || 'Claude Code 프로젝트 세션',
        currentTool: currentTool || undefined,
        currentThinking: currentThinking || undefined,
        inputTokens,
        outputTokens,
        stepCount,
        deskIndex: prevAgent ? prevAgent.deskIndex : 0,
        avatarSeed: seed,
      };

      const hasChanged =
        newActivityAdded ||
        !prevAgent ||
        prevAgent.name !== nextAgent.name ||
        prevAgent.status !== nextAgent.status ||
        prevAgent.bubbleText !== nextAgent.bubbleText ||
        prevAgent.stepCount !== nextAgent.stepCount;

      this.agents.set(agentId, nextAgent);
      return { changed: hasChanged, agentId };
    } catch {
      return { changed: false };
    }
  }

  private buildAntigravityActivity(
    agentId: string,
    agentName: string,
    step: RawAntigravityStep
  ): ActivityLogItem | null {
    const timestamp = step.created_at || new Date().toISOString();
    const id = `${agentId}-${step.step_index ?? Math.random()}`;

    if (step.type === 'USER_INPUT' && step.content) {
      const req = extractUserRequest(step.content);
      if (!req) return null;
      return {
        id,
        agentId,
        agentName,
        source: 'antigravity',
        timestamp,
        status: 'THINKING',
        icon: '🗣️',
        summary: '사용자 요청 수신',
        detail: req.slice(0, 100),
      };
    }

    if (step.type === 'PLANNER_RESPONSE') {
      if (step.tool_calls && step.tool_calls.length > 0) {
        const call = step.tool_calls[step.tool_calls.length - 1];
        const mapped = mapToolToStatus(call.name, call.args);
        const headline = step.thinking ? extractThinkingHeadline(step.thinking) : undefined;
        return {
          id,
          agentId,
          agentName,
          source: 'antigravity',
          timestamp,
          status: mapped.status,
          icon: mapped.icon,
          summary: mapped.text,
          detail: headline,
        };
      }
      if (step.content) {
        return {
          id,
          agentId,
          agentName,
          source: 'antigravity',
          timestamp,
          status: 'WAITING_USER',
          icon: '💬',
          summary: '사용자에게 응답 완료',
          detail: step.content.replace(/\s+/g, ' ').slice(0, 90),
        };
      }
    }

    return null;
  }
}
