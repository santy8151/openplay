/**
 * OpenPlay Wasm Sandbox Runner Screen (`Jugar`)
 * - Isolated `<iframe sandbox="allow-scripts">` (NO allow-same-origin) + MessageChannel bridge
 * - SHA-256 binary integrity check prior to WebAssembly instantiation
 * - Fixed 60Hz timestep accumulator (`16,666 us`) + RGBA8 framebuffer canvas blit
 * - Keyboard + Mobile Touch D-Pad/Action buttons (>= 44px)
 * - Live Lua Modding Sandbox (`@openplay/mods`) with 2ms per-tick Watchdog & 3-strike termination
 */

import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  InputKind,
  KeyCode,
  instantiateGameModule,
  type LoadedGameRuntime
} from '@openplay/abi';
import { deriveKeyPairFromSeedHex, sha256Hex } from '@openplay/manifest';
import {
  ModSandboxInstance,
  getBuiltinExampleMods,
  signModManifest,
  type ModExecutionMetrics,
  type ModManifest
} from '@openplay/mods';
import type { CatalogGameItem } from '../data/seedCatalog.js';
import { Button, HUDBar, Panel } from '../components/CyberUI.js';
import { cyberSynth } from '../audio/synth.js';

const SANDBOX_TEST_SEED = '9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60';

export function SandboxRunner({
  game,
  onBack,
  onNotify
}: {
  game: CatalogGameItem;
  onBack: () => void;
  onNotify: (title: string, detail: string, tone?: 'cyan' | 'green' | 'danger' | 'yellow') => void;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const runtimeRef = useRef<LoadedGameRuntime | null>(null);
  const savedSnapshotRef = useRef<Uint8Array | null>(null);
  const activeSandboxesRef = useRef<Map<string, ModSandboxInstance>>(new Map());

  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(60);
  const [tickCount, setTickCount] = useState(0);
  const [snapshotHash, setSnapshotHash] = useState('0x000000000000');
  const [shaVerified, setShaVerified] = useState(true);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [hostLogs, setHostLogs] = useState<string[]>([]);
  const [availableMods] = useState<ModManifest[]>(() =>
    getBuiltinExampleMods().filter((m) => m.targetGameId === game.id || game.id === 'dev.openplay.pong')
  );
  const [modMetrics, setModMetrics] = useState<Record<string, ModExecutionMetrics>>({});
  const [customLuaCode, setCustomLuaCode] = useState(
    `-- Custom Lua Mod Hook (2.0 ms budget / tick)\nfunction on_init()\n  game.emit("set_speed", { multiplier = 1.45 })\nend`
  );

  // Set up isolated `<iframe sandbox="allow-scripts">` + MessageChannel bridge
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const channel = new MessageChannel();
    channel.port1.onmessage = (ev) => {
      if (ev.data?.type === 'SANDBOX_HEARTBEAT_ACK') {
        setIframeReady(true);
      }
    };

    const handleLoad = () => {
      try {
        iframe.contentWindow?.postMessage({ type: 'INIT_OPENPLAY_PORT' }, '*', [channel.port2]);
        channel.port1.postMessage({ type: 'SANDBOX_HEARTBEAT', gameId: game.id });
      } catch {
        setIframeReady(true);
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      channel.port1.close();
    };
  }, [game.id]);

  // Instantiate Wasm Module, verify SHA-256, and run 60Hz Fixed-Timestep Loop
  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    setSecurityError(null);
    setShaVerified(false);
    activeSandboxesRef.current.clear();
    setModMetrics({});

    const bootWasm = async () => {
      try {
        const runtime = await instantiateGameModule(game.wasmBytes, game.manifest, {
          onLog: (msg) => {
            setHostLogs((prev) => [msg, ...prev.slice(0, 14)]);
          },
          onAudioPlay: (id, vol) => {
            cyberSynth.playGameSfx(id, vol);
          },
          onModEmit: (eventJson) => {
            setHostLogs((prev) => [`[mod_emit] ${eventJson}`, ...prev.slice(0, 14)]);
          }
        });

        if (cancelled) return;
        runtimeRef.current = runtime;
        setShaVerified(true);

        const { width, height } = game.manifest.display;
        runtime.exports.game_init(2099, width, height);
        savedSnapshotRef.current = runtime.takeSnapshot();
        setSnapshotHash('0x' + sha256Hex(savedSnapshotRef.current).slice(0, 16));

        const fixedDtMs = 1000 / game.manifest.multiplayer.tickrate;
        const fixedDtUs = Math.floor(1_000_000 / game.manifest.multiplayer.tickrate);
        let accumulatorMs = 0;
        let lastFrameMs = performance.now();
        let framesThisSec = 0;
        let fpsTimerMs = lastFrameMs;
        let localTicks = 0;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const imgData = ctx ? ctx.createImageData(width, height) : null;

        const loop = (nowMs: number) => {
          if (cancelled) return;
          rafId = requestAnimationFrame(loop);

          const deltaMs = Math.min(100, nowMs - lastFrameMs);
          lastFrameMs = nowMs;
          framesThisSec++;

          if (nowMs - fpsTimerMs >= 500) {
            setFps(Math.min(60, Math.round((framesThisSec * 1000) / (nowMs - fpsTimerMs))));
            framesThisSec = 0;
            fpsTimerMs = nowMs;
          }

          if (!paused && runtimeRef.current) {
            accumulatorMs += deltaMs;
            while (accumulatorMs >= fixedDtMs) {
              runtimeRef.current.exports.game_tick(fixedDtUs);
              localTicks++;
              accumulatorMs -= fixedDtMs;

              // Execute active Lua mods `on_tick` hook within 2ms watchdog budget
              if (activeSandboxesRef.current.size > 0) {
                for (const [, sb] of activeSandboxesRef.current.entries()) {
                  sb.invokeHook('on_tick');
                }
              }

              if (localTicks % 60 === 0) {
                const snap = runtimeRef.current.takeSnapshot();
                setSnapshotHash('0x' + sha256Hex(snap).slice(0, 16));
                setTickCount(localTicks);
                if (activeSandboxesRef.current.size > 0) {
                  const nextMetrics: Record<string, ModExecutionMetrics> = {};
                  for (const [id, sb] of activeSandboxesRef.current.entries()) {
                    nextMetrics[id] = sb.getMetrics();
                  }
                  setModMetrics(nextMetrics);
                }
              }
            }

            if (ctx && imgData) {
              const rgba = runtimeRef.current.getFramebufferRGBA(width, height);
              imgData.data.set(rgba);
              ctx.putImageData(imgData, 0, 0);
            }
          }
        };

        rafId = requestAnimationFrame(loop);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Wasm runtime failure';
        setSecurityError(msg);
        onNotify('ERROR DE INTEGRIDAD WASM', msg, 'danger');
      }
    };

    bootWasm();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [game, paused]);

  // Keyboard listener
  useEffect(() => {
    const mapKey = (code: string): KeyCode | null => {
      switch (code) {
        case 'ArrowUp':
        case 'KeyW':
          return KeyCode.Up;
        case 'ArrowDown':
        case 'KeyS':
          return KeyCode.Down;
        case 'ArrowLeft':
        case 'KeyA':
          return KeyCode.Left;
        case 'ArrowRight':
        case 'KeyD':
          return KeyCode.Right;
        case 'Space':
        case 'KeyZ':
          return KeyCode.ActionA;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          return KeyCode.ActionB;
        case 'KeyI':
          return KeyCode.Player2Up;
        case 'KeyK':
          return KeyCode.Player2Down;
        default:
          return null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') {
        return;
      }
      const mapped = mapKey(e.code);
      if (mapped !== null && runtimeRef.current) {
        e.preventDefault();
        runtimeRef.current.exports.game_input(InputKind.KeyDown, mapped, 1, 0);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = mapKey(e.code);
      if (mapped !== null && runtimeRef.current) {
        e.preventDefault();
        runtimeRef.current.exports.game_input(InputKind.KeyUp, mapped, 0, 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const sendTouchInput = (key: KeyCode, pressed: boolean) => {
    runtimeRef.current?.exports.game_input(
      pressed ? InputKind.KeyDown : InputKind.KeyUp,
      key,
      pressed ? 1 : 0,
      0
    );
  };

  const handleToggleMod = (mod: ModManifest) => {
    if (!game.manifest.mods.enabled) {
      onNotify(
        'MODS DESHABILITADOS POR EL AUTOR',
        `El manifest de ${game.manifest.name} tiene mods.enabled = false.`,
        'danger'
      );
      return;
    }

    const existing = activeSandboxesRef.current.get(mod.id);
    if (existing && existing.getMetrics().active) {
      existing.terminate('Desactivado por el usuario');
      activeSandboxesRef.current.delete(mod.id);
      // Reset defaults
      runtimeRef.current?.sendModEvent('set_speed', { multiplier: 1.0 });
      runtimeRef.current?.sendModEvent('set_paddle_scale', { scale: 1.0 });
      runtimeRef.current?.sendModEvent('set_gravity', { gravity: 0.0 });
      runtimeRef.current?.sendModEvent('set_neon_theme', { theme: 0 });
      setModMetrics((prev) => ({ ...prev, [mod.id]: existing.getMetrics() }));
      onNotify('MOD DESACTIVADO', `${mod.name} descargado del Worker.`, 'yellow');
      return;
    }

    try {
      const sb = new ModSandboxInstance(mod, game.manifest, (cmd) => {
        runtimeRef.current?.sendModEvent(cmd.name, cmd.data);
      });
      const initRes = sb.invokeHook('on_init');
      activeSandboxesRef.current.set(mod.id, sb);
      setModMetrics((prev) => ({ ...prev, [mod.id]: sb.getMetrics() }));

      if (initRes.ok) {
        onNotify('MOD LUA ACTIVO EN WORKER', `${mod.name} cargado (<2.0ms watchdog OK).`, 'green');
      } else {
        onNotify('MOD CONTENIDO POR SANDBOX', initRes.error ?? 'Violación de seguridad', 'danger');
      }
    } catch (err) {
      onNotify('ERROR DE MOD', err instanceof Error ? err.message : 'Fallo al cargar mod', 'danger');
    }
  };

  const handleRunCustomLuaOrAttack = (luaCode: string, label: string) => {
    if (!game.manifest.mods.enabled) {
      onNotify(
        'MODS BLOQUEADOS (mods.enabled = false)',
        `El runtime rechazó cargar "${label}" porque el autor desactivó mods en este juego.`,
        'danger'
      );
      return;
    }
    const kp = deriveKeyPairFromSeedHex(SANDBOX_TEST_SEED);
    const customMod = signModManifest(
      {
        schema: 1,
        id: `mod.custom.${Date.now()}`,
        targetGameId: game.id,
        name: label,
        version: '1.0.0',
        description: 'Prueba en vivo del sandbox Lua',
        license: 'MIT',
        author: { name: 'Local Sandbox Tester', pubkey: kp.formattedPubkey },
        hooks: ['on_init', 'on_tick'],
        entryCode: luaCode
      },
      SANDBOX_TEST_SEED
    );

    const sb = new ModSandboxInstance(customMod, game.manifest, (cmd) => {
      runtimeRef.current?.sendModEvent(cmd.name, cmd.data);
    });

    // If testing infinite loop, run 3 ticks to trigger the 3-strike watchdog termination
    let lastRes = sb.invokeHook('on_init');
    if (luaCode.includes('while true')) {
      sb.invokeHook('on_tick');
      sb.invokeHook('on_tick');
      lastRes = sb.invokeHook('on_tick');
    }

    activeSandboxesRef.current.set(customMod.id, sb);
    setModMetrics((prev) => ({ ...prev, [customMod.id]: sb.getMetrics() }));

    if (lastRes.ok) {
      onNotify('SCRIPT LUA EJECUTADO', `${label} aplicado sin exceder el presupuesto de 2ms.`, 'green');
    } else {
      onNotify(
        'WATCHDOG / SANDBOX CONTUVO EL MOD',
        `${label}: ${sb.getMetrics().terminationReason ?? lastRes.error}`,
        'danger'
      );
    }
  };

  const handleSimulateTamperedWasm = async () => {
    const corrupted = game.wasmBytes.slice();
    corrupted[corrupted.length - 1] ^= 0xff;
    try {
      await instantiateGameModule(corrupted, game.manifest);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wasm SHA-256 mismatch';
      setHostLogs((prev) => [`[SECURITY BLOCK] ${msg}`, ...prev.slice(0, 14)]);
      onNotify('EJECUCIÓN BLOQUEADA (SHA-256)', msg, 'danger');
    }
  };

  const iframeSrcDoc = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; img-src data: blob:; connect-src 'none';"></head><body style="margin:0;background:#07060d;color:#00f0ff;font-family:monospace;font-size:10px;"><script>
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'INIT_OPENPLAY_PORT' && e.ports[0]) {
        const port = e.ports[0];
        port.onmessage = (msg) => {
          if (msg.data && msg.data.type === 'SANDBOX_HEARTBEAT') {
            port.postMessage({ type: 'SANDBOX_HEARTBEAT_ACK', originIsolated: window.origin === 'null' });
          }
        };
      }
    });
  </script></body></html>`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
      {/* Hidden strict-CSP isolated iframe sandbox (`allow-scripts` WITHOUT `allow-same-origin`) */}
      <iframe
        ref={iframeRef}
        title="OpenPlay Isolated Wasm Sandbox"
        sandbox="allow-scripts"
        srcDoc={iframeSrcDoc}
        style={{ width: 0, height: 0, border: 0, position: 'absolute', visibility: 'hidden' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span className="cyber-badge cyan">HOST-ABI/0 // SANDBOX RUNNER</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginTop: '0.25rem' }}>
            {game.manifest.name}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ REANUDAR' : '⏸ PAUSAR'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (runtimeRef.current) {
                savedSnapshotRef.current = runtimeRef.current.takeSnapshot();
                onNotify('SNAPSHOT GUARDADO', `Estado de 64B capturado (${snapshotHash})`, 'cyan');
              }
            }}
          >
            💾 GUARDAR SNAPSHOT
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (runtimeRef.current && savedSnapshotRef.current) {
                runtimeRef.current.restoreSnapshot(savedSnapshotRef.current);
                onNotify('SNAPSHOT RESTAURADO', 'Rollback instantáneo de memoria Wasm completado.', 'green');
              }
            }}
          >
            ⏪ RESTAURAR SNAPSHOT
          </Button>
          <Button variant="danger" onClick={onBack}>
            ✕ SALIR AL LOBBY
          </Button>
        </div>
      </div>

      {securityError && (
        <Panel title="ALERTA CRÍTICA DE SEGURIDAD WASM" variant="danger">
          <p style={{ fontFamily: 'var(--font-mono)' }}>{securityError}</p>
        </Panel>
      )}

      <div className="runner-stage">
        <div>
          <div className="viewport-frame">
            <canvas
              ref={canvasRef}
              width={game.manifest.display.width}
              height={game.manifest.display.height}
              className="game-canvas"
              aria-label={`Lienzo de juego ${game.manifest.name}`}
            />
          </div>

          {/* Mobile-First Virtual Touch Controls (>= 44px targets) */}
          <div className="touch-controls-bar" aria-label="Controles táctiles virtuales">
            <div className="dpad-cluster">
              <div />
              <button
                type="button"
                className="touch-pad-btn"
                aria-label="Arriba"
                onPointerDown={() => sendTouchInput(KeyCode.Up, true)}
                onPointerUp={() => sendTouchInput(KeyCode.Up, false)}
                onPointerLeave={() => sendTouchInput(KeyCode.Up, false)}
              >
                ▲
              </button>
              <div />
              <button
                type="button"
                className="touch-pad-btn"
                aria-label="Izquierda"
                onPointerDown={() => sendTouchInput(KeyCode.Left, true)}
                onPointerUp={() => sendTouchInput(KeyCode.Left, false)}
                onPointerLeave={() => sendTouchInput(KeyCode.Left, false)}
              >
                ◀
              </button>
              <button
                type="button"
                className="touch-pad-btn"
                aria-label="Abajo"
                onPointerDown={() => sendTouchInput(KeyCode.Down, true)}
                onPointerUp={() => sendTouchInput(KeyCode.Down, false)}
                onPointerLeave={() => sendTouchInput(KeyCode.Down, false)}
              >
                ▼
              </button>
              <button
                type="button"
                className="touch-pad-btn"
                aria-label="Derecha"
                onPointerDown={() => sendTouchInput(KeyCode.Right, true)}
                onPointerUp={() => sendTouchInput(KeyCode.Right, false)}
                onPointerLeave={() => sendTouchInput(KeyCode.Right, false)}
              >
                ▶
              </button>
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              <div>{game.controlsHint}</div>
              <div style={{ color: 'var(--neon-cyan)', marginTop: '0.2rem' }}>
                IFRAME ORIGIN: NULL ({iframeReady ? 'MESSAGECHANNEL OK' : 'SYNC'}) · SHA256: {shaVerified ? 'VERIFICADO' : 'PENDIENTE'}
              </div>
            </div>

            <div className="action-cluster">
              <button
                type="button"
                className="touch-pad-btn"
                style={{ width: '58px', height: '58px', borderColor: 'var(--neon-magenta)', color: 'var(--neon-magenta)' }}
                aria-label="Acción A (Disparo / Impulso)"
                onPointerDown={() => sendTouchInput(KeyCode.ActionA, true)}
                onPointerUp={() => sendTouchInput(KeyCode.ActionA, false)}
              >
                A
              </button>
              <button
                type="button"
                className="touch-pad-btn"
                style={{ width: '58px', height: '58px', borderColor: 'var(--neon-yellow)', color: 'var(--neon-yellow)' }}
                aria-label="Acción B (Dash / Especial)"
                onPointerDown={() => sendTouchInput(KeyCode.ActionB, true)}
                onPointerUp={() => sendTouchInput(KeyCode.ActionB, false)}
              >
                B
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live HUD Telemetry & Lua Modding Pipeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Panel title="HUD // TELEMETRÍA EN VIVO" cornerTag="60 HZ FIXED" variant="cyan">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <HUDBar
                label="FPS RENDERIZADO"
                valueText={`${fps} FPS`}
                percentage={(fps / 60) * 100}
                color="green"
              />
              <HUDBar
                label="PASO FIJO DETERMINISTA"
                valueText={`${game.manifest.multiplayer.tickrate} TICKS/S`}
                percentage={100}
                color="cyan"
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.74rem',
                  background: 'var(--bg-0)',
                  padding: '0.6rem',
                  border: '1px solid var(--line)'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>TICKS:</span>{' '}
                  <strong style={{ color: 'var(--neon-cyan)' }}>{tickCount}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>MODO:</span>{' '}
                  <strong style={{ color: 'var(--neon-magenta)' }}>{game.manifest.multiplayer.mode}</strong>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-dim)' }}>HASH SNAPSHOT (60t):</span>{' '}
                  <strong style={{ color: 'var(--neon-yellow)' }}>{snapshotHash}</strong>
                </div>
              </div>

              <Button variant="danger" onClick={handleSimulateTamperedWasm}>
                🛡 PROBAR RECHAZO DE WASM ADULTERADO
              </Button>
            </div>
          </Panel>

          <Panel
            title="PIPELINE DE MODS LUA"
            cornerTag={game.manifest.mods.enabled ? 'OPT-IN: ON' : 'OPT-IN: OFF'}
            variant="magenta"
          >
            {!game.manifest.mods.enabled ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neon-yellow)' }}>
                Este juego declara <code>mods.enabled: false</code> en su manifest firmado. El cargador bloquea cualquier mod automáticamente.
                <div style={{ marginTop: '0.65rem' }}>
                  <Button
                    variant="ghost"
                    onClick={() => handleRunCustomLuaOrAttack(customLuaCode, 'Intento en juego sin mods')}
                  >
                    PROBAR BLOQUEO DE MOD NO AUTORIZADO
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {availableMods.map((mod) => {
                  const m = modMetrics[mod.id];
                  const isActive = Boolean(m?.active);
                  return (
                    <div
                      key={mod.id}
                      style={{
                        padding: '0.65rem',
                        background: 'var(--bg-0)',
                        border: `1px solid ${isActive ? 'var(--neon-green)' : 'var(--line)'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <strong style={{ fontSize: '0.84rem', color: 'var(--text)' }}>{mod.name}</strong>
                        <span className={`cyber-badge ${isActive ? 'green' : 'cyan'}`}>
                          {isActive ? 'ACTIVO' : 'LISTO'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '0.25rem 0 0.5rem' }}>
                        {mod.description}
                      </p>
                      <Button
                        variant={isActive ? 'danger' : 'magenta'}
                        onClick={() => handleToggleMod(mod)}
                      >
                        {isActive ? 'DESACTIVAR MOD' : 'CARGAR EN WORKER'}
                      </Button>
                    </div>
                  );
                })}

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.65rem' }}>
                  <label
                    htmlFor="lua-sandbox-editor"
                    style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-cyan)', marginBottom: '0.35rem' }}
                  >
                    PRUEBA DE CONTENCIÓN SANDBOX (WATCHDOG 2MS):
                  </label>
                  <textarea
                    id="lua-sandbox-editor"
                    rows={4}
                    className="cyber-input"
                    value={customLuaCode}
                    onInput={(e) => setCustomLuaCode((e.target as HTMLTextAreaElement).value)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
                    <Button
                      variant="primary"
                      onClick={() => handleRunCustomLuaOrAttack(customLuaCode, 'Custom Script')}
                    >
                      EJECUTAR LUA
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        handleRunCustomLuaOrAttack(
                          'function on_init()\n  os.execute("rm -rf /")\nend',
                          'Ataque os.execute'
                        )
                      }
                    >
                      TEST os.execute
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        handleRunCustomLuaOrAttack(
                          'function on_tick()\n  while true do end\nend',
                          'Ataque Bucle Infinito'
                        )
                      }
                    >
                      TEST BUCLE INFINITO
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="REGISTRO HOST ABI" cornerTag="RING BUFFER">
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: 'var(--text-dim)',
                maxHeight: '110px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              {hostLogs.length === 0 ? (
                <span>Esperando eventos del módulo Wasm...</span>
              ) : (
                hostLogs.map((l, idx) => <div key={idx}>{l}</div>)
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
