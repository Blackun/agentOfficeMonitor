# Agent Office Monitor 아키텍처 다이어그램

## 1. 전체 시스템 & Podman 컨테이너 아키텍처

호스트 OS(macOS)의 로컬 에이전트 로그 디렉터리와 Claude Code Hook 이벤트가 Podman 컨테이너 내부의 백엔드([`OfficeMonitorServer`](../server/index.ts))를 거쳐 React 2D 픽셀 캔버스([`OfficeCanvas.tsx`](../src/components/OfficeCanvas.tsx))로 전달되는 전체 구조입니다.

```mermaid
flowchart TB
    subgraph HostOS["💻 Host OS (macOS)"]
        AGYLogs["📁 ~/.gemini/antigravity/brain (transcript.jsonl)"]
        ClaudeLogs["📁 ~/.claude/projects (*.jsonl)"]
        ClaudeCLI["🤖 Claude Code CLI (Hooks)"]
        ConfigFile["⚙️ .office-config.json"]
        Browser["🌐 Web Browser (http://127.0.0.1:5173)"]
    end

    subgraph PodmanContainer["🐳 Podman Container (agent-office-monitor:latest)"]
        subgraph Backend["Node.js Backend Server (server/)"]
            LogWatcher["🔍 MultiAgentLogWatcher (server/logWatcher.ts)"]
            Simulator["🎭 AgentSimulator (server/simulator.ts)"]
            MonitorServer["🧠 OfficeMonitorServer (server/index.ts)"]
            WSS["📡 WebSocket Server (/ws) & REST API (/api/*)"]
        end

        subgraph Frontend["React 18 + Canvas 2D Frontend (src/)"]
            SocketHook["🔌 useAgentSocket (src/hooks/useAgentSocket.ts)"]
            OfficeCanvas["🎨 OfficeCanvas 60fps Loop (src/components/OfficeCanvas.tsx)"]
            PixelSprites["🕹️ 3-Zone Pixel Engine (src/components/pixelSprites.ts)"]
            SidePanels["📊 AgentDetail & ActivityFeed"]
            SettingsUI["⚙️ SettingsModal (src/components/SettingsModal.tsx)"]
        end
    end

    AGYLogs -->|"RO Volume Mount"| LogWatcher
    ClaudeLogs -->|"RO Volume Mount"| LogWatcher
    ConfigFile <-->|"RW Volume Mount"| MonitorServer
    ClaudeCLI -->|"POST /api/hook/claude"| WSS

    LogWatcher -->|"Real Agent State & Activities"| MonitorServer
    Simulator -->|"Virtual Agent State"| MonitorServer
    MonitorServer -->|"Per-Office Desk Assignment"| WSS

    WSS <-->|"WebSocket Push (SNAPSHOT) & REST"| SocketHook
    SocketHook --> OfficeCanvas
    SocketHook --> SidePanels
    SocketHook <--> SettingsUI
    OfficeCanvas --> PixelSprites
    Frontend <-->|"Port 5173:5173"| Browser
```

---

## 2. 실시간 로그 감지 및 WebSocket 브로드캐스트 시퀀스

에이전트가 도구를 호출(`edit_file`, `run_command`, `Read`, `Bash` 등)하거나 생각을 기록할 때 화면의 캐릭터가 실시간으로 움직이고 말풍선이 갱신되는 흐름입니다.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as "🤖 AI Agent (Antigravity / Claude)"
    participant FS as "📁 Host JSONL / Hook"
    participant Watcher as "🔍 MultiAgentLogWatcher"
    participant Server as "🧠 OfficeMonitorServer"
    participant Client as "🎨 OfficeCanvas (Browser)"

    Agent->>FS: 도구 실행 및 단계 기록 (transcript.jsonl / Hook)
    FS-->>Watcher: 파일 변경 감지 (1.5초 폴링) 또는 POST /api/hook/claude
    Watcher->>Watcher: JSONL 파싱 및 상태 매핑 (CODING, TERMINAL, READING, BREAK)
    Watcher->>Server: onUpdate() 콜백 트리거
    Server->>Server: 사무실별(antigravity / claude) 독립 좌석(deskIndex) 배정
    Server-->>Client: WebSocket SNAPSHOT 브로드캐스트
    Client->>Client: 60fps 통로 경유 이동 및 출근·휴게실·퇴근 픽셀 모션 렌더링
```

---

## 3. 3구역 오피스 공간 배정 및 상태 전환 구조

[`OfficeMonitorServer.buildSnapshot()`](../server/index.ts)과 [`OfficeCanvas.tsx`](../src/components/OfficeCanvas.tsx)가 에이전트의 소속(`office`)과 현재 상태(`status`)에 따라 1200×700 캔버스 위 좌표를 결정하는 구조입니다.

```mermaid
flowchart LR
    subgraph Sources["에이전트 소스"]
        S_AGY["Antigravity 세션 (office: antigravity)"]
        S_CLD["Claude Code 세션 (office: claude)"]
    end

    subgraph Canvas1200["🏢 2D Pixel Office Canvas (1200 x 700)"]
        subgraph LeftWing["🟡 좌측: ANTIGRAVITY OFFICE (x: 0..456)"]
            AGY_Door["🚪 AGY DOOR (출퇴근 문)"]
            AGY_Desks["💻 AGY-1 ~ AGY-6 데스크"]
        end

        subgraph CenterLounge["☕ 가운데: SHARED LOUNGE (x: 468..732)"]
            CoffeeBar["☕ 에스프레소 바 & 정수기"]
            SharedSofa["🛋️ 공용 러그 · 소파 · 스툴 (6종 휴식 모션)"]
        end

        subgraph RightWing["🟠 우측: CLAUDE CODE OFFICE (x: 744..1200)"]
            CLD_Door["🚪 CLAUDE DOOR (출퇴근 문)"]
            CLD_Desks["💻 CLD-1 ~ CLD-6 데스크"]
        end
    end

    S_AGY -->|"출근 인사 (CLOCK-IN)"| AGY_Door
    AGY_Door <-->|"작업 중 / 퇴근 (CLOCK-OUT)"| AGY_Desks
    AGY_Desks <-->|"유휴·대기 시 좌측 아치 통로 이동"| SharedSofa

    S_CLD -->|"출근 인사 (CLOCK-IN)"| CLD_Door
    CLD_Door <-->|"작업 중 / 퇴근 (CLOCK-OUT)"| CLD_Desks
    CLD_Desks <-->|"유휴·대기 시 우측 아치 통로 이동"| SharedSofa
```

---

## 4. 주요 컴포넌트 및 파일 매핑

| 계층 | 파일 | 역할 |
| :--- | :--- | :--- |
| **Container / Infra** | [`Containerfile`](../Containerfile), [`office-monitor.sh`](../office-monitor.sh) | `node:22-alpine` 이미지 빌드, 호스트 로그 볼륨(`:ro`) 마운트 및 컨테이너 라이프사이클 관리 |
| **Backend Core** | [`server/index.ts`](../server/index.ts) | WebSocket(`/ws`) 브로드캐스트, REST API(`/api/*`), 사무실별 독립 좌석 배정 |
| **Log Watcher** | [`server/logWatcher.ts`](../server/logWatcher.ts) | Antigravity(`transcript.jsonl`) 및 Claude Code(`~/.claude/projects`) 실시간 파싱, 세션/서브에이전트 실명 추출, Hook 수신 |
| **Simulator** | [`server/simulator.ts`](../server/simulator.ts) | `+ AGY 출근` / `+ Claude 출근` 수동 테스트용 가상 에이전트 상태 시뮬레이션 |
| **2D Canvas & Sprites** | [`src/components/OfficeCanvas.tsx`](../src/components/OfficeCanvas.tsx), [`src/components/pixelSprites.ts`](../src/components/pixelSprites.ts) | 1200×700 3구역 오피스 렌더링, 출근·휴게실(6종)·퇴근 모션, 아치 통로 경유 이동, 말풍선 오버레이 |
| **Telemetry & Config** | [`src/components/AgentDetail.tsx`](../src/components/AgentDetail.tsx), [`src/components/ActivityFeed.tsx`](../src/components/ActivityFeed.tsx), [`src/components/SettingsModal.tsx`](../src/components/SettingsModal.tsx) | 에이전트 상세 인스펙터, 실시간 작업 로그 피드, 경로/타이머/Hook 연동 설정 모달 |
