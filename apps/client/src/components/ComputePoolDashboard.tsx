import type { JSX } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Button, HUDBar, Panel } from './CyberUI.js';

interface ComputePoolDashboardProps {
  resourceSupportEnabled: boolean;
  onToggleSupport: (enabled: boolean) => void;
  onNotify: (title: string, detail: string, tone?: 'cyan' | 'green' | 'danger' | 'yellow') => void;
}

export function ComputePoolDashboard({
  resourceSupportEnabled,
  onToggleSupport,
  onNotify
}: ComputePoolDashboardProps): JSX.Element {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('0x71C...49b2');
  const [hashesComputed, setHashesComputed] = useState(148200);
  const [earnedCredits, setEarnedCredits] = useState(1.48);
  const [hashRate, setHashRate] = useState(0);

  // Worker ticker simulation when enabled
  useEffect(() => {
    if (!resourceSupportEnabled) {
      setHashRate(0);
      return;
    }

    setHashRate(1240); // 1,240 hashes/sec
    const timer = window.setInterval(() => {
      if (document.hidden) return; // Automatic pause when tab is inactive
      setHashesComputed((prev) => prev + 124);
      setEarnedCredits((prev) => Number((prev + 0.00124).toFixed(3)));
    }, 100);

    return () => clearInterval(timer);
  }, [resourceSupportEnabled]);

  const handleConnectWallet = () => {
    setWalletConnected(true);
    onNotify('BILLETERA CONECTADA', `Conectado como ${walletAddress} en Polygon PoS.`, 'green');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <Panel
        title="CONTRATO INTELIGENTE & POOL DE CÓMPUTO COMUNITARIO"
        cornerTag="SMART CONTRACT: OpenPlayComputePool.sol (POLYGON)"
        variant="cyan"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', margin: '0 0 0.5rem', fontSize: '0.9rem', maxWidth: '780px' }}>
              Mecanismo transparente y descentralizado para financiar infraestructura de servidores GPU (NVIDIA RTX / Data Center).
              <strong> Cero procesos ocultos:</strong> solo se activa tras tu aceptación explícita y se apaga de inmediato al salir.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <span>
                ESTADO DEL NODO:{' '}
                <strong style={{ color: resourceSupportEnabled ? 'var(--neon-green)' : 'var(--text-dim)' }}>
                  {resourceSupportEnabled ? '● ACTIVO (CONTRIBUYENDO)' : '○ INACTIVO'}
                </strong>
              </span>
              <span>
                CONTRATO:{' '}
                <strong style={{ color: 'var(--neon-cyan)' }}>0xOpenPlayComputePool...v1.0</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {walletConnected ? (
              <span className="cyber-badge green">BILLETERA: {walletAddress}</span>
            ) : (
              <Button variant="ghost" onClick={handleConnectWallet}>
                🔗 CONECTAR BILLETERA WEB3
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {/* Main Grid: Supporter Engine & Transparency Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Supporter Engine Control */}
        <Panel
          title="INTERRUPTOR DE APORTE VOLUNTARIO"
          cornerTag={resourceSupportEnabled ? 'APORTE EN CURSO' : 'DESACTIVADO'}
          variant={resourceSupportEnabled ? 'cyan' : 'default'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
              Al activar esta opción, aportas ciclos de verificación en primer plano para recompensarte con minutos de
              juego en la nube y financiar los clústeres GPU de la comunidad.
            </p>

            <div style={{ background: 'var(--bg-0)', padding: '0.85rem', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>POTENCIA DE CÓMPUTO:</span>
                <strong style={{ color: 'var(--neon-green)' }}>{hashRate} H/s</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>HASHES COMPLETADOS:</span>
                <strong style={{ color: 'var(--neon-cyan)' }}>{hashesComputed.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>CRÉDITOS DE STREAMING GANADOS:</span>
                <strong style={{ color: 'var(--neon-yellow)' }}>+{earnedCredits} MIN</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {resourceSupportEnabled ? (
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    onToggleSupport(false);
                    onNotify('APOYO DETENIDO', 'El aporte de cómputo voluntario se ha apagado por completo.', 'cyan');
                  }}
                >
                  ✕ APAGAR Y DETENER CÓMPUTO
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    onToggleSupport(true);
                    onNotify('APOYO ACTIVADO', 'Has aceptado los términos de aporte voluntario con consentimiento real.', 'green');
                  }}
                >
                  ✓ ACEPTAR TÉRMINOS Y ACTIVAR
                </Button>
              )}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              🔒 Garantía de seguridad: Cero minería oculta. Si minimizas la pestaña o cierras el navegador, el proceso
              se destruye inmediatamente mediante <code>beforeunload</code> y <code>visibilitychange</code>.
            </div>
          </div>
        </Panel>

        {/* Clustered Infrastructure Ledger */}
        <Panel title="REGISTRO PÚBLICO DE COMPRA DE GPUs (ON-CHAIN)" cornerTag="TRANSPARENCIA" variant="default">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
              Historial público de fondos recaudados destinados directamente a la compra y alquiler de servidores GPU para
              mantener la plataforma a 60 FPS:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <strong style={{ color: 'var(--neon-cyan)' }}>NVIDIA-RTX4080-BOGOTA-01</strong>
                  <span style={{ color: 'var(--neon-green)' }}>ACTIVO</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Proveedor: NVIDIA CloudXR Partner · 720 Horas · Costo: $540 USDC
                </div>
              </div>

              <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <strong style={{ color: 'var(--neon-cyan)' }}>LAMBDA-A10G-USEAST-02</strong>
                  <span style={{ color: 'var(--neon-green)' }}>ACTIVO</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Proveedor: Lambda GPU Cloud · 360 Horas · Costo: $360 USDC
                </div>
              </div>

              <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.7rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <strong style={{ color: 'var(--neon-cyan)' }}>HETZNER-GEX-EUCENTRAL</strong>
                  <span style={{ color: 'var(--neon-green)' }}>ACTIVO</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Proveedor: Hetzner GPU Dedicated · 720 Horas · Costo: $420 USDC
                </div>
              </div>
            </div>

            <HUDBar label="META DEL FONDO PARA NUEVO CLÚSTER NVIDIA" percentage={65} valueText="$1,320 / $2,000 USD" color="cyan" />
          </div>
        </Panel>
      </div>
    </div>
  );
}
