import React, { useState, useEffect } from 'react';
import { useAgentSocket } from './hooks/useAgentSocket';
import { OfficeCanvas } from './components/OfficeCanvas';
import { AgentDetail } from './components/AgentDetail';
import { ActivityFeed } from './components/ActivityFeed';
import { SettingsModal } from './components/SettingsModal';
import { STATUS_COLORS, STATUS_LABELS } from './components/pixelSprites';
import type { AgentStatus } from './types/agent';

const LEGEND_STATUSES: AgentStatus[] = [
  'CODING',
  'TERMINAL',
  'READING',
  'THINKING',
  'SEARCHING',
  'WAITING_USER',
  'IDLE_LOUNGE',
];

export const App: React.FC = () => {
  const {
    agents,
    activities,
    config,
    connected,
    updateConfig,
    addSimAgent,
    removeSimAgent,
    clearSimAgents,
  } = useAgentSocket();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Auto-select the first real local agent (Antigravity or Claude) when loaded
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      const real = agents.find(
        (a) => a.source === 'antigravity' || a.source === 'claude'
      );
      setSelectedAgentId(real ? real.id : agents[0].id);
    } else if (
      selectedAgentId &&
      agents.length > 0 &&
      !agents.some((a) => a.id === selectedAgentId)
    ) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) || null;

  const agyCount = agents.filter(
    (a) => a.source === 'antigravity' && a.status !== 'OFFLINE'
  ).length;
  const claudeCount = agents.filter(
    (a) => a.source === 'claude' && a.status !== 'OFFLINE'
  ).length;
  const simCount = agents.filter(
    (a) => a.source === 'simulation' && a.status !== 'OFFLINE'
  ).length;
  const totalTokens = agents
    .filter((a) => a.status !== 'OFFLINE')
    .reduce((sum, a) => sum + a.inputTokens + a.outputTokens, 0);

  return (
    <div className="app-shell">
      {/* Top HUD Header */}
      <header className="hud-header">
        <div className="brand-group">
          <div className="brand-logo">🏢</div>
          <div>
            <h1 className="brand-title">AGENT OFFICE MONITOR</h1>
            <p className="brand-subtitle">
              Antigravity & Claude Code Real-time 2D Pixel Office
            </p>
          </div>
          <div className={`ws-status-pill ${connected ? 'online' : 'offline'}`}>
            <span className="pulse-dot" />
            {connected ? 'LIVE SYNC' : 'CONNECTING...'}
          </div>
        </div>

        <div className="hud-metrics">
          <div className="hud-stat">
            <span className="hud-stat-label">Antigravity</span>
            <span className="hud-stat-value highlight-gold">{agyCount}명</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">Claude Code</span>
            <span className="hud-stat-value highlight-claude">{claudeCount}명</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">시뮬레이션</span>
            <span className="hud-stat-value highlight-cyan">{simCount}명</span>
          </div>
          <div className="hud-stat">
            <span className="hud-stat-label">총 처리 토큰</span>
            <span className="hud-stat-value">
              {(totalTokens / 1000).toFixed(1)}k
            </span>
          </div>
        </div>

        <div className="hud-controls">
          <button
            type="button"
            className="sim-btn settings-trigger-btn"
            onClick={() => setSettingsOpen(true)}
            title="Claude Code 및 Antigravity 연동 설정 열기"
          >
            ⚙️ 연동 설정
          </button>
          <button
            type="button"
            className="sim-btn primary"
            onClick={() => addSimAgent('antigravity')}
            title="Antigravity 사무실에 가상 에이전트를 출근시킵니다"
          >
            + AGY 출근
          </button>
          <button
            type="button"
            className="sim-btn claude-btn"
            onClick={() => addSimAgent('claude')}
            title="Claude Code 사무실에 가상 에이전트를 출근시킵니다"
          >
            + Claude 출근
          </button>
          <button
            type="button"
            className="sim-btn"
            onClick={removeSimAgent}
            disabled={simCount === 0}
            title="가상 에이전트 1명을 퇴근시킵니다"
          >
            - 퇴근
          </button>
          {simCount > 0 && (
            <button
              type="button"
              className="sim-btn ghost"
              onClick={clearSimAgents}
              title="모든 시뮬레이션 에이전트를 비우고 실제 로컬 에이전트만 표시합니다"
            >
              실제 세션만
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area: Pixel Office Left + Live Panel Right */}
      <main className="workspace-main">
        <section className="office-viewport-column">
          <OfficeCanvas
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />

          {/* Status Legend Bar */}
          <div className="office-legend-bar">
            <span className="legend-title">상태 범례:</span>
            {LEGEND_STATUSES.map((st) => (
              <div key={st} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: STATUS_COLORS[st] }}
                />
                <span className="legend-label">{STATUS_LABELS[st]}</span>
              </div>
            ))}
            <span className="legend-tip">
              💡 우측 상단 <strong>⚙️ 연동 설정</strong>에서 Claude Code 경로 및 출근 유지 시간을 조정할 수 있습니다.
            </span>
          </div>
        </section>

        <aside className="telemetry-sidebar">
          <AgentDetail
            agents={agents}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgentId}
          />
          <ActivityFeed
            activities={activities}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />
        </aside>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={updateConfig}
        agyCount={agyCount}
        claudeCount={claudeCount}
      />
    </div>
  );
};

export default App;
