import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  AgentInfo,
  ActivityLogItem,
  MonitorConfig,
  OfficeRoom,
  OfficeSnapshot,
} from '../types/agent';

const DEFAULT_CONFIG: MonitorConfig = {
  enableAntigravity: true,
  antigravityPath: '~/.gemini/antigravity/brain',
  enableClaude: true,
  claudePath: '~/.claude/projects',
  enableSimulation: false,
  idleLoungeMinutes: 2,
  activeWindowMinutes: 15,
};

export function useAgentSocket() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [config, setConfig] = useState<MonitorConfig>(DEFAULT_CONFIG);
  const [connected, setConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  const applySnapshot = useCallback((snapshot: OfficeSnapshot) => {
    if (!snapshot) return;
    setAgents(snapshot.agents || []);
    setActivities(snapshot.activities || []);
    if (snapshot.config) {
      setConfig(snapshot.config);
    }
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshot');
      if (res.ok) {
        const data = (await res.json()) as OfficeSnapshot;
        applySnapshot(data);
      }
    } catch {
      // Ignore fetch errors during reconnect
    }
  }, [applySnapshot]);

  useEffect(() => {
    fetchSnapshot();

    let reconnectTimer: number | undefined;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isUnmounted) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SNAPSHOT' && msg.payload) {
            applySnapshot(msg.payload);
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          setConnected(false);
          reconnectTimer = window.setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [applySnapshot, fetchSnapshot]);

  const updateConfig = useCallback(
    async (partial: Partial<MonitorConfig>) => {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snapshot) applySnapshot(data.snapshot);
      }
    },
    [applySnapshot]
  );

  const addSimAgent = useCallback(
    async (office?: OfficeRoom) => {
      const res = await fetch('/api/sim/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.snapshot) applySnapshot(data.snapshot);
      }
    },
    [applySnapshot]
  );

  const removeSimAgent = useCallback(async () => {
    const res = await fetch('/api/sim/remove', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.snapshot) applySnapshot(data.snapshot);
    }
  }, [applySnapshot]);

  const clearSimAgents = useCallback(async () => {
    const res = await fetch('/api/sim/clear', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.snapshot) applySnapshot(data.snapshot);
    }
  }, [applySnapshot]);

  return {
    agents,
    activities,
    config,
    connected,
    updateConfig,
    addSimAgent,
    removeSimAgent,
    clearSimAgents,
  };
}
