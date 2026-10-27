import React, { useState, useEffect } from 'react';
import type { MonitorConfig } from '../types/agent';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MonitorConfig;
  onSaveConfig: (next: Partial<MonitorConfig>) => Promise<void>;
  agyCount: number;
  claudeCount: number;
}

const CLAUDE_HOOK_SNIPPET = `{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://127.0.0.1:5173/api/hook/claude -H 'Content-Type: application/json' -d @- > /dev/null 2>&1 || true"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://127.0.0.1:5173/api/hook/claude -H 'Content-Type: application/json' -d '{\\"hook_event_name\\":\\"Stop\\"}' > /dev/null 2>&1 || true"
          }
        ]
      }
    ]
  }
}`;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  agyCount,
  claudeCount,
}) => {
  const [form, setForm] = useState<MonitorConfig>(config);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setForm(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSaveConfig(form);
    setSaving(false);
    onClose();
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(CLAUDE_HOOK_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerClaudeTest = async () => {
    await fetch('/api/hook/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'claude-live-demo',
        hook_event_name: 'PreToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: 'src/App.tsx' },
        cwd: '/Users/jgbae/Documents/antigravity/jolly-planck',
        prompt: 'Claude Code 실시간 연동 테스트 작업 수행 중',
      }),
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">⚙️ 에이전트 연동 및 사무실 설정</h2>
            <p className="modal-subtitle">
              Claude Code, Antigravity 로컬 로그 경로 및 사무실 출퇴근 규칙을 설정합니다.
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {/* 1. Claude Code Integration Card */}
          <div className="settings-card claude-card">
            <div className="settings-card-header">
              <div className="source-title-group">
                <span className="source-badge claude">CLAUDE CODE</span>
                <span className="source-card-title">Claude Code 로컬 세션 & Hook 연동</span>
                <span className="detected-pill">현재 {claudeCount}명 출근</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.enableClaude}
                  onChange={(e) =>
                    setForm({ ...form, enableClaude: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="settings-field">
              <label>Claude 프로젝트 로그 경로 (자동 스캔)</label>
              <input
                type="text"
                value={form.claudePath}
                onChange={(e) =>
                  setForm({ ...form, claudePath: e.target.value })
                }
                placeholder="~/.claude/projects"
                disabled={!form.enableClaude}
              />
              <span className="field-hint">
                기본값 <code>~/.claude/projects</code> 하위의 <code>*.jsonl</code> 세션 로그를 자동으로 실시간 감시합니다.
              </span>
            </div>

            <div className="hook-guide-box">
              <div className="hook-guide-header">
                <span>⚡ <strong>(선택) Claude Code 실시간 Hook 연동</strong> — <code>~/.claude/settings.json</code></span>
                <div className="hook-action-btns">
                  <button
                    type="button"
                    className="mini-btn test"
                    onClick={handleTriggerClaudeTest}
                  >
                    {testSent ? '✓ Claude 출근 신호 전송됨!' : '🧪 Claude 에이전트 테스트 호출'}
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    onClick={handleCopySnippet}
                  >
                    {copied ? '✓ 복사됨' : '📋 설정 JSON 복사'}
                  </button>
                </div>
              </div>
              <pre className="hook-code-preview">{CLAUDE_HOOK_SNIPPET}</pre>
            </div>
          </div>

          {/* 2. Antigravity Integration Card */}
          <div className="settings-card agy-card">
            <div className="settings-card-header">
              <div className="source-title-group">
                <span className="source-badge agy">ANTIGRAVITY</span>
                <span className="source-card-title">Antigravity 로컬 세션 연동</span>
                <span className="detected-pill">현재 {agyCount}명 출근</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.enableAntigravity}
                  onChange={(e) =>
                    setForm({ ...form, enableAntigravity: e.target.checked })
                  }
                />
                <span className="toggle-slider" />
              </label>
            </div>

            <div className="settings-field">
              <label>Antigravity Brain 로그 경로</label>
              <input
                type="text"
                value={form.antigravityPath}
                onChange={(e) =>
                  setForm({ ...form, antigravityPath: e.target.value })
                }
                placeholder="~/.gemini/antigravity/brain"
                disabled={!form.enableAntigravity}
              />
            </div>
          </div>

          {/* 3. Office Behavior & Timers */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="source-title-group">
                <span className="source-card-title">🕒 사무실 휴식/퇴근 시간 및 시뮬레이션</span>
              </div>
              <label className="toggle-checkbox-inline">
                <input
                  type="checkbox"
                  checked={form.enableSimulation}
                  onChange={(e) =>
                    setForm({ ...form, enableSimulation: e.target.checked })
                  }
                />
                <span>시뮬레이션 동료 표시</span>
              </label>
            </div>

            <div className="settings-grid-two">
              <div className="settings-field">
                <label>휴게실(Break Lounge) 이동 기준 (분)</label>
                <div className="preset-row">
                  {[1, 2, 5, 15].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`preset-chip ${
                        form.idleLoungeMinutes === m ? 'active' : ''
                      }`}
                      onClick={() =>
                        setForm({ ...form, idleLoungeMinutes: m })
                      }
                    >
                      {m}분
                    </button>
                  ))}
                </div>
                <span className="field-hint">
                  마지막 작업 후 {form.idleLoungeMinutes}분이 지나면 커피 라운지로 이동합니다.
                </span>
              </div>

              <div className="settings-field">
                <label>사무실 출근 유지 시간 (비활성 세션 자동 퇴근)</label>
                <div className="preset-row">
                  {[
                    { label: '5분', val: 5 },
                    { label: '15분', val: 15 },
                    { label: '30분', val: 30 },
                    { label: '2시간', val: 120 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      className={`preset-chip ${
                        form.activeWindowMinutes === item.val ? 'active' : ''
                      }`}
                      onClick={() =>
                        setForm({ ...form, activeWindowMinutes: item.val })
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <span className="field-hint">
                  마지막 이벤트 이후 {form.activeWindowMinutes}분이 지난 세션은 자동으로 퇴근(목록 제외) 처리됩니다.
                </span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="sim-btn ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="sim-btn primary" disabled={saving}>
              {saving ? '적용 중...' : '설정 저장 및 즉시 스캔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
