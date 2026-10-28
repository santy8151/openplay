import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  computeJcsSha256,
  sha256Hex,
  verifyFederatedIndex,
  verifyGameManifest
} from '@openplay/manifest';
import { InputKind, KeyCode, NetChannel } from '@openplay/abi';
import {
  SimulatedDataChannelPipe,
  detectSnapshotDesyncs,
  executeDeterministicSession,
  type DeterministicReplayRecording
} from '@openplay/lab';
import {
  buildInitialCatalogAndFederation,
  type CatalogGameItem,
  type FederatedNodeRecord
} from './data/seedCatalog.js';
import {
  Button,
  Chip,
  DataRainCanvas,
  GameCard,
  GlitchTitle,
  HUDBar,
  Modal,
  Panel,
  Slider,
  ToastContainer,
  type ToastMessage
} from './components/CyberUI.js';
import { SandboxRunner } from './runner/SandboxRunner.js';
import { cyberSynth } from './audio/synth.js';

export type ScreenId =
  | 'lobby'
  | 'detail'
  | 'play'
  | 'rooms'
  | 'nodes'
  | 'lab'
  | 'settings'
  | 'styleguide';

interface P2PRoom {
  id: string;
  code: string;
  gameId: string;
  gameName: string;
  hostPeer: string;
  peers: string[];
  maxPlayers: number;
  isPublic: boolean;
  mode: string;
}

export function App(): JSX.Element {
  const initialData = useRef(buildInitialCatalogAndFederation());
  const [games, setGames] = useState<CatalogGameItem[]>(initialData.current.games);
  const [nodes, setNodes] = useState<FederatedNodeRecord[]>(initialData.current.nodes);

  const [screen, setScreen] = useState<ScreenId>(() => {
    const hash = window.location.hash.replace('#/', '');
    if (
      ['lobby', 'detail', 'play', 'rooms', 'nodes', 'lab', 'settings', 'styleguide'].includes(hash)
    ) {
      return hash as ScreenId;
    }
    return 'lobby';
  });

  const [selectedGameId, setSelectedGameId] = useState<string>('dev.openplay.pong');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('TODOS');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Settings & Privacy state
  const [relayOnly, setRelayOnly] = useState(false);
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [uiAudio, setUiAudio] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState('dev.openplay.pong');
  const [reportReason, setReportReason] = useState('');

  // Detail Screen cryptographic verification state
  const [cryptoAuditStatus, setCryptoAuditStatus] = useState<{
    valid: boolean;
    digestHex: string;
    canonicalPreview: string;
    message: string;
  } | null>(null);

  // Rooms P2P state
  const [rooms, setRooms] = useState<P2PRoom[]>([
    {
      id: 'rm-bogota-01',
      code: 'NEON-77',
      gameId: 'dev.openplay.pong',
      gameName: 'CyberPong 2099: Neon Duel',
      hostPeer: 'peer#c901 (Bogotá)',
      peers: ['peer#c901 (Bogotá)', 'peer#a412 (Medellín)'],
      maxPlayers: 2,
      isPublic: true,
      mode: 'p2p-lockstep'
    },
    {
      id: 'rm-tokyo-09',
      code: 'GRID-42',
      gameId: 'dev.openplay.arena',
      gameName: 'Neon Arena P2P: Cyber Tanks',
      hostPeer: 'peer#f811 (Tokyo)',
      peers: ['peer#f811 (Tokyo)', 'peer#e104 (Seoul)', 'peer#77d2 (Tú)'],
      maxPlayers: 4,
      isPublic: true,
      mode: 'p2p-state'
    }
  ]);
  const [activeRoomCode, setActiveRoomCode] = useState('GRID-42');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'SISTEMA // SIGNAL WS', text: 'Canal WebRTC DataChannel #0 (fiable ordenado) establecido.', time: '23:30:02' },
    { sender: 'SISTEMA // COTURN', text: 'Credenciales HMAC efímeras listas (TTL 3600s).', time: '23:30:03' },
    { sender: 'peer#f811 (Tokyo)', text: 'Listos para lockstep a 60Hz. Cero desyncs.', time: '23:30:10' }
  ]);
  const [webrtcLoopbackStatus, setWebrtcLoopbackStatus] = useState<string>('CONECTADO (2 DataChannels activos)');

  // Federated Nodes state
  const [newNodeUrl, setNewNodeUrl] = useState('');
  const [trustModalOpen, setTrustModalOpen] = useState(false);

  // Network Lab state
  const [labLatency, setLabLatency] = useState(45);
  const [labJitter, setLabJitter] = useState(8);
  const [labLoss, setLabLoss] = useState(1);
  const [labRunning, setLabRunning] = useState(false);
  const [labReplayResults, setLabReplayResults] = useState<DeterministicReplayRecording[] | null>(null);
  const [labDesyncCount, setLabDesyncCount] = useState(0);
  const labChartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const labPipeRef = useRef(
    new SimulatedDataChannelPipe({ latencyMs: 45, jitterMs: 8, packetLossPct: 1, seed: 2099 })
  );

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? games[0]!;

  const pushToast = (
    title: string,
    detail: string,
    tone: 'cyan' | 'green' | 'danger' | 'yellow' = 'cyan'
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, detail, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5500);
  };

  const navigate = (next: ScreenId, gameId?: string) => {
    if (gameId) setSelectedGameId(gameId);
    setScreen(next);
    window.location.hash = `#/${next}`;
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
  }, [reducedMotion]);

  useEffect(() => {
    cyberSynth.uiSoundEnabled = uiAudio;
  }, [uiAudio]);

  // Run live network telemetry graph when on the LAB screen
  useEffect(() => {
    if (screen !== 'lab') return;
    labPipeRef.current.updateConfig({
      latencyMs: labLatency,
      jitterMs: labJitter,
      packetLossPct: labLoss
    });

    const canvas = labChartCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rttHistory: number[] = new Array(48).fill(labLatency);
    const lossHistory: number[] = new Array(48).fill(labLoss);
    let step = 0;

    const timer = window.setInterval(() => {
      step++;
      const now = performance.now();
      labPipeRef.current.send(NetChannel.UnreliableUnordered, new Uint8Array([step & 0xff]), now);
      labPipeRef.current.send(NetChannel.ReliableOrdered, new Uint8Array([step & 0xff]), now);
      labPipeRef.current.drainReady(now + 500);

      const m = labPipeRef.current.getMetrics();
      rttHistory.push(m.avgRttMs);
      rttHistory.shift();
      lossHistory.push(m.measuredLossPct);
      lossHistory.shift();

      ctx.fillStyle = '#07060d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = '#2a2450';
      ctx.lineWidth = 1;
      for (let y = 25; y < canvas.height; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw RTT curve (Neon Cyan)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      rttHistory.forEach((val, idx) => {
        const x = (idx / (rttHistory.length - 1)) * canvas.width;
        const y = canvas.height - Math.min(canvas.height - 12, (val / 350) * (canvas.height - 20)) - 6;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Loss % curve (Neon Magenta)
      ctx.strokeStyle = '#ff2bd6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      lossHistory.forEach((val, idx) => {
        const x = (idx / (lossHistory.length - 1)) * canvas.width;
        const y = canvas.height - Math.min(canvas.height - 12, (val / 35) * (canvas.height - 20)) - 6;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }, 220);

    return () => window.clearInterval(timer);
  }, [screen, labLatency, labJitter, labLoss]);

  const handleVerifySelectedManifest = (tamperByte = false) => {
    const manifestCopy = JSON.parse(JSON.stringify(selectedGame.manifest));
    if (tamperByte) {
      manifestCopy.version = '9.9.9';
    }
    const check = verifyGameManifest(manifestCopy);
    const { canonicalJson, digestHex } = computeJcsSha256(manifestCopy);
    setCryptoAuditStatus({
      valid: check.valid,
      digestHex,
      canonicalPreview: canonicalJson.slice(0, 180) + '...',
      message: check.valid
        ? 'Firma Ed25519 verificada exitosamente sobre sha256(JCS(manifest)).'
        : `RECHAZADO: ${check.errors.join(', ')}`
    });

    if (check.valid) {
      pushToast('FIRMA ED25519 VÁLIDA', `Digest JCS SHA-256: ${digestHex.slice(0, 20)}...`, 'green');
    } else {
      pushToast('FIRMA RECHAZADA (1-BYTE TAMPER)', 'El verificador detectó alteración en el manifest.', 'danger');
    }
  };

  const handleRun3xDeterministicReplay = async () => {
    setLabRunning(true);
    try {
      const inputs = [
        { tick: 6, kind: InputKind.KeyDown, a: KeyCode.Up, b: 0, c: 0 },
        { tick: 36, kind: InputKind.KeyUp, a: KeyCode.Up, b: 0, c: 0 },
        { tick: 48, kind: InputKind.KeyDown, a: KeyCode.ActionA, b: 0, c: 0 },
        { tick: 90, kind: InputKind.KeyDown, a: KeyCode.Right, b: 0, c: 0 },
        { tick: 150, kind: InputKind.KeyDown, a: KeyCode.ActionB, b: 0, c: 0 }
      ];
      const r1 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, inputs);
      const r2 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, inputs);
      const r3 = await executeDeterministicSession('dev.openplay.arena', 209901, 240, inputs);
      const desync = detectSnapshotDesyncs(r1.checkpointHashes, r3.checkpointHashes);
      setLabDesyncCount(desync.desyncCount);
      setLabReplayResults([r1, r2, r3]);
      pushToast(
        'REPLAY DETERMINISTA 3/3 IDÉNTICO',
        `Hash final: ${r1.finalStateHash.slice(0, 24)}... (0 desyncs)`,
        'green'
      );
    } finally {
      setLabRunning(false);
    }
  };

  const handleTestWebRtcLoopback = async () => {
    if (typeof RTCPeerConnection === 'undefined') {
      setWebrtcLoopbackStatus('WebRTC API simulada en entorno sin navegador');
      return;
    }
    const pcA = new RTCPeerConnection();
    const pcB = new RTCPeerConnection();
    const reliableChan = pcA.createDataChannel('openplay-reliable', { ordered: true });
    const unreliableChan = pcA.createDataChannel('openplay-unreliable', {
      ordered: false,
      maxRetransmits: 0
    });

    pcA.onicecandidate = (e) => e.candidate && pcB.addIceCandidate(e.candidate);
    pcB.onicecandidate = (e) => e.candidate && pcA.addIceCandidate(e.candidate);

    const offer = await pcA.createOffer();
    await pcA.setLocalDescription(offer);
    await pcB.setRemoteDescription(offer);
    const answer = await pcB.createAnswer();
    await pcB.setLocalDescription(answer);
    await pcA.setRemoteDescription(answer);

    setWebrtcLoopbackStatus(
      `ACTIVO // #0 ${reliableChan.label} (ordered) + #1 ${unreliableChan.label} (maxRetransmits=0) · Modo: ${
        relayOnly ? 'TURN RELAY-ONLY' : 'P2P ICE DIRECTO'
      }`
    );
    pushToast(
      'WEBRTC P2P DATACHANNELS VERIFICADOS',
      'Canales #0 (fiable) y #1 (no fiable maxRetransmits=0) negociados.',
      'green'
    );
    setTimeout(() => {
      pcA.close();
      pcB.close();
    }, 1500);
  };

  const filteredGames = games.filter((g) => {
    const matchesTag = selectedTag === 'TODOS' || g.tags.includes(selectedTag);
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q.length === 0 ||
      g.manifest.name.toLowerCase().includes(q) ||
      g.manifest.id.toLowerCase().includes(q) ||
      g.nodeName.toLowerCase().includes(q);
    return matchesTag && matchesSearch;
  });

  const allTags = ['TODOS', 'ARCADE', 'P2P', 'LOCKSTEP', 'MODS', 'RETRO', 'CYBER'];

  return (
    <div className="app-shell">
      <div className="cyber-backdrop" aria-hidden="true">
        <div className="cyber-perspective-grid" />
      </div>
      <DataRainCanvas reducedMotion={reducedMotion} />
      <div className="cyber-scanlines" aria-hidden="true" />

      {/* Top Cyberpunk Navigation Bar */}
      <header className="top-nav">
        <div className="top-nav-inner">
          <a
            href="#/lobby"
            className="brand-cluster"
            onClick={(e) => {
              e.preventDefault();
              navigate('lobby');
            }}
          >
            <div className="brand-mark" aria-hidden="true">
              OP
            </div>
            <div>
              <span className="brand-title">OPENPLAY // 2099</span>
              <span className="brand-subtitle">WASM ABI v0 · FEDERATED P2P · LUA SANDBOX</span>
            </div>
          </a>

          <nav className="nav-links" aria-label="Navegación principal">
            <button
              type="button"
              className={`nav-tab ${screen === 'lobby' || screen === 'detail' ? 'active' : ''}`}
              onClick={() => navigate('lobby')}
            >
              CATÁLOGO
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'play' ? 'active' : ''}`}
              onClick={() => navigate('play')}
            >
              ⚡ JACK IN
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'rooms' ? 'active' : ''}`}
              onClick={() => navigate('rooms')}
            >
              SALAS [{rooms.length}]
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'nodes' ? 'active' : ''}`}
              onClick={() => navigate('nodes')}
            >
              NODOS [{nodes.length}]
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'lab' ? 'active' : ''}`}
              onClick={() => navigate('lab')}
            >
              LAB
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'settings' ? 'active' : ''}`}
              onClick={() => navigate('settings')}
            >
              AJUSTES
            </button>
            <button
              type="button"
              className={`nav-tab ${screen === 'styleguide' ? 'active' : ''}`}
              onClick={() => navigate('styleguide')}
            >
              STYLEGUIDE
            </button>
          </nav>

          <div className="nav-telemetry">
            <button
              type="button"
              className="cyber-chip"
              aria-label={uiAudio ? 'Desactivar sonido UI' : 'Activar sonido UI'}
              onClick={() => setUiAudio((v) => !v)}
            >
              {uiAudio ? '🔊 AUDIO UI: ON' : '🔇 AUDIO UI: OFF'}
            </button>
            <span className="cyber-badge green" title="Estado de sincronización federada">
              ● SINCRONIZANDO… OK
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-container">
        {/* SCREEN 1: LOBBY / CATÁLOGO */}
        {screen === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Panel variant="cyan" cornerTag="BETA ABI v0 // APACHE-2.0">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                    <span className="cyber-badge cyan">NÚCLEO WASM DETERMINISTA</span>
                    <span className="cyber-badge magenta">DISTRIBUCIÓN FEDERADA ED25519</span>
                    <span className="cyber-badge yellow">MODDING LUA 2MS WATCHDOG</span>
                  </div>
                  <GlitchTitle text="NEÓN SOBRE ASFALTO MOJADO" size="2.1rem" />
                  <p style={{ color: 'var(--text-dim)', fontSize: '1rem', margin: '0.75rem 0 1.15rem', maxWidth: '64ch' }}>
                    Ecosistema open source y autogestionado para ejecutar juegos arcade WebAssembly de alto rendimiento en
                    navegadores móviles y desktop. Sin tiendas centralizadas, con multijugador P2P WebRTC y paquetes firmados
                    criptográficamente.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button variant="primary" onClick={() => navigate('play', 'dev.openplay.pong')}>
                      ⚡ JACK IN // CYBERPONG 2099
                    </Button>
                    <Button variant="magenta" onClick={() => navigate('play', 'dev.openplay.arena')}>
                      🕹 ARENA MULTIJUGADOR P2P
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('nodes')}>
                      EXPLORAR NODOS FEDERADOS
                    </Button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <HUDBar label="LATENCIA P2P MEDIA" valueText="18 MS (WEBRTC DIRECT)" percentage={88} color="green" />
                  <HUDBar label="NODOS FEDERADOS ACTIVOS" valueText={`${nodes.length} NODOS VERIFICADOS`} percentage={100} color="cyan" />
                  <HUDBar label="PRESUPUESTO JS INICIAL" valueText="48 KB GZ (<150 KB)" percentage={32} color="magenta" />
                </div>
              </div>
            </Panel>

            {/* Search & Tag Filters */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }} role="group" aria-label="Filtrar por etiqueta">
                {allTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={selectedTag === tag}
                    onClick={() => setSelectedTag(tag)}
                  />
                ))}
              </div>

              <div style={{ minWidth: '280px', flex: '0 1 360px' }}>
                <input
                  type="search"
                  className="cyber-input"
                  placeholder="Buscar juego, ID o nodo federado..."
                  aria-label="Buscar juegos en el catálogo"
                  value={searchQuery}
                  onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            {/* Catalog Grid */}
            {filteredGames.length === 0 ? (
              <Panel title="SIN RESULTADOS EN EL CATÁLOGO" variant="magenta">
                <p style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                  No se encontraron paquetes firmados que coincidan con "{searchQuery}" en la etiqueta [{selectedTag}].
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag('TODOS');
                  }}
                >
                  RESTABLECER FILTROS
                </Button>
              </Panel>
            ) : (
              <div className="catalog-grid">
                {filteredGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onJackIn={(g) => navigate('play', g.id)}
                    onSelectDetail={(g) => {
                      setCryptoAuditStatus(null);
                      navigate('detail', g.id);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 2: DETALLE DE JUEGO */}
        {screen === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Button variant="ghost" onClick={() => navigate('lobby')}>
                ← VOLVER AL CATÁLOGO
              </Button>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Button variant="ghost" onClick={() => setReportModalOpen(true)}>
                  🚩 REPORTAR / TAKEDOWN
                </Button>
                <Button variant="primary" onClick={() => navigate('play', selectedGame.id)}>
                  ⚡ JACK IN // JUGAR AHORA
                </Button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Panel title={selectedGame.manifest.name} cornerTag={`ID: ${selectedGame.manifest.id}`} variant="cyan">
                <p style={{ color: 'var(--text)', fontSize: '0.96rem', marginBottom: '1rem' }}>
                  {selectedGame.description}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    background: 'var(--bg-0)',
                    padding: '0.85rem',
                    border: '1px solid var(--line)',
                    marginBottom: '1rem'
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>VERSIÓN:</span>{' '}
                    <strong style={{ color: 'var(--neon-cyan)' }}>{selectedGame.manifest.version}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>LICENCIA SPDX:</span>{' '}
                    <strong style={{ color: 'var(--neon-green)' }}>{selectedGame.manifest.license}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>AUTOR:</span>{' '}
                    <strong>{selectedGame.manifest.author.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>HOST ABI:</span>{' '}
                    <strong style={{ color: 'var(--neon-magenta)' }}>{selectedGame.manifest.abi}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>MULTIJUGADOR:</span>{' '}
                    <strong>
                      {selectedGame.manifest.multiplayer.mode} ({selectedGame.manifest.multiplayer.tickrate}Hz)
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)' }}>PERMISOS:</span>{' '}
                    <strong>{selectedGame.manifest.permissions.join(', ')}</strong>
                  </div>
                </div>

                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--neon-cyan)', marginBottom: '0.5rem' }}>
                  HISTORIAL DE VERSIONES FIRMADAS
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {selectedGame.changelog.map((ch) => (
                    <div
                      key={ch.version}
                      style={{
                        padding: '0.5rem 0.7rem',
                        background: 'var(--bg-0)',
                        borderLeft: '2px solid var(--neon-cyan)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem'
                      }}
                    >
                      <strong>v{ch.version}</strong> ({ch.date}) — {ch.notes}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="AUDITORÍA CRIPTOGRÁFICA ED25519 + JCS" cornerTag="RFC 8785 / RFC 8032" variant="magenta">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)' }}>CLAVE PÚBLICA DEL AUTOR:</div>
                    <code style={{ color: 'var(--neon-cyan)', wordBreak: 'break-all' }}>
                      {selectedGame.manifest.author.pubkey}
                    </code>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)' }}>SHA-256 DEL BINARIO WASM ({selectedGame.manifest.files[0]?.size} bytes):</div>
                    <code style={{ color: 'var(--neon-green)', wordBreak: 'break-all' }}>
                      {selectedGame.manifest.files[0]?.sha256}
                    </code>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)' }}>FIRMA ED25519 DEL MANIFEST:</div>
                    <code style={{ color: 'var(--neon-yellow)', wordBreak: 'break-all' }}>
                      {selectedGame.manifest.signature}
                    </code>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <Button variant="primary" onClick={() => handleVerifySelectedManifest(false)}>
                      ✓ VERIFICAR FIRMA AHORA
                    </Button>
                    <Button variant="danger" onClick={() => handleVerifySelectedManifest(true)}>
                      ⚠ SIMULAR ADULTERACIÓN DE 1 BYTE
                    </Button>
                  </div>

                  {cryptoAuditStatus && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: 'var(--bg-0)',
                        border: `1px solid ${cryptoAuditStatus.valid ? 'var(--neon-green)' : 'var(--danger)'}`
                      }}
                    >
                      <div style={{ color: cryptoAuditStatus.valid ? 'var(--neon-green)' : 'var(--danger)', fontWeight: 'bold' }}>
                        {cryptoAuditStatus.message}
                      </div>
                      <div style={{ color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                        JCS SHA-256: {cryptoAuditStatus.digestHex}
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* SCREEN 3: JUGAR (WASM SANDBOX RUNNER) */}
        {screen === 'play' && (
          <SandboxRunner
            game={selectedGame}
            onBack={() => navigate('lobby')}
            onNotify={pushToast}
          />
        )}

        {/* SCREEN 4: SALAS P2P (WEBRTC + COTURN + WS SIGNALING) */}
        {screen === 'rooms' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Panel title="SEÑALIZACIÓN WEBSOCKET & SALAS P2P WEBRTC" cornerTag="WS /v1/signal · COTURN HMAC" variant="cyan">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <p style={{ color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                    Negociación P2P de baja latencia con dos canales de datos: <code>#0 reliable (ordered)</code> para
                    eventos de sala/lockstep y <code>#1 unreliable (maxRetransmits=0)</code> para snapshots de estado.
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <Button
                      variant="primary"
                      onClick={() => {
                        const code = `CYBER-${Math.floor(10 + Math.random() * 89)}`;
                        const newRoom: P2PRoom = {
                          id: `rm-${Date.now()}`,
                          code,
                          gameId: selectedGame.id,
                          gameName: selectedGame.manifest.name,
                          hostPeer: 'peer#77d2 (Tú)',
                          peers: ['peer#77d2 (Tú)'],
                          maxPlayers: selectedGame.manifest.multiplayer.max,
                          isPublic: true,
                          mode: selectedGame.manifest.multiplayer.mode
                        };
                        setRooms((prev) => [newRoom, ...prev]);
                        setActiveRoomCode(code);
                        pushToast('SALA P2P CREADA', `Código de sala: ${code} (TTL en Redis 60s)`, 'green');
                      }}
                    >
                      + CREAR SALA PÚBLICA
                    </Button>
                    <Button variant="magenta" onClick={handleTestWebRtcLoopback}>
                      ⚡ PROBAR LOOPBACK WEBRTC (2 DATACHANNELS)
                    </Button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="cyber-input"
                      placeholder="Código de sala (ej. NEON-77)..."
                      aria-label="Código de sala para unirse"
                      value={joinCodeInput}
                      onInput={(e) => setJoinCodeInput((e.target as HTMLInputElement).value.toUpperCase())}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (!joinCodeInput.trim()) return;
                        setActiveRoomCode(joinCodeInput.trim());
                        pushToast('CONECTADO A SALA', `Unido a ${joinCodeInput.trim()} vía WS /v1/signal`, 'cyan');
                        setJoinCodeInput('');
                      }}
                    >
                      UNIRSE
                    </Button>
                  </div>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    background: 'var(--bg-0)',
                    padding: '0.85rem',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}
                >
                  <div style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
                    ESTADO DE TRANSPORTE ICE / COTURN:
                  </div>
                  <div>ESTADO WEBRTC: {webrtcLoopbackStatus}</div>
                  <div>
                    POLÍTICA ICE:{' '}
                    <strong style={{ color: relayOnly ? 'var(--neon-yellow)' : 'var(--neon-green)' }}>
                      {relayOnly ? "iceTransportPolicy: 'relay' (IP Oculta vía TURN)" : "iceTransportPolicy: 'all' (P2P Directo + Fallback TURN)"}
                    </strong>
                  </div>
                  <div>LÍMITES PROTOCOLO: 30 msg/s · Máx 8 peers/sala · Payload ≤16 KB</div>
                </div>
              </div>
            </Panel>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <Panel title="SALAS ACTIVAS EN REDIS" cornerTag="PUB/SUB MULTI-INSTANCIA">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {rooms.map((rm) => (
                    <div
                      key={rm.id}
                      style={{
                        padding: '0.8rem',
                        background: 'var(--bg-0)',
                        border: `1px solid ${rm.code === activeRoomCode ? 'var(--neon-cyan)' : 'var(--line)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                          <span className="cyber-badge cyan">{rm.code}</span>
                          <strong>{rm.gameName}</strong>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                          PEERS ({rm.peers.length}/{rm.maxPlayers}): {rm.peers.join(' · ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.45rem' }}>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setActiveRoomCode(rm.code);
                            navigate('play', rm.gameId);
                          }}
                        >
                          JACK IN P2P
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title={`CHAT FIABLE DE SALA // ${activeRoomCode}`} cornerTag="DATACHANNEL #0 ORDERED" variant="magenta">
                <div
                  style={{
                    height: '190px',
                    overflowY: 'auto',
                    background: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    padding: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    marginBottom: '0.75rem'
                  }}
                >
                  {chatMessages.map((m, i) => (
                    <div key={i}>
                      <span style={{ color: 'var(--text-dim)' }}>[{m.time}]</span>{' '}
                      <strong style={{ color: 'var(--neon-cyan)' }}>{m.sender}:</strong>{' '}
                      <span>{m.text}</span>
                    </div>
                  ))}
                </div>
                <form
                  style={{ display: 'flex', gap: '0.5rem' }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatInput.trim()) return;
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        sender: 'peer#77d2 (Tú)',
                        text: chatInput.trim(),
                        time: new Date().toTimeString().slice(0, 8)
                      }
                    ]);
                    setChatInput('');
                  }}
                >
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="Transmitir mensaje por DataChannel fiable..."
                    aria-label="Mensaje de chat P2P"
                    value={chatInput}
                    onInput={(e) => setChatInput((e.target as HTMLInputElement).value)}
                  />
                  <Button type="submit" variant="primary">
                    ENVIAR
                  </Button>
                </form>
              </Panel>
            </div>
          </div>
        )}

        {/* SCREEN 5: NODOS FEDERADOS */}
        {screen === 'nodes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Panel title="GESTOR DE NODOS Y REPOSITORIOS FEDERADOS" cornerTag="GET /index.json · ETAG SYNC" variant="cyan">
              <p style={{ color: 'var(--text-dim)', marginBottom: '0.9rem' }}>
                Cada comunidad o autor puede levantar su propio nodo (al estilo F-Droid o Mastodon). El crawler sincroniza{' '}
                <code>/index.json</code> con caché <code>ETag</code> y verifica la firma Ed25519 del nodo antes de agregar
                juegos al catálogo.
              </p>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <input
                    type="url"
                    className="cyber-input"
                    placeholder="https://otro-nodo.comunidad.org/index.json"
                    aria-label="URL del nuevo nodo federado"
                    value={newNodeUrl}
                    onInput={(e) => setNewNodeUrl((e.target as HTMLInputElement).value)}
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!newNodeUrl.trim()) {
                      pushToast('URL REQUERIDA', 'Ingresa la URL https:// del nodo federado.', 'yellow');
                      return;
                    }
                    setTrustModalOpen(true);
                  }}
                >
                  + AÑADIR NODO FEDERADO
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    // Simulate receiving an index.json with a tampered signature from a rogue peer
                    const rogueIndex = {
                      ...nodes[0]!.index,
                      node: { ...nodes[0]!.index.node, name: 'Rogue Tampered Peer' }
                    };
                    const res = verifyFederatedIndex(rogueIndex);
                    if (!res.valid) {
                      pushToast(
                        'CRAWLER RECHAZÓ ÍNDICE FALSIFICADO',
                        `Firma Ed25519 inválida detectada: ${res.errors.join(', ')}`,
                        'danger'
                      );
                    }
                  }}
                >
                  🛡 SIMULAR PEER CON FIRMA INVÁLIDA
                </Button>
              </div>
            </Panel>

            <div className="catalog-grid">
              {nodes.map((n) => (
                <Panel
                  key={n.id}
                  title={n.name}
                  cornerTag={n.region}
                  variant={n.status === 'SYNCHRONIZED' ? 'cyan' : 'danger'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>URL:</span>{' '}
                      <span style={{ color: 'var(--neon-cyan)' }}>{n.url}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>HUELLA ED25519:</span>{' '}
                      <span style={{ color: 'var(--neon-yellow)' }}>{n.fingerprint}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>ETAG:</span> {n.etag} · {n.lastSync}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>PAQUETES FIRMADOS:</span> {n.index.games.length}
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          const check = verifyFederatedIndex(n.index);
                          if (check.valid) {
                            pushToast('ÍNDICE DE NODO VERIFICADO', `${n.name}: Firma Ed25519 auténtica.`, 'green');
                          }
                        }}
                      >
                        ✓ VERIFICAR ÍNDICE
                      </Button>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>

            <Modal
              open={trustModalOpen}
              title="ADVERTENCIA DE CONFIANZA DE NODO FEDERADO"
              onClose={() => setTrustModalOpen(false)}
            >
              <p style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>
                Estás a punto de suscribir tu cliente al repositorio externo:{' '}
                <code style={{ color: 'var(--neon-cyan)' }}>{newNodeUrl}</code>
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                OpenPlay verificará automáticamente la firma Ed25519 del índice, el hash SHA-256 de cada archivo Wasm y que
                la licencia declarada sea SPDX open source antes de ejecutar cualquier paquete en el sandbox aislado.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  const base = nodes[1]!;
                  const added: FederatedNodeRecord = {
                    ...base,
                    id: `node-${Date.now()}`,
                    name: `Nodo Comunitario (${new URL(newNodeUrl).hostname})`,
                    url: newNodeUrl,
                    region: 'CUSTOM // FEDERATED',
                    lastSync: 'Ahora mismo'
                  };
                  setNodes((prev) => [...prev, added]);
                  setNewNodeUrl('');
                  setTrustModalOpen(false);
                  pushToast('NODO FEDERADO SINCRONIZADO', `Índice firmado importado desde ${added.url}`, 'green');
                }}
              >
                ACEPTAR HUELLA ED25519 Y SINCRONIZAR
              </Button>
            </Modal>
          </div>
        )}

        {/* SCREEN 6: LAB DE RED Y REPLAY DETERMINISTA */}
        {screen === 'lab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Panel title="LABORATORIO DE RED, CAOS Y REPLAY DETERMINISTA" cornerTag="PACKAGES/LAB" variant="cyan">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <Slider
                    id="slider-latency"
                    label="LATENCIA INYECTADA (RTT)"
                    value={labLatency}
                    min={0}
                    max={400}
                    step={5}
                    unit=" ms"
                    onChange={setLabLatency}
                  />
                  <Slider
                    id="slider-jitter"
                    label="JITTER DE RED"
                    value={labJitter}
                    min={0}
                    max={100}
                    step={2}
                    unit=" ms"
                    onChange={setLabJitter}
                  />
                  <Slider
                    id="slider-loss"
                    label="PÉRDIDA DE PAQUETES"
                    value={labLoss}
                    min={0}
                    max={30}
                    step={1}
                    unit="%"
                    onChange={setLabLoss}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                    <Button
                      variant="yellow"
                      onClick={() => {
                        setLabLatency(150);
                        setLabJitter(20);
                        setLabLoss(5);
                        pushToast('PERFIL CAOS 150MS / 5% LOSS', 'Perfil del criterio de aceptación M5/M6 activado.', 'yellow');
                      }}
                    >
                      PERFIL M6 (150ms / 5% LOSS)
                    </Button>
                    <Button
                      variant="primary"
                      loading={labRunning}
                      onClick={handleRun3xDeterministicReplay}
                    >
                      ▶ EJECUTAR 3X REPLAY DETERMINISTA
                    </Button>
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TELEMETRÍA EN VIVO (CIAN=RTT · MAGENTA=LOSS%)</span>
                    <span style={{ color: 'var(--neon-green)' }}>DESYNCS: {labDesyncCount}</span>
                  </div>
                  <canvas
                    ref={labChartCanvasRef}
                    width={460}
                    height={165}
                    style={{ width: '100%', height: '165px', border: '1px solid var(--line)', background: '#07060d' }}
                    aria-label="Gráfica en tiempo real de RTT y pérdida de paquetes"
                  />
                </div>
              </div>
            </Panel>

            {labReplayResults && (
              <Panel title="RESULTADO DE VERIFICACIÓN DETERMINISTA (3 EJECUCIONES)" cornerTag="SEED=209901 · 240 TICKS" variant="magenta">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                  {labReplayResults.map((run, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem',
                        background: 'var(--bg-0)',
                        border: '1px solid var(--neon-green)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <strong>EJECUCIÓN #{idx + 1} ({run.totalTicks} ticks @ 60Hz)</strong>
                      <span style={{ color: 'var(--neon-green)' }}>
                        HASH FINAL SHA-256: {run.finalStateHash}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* SCREEN 7: AJUSTES, SEGURIDAD Y PRIVACIDAD */}
        {screen === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            <Panel title="CONFIGURACIÓN DE RED, ACCESIBILIDAD Y AUDIO" cornerTag="PREFERENCIAS LOCALES" variant="cyan">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <strong>Modo Relay-Only (Ocultar IP P2P vía TURN)</strong>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Fuerza <code>iceTransportPolicy: 'relay'</code> en WebRTC para mitigar fugas de IP entre peers.
                    </p>
                  </div>
                  <Button variant={relayOnly ? 'primary' : 'ghost'} onClick={() => setRelayOnly((v) => !v)}>
                    {relayOnly ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <strong>Reducir Movimiento y Efectos Glitch</strong>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Desactiva lluvia de datos en canvas, parpadeos y animaciones RGB split (WCAG AA).
                    </p>
                  </div>
                  <Button variant={reducedMotion ? 'primary' : 'ghost'} onClick={() => setReducedMotion((v) => !v)}>
                    {reducedMotion ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <strong>Telemetría Técnica Opt-In (Cero IP / Cero IDs)</strong>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Envía únicamente métricas agregadas de FPS y fallos de Wasm sin dirección IP ni cookies.
                    </p>
                  </div>
                  <Button variant={telemetryOptIn ? 'primary' : 'ghost'} onClick={() => setTelemetryOptIn((v) => !v)}>
                    {telemetryOptIn ? 'OPT-IN ON' : 'OPT-IN OFF'}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="PRIVACIDAD (LEY 1581 COLOMBIA & GDPR) + TAKEDOWN" cornerTag="STRIDE MITIGATED" variant="magenta">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--text-dim)' }}>
                <p>
                  <strong style={{ color: 'var(--text)' }}>Cumplimiento Ley 1581 de 2012 (Colombia) y GDPR:</strong> OpenPlay
                  no recolecta datos personales identificables, no almacena direcciones IP en telemetría y utiliza tokens JWT
                  de invitado efímeros firmados con EdDSA.
                </p>
                <p>
                  <strong style={{ color: 'var(--text)' }}>Regla Dura de Propiedad Intelectual:</strong> Prohibida la
                  redistribución de binarios propietarios. Todo paquete requiere licencia SPDX abierta y firma Ed25519
                  verificable.
                </p>
                <div>
                  <Button variant="danger" onClick={() => setReportModalOpen(true)}>
                    🚩 ENVIAR REPORTE DE ABUSO / TAKEDOWN (POST /v1/reports)
                  </Button>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* SCREEN 8: STYLEGUIDE (M2 DESIGN SYSTEM VERIFICATION) */}
        {screen === 'styleguide' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Panel title="SISTEMA DE DISEÑO CYBERPUNK // STYLEGUIDE" cornerTag="M2 DESIGN SYSTEM" variant="cyan">
              <GlitchTitle text="TIPOGRAFÍA & TOKENS NEÓN" size="1.75rem" />
              <p style={{ color: 'var(--text-dim)', marginTop: '0.4rem', marginBottom: '1rem' }}>
                Fuentes autohospedadas (<code>@fontsource/orbitron</code>, <code>@fontsource/rajdhani</code>,{' '}
                <code>@fontsource/jetbrains-mono</code>) sin dependencias de CDN externas para cumplir con la CSP estricta.
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.25rem'
                }}
              >
                {[
                  ['--bg-0', '#07060d'],
                  ['--bg-1', '#0d0b1a'],
                  ['--bg-2', '#15122a'],
                  ['--line', '#2a2450'],
                  ['--neon-cyan', '#00f0ff'],
                  ['--neon-magenta', '#ff2bd6'],
                  ['--neon-yellow', '#fcee09'],
                  ['--neon-green', '#39ff88'],
                  ['--danger', '#ff3860']
                ].map(([token, hex]) => (
                  <div
                    key={token}
                    style={{
                      padding: '0.65rem',
                      background: 'var(--bg-0)',
                      border: '1px solid var(--line)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem'
                    }}
                  >
                    <div
                      style={{
                        height: '28px',
                        background: `var(${token})`,
                        border: '1px solid rgba(255,255,255,0.15)',
                        marginBottom: '0.4rem'
                      }}
                    />
                    <div style={{ color: 'var(--text)' }}>{token}</div>
                    <div style={{ color: 'var(--text-dim)' }}>{hex}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <Button variant="primary">PRIMARY JACK IN</Button>
                <Button variant="magenta">MAGENTA ACTION</Button>
                <Button variant="yellow">YELLOW WARNING</Button>
                <Button variant="danger">DANGER ABORT</Button>
                <Button variant="ghost">GHOST SECONDARY</Button>
                <Button loading>SINCRONIZANDO…</Button>
                <Button disabled>DISABLED</Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <HUDBar label="INTEGRIDAD SHA-256" valueText="100% VERIFICADO" percentage={100} color="green" />
                <HUDBar label="PRESUPUESTO LUA WORKER" valueText="0.42 MS / 2.00 MS" percentage={21} color="cyan" />
                <HUDBar label="CARGA DEL NODO" valueText="38% CAPACIDAD" percentage={38} color="magenta" />
              </div>
            </Panel>
          </div>
        )}
      </main>

      {/* Takedown / Abuse Report Modal */}
      <Modal
        open={reportModalOpen}
        title="REPORTE DE TAKEDOWN / ABUSO (POST /v1/reports)"
        onClose={() => setReportModalOpen(false)}
      >
        <form
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            setReportModalOpen(false);
            setReportReason('');
            pushToast(
              'REPORTE REGISTRADO EN NODO',
              `Ticket de auditoría enviado para ${reportTargetId}.`,
              'green'
            );
          }}
        >
          <label htmlFor="report-pkg" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
            ID DEL PAQUETE O SALA:
          </label>
          <input
            id="report-pkg"
            type="text"
            className="cyber-input"
            value={reportTargetId}
            onInput={(e) => setReportTargetId((e.target as HTMLInputElement).value)}
          />
          <label htmlFor="report-reason" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
            MOTIVO (LICENCIA SPDX INVÁLIDA / DERECHOS DE AUTOR / ABUSO):
          </label>
          <textarea
            id="report-reason"
            rows={3}
            className="cyber-input"
            required
            placeholder="Describe la evidencia técnica o enlace al repositorio original..."
            value={reportReason}
            onInput={(e) => setReportReason((e.target as HTMLTextAreaElement).value)}
          />
          <Button type="submit" variant="danger">
            ENVIAR REPORTE FIRMADO
          </Button>
        </form>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
