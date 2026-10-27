import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { MultiAgentLogWatcher } from './logWatcher';
import { AgentSimulator } from './simulator';
import type { AgentInfo, MonitorConfig, OfficeSnapshot } from './types';

const CONFIG_FILE = path.resolve(process.cwd(), '.office-config.json');

const DEFAULT_CONFIG: MonitorConfig = {
  enableAntigravity: true,
  antigravityPath: '~/.gemini/antigravity/brain',
  enableClaude: true,
  claudePath: '~/.claude/projects',
  enableSimulation: false,
  idleLoungeMinutes: 2,
  activeWindowMinutes: 15,
};

function loadConfig(): MonitorConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Fallback to default
  }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(config: MonitorConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Ignore write error
  }
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export class OfficeMonitorServer {
  private config: MonitorConfig;
  private watcher: MultiAgentLogWatcher;
  private simulator: AgentSimulator;
  private wss: WebSocketServer;
  private deskAssignments: Map<string, number> = new Map();

  constructor() {
    this.config = loadConfig();
    this.wss = new WebSocketServer({ noServer: true });
    const broadcast = () => this.broadcastSnapshot();
    this.watcher = new MultiAgentLogWatcher(this.config, broadcast);
    this.simulator = new AgentSimulator(broadcast);

    this.wss.on('connection', (ws: WebSocket) => {
      ws.send(JSON.stringify({ type: 'SNAPSHOT', payload: this.buildSnapshot() }));
    });
  }

  public start(): void {
    this.watcher.start();
    this.simulator.start();
  }

  public stop(): void {
    this.watcher.stop();
    this.simulator.stop();
  }

  public buildSnapshot(): OfficeSnapshot {
    const realAgents = this.watcher.getAgents();
    const simAgents = this.config.enableSimulation ? this.simulator.getAgents() : [];

    // Sort real agents by most recently active first
    realAgents.sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );

    const allAgents: AgentInfo[] = [...realAgents, ...simAgents];

    // Assign stable desk indices independently per office ('antigravity' vs 'claude')
    const activeIds = new Set(
      allAgents
        .filter((a) => a.status !== 'OFFLINE' && a.status !== 'IDLE_LOUNGE')
        .map((a) => a.id)
    );

    for (const [id] of this.deskAssignments) {
      if (!activeIds.has(id)) {
        this.deskAssignments.delete(id);
      }
    }

    for (const officeRoom of ['antigravity', 'claude'] as const) {
      const roomAgents = allAgents.filter((a) => a.office === officeRoom);
      const usedDesks = new Set<number>();

      for (const a of roomAgents) {
        const existingDesk = this.deskAssignments.get(a.id);
        if (existingDesk !== undefined) {
          usedDesks.add(existingDesk);
        }
      }

      for (const agent of roomAgents) {
        if (agent.status === 'OFFLINE' || agent.status === 'IDLE_LOUNGE') {
          agent.deskIndex = -1;
        } else {
          let desk = this.deskAssignments.get(agent.id);
          if (desk === undefined) {
            desk = 0;
            while (usedDesks.has(desk)) {
              desk++;
            }
            this.deskAssignments.set(agent.id, desk);
            usedDesks.add(desk);
          }
          agent.deskIndex = desk;
        }
      }
    }

    const simActivities = this.config.enableSimulation
      ? this.simulator.getActivities()
      : [];

    const allActivities = [...this.watcher.getActivities(), ...simActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 60);

    const antigravitySessions = realAgents.filter(
      (a) => a.source === 'antigravity' && a.status !== 'OFFLINE'
    ).length;
    const claudeSessions = realAgents.filter(
      (a) => a.source === 'claude' && a.status !== 'OFFLINE'
    ).length;
    const simSessions = simAgents.filter((a) => a.status !== 'OFFLINE').length;

    return {
      agents: allAgents,
      activities: allActivities,
      config: this.config,
      stats: {
        antigravitySessions,
        claudeSessions,
        simSessions,
      },
      serverTime: new Date().toISOString(),
    };
  }

  public broadcastSnapshot(): void {
    const message = JSON.stringify({
      type: 'SNAPSHOT',
      payload: this.buildSnapshot(),
    });
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  public handleApiRequest(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url || '';
    if (!url.startsWith('/api/')) return false;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (url === '/api/snapshot' && req.method === 'GET') {
      res.end(JSON.stringify(this.buildSnapshot()));
      return true;
    }

    if (url === '/api/config' && req.method === 'POST') {
      readJsonBody(req).then((body) => {
        this.config = {
          ...this.config,
          enableAntigravity:
            typeof body.enableAntigravity === 'boolean'
              ? body.enableAntigravity
              : this.config.enableAntigravity,
          antigravityPath:
            typeof body.antigravityPath === 'string' && body.antigravityPath.trim()
              ? body.antigravityPath.trim()
              : this.config.antigravityPath,
          enableClaude:
            typeof body.enableClaude === 'boolean'
              ? body.enableClaude
              : this.config.enableClaude,
          claudePath:
            typeof body.claudePath === 'string' && body.claudePath.trim()
              ? body.claudePath.trim()
              : this.config.claudePath,
          enableSimulation:
            typeof body.enableSimulation === 'boolean'
              ? body.enableSimulation
              : this.config.enableSimulation,
          idleLoungeMinutes:
            typeof body.idleLoungeMinutes === 'number'
              ? Math.max(1, body.idleLoungeMinutes)
              : this.config.idleLoungeMinutes,
          activeWindowMinutes:
            typeof body.activeWindowMinutes === 'number'
              ? Math.max(5, body.activeWindowMinutes)
              : this.config.activeWindowMinutes,
        };
        saveConfig(this.config);
        this.watcher.updateConfig(this.config);
        this.broadcastSnapshot();
        res.end(JSON.stringify({ ok: true, snapshot: this.buildSnapshot() }));
      });
      return true;
    }

    if (url === '/api/hook/claude' && req.method === 'POST') {
      readJsonBody(req).then((body) => {
        this.watcher.handleClaudeHookEvent(body);
        res.end(JSON.stringify({ ok: true }));
      });
      return true;
    }

    if (url === '/api/sim/add' && req.method === 'POST') {
      readJsonBody(req).then((body) => {
        if (!this.config.enableSimulation) {
          this.config.enableSimulation = true;
          saveConfig(this.config);
        }
        const preferred =
          body.office === 'claude' || body.office === 'antigravity'
            ? body.office
            : undefined;
        const added = this.simulator.addSimulatedAgent(preferred);
        res.end(
          JSON.stringify({ ok: true, agent: added, snapshot: this.buildSnapshot() })
        );
      });
      return true;
    }

    if (url === '/api/sim/remove' && req.method === 'POST') {
      const removed = this.simulator.removeSimulatedAgent();
      res.end(JSON.stringify({ ok: removed, snapshot: this.buildSnapshot() }));
      return true;
    }

    if (url === '/api/sim/clear' && req.method === 'POST') {
      this.simulator.clearSimulatedAgents();
      res.end(JSON.stringify({ ok: true, snapshot: this.buildSnapshot() }));
      return true;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
    return true;
  }

  public attachToHttpServer(httpServer: HttpServer): void {
    httpServer.on('upgrade', (request, socket, head) => {
      if (request.url === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });
  }
}
