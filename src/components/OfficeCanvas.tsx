import React, { useEffect, useRef, useState } from 'react';
import type { AgentInfo, OfficeRoom } from '../types/agent';
import {
  drawDualOfficeBackground,
  drawWorkstationDesk,
  drawPixelAgent,
  STATUS_COLORS,
  STATUS_LABELS,
  type AgentMotionPhase,
  type LoungePose,
} from './pixelSprites';

interface OfficeCanvasProps {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
}

interface LoungeSpot {
  x: number;
  y: number;
  pose: LoungePose;
  icon: string;
  text: string;
}

interface AgentPositionState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  office: OfficeRoom;
  phase: AgentMotionPhase;
  phaseTicks: number;
  opacity: number;
  loungeSpotIdx: number;
  loungeSwitchTick: number;
  agentSnapshot: AgentInfo;
}

interface RenderOverlayItem {
  agent: AgentInfo;
  x: number;
  y: number;
  isMoving: boolean;
  phase: AgentMotionPhase;
  opacity: number;
  loungeSpot: LoungeSpot;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

const LOUNGE_SPOTS: LoungeSpot[] = [
  {
    x: 536,
    y: 152,
    pose: 'COFFEE',
    icon: '☕',
    text: '커피 머신에서 아메리카노 내리는 중',
  },
  {
    x: 668,
    y: 152,
    pose: 'WATER',
    icon: '💧',
    text: '정수기에서 시원한 물 마시며 대기 중',
  },
  {
    x: 562,
    y: 268,
    pose: 'SOFA',
    icon: '🛋️',
    text: '소파에 앉아 다음 호출 대기 중',
  },
  {
    x: 620,
    y: 268,
    pose: 'SOFA',
    icon: '🛋️',
    text: '소파에서 편안히 휴식하며 대기 중',
  },
  {
    x: 556,
    y: 422,
    pose: 'CHAT',
    icon: '💬',
    text: '라운지 스툴에서 동료와 담소 중',
  },
  {
    x: 644,
    y: 422,
    pose: 'CHAT',
    icon: '🎵',
    text: '음악 들으며 다음 서브태스크 대기 중',
  },
  {
    x: 535,
    y: 506,
    pose: 'STRETCH',
    icon: '🙆',
    text: '작업 완료 후 시원하게 스트레칭 중',
  },
  {
    x: 652,
    y: 506,
    pose: 'PHONE',
    icon: '📱',
    text: '휴게실에서 기술 문서 읽으며 대기 중',
  },
];

function getRoomOffsetX(office: OfficeRoom): number {
  return office === 'claude' ? 744 : 0;
}

function getDeskCoordinates(
  office: OfficeRoom,
  deskIndex: number
): { x: number; y: number } {
  const roomX = getRoomOffsetX(office);
  const cols = 2;
  const col = deskIndex % cols;
  const row = Math.floor(deskIndex / cols);

  const startX = roomX + 48;
  const startY = 140;
  const gapX = 216;
  const gapY = 160;

  return {
    x: startX + col * gapX,
    y: startY + row * gapY,
  };
}

function getEntranceCoordinates(office: OfficeRoom): { x: number; y: number } {
  const roomX = getRoomOffsetX(office);
  return {
    x: office === 'claude' ? roomX + 374 : roomX + 80,
    y: CANVAS_HEIGHT - 38,
  };
}

function getZone(x: number): 'left' | 'lounge' | 'right' {
  if (x < 462) return 'left';
  if (x > 738) return 'right';
  return 'lounge';
}

/**
 * Routes agents through the open partition doorways (y = 365) when moving
 * between an Office Wing and the Center Shared Lounge.
 */
function computeNextWaypoint(
  x: number,
  y: number,
  destX: number,
  destY: number
): { wx: number; wy: number } {
  const curZone = getZone(x);
  const destZone = getZone(destX);

  if (curZone === destZone) {
    return { wx: destX, wy: destY };
  }

  const doorY = 365;
  // Moving between Left Wing (AGY) and Lounge/Right
  if (curZone === 'left') {
    const doorInsideLeftX = 434;
    const doorInsideLoungeX = 492;
    if (Math.abs(y - doorY) > 18 && x < 454) {
      return { wx: doorInsideLeftX, wy: doorY };
    }
    return { wx: doorInsideLoungeX, wy: doorY };
  }

  // Moving between Right Wing (Claude) and Lounge/Left
  if (curZone === 'right') {
    const doorInsideRightX = 766;
    const doorInsideLoungeX = 708;
    if (Math.abs(y - doorY) > 18 && x > 746) {
      return { wx: doorInsideRightX, wy: doorY };
    }
    return { wx: doorInsideLoungeX, wy: doorY };
  }

  // Currently in Lounge, moving out to Left Wing or Right Wing
  if (destZone === 'left') {
    const doorInsideLoungeX = 492;
    const doorInsideLeftX = 434;
    if (Math.abs(y - doorY) > 18 && x > 470) {
      return { wx: doorInsideLoungeX, wy: doorY };
    }
    return { wx: doorInsideLeftX, wy: doorY };
  } else {
    const doorInsideLoungeX = 708;
    const doorInsideRightX = 766;
    if (Math.abs(y - doorY) > 18 && x < 730) {
      return { wx: doorInsideLoungeX, wy: doorY };
    }
    return { wx: doorInsideRightX, wy: doorY };
  }
}

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const posMapRef = useRef<Map<string, AgentPositionState>>(new Map());
  const agentsRef = useRef<AgentInfo[]>(agents);
  const selectedRef = useRef<string | null>(selectedAgentId);
  const tickRef = useRef<number>(0);

  const [renderOverlay, setRenderOverlay] = useState<RenderOverlayItem[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    selectedRef.current = selectedAgentId;
  }, [selectedAgentId]);

  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const activeAgents = agentsRef.current.filter((a) => a.status !== 'OFFLINE');
      const activeIds = new Set(activeAgents.map((a) => a.id));
      const posMap = posMapRef.current;

      // Track occupied lounge spots so idle agents spread out naturally
      const usedLoungeSpots = new Set<number>();
      for (const [id, st] of posMap.entries()) {
        if (
          activeIds.has(id) &&
          st.agentSnapshot.status === 'IDLE_LOUNGE' &&
          st.loungeSpotIdx >= 0
        ) {
          usedLoungeSpots.add(st.loungeSpotIdx);
        }
      }

      const pickFreeLoungeSpot = (preferredSeed: number, currentIdx = -1): number => {
        for (let offset = 0; offset < LOUNGE_SPOTS.length; offset++) {
          const candidate = (preferredSeed + offset) % LOUNGE_SPOTS.length;
          if (candidate !== currentIdx && !usedLoungeSpots.has(candidate)) {
            usedLoungeSpots.add(candidate);
            return candidate;
          }
        }
        return preferredSeed % LOUNGE_SPOTS.length;
      };

      // 1. Update or spawn active agents
      for (const agent of activeAgents) {
        const office: OfficeRoom =
          agent.office || (agent.source === 'claude' ? 'claude' : 'antigravity');
        const entrance = getEntranceCoordinates(office);
        const isLounge = agent.status === 'IDLE_LOUNGE' || agent.deskIndex < 0;

        let pos = posMap.get(agent.id);
        if (!pos || pos.office !== office) {
          const initialSpotIdx = isLounge
            ? pickFreeLoungeSpot(agent.avatarSeed)
            : agent.avatarSeed % LOUNGE_SPOTS.length;
          const desk = getDeskCoordinates(office, Math.max(0, agent.deskIndex));
          const targetX = isLounge
            ? LOUNGE_SPOTS[initialSpotIdx].x
            : desk.x + 78;
          const targetY = isLounge
            ? LOUNGE_SPOTS[initialSpotIdx].y
            : desk.y + 38;

          // Spawn at office entrance door with Clock-In Greeting ('ARRIVING')
          pos = {
            x: entrance.x,
            y: entrance.y,
            targetX,
            targetY,
            isMoving: false,
            office,
            phase: 'ARRIVING',
            phaseTicks: 68,
            opacity: 1,
            loungeSpotIdx: initialSpotIdx,
            loungeSwitchTick: tick + 540 + (agent.avatarSeed % 240),
            agentSnapshot: agent,
          };
          posMap.set(agent.id, pos);
        } else {
          // If agent was leaving/goodbye and got reactivated, cancel departure
          if (pos.phase === 'LEAVING' || pos.phase === 'GOODBYE') {
            pos.phase = 'NORMAL';
            pos.opacity = 1;
          }
          pos.agentSnapshot = agent;

          if (isLounge) {
            // Periodically stroll to a different lounge activity station
            if (tick >= pos.loungeSwitchTick && !pos.isMoving) {
              usedLoungeSpots.delete(pos.loungeSpotIdx);
              pos.loungeSpotIdx = pickFreeLoungeSpot(
                agent.avatarSeed + Math.floor(tick / 60),
                pos.loungeSpotIdx
              );
              pos.loungeSwitchTick = tick + 580 + ((agent.avatarSeed + tick) % 280);
            }
            const spot = LOUNGE_SPOTS[pos.loungeSpotIdx % LOUNGE_SPOTS.length];
            pos.targetX = spot.x;
            pos.targetY = spot.y;
          } else {
            const desk = getDeskCoordinates(office, agent.deskIndex);
            pos.targetX = desk.x + 78;
            pos.targetY = desk.y + 38;
          }
        }
      }

      // 2. Transition disappeared / OFFLINE agents into 'LEAVING' (walk to exit door)
      for (const [id, pos] of posMap.entries()) {
        if (!activeIds.has(id) && pos.phase !== 'LEAVING' && pos.phase !== 'GOODBYE') {
          const entrance = getEntranceCoordinates(pos.office);
          pos.phase = 'LEAVING';
          pos.targetX = entrance.x;
          pos.targetY = entrance.y;
        }
      }

      // 3. Step movement & animation phases for all tracked agents
      const nextOverlay: RenderOverlayItem[] = [];

      for (const [id, pos] of posMap.entries()) {
        if (pos.phase === 'ARRIVING') {
          pos.isMoving = false;
          pos.phaseTicks -= 1;
          // Smooth scale/fade-in during first 15 ticks
          pos.opacity = Math.min(1, (75 - pos.phaseTicks) / 15);
          if (pos.phaseTicks <= 0) {
            pos.phase = 'NORMAL';
            pos.opacity = 1;
          }
        } else if (pos.phase === 'GOODBYE') {
          pos.isMoving = false;
          pos.phaseTicks -= 1;
          pos.opacity = Math.max(0, pos.phaseTicks / 45);
          if (pos.phaseTicks <= 0) {
            posMap.delete(id);
            continue;
          }
        } else {
          const { wx, wy } = computeNextWaypoint(
            pos.x,
            pos.y,
            pos.targetX,
            pos.targetY
          );
          const dx = wx - pos.x;
          const dy = wy - pos.y;
          const dist = Math.hypot(dx, dy);
          const totalDist = Math.hypot(pos.targetX - pos.x, pos.targetY - pos.y);

          if (totalDist > 2.2) {
            // Leisurely stroll inside lounge, brisk natural walk when commuting
            const isLoungeStroll =
              pos.phase === 'NORMAL' &&
              pos.agentSnapshot.status === 'IDLE_LOUNGE' &&
              getZone(pos.x) === 'lounge' &&
              getZone(pos.targetX) === 'lounge';
            const speed = isLoungeStroll
              ? 1.25
              : Math.min(dist * 0.05 + 1.35, 2.35);
            if (dist > 0.1) {
              pos.x += (dx / dist) * Math.min(speed, dist);
              pos.y += (dy / dist) * Math.min(speed, dist);
            }
            pos.isMoving = true;
          } else {
            pos.x = pos.targetX;
            pos.y = pos.targetY;
            pos.isMoving = false;

            if (pos.phase === 'LEAVING') {
              pos.phase = 'GOODBYE';
              pos.phaseTicks = 45;
            }
          }
        }

        nextOverlay.push({
          agent: pos.agentSnapshot,
          x: pos.x,
          y: pos.y,
          isMoving: pos.isMoving,
          phase: pos.phase,
          opacity: pos.opacity,
          loungeSpot: LOUNGE_SPOTS[pos.loungeSpotIdx % LOUNGE_SPOTS.length],
        });
      }

      // 4. Draw 2D Dual-Office Pixel Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          // 1) Dual Office Background (Left: Antigravity Office, Center: Shared Lounge, Right: Claude Office)
          drawDualOfficeBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, tick);

          // 2) Render Desks independently for each Office Wing
          const offices: OfficeRoom[] = ['antigravity', 'claude'];
          for (const office of offices) {
            const officeAgents = activeAgents.filter(
              (a) =>
                (a.office || (a.source === 'claude' ? 'claude' : 'antigravity')) ===
                office
            );
            const maxAssignedDesk = officeAgents.reduce(
              (max, a) => Math.max(max, a.deskIndex),
              -1
            );
            const totalDesks = Math.max(6, Math.ceil((maxAssignedDesk + 1) / 2) * 2);

            const deskOccupant = new Map<number, AgentInfo>();
            for (const a of officeAgents) {
              if (a.deskIndex >= 0 && a.status !== 'IDLE_LOUNGE') {
                deskOccupant.set(a.deskIndex, a);
              }
            }

            for (let d = 0; d < totalDesks; d++) {
              const coords = getDeskCoordinates(office, d);
              const occupant = deskOccupant.get(d);
              const pos = occupant ? posMap.get(occupant.id) : undefined;
              const isAtDesk =
                occupant && pos && !pos.isMoving && pos.phase === 'NORMAL';

              drawWorkstationDesk(
                ctx,
                coords.x,
                coords.y,
                d,
                office,
                isAtDesk ? occupant.status : null,
                occupant?.source === 'antigravity' || occupant?.source === 'claude',
                occupant?.id === selectedRef.current,
                tick
              );
            }
          }

          // 3) Draw all Pixel Agents (including arriving & departing agents) sorted by Y coordinate
          const sortedOverlay = [...nextOverlay].sort((a, b) => a.y - b.y);

          for (const item of sortedOverlay) {
            drawPixelAgent(
              ctx,
              item.x,
              item.y,
              item.agent.avatarSeed,
              item.agent.status,
              item.isMoving,
              item.agent.source === 'antigravity' || item.agent.source === 'claude',
              tick,
              item.phase,
              item.loungeSpot.pose,
              item.opacity
            );
          }
        }
      }

      if (tick % 3 === 0) {
        setRenderOverlay(nextOverlay);
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="office-stage-wrapper">
      <div
        className="office-canvas-container"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="pixel-canvas"
        />

        {/* Real-time Speech Bubbles & Name Tags Overlay */}
        <div className="speech-bubbles-layer">
          {renderOverlay.map((item) => {
            const { agent, x, y, isMoving, phase, opacity, loungeSpot } = item;
            const isSelected = agent.id === selectedAgentId;
            const isReal = agent.source === 'antigravity' || agent.source === 'claude';
            const office: OfficeRoom =
              agent.office || (agent.source === 'claude' ? 'claude' : 'antigravity');

            let statusColor = STATUS_COLORS[agent.status];
            let statusLabel = STATUS_LABELS[agent.status];
            let bubbleIcon = agent.bubbleIcon;
            let bubbleText = agent.bubbleText;

            if (phase === 'ARRIVING') {
              statusColor = '#4ade80';
              statusLabel = 'CLOCK-IN';
              bubbleIcon = '🙋';
              bubbleText = '출근했습니다! 자리로 이동 준비...';
            } else if (phase === 'LEAVING' || phase === 'GOODBYE') {
              statusColor = '#fbbf24';
              statusLabel = 'CLOCK-OUT';
              bubbleIcon = '👋';
              bubbleText =
                phase === 'GOODBYE'
                  ? '수고하셨습니다! 퇴근합니다!'
                  : '작업 마치고 출입문으로 퇴근 중...';
            } else if (isMoving) {
              statusLabel = 'WALKING';
              bubbleIcon = agent.status === 'IDLE_LOUNGE' ? '🚶' : '🏃';
              bubbleText =
                agent.status === 'IDLE_LOUNGE'
                  ? '휴게실로 이동 중...'
                  : '업무 데스크로 이동 중...';
            } else if (agent.status === 'IDLE_LOUNGE') {
              bubbleIcon = loungeSpot.icon;
              bubbleText = loungeSpot.text;
            }

            return (
              <div
                key={agent.id}
                className={`agent-overlay-anchor ${isSelected ? 'selected' : ''} ${
                  isReal ? 'real-agent' : ''
                } source-${agent.source} office-${office}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  opacity,
                }}
                onClick={() => onSelectAgent(agent.id)}
              >
                {/* Speech Bubble (with Agent Name + Status inside) */}
                <div
                  className="pixel-speech-bubble"
                  style={{ borderColor: isSelected ? statusColor : undefined }}
                >
                  <div className="bubble-header">
                    <span
                      className="status-dot"
                      style={{ backgroundColor: statusColor }}
                    />
                    <span className="bubble-agent-name">{agent.name}</span>
                    <span className="status-tag" style={{ color: statusColor }}>
                      {statusLabel}
                    </span>
                    {agent.source === 'antigravity' && (
                      <span className="real-badge agy">AGY</span>
                    )}
                    {agent.source === 'claude' && (
                      <span className="real-badge claude">CLAUDE</span>
                    )}
                    {agent.source === 'simulation' && (
                      <span className={`real-badge sim-${office}`}>
                        {office === 'claude' ? 'CLD-SIM' : 'AGY-SIM'}
                      </span>
                    )}
                  </div>
                  <div className="bubble-body">
                    <span className="bubble-icon">{bubbleIcon}</span>
                    <span className="bubble-text">{bubbleText}</span>
                  </div>
                </div>

                {/* Clickable Character Hitbox */}
                <div className="agent-hitbox" title={`${agent.name} 클릭하여 상세 보기`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
