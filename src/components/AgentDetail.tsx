import React from 'react';
import type { AgentInfo } from '../types/agent';
import { STATUS_COLORS, STATUS_LABELS } from './pixelSprites';

interface AgentDetailProps {
  agents: AgentInfo[];
  selectedAgent: AgentInfo | null;
  onSelectAgent: (id: string) => void;
}

export const AgentDetail: React.FC<AgentDetailProps> = ({
  agents,
  selectedAgent,
  onSelectAgent,
}) => {
  const activeAgents = agents.filter((a) => a.status !== 'OFFLINE');

  return (
    <div className="panel-section agent-detail-section">
      <div className="section-header">
        <span className="section-title">👥 출근 에이전트 목록 ({activeAgents.length})</span>
      </div>

      {/* Horizontal Roster Chips */}
      <div className="agent-roster-chips">
        {activeAgents.map((agent) => {
          const isSelected = selectedAgent?.id === agent.id;
          const color = STATUS_COLORS[agent.status];
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              className={`roster-chip ${isSelected ? 'active' : ''}`}
            >
              <span className="chip-dot" style={{ backgroundColor: color }} />
              <span className="chip-name">{agent.name}</span>
              {agent.source === 'antigravity' && (
                <span className="chip-badge-real agy">AGY</span>
              )}
              {agent.source === 'claude' && (
                <span className="chip-badge-real claude">CLAUDE</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detailed Inspector Card */}
      {selectedAgent ? (
        <div className="agent-inspector-card">
          <div className="inspector-top">
            <div>
              <div className="inspector-title-row">
                <h3 className="inspector-name">{selectedAgent.name}</h3>
                <span
                  className="inspector-status-pill"
                  style={{
                    backgroundColor: `${STATUS_COLORS[selectedAgent.status]}22`,
                    color: STATUS_COLORS[selectedAgent.status],
                    borderColor: `${STATUS_COLORS[selectedAgent.status]}66`,
                  }}
                >
                  {selectedAgent.bubbleIcon} {STATUS_LABELS[selectedAgent.status]}
                </span>
              </div>
              <p className="inspector-subtitle">
                {selectedAgent.role} · <strong>{selectedAgent.model}</strong>
              </p>
            </div>
            <span className={`source-tag ${selectedAgent.source}`}>
              {selectedAgent.source === 'antigravity'
                ? '🟢 Antigravity'
                : selectedAgent.source === 'claude'
                ? '🟠 Claude Code'
                : '🧪 시뮬레이션'}
            </span>
          </div>

          <div className="inspector-current-bubble">
            <span className="current-bubble-label">현재 상태</span>
            <div className="current-bubble-value">
              <span>{selectedAgent.bubbleIcon}</span>
              <span>{selectedAgent.bubbleText}</span>
            </div>
          </div>

          {selectedAgent.lastUserRequest && (
            <div className="inspector-field">
              <span className="field-label">최근 할당된 작업 (User Request)</span>
              <p className="field-box">{selectedAgent.lastUserRequest}</p>
            </div>
          )}

          {selectedAgent.currentThinking && (
            <div className="inspector-field">
              <span className="field-label">최근 추론 / 생각 (Thinking)</span>
              <p className="field-box subtle">{selectedAgent.currentThinking}</p>
            </div>
          )}

          <div className="inspector-metrics">
            <div className="metric-box">
              <span className="metric-label">좌석 번호</span>
              <span className="metric-val">
                {selectedAgent.deskIndex >= 0
                  ? `DESK-${selectedAgent.deskIndex + 1}`
                  : 'LOUNGE'}
              </span>
            </div>
            <div className="metric-box">
              <span className="metric-label">실행 스텝</span>
              <span className="metric-val">{selectedAgent.stepCount} steps</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">누적 토큰</span>
              <span className="metric-val">
                {((selectedAgent.inputTokens + selectedAgent.outputTokens) / 1000).toFixed(1)}k
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-inspector">
          사무실 화면에서 에이전트 캐릭터나 말풍선을 클릭하면 상세 작업 내역이 표시됩니다.
        </div>
      )}
    </div>
  );
};
