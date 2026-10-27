import React, { useState } from 'react';
import type { ActivityLogItem } from '../types/agent';
import { STATUS_COLORS } from './pixelSprites';

interface ActivityFeedProps {
  activities: ActivityLogItem[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  selectedAgentId,
  onSelectAgent,
}) => {
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);

  const displayed =
    filterSelectedOnly && selectedAgentId
      ? activities.filter((a) => a.agentId === selectedAgentId)
      : activities;

  return (
    <div className="panel-section activity-feed-section">
      <div className="section-header">
        <span className="section-title">⚡ 실시간 작업 로그 (Activity Feed)</span>
        <div className="feed-filter-group">
          <button
            type="button"
            className={`filter-btn ${!filterSelectedOnly ? 'active' : ''}`}
            onClick={() => setFilterSelectedOnly(false)}
          >
            전체 ({activities.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${filterSelectedOnly ? 'active' : ''}`}
            onClick={() => setFilterSelectedOnly(true)}
            disabled={!selectedAgentId}
          >
            선택 에이전트만
          </button>
        </div>
      </div>

      <div className="activity-list">
        {displayed.length === 0 ? (
          <div className="empty-feed">표시할 실시간 활동 내역이 없습니다.</div>
        ) : (
          displayed.map((item) => {
            const color = STATUS_COLORS[item.status] || '#94a3b8';
            const isSelected = item.agentId === selectedAgentId;

            return (
              <div
                key={item.id}
                className={`activity-item ${isSelected ? 'highlighted' : ''}`}
                onClick={() => onSelectAgent(item.agentId)}
              >
                <div
                  className="activity-status-bar"
                  style={{ backgroundColor: color }}
                />
                <div className="activity-content">
                  <div className="activity-meta">
                    <span className="activity-agent-name" style={{ color }}>
                      {item.agentName}
                    </span>
                    {item.source === 'claude' && (
                      <span className="activity-real-tag claude">CLAUDE</span>
                    )}
                    {item.source === 'antigravity' && (
                      <span className="activity-real-tag agy">AGY</span>
                    )}
                    <span className="activity-time">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="activity-summary">
                    <span className="activity-icon">{item.icon}</span>
                    <span>{item.summary}</span>
                  </div>
                  {item.detail && (
                    <div className="activity-detail">{item.detail}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
