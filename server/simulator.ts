import type { AgentInfo, AgentStatus, ActivityLogItem, OfficeRoom } from './types';

interface SimPreset {
  name: string;
  role: string;
  model: string;
  office: OfficeRoom;
  request: string;
  seed: number;
}

const SIM_PRESETS: SimPreset[] = [
  {
    name: 'Aria-fe01',
    role: 'Frontend Architect',
    model: 'Gemini 4 Argon',
    office: 'antigravity',
    request: '대시보드 차트 렌더링 최적화 및 다크모드 컬러 토큰 정리',
    seed: 101,
  },
  {
    name: 'Sonnet-be02',
    role: 'Claude Backend Dev',
    model: 'Claude Sonnet 4',
    office: 'claude',
    request: 'WebSocket 스트리밍 파이프라인 메모리 누수 패치 및 유닛 테스트',
    seed: 204,
  },
  {
    name: 'Zoe-qa03',
    role: 'Security & QA Agent',
    model: 'Gemini 3.8 Flash',
    office: 'antigravity',
    request: 'E2E 통합 테스트 시나리오 실행 및 API 인증 미들웨어 검증',
    seed: 309,
  },
  {
    name: 'Opus-arch04',
    role: 'Claude System Architect',
    model: 'Claude Opus 4',
    office: 'claude',
    request: 'PostgreSQL 인덱스 튜닝 및 멀티 에이전트 이벤트 버스 리팩토링',
    seed: 415,
  },
  {
    name: 'Maya-ml05',
    role: 'AI Research Agent',
    model: 'Gemini 4 Argon',
    office: 'antigravity',
    request: '벡터 임베딩 청킹 전략 벤치마크 실험 및 리포트 생성',
    seed: 522,
  },
  {
    name: 'Haiku-ops06',
    role: 'Claude DevOps Agent',
    model: 'Claude Haiku',
    office: 'claude',
    request: 'CI/CD 워크플로우 캐싱 최적화 및 컨테이너 이미지 경량화',
    seed: 631,
  },
];

const SIM_ACTIONS: Array<{
  status: AgentStatus;
  icon: string;
  text: string;
  tool?: string;
  thinking?: string;
}> = [
  {
    status: 'CODING',
    icon: '✏️',
    text: '코드 수정: OfficeCanvas.tsx',
    tool: 'edit_file',
    thinking: 'Refining pixel sprite animation frames',
  },
  {
    status: 'TERMINAL',
    icon: '💻',
    text: '터미널: npm run test:unit',
    tool: 'run_command',
    thinking: 'Running unit test suite to verify changes',
  },
  {
    status: 'READING',
    icon: '📖',
    text: '탐색/읽기: schema.prisma',
    tool: 'read_file',
    thinking: 'Inspecting database relations and indexes',
  },
  {
    status: 'THINKING',
    icon: '🤔',
    text: '생각 중: 아키텍처 의존성 분석',
    thinking: 'Evaluating state synchronization edge cases',
  },
  {
    status: 'SEARCHING',
    icon: '🔍',
    text: '검색 중: Canvas 2D pixel rendering',
    tool: 'search_web',
    thinking: 'Checking MDN docs for imageSmoothingEnabled',
  },
  {
    status: 'CODING',
    icon: '✏️',
    text: '파일 작성: useWebSocket.ts',
    tool: 'write_file',
    thinking: 'Implementing auto-reconnect hook with backoff',
  },
  {
    status: 'IDLE_LOUNGE',
    icon: '☕',
    text: '휴게실에서 커피 마시며 대기 중',
    thinking: 'Waiting for next task assignment in lounge',
  },
  {
    status: 'WAITING_USER',
    icon: '💬',
    text: 'PR 리뷰 및 피드백 대기 중',
    thinking: 'Completed implementation, awaiting user review',
  },
];

export class AgentSimulator {
  private simAgents: Map<string, AgentInfo> = new Map();
  private simActivities: ActivityLogItem[] = [];
  private timer?: NodeJS.Timeout;
  private onUpdate?: () => void;
  private counter = 0;

  constructor(onUpdate?: () => void) {
    this.onUpdate = onUpdate;
  }

  public start(): void {
    // Do not auto-seed fake agents on startup so each office only shows real sessions
    // unless the user explicitly clicks "+ AGY 출근" or "+ Claude 출근".
    this.timer = setInterval(() => {
      this.tick();
    }, 4500);
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  public getAgents(): AgentInfo[] {
    return Array.from(this.simAgents.values());
  }

  public getActivities(): ActivityLogItem[] {
    return this.simActivities;
  }

  public addSimulatedAgent(preferredOffice?: OfficeRoom): AgentInfo {
    const office: OfficeRoom = preferredOffice || 'antigravity';
    const matchingPresets = SIM_PRESETS.filter((p) => p.office === office);
    const sameOfficeCount = Array.from(this.simAgents.values()).filter(
      (a) => a.office === office
    ).length;
    const preset =
      matchingPresets[sameOfficeCount % matchingPresets.length] || SIM_PRESETS[0];
    const uniqueSuffix =
      sameOfficeCount >= matchingPresets.length ? `-${sameOfficeCount + 1}` : '';
    const id = `sim-agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const action = SIM_ACTIONS[this.simAgents.size % SIM_ACTIONS.length];

    const agent: AgentInfo = {
      id,
      name: `${preset.name}${uniqueSuffix}`,
      role: preset.role,
      model: office === 'claude' && !preset.model.includes('Claude') ? 'Claude Sonnet 4' : preset.model,
      source: 'simulation',
      office,
      status: action.status,
      bubbleIcon: action.icon,
      bubbleText: action.text,
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      lastUserRequest: preset.request,
      currentTool: action.tool,
      currentThinking: action.thinking,
      inputTokens: 12400 + Math.floor(Math.random() * 8000),
      outputTokens: 1850 + Math.floor(Math.random() * 1500),
      stepCount: 6 + Math.floor(Math.random() * 12),
      deskIndex: 0,
      avatarSeed: preset.seed + this.simAgents.size * 17,
    };

    this.simAgents.set(id, agent);
    this.recordActivity(
      agent,
      '👋',
      `${office === 'claude' ? 'Claude Code' : 'Antigravity'} 사무실에 출근했습니다`,
      preset.request
    );
    if (this.onUpdate) this.onUpdate();
    return agent;
  }

  public removeSimulatedAgent(): boolean {
    const keys = Array.from(this.simAgents.keys());
    if (keys.length === 0) return false;
    const lastKey = keys[keys.length - 1];
    const removed = this.simAgents.get(lastKey);
    this.simAgents.delete(lastKey);
    if (removed) {
      this.recordActivity(removed, '🚪', '작업을 마치고 퇴근했습니다');
    }
    if (this.onUpdate) this.onUpdate();
    return true;
  }

  public clearSimulatedAgents(): void {
    this.simAgents.clear();
    if (this.onUpdate) this.onUpdate();
  }

  private tick(): void {
    if (this.simAgents.size === 0) return;
    const agents = Array.from(this.simAgents.values());
    const target = agents[this.counter % agents.length];
    this.counter++;

    const nextAction = SIM_ACTIONS[Math.floor(Math.random() * SIM_ACTIONS.length)];
    target.status = nextAction.status;
    target.bubbleIcon = nextAction.icon;
    target.bubbleText = nextAction.text;
    target.currentTool = nextAction.tool;
    target.currentThinking = nextAction.thinking;
    target.lastActiveAt = new Date().toISOString();
    target.inputTokens += Math.floor(Math.random() * 900) + 200;
    target.outputTokens += Math.floor(Math.random() * 220) + 40;
    target.stepCount += 1;

    this.recordActivity(target, nextAction.icon, nextAction.text, nextAction.thinking);

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  private recordActivity(
    agent: AgentInfo,
    icon: string,
    summary: string,
    detail?: string
  ): void {
    this.simActivities.unshift({
      id: `sim-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      agentId: agent.id,
      agentName: agent.name,
      source: 'simulation',
      office: agent.office,
      timestamp: new Date().toISOString(),
      status: agent.status,
      icon,
      summary,
      detail,
      isSimulated: true,
    });
    if (this.simActivities.length > 50) {
      this.simActivities.length = 50;
    }
  }
}
