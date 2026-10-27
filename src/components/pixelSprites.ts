import type { AgentStatus, OfficeRoom } from '../types/agent';

const HAIR_COLORS = [
  { base: '#231b2e', light: '#3b2e4d' }, // Soft Black
  { base: '#4a2c18', light: '#6e4427' }, // Chestnut Brown
  { base: '#8c431f', light: '#b55b2e' }, // Auburn
  { base: '#d48b35', light: '#eab05c' }, // Golden Blonde
  { base: '#1e3f5a', light: '#2f5e85' }, // Midnight Blue
  { base: '#6b274b', light: '#913868' }, // Wine Burgundy
  { base: '#b83b28', light: '#de543e' }, // Ginger Red
  { base: '#374151', light: '#6b7280' }, // Silver / Ash Grey
];

const OUTFIT_PALETTES = [
  { jacket: '#2563eb', shirt: '#f8fafc', pants: '#1e293b', shoe: '#0f172a' },
  { jacket: '#059669', shirt: '#ecfdf5', pants: '#1f2937', shoe: '#374151' },
  { jacket: '#7c3aed', shirt: '#f3e8ff', pants: '#1e1b4b', shoe: '#111827' },
  { jacket: '#e11d48', shirt: '#fff1f2', pants: '#27272a', shoe: '#18181b' },
  { jacket: '#d97706', shirt: '#fef3c7', pants: '#1c1917', shoe: '#292524' },
  { jacket: '#0891b2', shirt: '#cffafe', pants: '#0f172a', shoe: '#334155' },
  { jacket: '#334155', shirt: '#38bdf8', pants: '#0f172a', shoe: '#1e293b' },
  { jacket: '#4f46e5', shirt: '#e0e7ff', pants: '#1e1b4b', shoe: '#0f172a' },
];

const SKIN_PALETTES = [
  { base: '#ffe0bd', shadow: '#f2c299', blush: '#f4978e' },
  { base: '#f7cfa0', shadow: '#e0b17e', blush: '#e58c83' },
  { base: '#e5b586', shadow: '#cc9866', blush: '#d67f76' },
  { base: '#c68b59', shadow: '#a86f40', blush: '#b8655d' },
  { base: '#fff0db', shadow: '#f2d3b1', blush: '#f7a399' },
];

export const STATUS_COLORS: Record<AgentStatus, string> = {
  CODING: '#38bdf8',
  TERMINAL: '#4ade80',
  READING: '#c084fc',
  THINKING: '#fbbf24',
  SEARCHING: '#2dd4bf',
  WAITING_USER: '#f472b6',
  IDLE_LOUNGE: '#a3e635',
  OFFLINE: '#64748b',
};

export const STATUS_LABELS: Record<AgentStatus, string> = {
  CODING: 'CODING',
  TERMINAL: 'TERMINAL',
  READING: 'READING',
  THINKING: 'THINKING',
  SEARCHING: 'SEARCHING',
  WAITING_USER: 'WAITING',
  IDLE_LOUNGE: 'BREAK',
  OFFLINE: 'OFFLINE',
};

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  P = 3
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w * P), Math.round(h * P));
}

export function drawDualOfficeBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tick: number
) {
  const wingW = 456;
  const wallW = 12;
  const loungeX = wingW + wallW; // 468
  const loungeW = width - (wingW + wallW) * 2; // 264 (for width=1200)
  const rightWingX = loungeX + loungeW + wallW; // 744

  // 1. Draw Left Wing: Antigravity Office
  drawSingleOfficeWing(ctx, 0, wingW, height, 'antigravity', tick);

  // 2. Draw Center Zone: Shared Break Lounge
  drawCenterSharedLounge(ctx, loungeX, loungeW, height, tick);

  // 3. Draw Right Wing: Claude Code Office
  drawSingleOfficeWing(ctx, rightWingX, wingW, height, 'claude', tick);

  // 4. Draw Partition Walls with Open Archways into the Shared Lounge
  drawPartitionWallWithDoorway(ctx, wingW, wallW, height);
  drawPartitionWallWithDoorway(ctx, loungeX + loungeW, wallW, height);
}

function drawPartitionWallWithDoorway(
  ctx: CanvasRenderingContext2D,
  wallX: number,
  wallW: number,
  height: number
) {
  const doorTop = 285;
  const doorBottom = 445;

  // Top wall segment
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(wallX, 0, wallW, doorTop);
  ctx.fillStyle = '#334155';
  ctx.fillRect(wallX + 2, 0, wallW - 4, doorTop);

  // Bottom wall segment
  ctx.fillStyle = '#0f141d';
  ctx.fillRect(wallX, doorBottom, wallW, height - doorBottom);
  ctx.fillStyle = '#334155';
  ctx.fillRect(wallX + 2, doorBottom, wallW - 4, height - doorBottom);

  // Doorway threshold floor strip
  ctx.fillStyle = '#475569';
  ctx.fillRect(wallX, doorTop, wallW, doorBottom - doorTop);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(wallX + 2, doorTop + 4, wallW - 4, doorBottom - doorTop - 8);

  // Door frame posts
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(wallX - 1, doorTop - 4, wallW + 2, 6);
  ctx.fillRect(wallX - 1, doorBottom - 2, wallW + 2, 6);

  // Subtle panel joints on walls
  ctx.fillStyle = '#1e293b';
  for (let wy = 16; wy < height; wy += 28) {
    if (wy < doorTop - 6 || wy > doorBottom + 6) {
      ctx.fillRect(wallX + 2, wy, wallW - 4, 2);
    }
  }
}

function drawCenterSharedLounge(
  ctx: CanvasRenderingContext2D,
  loungeX: number,
  loungeW: number,
  height: number,
  tick: number
) {
  const tileSize = 32;

  // 1. Warm Wood/Lounge Floor Tiles
  for (let y = 0; y < height; y += tileSize) {
    for (let x = loungeX; x < loungeX + loungeW; x += tileSize) {
      const w = Math.min(tileSize, loungeX + loungeW - x);
      const isAlt =
        (Math.floor((x - loungeX) / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      ctx.fillStyle = isAlt ? '#242b35' : '#28303b';
      ctx.fillRect(x, y, w, tileSize);

      ctx.fillStyle = '#1d232b';
      ctx.fillRect(x, y + tileSize - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, tileSize);
    }
  }

  // 2. Top Wall & Shared Lounge Sign
  const wallH = 72;
  ctx.fillStyle = '#1f363d';
  ctx.fillRect(loungeX, 0, loungeW, wallH);
  ctx.fillStyle = '#141720';
  ctx.fillRect(loungeX, 0, loungeW, 8);
  ctx.fillStyle = '#2d4f59';
  ctx.fillRect(loungeX, wallH - 10, loungeW, 6);
  ctx.fillStyle = '#141720';
  ctx.fillRect(loungeX, wallH - 4, loungeW, 4);

  const signX = loungeX + 24;
  const signY = 16;
  const signW = loungeW - 48;
  const signH = 40;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(signX, signY, signW, signH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(signX, signY, signW, signH);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText('☕ SHARED LOUNGE', signX + 42, signY + 25);

  // 3. Coffee Bar & Water Dispenser at Top of Lounge
  drawCompactCoffeeStation(ctx, loungeX + 38, wallH + 34, tick);

  // Water Dispenser next to Coffee Bar
  const wx = loungeX + 188;
  const wy = wallH + 22;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(wx, wy + 18, 30, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(wx + 2, wy + 20, 26, 14);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(wx + 4, wy, 22, 18);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(wx + 8, wy + 3, 6, 12);

  // 4. Central Cozy Lounge Carpet Rug
  const rugX = loungeX + 22;
  const rugY = 204;
  const rugW = loungeW - 44;
  const rugH = 360;

  ctx.fillStyle = '#1b3547';
  ctx.fillRect(rugX, rugY, rugW, rugH);
  ctx.fillStyle = '#214257';
  ctx.fillRect(rugX + 6, rugY + 6, rugW - 12, rugH - 12);

  // Subtle rug pattern border
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rugX + 12, rugY + 12, rugW - 24, rugH - 24);

  // 5. Shared Sofa + Coffee Table + Cozy Cushions
  drawCompactSofa(ctx, loungeX + 66, rugY + 38, false);

  // Second Bench / Pouf seats below table for Claude & AGY agents to chat
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(loungeX + 56, rugY + 200, 64, 34);
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(loungeX + 60, rugY + 204, 56, 26);

  ctx.fillStyle = '#0f766e';
  ctx.fillRect(loungeX + 144, rugY + 200, 64, 34);
  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(loungeX + 148, rugY + 204, 56, 26);

  // 6. Plants & Lounge Footer Label
  drawOfficePlant(ctx, loungeX + 22, height - 76);
  drawOfficePlant(ctx, loungeX + loungeW - 46, height - 76);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(loungeX + 54, height - 42, loungeW - 108, 24);
  ctx.fillStyle = '#a3e635';
  ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
  ctx.fillText('REST & COFFEE ZONE', loungeX + 72, height - 26);
}

function drawSingleOfficeWing(
  ctx: CanvasRenderingContext2D,
  roomX: number,
  roomW: number,
  height: number,
  office: OfficeRoom,
  tick: number
) {
  const isClaude = office === 'claude';
  const tileSize = 32;

  // 1. Distinct Floor Tiles per Office Wing
  for (let y = 0; y < height; y += tileSize) {
    for (let x = roomX; x < roomX + roomW; x += tileSize) {
      const w = Math.min(tileSize, roomX + roomW - x);
      const isAlt = (Math.floor((x - roomX) / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
      if (isClaude) {
        // Warm espresso / terracotta-tinted dark wood floor for Claude Code Office
        ctx.fillStyle = isAlt ? '#291f1e' : '#2d2321';
      } else {
        // Deep cyber-slate floor for Antigravity Office
        ctx.fillStyle = isAlt ? '#1e2230' : '#222736';
      }
      ctx.fillRect(x, y, w, tileSize);

      ctx.fillStyle = isClaude ? '#211817' : '#181c27';
      ctx.fillRect(x, y + tileSize - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, tileSize);
    }
  }

  // 2. Top Wall & Office Banner Sign
  const wallH = 72;
  ctx.fillStyle = isClaude ? '#3a2926' : '#2b3247';
  ctx.fillRect(roomX, 0, roomW, wallH);
  ctx.fillStyle = '#141720';
  ctx.fillRect(roomX, 0, roomW, 8);
  ctx.fillStyle = isClaude ? '#543b36' : '#3d4766';
  ctx.fillRect(roomX, wallH - 10, roomW, 6);
  ctx.fillStyle = '#141720';
  ctx.fillRect(roomX, wallH - 4, roomW, 4);

  // Office Name Sign Board on Top Wall
  const signX = roomX + 20;
  const signY = 16;
  const signW = 224;
  const signH = 40;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(signX, signY, signW, signH);
  ctx.strokeStyle = isClaude ? '#ea580c' : '#f59e0b';
  ctx.lineWidth = 2;
  ctx.strokeRect(signX, signY, signW, signH);

  ctx.fillStyle = isClaude ? '#fb923c' : '#fde047';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(
    isClaude ? '🟠 CLAUDE CODE OFFICE' : '🟡 ANTIGRAVITY OFFICE',
    signX + 14,
    signY + 25
  );

  // Window on Top Wall
  const wx = roomX + 260;
  ctx.fillStyle = '#1e1926';
  ctx.fillRect(wx, 14, 110, 44);
  ctx.fillStyle = '#0f2942';
  ctx.fillRect(wx + 4, 18, 102, 36);
  ctx.fillStyle = '#163b5c';
  ctx.fillRect(wx + 10, 30, 20, 24);
  ctx.fillRect(wx + 36, 22, 26, 32);
  ctx.fillRect(wx + 70, 32, 22, 22);
  ctx.fillStyle = (tick + wx) % 60 < 30 ? '#fde047' : '#38bdf8';
  ctx.fillRect(wx + 44, 28, 3, 3);
  ctx.fillRect(wx + 76, 38, 3, 3);
  ctx.fillStyle = '#1e1926';
  ctx.fillRect(wx + 53, 18, 4, 36);

  // Server Rack at top-right of each office wing
  drawSingleServerRack(ctx, roomX + roomW - 68, 14, isClaude, tick);

  // Decorative Plants in corners
  drawOfficePlant(ctx, roomX + 16, wallH + 12);
  drawOfficePlant(ctx, roomX + roomW - 42, height - 76);

  // 3. Dedicated Office Entrance Door at Bottom of Wing
  const doorX = isClaude ? roomX + roomW - 128 : roomX + 34;
  const doorY = height - 30;
  ctx.fillStyle = isClaude ? '#5c2d1e' : '#2e3b59';
  ctx.fillRect(doorX, doorY - 12, 92, 24);
  ctx.fillStyle = isClaude ? '#7c3a25' : '#3b4d75';
  ctx.fillRect(doorX + 4, doorY - 8, 84, 16);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 9px "JetBrains Mono", monospace';
  ctx.fillText(
    isClaude ? 'CLAUDE DOOR' : 'AGY DOOR',
    doorX + (isClaude ? 15 : 22),
    doorY + 3
  );
}

function drawSingleServerRack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isClaude: boolean,
  tick: number
) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(x, y, 50, 52);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x + 3, y + 3, 44, 46);

  for (let row = 0; row < 4; row++) {
    const by = y + 7 + row * 10;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 6, by, 38, 7);

    const ledOn = (tick + row * 9) % 20 < 12;
    ctx.fillStyle = ledOn ? (isClaude ? '#fb923c' : '#4ade80') : '#334155';
    ctx.fillRect(x + 9, by + 2, 3, 3);

    const actOn = (tick + row * 5) % 14 < 7;
    ctx.fillStyle = actOn ? '#38bdf8' : '#1e293b';
    ctx.fillRect(x + 15, by + 2, 3, 3);

    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 22, by + 2, 18, 3);
  }
}

function drawCompactCoffeeStation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tick: number
) {
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(x, y + 18, 112, 32);
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(x, y + 12, 112, 9);

  // Espresso Machine
  ctx.fillStyle = '#334155';
  ctx.fillRect(x + 12, y - 8, 32, 24);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x + 15, y - 5, 26, 7);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + 19, y - 2, 4, 3);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(x + 26, y - 2, 4, 3);

  // Mugs
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x + 58, y + 3, 9, 10);
  ctx.fillStyle = '#fb923c';
  ctx.fillRect(x + 74, y + 3, 9, 10);

  const steamOffset = Math.floor(tick / 12) % 7;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(x + 25, y - 13 - steamOffset, 3, 4);
}

function drawCompactSofa(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isClaude: boolean
) {
  ctx.fillStyle = isClaude ? '#9a3412' : '#0f766e';
  ctx.fillRect(x, y, 132, 42);
  ctx.fillStyle = isClaude ? '#7c2d12' : '#115e59';
  ctx.fillRect(x, y, 132, 12);
  ctx.fillRect(x, y, 12, 42);
  ctx.fillRect(x + 120, y, 12, 42);
  ctx.fillStyle = isClaude ? '#ea580c' : '#14b8a6';
  ctx.fillRect(x + 14, y + 12, 48, 24);
  ctx.fillRect(x + 68, y + 12, 48, 24);

  // Table in front
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 24, y + 52, 84, 24);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(x + 28, y + 55, 76, 18);
}

function drawOfficePlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x + 6, y + 20, 6, 5, '#c2410c');
  px(ctx, x + 4, y + 17, 7, 2, '#ea580c');
  px(ctx, x + 6, y + 6, 6, 4, '#15803d');
  px(ctx, x + 2, y + 10, 4, 3, '#22c55e');
  px(ctx, x + 14, y + 10, 4, 3, '#22c55e');
  px(ctx, x + 8, y + 2, 4, 3, '#4ade80');
}

export function drawWorkstationDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  deskIndex: number,
  office: OfficeRoom,
  status: AgentStatus | null,
  isRealAgent: boolean,
  isSelected: boolean,
  tick: number
) {
  const deskW = 132;
  const deskH = 72;
  const isClaude = office === 'claude';

  if (isSelected) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(x - 8, y - 12, deskW + 16, deskH + 30);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y - 12, deskW + 16, deskH + 30);
  } else if (isRealAgent) {
    ctx.fillStyle = isClaude
      ? 'rgba(234, 88, 12, 0.12)'
      : 'rgba(250, 204, 21, 0.1)';
    ctx.fillRect(x - 6, y - 8, deskW + 12, deskH + 24);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x + 4, y + 22, deskW, 44);

  // Ergonomic Office Chair
  const chairX = x + 62;
  const chairY = y + 36;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(chairX + 8, chairY + 26, 20, 4);
  ctx.fillRect(chairX + 16, chairY + 20, 4, 8);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(chairX + 2, chairY - 4, 32, 24);
  ctx.fillStyle = '#334155';
  ctx.fillRect(chairX + 5, chairY - 2, 26, 20);

  // Desk Surface (Warm oak for Claude, Sleek walnut/steel for Antigravity)
  ctx.fillStyle = isClaude ? '#6b3e26' : '#475569';
  ctx.fillRect(x, y + 10, deskW, 34);
  ctx.fillStyle = isClaude ? '#854d30' : '#64748b';
  ctx.fillRect(x + 3, y + 13, deskW - 6, 26);

  ctx.fillStyle = isClaude ? '#432515' : '#334155';
  ctx.fillRect(x, y + 40, deskW, 8);
  ctx.fillRect(x + 6, y + 48, 8, 12);
  ctx.fillRect(x + deskW - 14, y + 48, 8, 12);

  // Side Widescreen Monitor on the LEFT of the desk
  const monX = x + 10;
  const monY = y - 6;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(monX, monY, 46, 26);
  ctx.fillStyle = '#334155';
  ctx.fillRect(monX + 18, monY + 26, 10, 5);
  ctx.fillRect(monX + 12, monY + 30, 22, 3);

  const screenColor = status ? STATUS_COLORS[status] : '#1e293b';
  ctx.fillStyle = status ? '#090d16' : '#111827';
  ctx.fillRect(monX + 3, monY + 3, 40, 20);

  if (status) {
    ctx.fillStyle = screenColor;
    const animLine = Math.floor(tick / 6) % 4;
    for (let r = 0; r < 4; r++) {
      const lineW = ((r * 11 + animLine * 7) % 22) + 10;
      ctx.globalAlpha = r === animLine ? 1.0 : 0.55;
      ctx.fillRect(monX + 6, monY + 5 + r * 4, lineW, 2);
    }
    ctx.globalAlpha = 0.14;
    ctx.fillRect(monX - 3, monY - 2, 52, 30);
    ctx.globalAlpha = 1.0;
  }

  // Keyboard & Mouse
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 62, y + 25, 32, 10);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + 65, y + 27, 22, 6);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x + 98, y + 28, 5, 7);

  // Mug
  ctx.fillStyle = isClaude ? '#fb923c' : '#fbbf24';
  ctx.fillRect(x + 112, y + 16, 9, 10);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 114, y + 17, 5, 3);

  // Desk Badge (`AGY-1` vs `CLD-1`)
  ctx.fillStyle = isRealAgent
    ? isClaude
      ? '#ea580c'
      : '#f59e0b'
    : '#1e293b';
  ctx.fillRect(x + 8, y + 27, 38, 11);
  ctx.fillStyle = isRealAgent ? (isClaude ? '#ffffff' : '#0f172a') : '#cbd5e1';
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  const prefix = isClaude ? 'CLD' : 'AGY';
  ctx.fillText(`${prefix}-${deskIndex + 1}`, x + 11, y + 35);
}

export type AgentMotionPhase = 'ARRIVING' | 'NORMAL' | 'LEAVING' | 'GOODBYE';
export type LoungePose = 'COFFEE' | 'WATER' | 'SOFA' | 'CHAT' | 'STRETCH' | 'PHONE';

export function drawPixelAgent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  status: AgentStatus,
  isMoving: boolean,
  isRealAgent: boolean,
  tick: number,
  motionPhase: AgentMotionPhase = 'NORMAL',
  loungePose: LoungePose = 'COFFEE',
  opacity = 1
) {
  ctx.save();
  if (opacity < 1) {
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  }

  const hair = HAIR_COLORS[seed % HAIR_COLORS.length];
  const outfit = OUTFIT_PALETTES[(seed >> 2) % OUTFIT_PALETTES.length];
  const skin = SKIN_PALETTES[(seed >> 4) % SKIN_PALETTES.length];
  const hairStyle = seed % 6;

  const isWaving = motionPhase === 'ARRIVING' || motionPhase === 'GOODBYE';
  const isLoungeIdle = !isMoving && !isWaving && status === 'IDLE_LOUNGE';
  const isLoungeSeated =
    isLoungeIdle && (loungePose === 'SOFA' || loungePose === 'CHAT');
  const isSeatedAtDesk = !isMoving && !isWaving && status !== 'IDLE_LOUNGE';

  const walkBob = isMoving ? (Math.floor(tick / 4) % 2 === 0 ? -2 : 1) : 0;
  const waveBounce = isWaving ? (Math.floor(tick / 6) % 2 === 0 ? -2 : 0) : 0;
  const stretchLift =
    isLoungeIdle && loungePose === 'STRETCH'
      ? Math.floor((tick + seed * 5) / 16) % 3 === 0
        ? -2
        : 0
      : 0;
  const breathBob =
    !isMoving && !isWaving ? (Math.floor((tick + seed * 3) / 20) % 2 === 0 ? -1 : 0) : 0;

  const cx = Math.round(x);
  const cy = Math.round(y + walkBob + waveBounce + stretchLift + breathBob);

  // 0. Arrival / Departure Door Portal Ring Effect
  if (isWaving) {
    const ringPulse = (tick % 24) / 24;
    ctx.strokeStyle =
      motionPhase === 'ARRIVING'
        ? `rgba(74, 222, 128, ${0.75 - ringPulse * 0.5})`
        : `rgba(251, 191, 36, ${0.75 - ringPulse * 0.5})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.round(cx - 16 - ringPulse * 6),
      Math.round(y + 15 - ringPulse * 2),
      Math.round(32 + ringPulse * 12),
      Math.round(10 + ringPulse * 4)
    );
  }

  // 1. Floor drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.fillRect(cx - 13, Math.round(y) + 19, 26, 5);
  ctx.fillRect(cx - 10, Math.round(y) + 18, 20, 7);

  // 2. Back hair layer
  if (hairStyle === 1) {
    ctx.fillStyle = hair.base;
    ctx.fillRect(cx - 13, cy - 18, 26, 18);
    ctx.fillRect(cx - 14, cy - 12, 28, 10);
  } else if (hairStyle === 2) {
    ctx.fillStyle = hair.base;
    ctx.fillRect(cx + 9, cy - 29, 6, 8);
    ctx.fillRect(cx + 12, cy - 25, 5, 10);
  } else if (hairStyle === 3) {
    ctx.fillStyle = hair.base;
    ctx.fillRect(cx - 13, cy - 20, 26, 12);
  }

  // 3. Legs, Pants & Sneakers
  if (isMoving) {
    const stride = Math.floor(tick / 4) % 4;
    const leftOffset = stride === 0 ? -3 : stride === 2 ? 2 : 0;
    const rightOffset = stride === 2 ? -3 : stride === 0 ? 2 : 0;

    ctx.fillStyle = outfit.pants;
    ctx.fillRect(cx - 9, cy + 7, 18, 4);

    ctx.fillStyle = outfit.pants;
    ctx.fillRect(cx - 8, cy + 10 + leftOffset, 7, 8);
    ctx.fillStyle = outfit.shoe;
    ctx.fillRect(cx - 9, cy + 17 + leftOffset, 8, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx - 9, cy + 20 + leftOffset, 8, 1);

    ctx.fillStyle = outfit.pants;
    ctx.fillRect(cx + 1, cy + 10 + rightOffset, 7, 8);
    ctx.fillStyle = outfit.shoe;
    ctx.fillRect(cx + 1, cy + 17 + rightOffset, 8, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cx + 1, cy + 20 + rightOffset, 8, 1);
  } else if (isSeatedAtDesk || isLoungeSeated) {
    ctx.fillStyle = outfit.pants;
    ctx.fillRect(cx - 9, cy + 7, 18, 6);
    ctx.fillRect(cx - 8, cy + 12, 6, 6);
    ctx.fillRect(cx + 2, cy + 12, 6, 6);
    ctx.fillStyle = outfit.shoe;
    ctx.fillRect(cx - 9, cy + 17, 7, 3);
    ctx.fillRect(cx + 2, cy + 17, 7, 3);
  } else {
    ctx.fillStyle = outfit.pants;
    ctx.fillRect(cx - 9, cy + 7, 18, 4);
    ctx.fillRect(cx - 8, cy + 10, 7, 8);
    ctx.fillRect(cx + 1, cy + 10, 7, 8);
    ctx.fillStyle = outfit.shoe;
    ctx.fillRect(cx - 9, cy + 18, 8, 3);
    ctx.fillRect(cx + 1, cy + 18, 8, 3);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 9, cy + 20, 8, 1);
    ctx.fillRect(cx + 1, cy + 20, 8, 1);
  }

  // 4. Torso: Layered Jacket/Hoodie + Inner Shirt + Belt
  ctx.fillStyle = outfit.jacket;
  ctx.fillRect(cx - 9, cy - 8, 18, 2);
  ctx.fillRect(cx - 11, cy - 6, 22, 13);

  ctx.fillStyle = outfit.shirt;
  ctx.fillRect(cx - 4, cy - 7, 8, 12);

  if (isRealAgent) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 1, cy - 5, 2, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 3, cy + 1, 6, 4);
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(cx - 5, cy - 6, 1, 13);
    ctx.fillRect(cx + 4, cy - 6, 1, 13);
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - 10, cy + 6, 20, 2);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx - 2, cy + 6, 4, 2);

  // 5. Neck
  ctx.fillStyle = skin.shadow;
  ctx.fillRect(cx - 4, cy - 11, 8, 4);
  ctx.fillStyle = skin.base;
  ctx.fillRect(cx - 3, cy - 11, 6, 3);

  // 6. Arms & Hands (including Clock-in Wave & Lounge Poses)
  if (isWaving) {
    const waveX = Math.floor(tick / 4) % 2 === 0 ? 0 : 3;
    // Left arm relaxed
    ctx.fillStyle = outfit.jacket;
    ctx.fillRect(cx - 14, cy - 5, 4, 10);
    ctx.fillStyle = skin.base;
    ctx.fillRect(cx - 14, cy + 5, 4, 3);
    // Right arm raised high waving hello / goodbye
    ctx.fillStyle = outfit.jacket;
    ctx.fillRect(cx + 10, cy - 14, 4, 10);
    ctx.fillStyle = skin.base;
    ctx.fillRect(cx + 10 + waveX, cy - 19, 5, 5);
  } else if (isSeatedAtDesk && (status === 'CODING' || status === 'TERMINAL')) {
    const typeStep = Math.floor(tick / 3) % 2;
    ctx.fillStyle = outfit.jacket;
    ctx.fillRect(cx - 14, cy - 5, 4, 8);
    ctx.fillRect(cx + 10, cy - 5, 4, 8);
    ctx.fillStyle = skin.base;
    ctx.fillRect(cx - 15, cy + 1 + (typeStep === 0 ? -2 : 0), 5, 4);
    ctx.fillRect(cx + 9, cy + 1 + (typeStep === 1 ? -2 : 0), 5, 4);
  } else if (isSeatedAtDesk && status === 'THINKING') {
    ctx.fillStyle = outfit.jacket;
    ctx.fillRect(cx - 14, cy - 5, 4, 9);
    ctx.fillRect(cx + 10, cy - 8, 4, 8);
    ctx.fillStyle = skin.base;
    ctx.fillRect(cx - 14, cy + 4, 4, 3);
    ctx.fillRect(cx + 6, cy - 12, 5, 4);
  } else if (isLoungeIdle) {
    if (loungePose === 'STRETCH') {
      // Stretching arms up periodically
      const armsUp = Math.floor((tick + seed * 5) / 16) % 3 !== 2;
      if (armsUp) {
        const sway = Math.floor(tick / 10) % 2 === 0 ? -1 : 1;
        ctx.fillStyle = outfit.jacket;
        ctx.fillRect(cx - 14 + sway, cy - 16, 4, 11);
        ctx.fillRect(cx + 10 + sway, cy - 16, 4, 11);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 14 + sway, cy - 20, 4, 4);
        ctx.fillRect(cx + 10 + sway, cy - 20, 4, 4);
      } else {
        ctx.fillStyle = outfit.jacket;
        ctx.fillRect(cx - 14, cy - 5, 4, 10);
        ctx.fillRect(cx + 10, cy - 5, 4, 10);
        ctx.fillStyle = skin.base;
        ctx.fillRect(cx - 14, cy + 5, 4, 3);
        ctx.fillRect(cx + 10, cy + 5, 4, 3);
      }
    } else if (loungePose === 'PHONE') {
      // Holding glowing smartphone/tablet in front
      ctx.fillStyle = outfit.jacket;
      ctx.fillRect(cx - 14, cy - 5, 4, 8);
      ctx.fillRect(cx + 10, cy - 5, 4, 7);
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 12, cy + 2, 4, 3);
      ctx.fillRect(cx + 7, cy, 4, 3);
      // Phone device + screen glow
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx + 4, cy - 5, 7, 9);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx + 5, cy - 4, 5, 7);
    } else if (loungePose === 'CHAT' || loungePose === 'SOFA') {
      // Seated relaxed on sofa / pouf, occasional hand gesture
      const gestureLift = Math.floor((tick + seed * 9) / 14) % 2 === 0 ? -2 : 0;
      ctx.fillStyle = outfit.jacket;
      ctx.fillRect(cx - 14, cy - 4, 4, 9);
      ctx.fillRect(cx + 10, cy - 4 + gestureLift, 4, 8);
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 13, cy + 4, 4, 3);
      ctx.fillRect(cx + 10, cy + 3 + gestureLift, 4, 3);
    } else {
      // COFFEE or WATER: Sipping animation
      const isSipping = (tick + seed * 11) % 90 < 26;
      const cupLift = isSipping ? -8 : 0;
      const cupX = isSipping ? cx + 6 : cx + 13;
      const cupY = cy - 4 + cupLift;

      ctx.fillStyle = outfit.jacket;
      ctx.fillRect(cx - 14, cy - 5, 4, 10);
      ctx.fillRect(cx + 10, cy - 5 + Math.floor(cupLift / 2), 4, 7);
      ctx.fillStyle = skin.base;
      ctx.fillRect(cx - 14, cy + 5, 4, 3);
      ctx.fillRect(cx + 10, cy + 1 + Math.floor(cupLift / 2), 4, 3);

      // Cup / Mug
      ctx.fillStyle = loungePose === 'WATER' ? '#bae6fd' : '#ffffff';
      ctx.fillRect(cupX, cupY, 7, 8);
      ctx.fillStyle = loungePose === 'WATER' ? '#38bdf8' : '#78350f';
      ctx.fillRect(cupX + 1, cupY + 1, 5, 3);

      // Rising steam above coffee mug
      if (loungePose === 'COFFEE') {
        const steamStep = Math.floor(tick / 10) % 6;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(cupX + 2, cupY - 4 - steamStep, 2, 3);
        ctx.fillRect(cupX + 4, cupY - 7 - ((steamStep + 3) % 6), 2, 2);
      }
    }
  } else {
    const swing = isMoving ? (Math.floor(tick / 4) % 2 === 0 ? -2 : 2) : 0;
    ctx.fillStyle = outfit.jacket;
    ctx.fillRect(cx - 14, cy - 5 + swing, 4, 10);
    ctx.fillRect(cx + 10, cy - 5 - swing, 4, 10);
    ctx.fillStyle = skin.base;
    ctx.fillRect(cx - 14, cy + 5 + swing, 4, 3);
    ctx.fillRect(cx + 10, cy + 5 - swing, 4, 3);
  }

  // 7. Head & Ears
  const headNod =
    isLoungeIdle && (loungePose === 'CHAT' || loungePose === 'SOFA')
      ? Math.floor((tick + seed * 7) / 18) % 2 === 0
        ? 1
        : 0
      : 0;
  const hy = cy + headNod;

  ctx.fillStyle = skin.shadow;
  ctx.fillRect(cx - 12, hy - 21, 2, 5);
  ctx.fillRect(cx + 10, hy - 21, 2, 5);
  ctx.fillStyle = skin.base;
  ctx.fillRect(cx - 11, hy - 20, 1, 3);
  ctx.fillRect(cx + 10, hy - 20, 1, 3);

  ctx.fillStyle = skin.base;
  ctx.fillRect(cx - 9, hy - 27, 18, 15);
  ctx.fillRect(cx - 10, hy - 25, 20, 11);
  ctx.fillRect(cx - 7, hy - 12, 14, 2);

  ctx.fillStyle = skin.shadow;
  ctx.fillRect(cx - 6, hy - 11, 12, 1);

  // 8. Face Features
  ctx.fillStyle = skin.blush;
  ctx.globalAlpha = opacity * 0.55;
  ctx.fillRect(cx - 9, hy - 16, 3, 2);
  ctx.fillRect(cx + 6, hy - 16, 3, 2);
  ctx.globalAlpha = opacity;

  ctx.fillStyle = hair.base;
  const browLift =
    status === 'THINKING' || status === 'SEARCHING' || isWaving ? -1 : 0;
  ctx.fillRect(cx - 7, hy - 22 + browLift, 5, 1);
  ctx.fillRect(cx + 2, hy - 22 + browLift, 5, 1);

  const isBlinking = (tick + seed * 7) % 95 < 4;
  const eyesClosedRelax =
    isLoungeIdle &&
    (loungePose === 'STRETCH' ||
      (loungePose === 'SOFA' && (tick + seed * 13) % 160 < 45));

  if (isBlinking || eyesClosedRelax) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 7, hy - 18, 5, 1);
    ctx.fillRect(cx + 2, hy - 18, 5, 1);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 7, hy - 20, 5, 4);
    ctx.fillRect(cx + 2, hy - 20, 5, 4);
    const lookX =
      isSeatedAtDesk && (status === 'CODING' || status === 'TERMINAL')
        ? -1
        : isLoungeIdle && loungePose === 'PHONE'
          ? 1
          : 0;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 5 + lookX, hy - 20, 3, 4);
    ctx.fillRect(cx + 4 + lookX, hy - 20, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4 + lookX, hy - 20, 1, 1);
    ctx.fillRect(cx + 5 + lookX, hy - 20, 1, 1);
  }

  ctx.fillStyle = skin.shadow;
  ctx.fillRect(cx - 1, hy - 16, 2, 1);

  if (status === 'IDLE_LOUNGE' || status === 'WAITING_USER' || isWaving) {
    ctx.fillStyle = '#9f1239';
    ctx.fillRect(cx - 2, hy - 14, 4, 1);
    ctx.fillRect(cx - 3, hy - 15, 1, 1);
    ctx.fillRect(cx + 2, hy - 15, 1, 1);
  } else if (status === 'THINKING' || status === 'SEARCHING') {
    ctx.fillStyle = '#881337';
    ctx.fillRect(cx - 1, hy - 14, 2, 2);
  } else {
    ctx.fillStyle = '#881337';
    ctx.fillRect(cx - 2, hy - 14, 4, 1);
  }

  if (seed % 3 === 1) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - 8, hy - 21, 7, 5);
    ctx.strokeRect(cx + 1, hy - 21, 7, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 1, hy - 19, 2, 1);
  }

  // 9. Hairstyles
  ctx.fillStyle = hair.base;
  ctx.fillRect(cx - 9, hy - 31, 18, 4);
  ctx.fillRect(cx - 11, hy - 29, 22, 5);

  if (hairStyle === 0) {
    ctx.fillRect(cx - 11, hy - 25, 3, 6);
    ctx.fillRect(cx + 8, hy - 25, 3, 6);
    ctx.fillRect(cx - 8, hy - 25, 11, 3);
  } else if (hairStyle === 1) {
    ctx.fillRect(cx - 12, hy - 26, 4, 12);
    ctx.fillRect(cx + 8, hy - 26, 4, 12);
    ctx.fillRect(cx - 8, hy - 25, 9, 2);
  } else if (hairStyle === 2) {
    ctx.fillRect(cx - 11, hy - 25, 3, 8);
    ctx.fillRect(cx + 8, hy - 25, 3, 8);
    ctx.fillRect(cx - 6, hy - 25, 12, 2);
  } else if (hairStyle === 3) {
    ctx.fillRect(cx - 12, hy - 26, 4, 11);
    ctx.fillRect(cx + 8, hy - 26, 4, 11);
    ctx.fillRect(cx - 9, hy - 25, 18, 3);
  } else if (hairStyle === 4) {
    ctx.fillRect(cx - 7, hy - 33, 4, 2);
    ctx.fillRect(cx + 1, hy - 33, 5, 2);
    ctx.fillRect(cx - 12, hy - 26, 3, 7);
    ctx.fillRect(cx + 9, hy - 26, 3, 7);
    ctx.fillRect(cx - 6, hy - 25, 5, 3);
    ctx.fillRect(cx + 2, hy - 25, 4, 2);
  } else {
    ctx.fillRect(cx - 10, hy - 32, 20, 3);
    ctx.fillRect(cx - 12, hy - 28, 24, 5);
    ctx.fillRect(cx - 12, hy - 24, 3, 6);
    ctx.fillRect(cx + 9, hy - 24, 3, 6);
  }

  ctx.fillStyle = hair.light;
  ctx.fillRect(cx - 6, hy - 29, 5, 2);
  ctx.fillRect(cx + 2, hy - 29, 4, 2);

  if (isRealAgent) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 10, hy - 32, 20, 2);
    ctx.fillRect(cx - 13, hy - 24, 3, 6);
    ctx.fillRect(cx + 10, hy - 24, 3, 6);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 12, hy - 16, 5, 1);
  }

  // 10. Floating Lounge Emote Particle (Music note / Zzz / Sparkle)
  if (isLoungeIdle) {
    const floatOffset = Math.floor((tick + seed * 5) / 8) % 8;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    if (loungePose === 'SOFA') {
      ctx.fillStyle = '#a3e635';
      ctx.fillText('zZ', cx + 14, hy - 26 - floatOffset);
    } else if (loungePose === 'CHAT') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('♪', cx + 15, hy - 26 - floatOffset);
    } else if (loungePose === 'STRETCH') {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('✨', cx + 13, hy - 26 - floatOffset);
    }
  }

  ctx.restore();
}
