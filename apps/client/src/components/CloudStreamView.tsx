import type { JSX } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Button, HUDBar, Panel } from './CyberUI.js';

interface CloudStreamViewProps {
  userCredits: number;
  onAddCredits: () => void;
  onNotify: (title: string, detail: string, tone?: 'cyan' | 'green' | 'danger' | 'yellow') => void;
}

interface CloudGame {
  id: string;
  name: string;
  genre: string;
  recommendedGpu: string;
  minBitrateMbps: number;
  bannerColor: string;
  badge: string;
}

const CLOUD_GAMES: CloudGame[] = [
  {
    id: 'cloud-cyberpunk',
    name: 'Cyberpunk 2099 // Overdrive Edition',
    genre: 'Acción RPG / Mundo Abierto',
    recommendedGpu: 'NVIDIA RTX 4080 (CloudXR)',
    minBitrateMbps: 35,
    bannerColor: '#fcee09',
    badge: 'RAY TRACING // 60 FPS'
  },
  {
    id: 'cloud-gta5',
    name: 'Grand Theft Auto V // Los Santos Grid',
    genre: 'Mundo Abierto / Multijugador',
    recommendedGpu: 'NVIDIA RTX 3080 / L4',
    minBitrateMbps: 25,
    bannerColor: '#00f0ff',
    badge: '1080P // LOW LATENCY'
  },
  {
    id: 'cloud-tekken',
    name: 'Tekken 8 // Neon Tournament',
    genre: 'Lucha Competitiva',
    recommendedGpu: 'NVIDIA A10G (Sub-15ms Latency)',
    minBitrateMbps: 30,
    bannerColor: '#ff2bd6',
    badge: 'ESPORTS // 120 FPS'
  },
  {
    id: 'cloud-doom',
    name: 'DOOM Eternal // Rip & Tear Cloud',
    genre: 'FPS Rápido',
    recommendedGpu: 'NVIDIA RTX 4080 (DLSS 3)',
    minBitrateMbps: 40,
    bannerColor: '#ff003c',
    badge: 'VULKAN // ULTRA'
  }
];

export function CloudStreamView({
  userCredits,
  onAddCredits,
  onNotify
}: CloudStreamViewProps): JSX.Element {
  const [selectedGame, setSelectedGame] = useState<CloudGame>(CLOUD_GAMES[0]!);
  const [region, setRegion] = useState<'bogota' | 'useast' | 'eucentral'>('bogota');
  const [sessionActive, setSessionActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [streamStats, setStreamStats] = useState({
    pingMs: 14,
    bitrateMbps: 34.8,
    fps: 60.0,
    packetLossPct: 0.0,
    codec: 'AV1 (NVENC HW)',
    gamepadConnected: false
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Poll for gamepad connectivity
  useEffect(() => {
    const checkGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let found = false;
      for (const gp of gamepads) {
        if (gp && gp.connected) {
          found = true;
          break;
        }
      }
      setStreamStats((prev) => ({ ...prev, gamepadConnected: found }));
    };

    const interval = window.setInterval(checkGamepad, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebRTC Stream Canvas Simulation when session is active
  useEffect(() => {
    if (!sessionActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const renderStream = () => {
      time += 0.05;
      const w = canvas.width;
      const h = canvas.height;

      // Simulated 3D Cyberpunk Game Viewport
      ctx.fillStyle = '#0a0914';
      ctx.fillRect(0, 0, w, h);

      // Grid horizon
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      const horizonY = h * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(w, horizonY);
      ctx.stroke();

      // Perspective floor lines
      for (let x = -w; x <= w * 2; x += 60) {
        ctx.beginPath();
        ctx.moveTo(w / 2, horizonY);
        ctx.lineTo(x + Math.sin(time) * 20, h);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.stroke();
      }

      // Animated target cursor / Crosshair
      const cx = w / 2 + Math.sin(time * 1.5) * 40;
      const cy = h / 2 + Math.cos(time * 1.2) * 25;
      ctx.strokeStyle = '#fcee09';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.lineTo(cx + 24, cy);
      ctx.moveTo(cx, cy - 24);
      ctx.lineTo(cx, cy + 24);
      ctx.stroke();

      // Remote Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillText(`OPENPLAY CLOUD // NVIDIA RTX 4080 · REGION: ${region.toUpperCase()}`, 16, 28);
      ctx.fillText(`SESSION LATENCY: ${streamStats.pingMs}ms · 1080p 60FPS · WEBRTC PEER OK`, 16, 46);

      animFrameRef.current = requestAnimationFrame(renderStream);
    };

    animFrameRef.current = requestAnimationFrame(renderStream);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [sessionActive, region, streamStats.pingMs]);

  const handleStartSession = () => {
    if (userCredits <= 0) {
      onNotify('CRÉDITOS INSUFICIENTES', 'Necesitas minutos de streaming. Puedes recargar o activar el apoyo voluntario en Ajustes.', 'yellow');
      return;
    }

    setConnecting(true);
    onNotify('ORQUESTANDO GPU', `Negociando instancia NVIDIA en nodo ${region.toUpperCase()}...`, 'cyan');

    setTimeout(() => {
      setConnecting(false);
      setSessionActive(true);
      onNotify('SESIÓN INICIADA', `Streaming WebRTC conectado a 60 FPS con decodificación por hardware.`, 'green');
    }, 1200);
  };

  const handleStopSession = () => {
    setSessionActive(false);
    onNotify('SESIÓN LIBERADA', 'La GPU remota ha sido devuelta al pool para otros usuarios.', 'cyan');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <Panel
        title="CLOUD GAMING // STREAMING REMOTO CON GPU DEDICADA"
        cornerTag="ESTILO GEFORCE NOW · WEBRTC ULTRA-BAJA LATENCIA"
        variant="cyan"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', margin: '0 0 0.5rem', fontSize: '0.9rem', maxWidth: '720px' }}>
              El juego se ejecuta en servidores remotos con aceleración por hardware NVIDIA RTX y decodificación AV1 / H.264.
              Compatible con mandos de Xbox, PlayStation y teclado/ratón sin instalar nada.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <span>
                TU SALDO: <strong style={{ color: 'var(--neon-green)' }}>{userCredits} MINUTOS</strong>
              </span>
              <span>
                MANDO:{' '}
                <strong style={{ color: streamStats.gamepadConnected ? 'var(--neon-green)' : 'var(--text-dim)' }}>
                  {streamStats.gamepadConnected ? '✓ CONECTADO (GAMEPAD API)' : 'NINGUNO (TECLADO/RATÓN ACTIVO)'}
                </strong>
              </span>
            </div>
          </div>
          <Button variant="magenta" onClick={onAddCredits}>
            + RECARGAR CRÉDITOS CLOUD
          </Button>
        </div>
      </Panel>

      {/* Main Streaming Session Viewport or Selector */}
      {sessionActive ? (
        <Panel
          title={`SESIÓN ACTIVA: ${selectedGame.name}`}
          cornerTag={`PING: ${streamStats.pingMs}ms · AV1 NVENC`}
          variant="cyan"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Stream Viewport with HUD overlay */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                border: '1px solid var(--neon-cyan)',
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.2)',
                overflow: 'hidden'
              }}
            >
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />

              {/* Stream Telemetry Overlay Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(7, 6, 13, 0.85)',
                  border: '1px solid var(--neon-green)',
                  padding: '0.4rem 0.75rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  gap: '0.75rem'
                }}
              >
                <span>LATENCIA: <strong style={{ color: 'var(--neon-green)' }}>{streamStats.pingMs} MS</strong></span>
                <span>BITRATE: <strong>{streamStats.bitrateMbps} MBPS</strong></span>
                <span>FPS: <strong>60.0</strong></span>
              </div>
            </div>

            {/* Controls Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="cyber-badge green">CANAL DE CONTROL P2P</span>
                <span className="cyber-badge cyan">CODEC: {streamStats.codec}</span>
                <span className="cyber-badge yellow">SERVIDOR: {region.toUpperCase()}</span>
              </div>
              <Button variant="danger" onClick={handleStopSession}>
                ✕ DETENER SESIÓN Y LIBERAR GPU
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Left Column: Server Region & Configuration */}
          <Panel title="CONFIGURACIÓN DEL NODO GPU" cornerTag="ORQUESTADOR" variant="default">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                  ZONA DE DATACENTER:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    variant={region === 'bogota' ? 'primary' : 'ghost'}
                    onClick={() => setRegion('bogota')}
                  >
                    BOGOTÁ EDGE (14 MS)
                  </Button>
                  <Button
                    variant={region === 'useast' ? 'primary' : 'ghost'}
                    onClick={() => setRegion('useast')}
                  >
                    US EAST (38 MS)
                  </Button>
                  <Button
                    variant={region === 'eucentral' ? 'primary' : 'ghost'}
                    onClick={() => setRegion('eucentral')}
                  >
                    EU CENTRAL (85 MS)
                  </Button>
                </div>
              </div>

              <div>
                <HUDBar label="CAPACIDAD DE GPUs DEL CLUSTER" percentage={78} valueText="12/16 GPUs ACTIVAS" color="cyan" />
                <HUDBar label="TIEMPO DE ESPERA PROMEDIO" percentage={5} valueText="< 1.5 SEGUNDOS" color="green" />
              </div>

              <div style={{ background: 'var(--bg-0)', padding: '0.85rem', border: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--neon-cyan)', marginBottom: '0.3rem' }}>// REQUISITOS TÉCNICOS:</div>
                <div style={{ color: 'var(--text-dim)' }}>• Conexión mínima: 15 Mbps de bajada</div>
                <div style={{ color: 'var(--text-dim)' }}>• Soporte WebRTC y Gamepad API en tu navegador</div>
                <div style={{ color: 'var(--text-dim)' }}>• Decodificación H.264 o AV1 activa en tu GPU/CPU</div>
              </div>
            </div>
          </Panel>

          {/* Right Column: Game Selection */}
          <Panel title="TÍTULOS DISPONIBLES PARA CLOUD STREAMING" cornerTag="CATÁLOGO GPU" variant="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {CLOUD_GAMES.map((game) => {
                const isSelected = selectedGame.id === game.id;
                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    style={{
                      padding: '0.85rem',
                      border: isSelected ? '1px solid var(--neon-cyan)' : '1px solid var(--line)',
                      background: isSelected ? 'rgba(0, 240, 255, 0.08)' : 'var(--bg-0)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span className="cyber-badge cyan">{game.badge}</span>
                      </div>
                      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text)' }}>
                        {game.name}
                      </strong>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                        GPU: {game.recommendedGpu}
                      </div>
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'ghost'}
                      loading={connecting && isSelected}
                      onClick={() => {
                        setSelectedGame(game);
                        handleStartSession();
                      }}
                    >
                      ⚡ INICIAR STREAM
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
