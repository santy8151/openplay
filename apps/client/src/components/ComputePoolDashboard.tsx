import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Button, HUDBar, Panel } from './CyberUI.js';
import {
  connectFreighter,
  fetchStellarBalances,
  buyStreamCreditsWithStellar,
  submitComputeProofToSoroban,
  STELLAR_CONFIG,
  type StellarWalletState
} from '../stellar/stellarClient.js';

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
  const [wallet, setWallet] = useState<StellarWalletState>({
    connected: false,
    publicKey: null,
    network: 'TESTNET',
    xlmBalance: '0.00',
    usdcBalance: '0.00'
  });

  const [hashesComputed, setHashesComputed] = useState(240000);
  const [earnedCredits, setEarnedCredits] = useState(2.4);
  const [hashRate, setHashRate] = useState(0);
  const [buyingXlm, setBuyingXlm] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Worker ticker simulation when enabled
  useEffect(() => {
    if (!resourceSupportEnabled) {
      setHashRate(0);
      return;
    }

    setHashRate(1850); // 1,850 hashes/sec
    const timer = window.setInterval(() => {
      if (document.hidden) return; // Automatic pause when tab is inactive
      setHashesComputed((prev) => prev + 185);
      setEarnedCredits((prev) => Number((prev + 0.00185).toFixed(3)));
    }, 100);

    return () => clearInterval(timer);
  }, [resourceSupportEnabled]);

  const handleConnectFreighter = async () => {
    const res = await connectFreighter();
    if (!res.success || !res.publicKey) {
      onNotify('ERROR STELLAR', res.error || 'No se pudo conectar Freighter.', 'danger');
      return;
    }

    const balances = await fetchStellarBalances(res.publicKey);
    setWallet({
      connected: true,
      publicKey: res.publicKey,
      network: 'TESTNET',
      xlmBalance: balances.xlm,
      usdcBalance: balances.usdc
    });

    onNotify('FREIGHTER CONECTADO', `Billetera Stellar ${res.publicKey.slice(0, 6)}...${res.publicKey.slice(-4)} activa en Soroban Testnet.`, 'green');
  };

  const handleBuyXlmCredits = async (xlmAmount: number) => {
    if (!wallet.connected || !wallet.publicKey) {
      onNotify('BILLETERA REQUERIDA', 'Conecta tu billetera Stellar Freighter primero.', 'yellow');
      return;
    }

    setBuyingXlm(true);
    onNotify('LLAMANDO A SOROBAN', `Firmando transacción de ${xlmAmount} XLM en Stellar Testnet...`, 'cyan');

    try {
      const res = await buyStreamCreditsWithStellar(wallet.publicKey, xlmAmount);
      setBuyingXlm(false);
      setLastTxHash(res.txHash);

      // Deduct balance locally for instant feedback
      setWallet((prev) => ({
        ...prev,
        xlmBalance: (Number(prev.xlmBalance) - xlmAmount).toFixed(2)
      }));

      onNotify('SOROBAN: CRÉDITOS AÑADIDOS', `+${res.minutesCredited} minutos acreditados. Tx: ${res.txHash.slice(0, 10)}...`, 'green');
    } catch {
      setBuyingXlm(false);
      onNotify('ERROR DE TRANSACCIÓN', 'Falló la invocación del contrato Soroban.', 'danger');
    }
  };

  const handleSyncProofToStellar = async () => {
    if (!wallet.publicKey) {
      onNotify('BILLETERA REQUERIDA', 'Conecta tu billetera Stellar para registrar en Soroban.', 'yellow');
      return;
    }

    onNotify('REGISTRANDO EN STELLAR', 'Enviando prueba de cómputo a Soroban...', 'cyan');
    const res = await submitComputeProofToSoroban(wallet.publicKey, hashesComputed);
    setLastTxHash(res.txHash);
    onNotify('PROOF REGISTRADO ON-CHAIN', `Ledger: ${res.ledger} · Ganados +${res.minutesCredited} min.`, 'green');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <Panel
        title="STELLAR SOROBAN // CONTRATO INTELIGENTE DE CÓMPUTO & STREAMING"
        cornerTag="STELLAR HACKATHON EDITION · SOROBAN TESTNET"
        variant="cyan"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', margin: '0 0 0.5rem', fontSize: '0.9rem', maxWidth: '820px' }}>
              Infraestructura descentralizada construida sobre <strong>Stellar Soroban (Rust / WebAssembly)</strong> para
              financiar servidores de Cloud Gaming con GPU NVIDIA RTX mediante micropagos ultra-rápidos en <strong>XLM y USDC</strong>.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <span>
                RED: <strong style={{ color: 'var(--neon-green)' }}>STELLAR {STELLAR_CONFIG.network}</strong>
              </span>
              <span>
                CONTRATO SOROBAN:{' '}
                <strong style={{ color: 'var(--neon-cyan)' }}>
                  {STELLAR_CONFIG.contractId.slice(0, 10)}...{STELLAR_CONFIG.contractId.slice(-6)}
                </strong>
              </span>
              <span>
                FINALIDAD: <strong style={{ color: 'var(--neon-yellow)' }}>3 - 5 SEGUNDOS</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {wallet.connected && wallet.publicKey ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <span className="cyber-badge green">
                  FREIGHTER: {wallet.publicKey.slice(0, 5)}...{wallet.publicKey.slice(-4)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--neon-cyan)' }}>
                  {wallet.xlmBalance} XLM | {wallet.usdcBalance} USDC
                </span>
              </div>
            ) : (
              <Button variant="primary" onClick={handleConnectFreighter}>
                🚀 CONECTAR FREIGHTER (STELLAR)
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {/* Main Grid: Stellar Micropayments & Compute Sharing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Stellar Micropayments: Buy GPU Stream Time in XLM */}
        <Panel title="MICROPAGOS PAY-AS-YOU-GO EN STELLAR (XLM)" cornerTag="SOROBAN SMART CONTRACT" variant="cyan">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
              Adquiere tiempo de streaming en clústeres NVIDIA RTX al instante sin tarjetas de crédito y con tarifas de gas
              inferiores a $0.00001 USD gracias a la red Stellar.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div
                style={{
                  background: 'var(--bg-0)',
                  border: '1px solid var(--line)',
                  padding: '0.75rem',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handleBuyXlmCredits(2)}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--neon-cyan)' }}>2 XLM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-green)' }}>30 MINUTOS</div>
                <Button variant="ghost" className="w-full" loading={buyingXlm} style={{ marginTop: '0.4rem', fontSize: '0.7rem' }}>
                  COMPRAR
                </Button>
              </div>

              <div
                style={{
                  background: 'var(--bg-0)',
                  border: '1px solid var(--neon-cyan)',
                  padding: '0.75rem',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handleBuyXlmCredits(5)}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--neon-yellow)' }}>5 XLM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-green)' }}>75 MINUTOS</div>
                <Button variant="primary" className="w-full" loading={buyingXlm} style={{ marginTop: '0.4rem', fontSize: '0.7rem' }}>
                  POPULAR
                </Button>
              </div>

              <div
                style={{
                  background: 'var(--bg-0)',
                  border: '1px solid var(--line)',
                  padding: '0.75rem',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => handleBuyXlmCredits(10)}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--neon-magenta)' }}>10 XLM</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-green)' }}>150 MINUTOS</div>
                <Button variant="ghost" className="w-full" loading={buyingXlm} style={{ marginTop: '0.4rem', fontSize: '0.7rem' }}>
                  COMPRAR
                </Button>
              </div>
            </div>

            {lastTxHash && (
              <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid var(--neon-cyan)', padding: '0.65rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--neon-green)' }}>✓ TRANSACCIÓN SOROBAN VERIFICADA:</span>
                <div style={{ wordBreak: 'break-all', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Tx: {lastTxHash}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Compute Sharing & Proof Verification */}
        <Panel
          title="APOYO COMUNITARIO & PRUEBA EN SOROBAN"
          cornerTag={resourceSupportEnabled ? 'APORTE ACTIVO' : 'APAGADO'}
          variant={resourceSupportEnabled ? 'magenta' : 'default'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
              Contribuye con ciclos ligeros de verificación solo mientras estés jugando en la plataforma para acumular
              créditos de streaming y certificar tu aporte en el ledger de Stellar.
            </p>

            <div style={{ background: 'var(--bg-0)', padding: '0.75rem', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>HASHES VERIFICADOS:</span>
                <strong style={{ color: 'var(--neon-cyan)' }}>{hashesComputed.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>CRÉDITOS GENERADOS:</span>
                <strong style={{ color: 'var(--neon-green)' }}>+{earnedCredits} MINUTOS</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>VELOCIDAD DE CÓMPUTO:</span>
                <strong style={{ color: 'var(--neon-yellow)' }}>{hashRate} H/s</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {resourceSupportEnabled ? (
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    onToggleSupport(false);
                    onNotify('CÓMPUTO DETENIDO', 'Se revocó el consentimiento y se apagó el worker.', 'cyan');
                  }}
                >
                  ✕ APAGAR CÓMPUTO
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    onToggleSupport(true);
                    onNotify('CÓMPUTO ACTIVADO', 'Aporte voluntario activado con consentimiento explícito.', 'green');
                  }}
                >
                  ✓ ACTIVAR APORTE VOLUNTARIO
                </Button>
              )}

              {wallet.connected && (
                <Button variant="ghost" onClick={handleSyncProofToStellar}>
                  REGISTRAR EN STELLAR
                </Button>
              )}
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              🔒 Garantía de seguridad: Cero minería oculta. El proceso se apaga inmediatamente al salir o minimizar la pestaña.
            </div>
          </div>
        </Panel>
      </div>

      {/* On-Chain Transparency Ledger: GPU Clusters Funded on Stellar */}
      <Panel title="REGISTRO ON-CHAIN DE CLÚSTERES GPU FINANCIADOS EN STELLAR" cornerTag="TRANSPARENCIA TOTAL" variant="default">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <strong style={{ color: 'var(--neon-cyan)' }}>NVIDIA-RTX4080-BOGOTA-01</strong>
              <span style={{ color: 'var(--neon-green)' }}>● ACTIVO</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Proveedor: NVIDIA CloudXR Edge · 720 Horas
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-yellow)', marginTop: '0.15rem' }}>
              Financiado con: 2,700 XLM ($540 USDC)
            </div>
          </div>

          <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <strong style={{ color: 'var(--neon-cyan)' }}>LAMBDA-A10G-USEAST-02</strong>
              <span style={{ color: 'var(--neon-green)' }}>● ACTIVO</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Proveedor: Lambda GPU Cloud · 360 Horas
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-yellow)', marginTop: '0.15rem' }}>
              Financiado con: 1,800 XLM ($360 USDC)
            </div>
          </div>

          <div style={{ background: 'var(--bg-0)', border: '1px solid var(--line)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <strong style={{ color: 'var(--neon-cyan)' }}>HETZNER-GEX-EUCENTRAL</strong>
              <span style={{ color: 'var(--neon-green)' }}>● ACTIVO</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
              Proveedor: Hetzner GPU Dedicated · 720 Horas
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--neon-yellow)', marginTop: '0.15rem' }}>
              Financiado con: 2,100 XLM ($420 USDC)
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <HUDBar label="FONDO STELLAR PARA ADQUISICIÓN DE NUEVOS NODOS GPU" percentage={74} valueText="6,600 / 8,900 XLM ACUMULADOS" color="cyan" />
        </div>
      </Panel>
    </div>
  );
}
