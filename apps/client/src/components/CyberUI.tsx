/**
 * OpenPlay Cyberpunk Design System Base Components
 * (`Panel`, `Button`, `Chip`, `Card`, `HUDBar`, `GlitchTitle`, `Slider`, `Toast`, `Modal`, `DataRainCanvas`)
 */

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { cyberSynth } from '../audio/synth.js';
import type { CatalogGameItem } from '../data/seedCatalog.js';

export interface PanelProps {
  title?: string;
  cornerTag?: string;
  variant?: 'default' | 'cyan' | 'magenta' | 'danger';
  className?: string;
  children: ComponentChildren;
}

export function Panel({
  title,
  cornerTag,
  variant = 'default',
  className = '',
  children
}: PanelProps): JSX.Element {
  const variantClass = variant === 'default' ? '' : `variant-${variant}`;
  return (
    <section className={`cyber-panel ${variantClass} ${className}`.trim()}>
      {(title || cornerTag) && (
        <header className="panel-header">
          {title ? <h2 className="panel-title">{title}</h2> : <span />}
          {cornerTag && <span className="panel-corner-tag">{cornerTag}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

export interface ButtonProps {
  variant?: 'default' | 'primary' | 'magenta' | 'yellow' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  className?: string;
  children: ComponentChildren;
}

export function Button({
  variant = 'default',
  loading = false,
  disabled = false,
  onClick,
  ariaLabel,
  type = 'button',
  className = '',
  children
}: ButtonProps): JSX.Element {
  const variantClass = variant === 'default' ? '' : `btn-${variant}`;
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled || loading}
      className={`cyber-btn ${variantClass} ${className}`.trim()}
      onMouseEnter={() => cyberSynth.playUiTone('hover')}
      onClick={() => {
        cyberSynth.playUiTone(variant === 'primary' ? 'jackin' : 'click');
        onClick?.();
      }}
    >
      {children}
      {loading && <span className="cyber-btn-loading-bar" aria-hidden="true" />}
    </button>
  );
}

export interface ChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}

export function Chip({ label, active = false, count, onClick }: ChipProps): JSX.Element {
  return (
    <button
      type="button"
      className={`cyber-chip ${active ? 'active' : ''}`}
      aria-pressed={active}
      onClick={() => {
        cyberSynth.playUiTone('click');
        onClick?.();
      }}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>[{count}]</span>
      )}
    </button>
  );
}

export interface HUDBarProps {
  label: string;
  valueText: string;
  percentage: number; // 0..100
  color?: 'cyan' | 'magenta' | 'green' | 'yellow' | 'danger';
  ariaLabel?: string;
}

export function HUDBar({
  label,
  valueText,
  percentage,
  color = 'cyan',
  ariaLabel
}: HUDBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, percentage));
  const colorMap: Record<string, string> = {
    cyan: 'var(--neon-cyan)',
    magenta: 'var(--neon-magenta)',
    green: 'var(--neon-green)',
    yellow: 'var(--neon-yellow)',
    danger: 'var(--danger)'
  };
  return (
    <div className="hud-bar" role="region" aria-label={ariaLabel ?? `${label}: ${valueText}`}>
      <div className="hud-bar-header">
        <span className="hud-bar-label">{label}</span>
        <span className="hud-bar-value" style={{ color: colorMap[color] }}>
          {valueText}
        </span>
      </div>
      <div className="hud-bar-track">
        <div
          className="hud-bar-fill"
          style={{
            background: colorMap[color],
            transform: `scaleX(${clamped / 100})`
          }}
        />
        <div className="hud-bar-ticks" />
      </div>
    </div>
  );
}

export interface GlitchTitleProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  size?: string;
}

export function GlitchTitle({ text, as = 'h1', size = '2rem' }: GlitchTitleProps): JSX.Element {
  const Tag = as;
  return (
    <Tag className="glitch-title" style={{ fontSize: size }} data-text={text}>
      {text}
    </Tag>
  );
}

export interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
}

export function Slider({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}: SliderProps): JSX.Element {
  return (
    <div className="cyber-slider-wrap">
      <div className="hud-bar-header">
        <label htmlFor={id} className="hud-bar-label">
          {label}
        </label>
        <span className="hud-bar-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="cyber-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label} (${value}${unit})`}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
      />
    </div>
  );
}

export interface ToastMessage {
  id: string;
  title: string;
  detail: string;
  tone: 'cyan' | 'green' | 'danger' | 'yellow';
}

export function ToastContainer({
  toasts,
  onDismiss
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}): JSX.Element | null {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`cyber-panel ${t.tone === 'danger' ? 'variant-danger' : 'variant-cyan'}`}
          style={{ padding: '0.85rem 1rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--neon-cyan)' }}>
              {t.title}
            </strong>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                minWidth: '32px',
                minHeight: '32px'
              }}
            >
              [X]
            </button>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text)', marginTop: '0.25rem' }}>{t.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
}): JSX.Element | null {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-box">
        <Panel title={title} cornerTag="ESC // CERRAR" variant="cyan">
          {children}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.1rem' }}>
            <Button variant="ghost" onClick={onClose}>
              CERRAR VENTANA
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/**
 * Procedural SVG Cyberpunk Artwork for each Game Card in the Catalog
 */
export function CyberGameArtwork({ game }: { game: CatalogGameItem }): JSX.Element {
  if (game.id === 'dev.openplay.pong') {
    return (
      <svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="480" height="220" fill="#07060d" />
        <g stroke="#2a2450" strokeWidth="1">
          <line x1="240" y1="0" x2="240" y2="220" strokeDasharray="8 8" />
          <line x1="0" y1="55" x2="480" y2="55" />
          <line x1="0" y1="110" x2="480" y2="110" />
          <line x1="0" y1="165" x2="480" y2="165" />
        </g>
        <rect x="34" y="62" width="12" height="76" fill="#00f0ff" />
        <rect x="434" y="84" width="12" height="76" fill="#ff2bd6" />
        <circle cx="205" cy="102" r="10" fill="#fcee09" />
        <path d="M 205 102 L 135 128" stroke="#fcee09" strokeWidth="4" opacity="0.45" />
        <text x="165" y="42" fill="#00f0ff" fontFamily="monospace" fontWeight="bold" fontSize="24">07</text>
        <text x="285" y="42" fill="#ff2bd6" fontFamily="monospace" fontWeight="bold" fontSize="24">05</text>
      </svg>
    );
  }

  if (game.id === 'dev.openplay.arena') {
    return (
      <svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="480" height="220" fill="#080612" />
        <rect x="150" y="55" width="24" height="110" fill="#15122a" stroke="#00f0ff" strokeWidth="2" />
        <rect x="306" y="55" width="24" height="110" fill="#15122a" stroke="#ff2bd6" strokeWidth="2" />
        <rect x="74" y="95" width="24" height="24" fill="#00f0ff" />
        <rect x="382" y="105" width="24" height="24" fill="#ff2bd6" />
        <rect x="228" y="32" width="24" height="24" fill="#fcee09" />
        <circle cx="215" cy="112" r="5" fill="#fcee09" />
        <circle cx="265" cy="118" r="5" fill="#39ff88" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 480 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="480" height="220" fill="#07060d" />
      <polygon points="0,220 190,95 290,95 480,220" fill="#15122a" stroke="#00f0ff" strokeWidth="1.5" />
      <rect x="140" y="20" width="10" height="75" fill="#ff2bd6" />
      <rect x="330" y="110" width="10" height="90" fill="#00f0ff" />
      <polygon points="210,150 265,135 265,165" fill="#fcee09" />
    </svg>
  );
}

/**
 * Card Component for the Catalog Grid
 */
export function GameCard({
  game,
  onJackIn,
  onSelectDetail
}: {
  game: CatalogGameItem;
  onJackIn: (game: CatalogGameItem) => void;
  onSelectDetail: (game: CatalogGameItem) => void;
}): JSX.Element {
  const isP2P = game.manifest.multiplayer.mode !== 'single';
  return (
    <article className="cyber-panel game-card" aria-label={game.manifest.name}>
      <div>
        <div className="game-card-cover">
          <CyberGameArtwork game={game} />
          <div className="game-card-badges">
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span className={`cyber-badge ${isP2P ? 'cyan' : 'yellow'}`}>
                {isP2P ? `P2P // ${game.manifest.multiplayer.min}-${game.manifest.multiplayer.max}P` : 'SOLO // 1P'}
              </span>
              {game.manifest.mods.enabled ? (
                <span className="cyber-badge magenta">MODS LUA</span>
              ) : (
                <span className="cyber-badge">SIN MODS</span>
              )}
            </div>
            <span className="cyber-badge green">SPDX: {game.manifest.license}</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              color: 'var(--text)',
              letterSpacing: '0.04em'
            }}
          >
            {game.manifest.name}
          </h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--neon-cyan)' }}>
            v{game.manifest.version}
          </span>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', margin: '0.45rem 0 0.75rem' }}>
          {game.tagline}
        </p>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            paddingTop: '0.55rem',
            borderTop: '1px solid var(--line)',
            marginBottom: '0.8rem'
          }}
        >
          <span>NODO: {game.nodeName}</span>
          <span style={{ color: 'var(--neon-green)' }}>✓ ED25519 OK</span>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Button variant="primary" className="flex-1" onClick={() => onJackIn(game)}>
            ⚡ JACK IN
          </Button>
          <Button variant="ghost" onClick={() => onSelectDetail(game)}>
            DETALLE
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * Subtle Data Rain Canvas — Automatically pauses when document is hidden or reducedMotion is enabled!
 */
export function DataRainCanvas({ reducedMotion }: { reducedMotion: boolean }): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const cols = Math.max(12, Math.floor(width / 36));
    const drops = new Array<number>(cols).fill(0).map((_, i) => (i * 29) % height);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let lastStep = 0;
    const render = (ts: number) => {
      animId = requestAnimationFrame(render);
      if (document.hidden) return; // Required by spec: paused if tab is not visible
      if (ts - lastStep < 65) return;
      lastStep = ts;

      ctx.fillStyle = 'rgba(7, 6, 13, 0.18)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '11px monospace';

      for (let i = 0; i < drops.length; i++) {
        const glyph = (i + Math.floor(ts / 100)) % 2 === 0 ? '01' : '7F';
        ctx.fillText(glyph, i * 36, drops[i]!);
        drops[i] = drops[i]! > height ? 0 : drops[i]! + 14;
      }
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;
  return <canvas ref={canvasRef} className="cyber-rain-canvas" aria-hidden="true" />;
}
