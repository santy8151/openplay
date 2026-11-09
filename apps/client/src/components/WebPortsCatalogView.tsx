import type { JSX } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { WEB_GAME_PORTS, type WebPortItem } from '../data/webPortsCatalog.js';
import { Button, Chip, Panel } from './CyberUI.js';

interface WebPortsCatalogViewProps {
  onNotify: (title: string, detail: string, tone?: 'cyan' | 'green' | 'danger' | 'yellow') => void;
}

export function WebPortsCatalogView({ onNotify }: WebPortsCatalogViewProps): JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [demoOnly, setDemoOnly] = useState(false);
  const [activePlayItem, setActivePlayItem] = useState<WebPortItem | null>(null);

  // Extract all unique letters
  const letters = useMemo(() => {
    const set = new Set(WEB_GAME_PORTS.map((p) => p.letter));
    return ['ALL', ...Array.from(set).sort()];
  }, []);

  const categories = ['ALL', 'WASM', 'WEBGL', 'RECOMP', 'EMULATOR', 'RETRO'];

  const filteredPorts = useMemo(() => {
    return WEB_GAME_PORTS.filter((item) => {
      if (selectedLetter !== 'ALL' && item.letter !== selectedLetter) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (demoOnly && !item.playUrl) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesTags) return false;
      }
      return true;
    });
  }, [search, selectedLetter, selectedCategory, demoOnly]);

  const handleLaunchGame = (item: WebPortItem) => {
    if (!item.playUrl) {
      if (item.sourceUrl) {
        window.open(item.sourceUrl, '_blank', 'noopener,noreferrer');
        onNotify('REPOSITORIO ABIERTO', `Abriendo código fuente de ${item.title}`, 'cyan');
      } else {
        onNotify('SIN ENLACE', 'Este port no cuenta con demo pública disponible aún.', 'yellow');
      }
      return;
    }

    setActivePlayItem(item);
    onNotify('PORT INICIADO', `Cargando ${item.title} en contenedor seguro WebAssembly/WebGL...`, 'green');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <Panel
        title="CATÁLOGO ULTIMATE DE PORTS WEB // WEBASSMEBLY & WEBGL"
        cornerTag={`${WEB_GAME_PORTS.length} PORTS INDEXADOS · ACCESO DIRECTO`}
        variant="cyan"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', margin: '0 0 0.5rem', fontSize: '0.9rem', maxWidth: '750px' }}>
              Juegos icónicos portados a la web mediante <strong>WebAssembly, WebGL, Emscripten y decompilaciones nativas</strong>.
              Se ejecutan al 100% en el navegador de tu PC, tablet o consola con cero consumo de servidores GPU.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-green)' }}>
                ⭐ {WEB_GAME_PORTS.filter(p => p.playUrl).length} Jugables en Navegador
              </span>
              <span style={{ color: 'var(--line)' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)' }}>
                📦 {WEB_GAME_PORTS.filter(p => p.sourceUrl).length} Código Abierto Verificado
              </span>
            </div>
          </div>
          <Button
            variant={demoOnly ? 'primary' : 'ghost'}
            onClick={() => setDemoOnly(!demoOnly)}
          >
            {demoOnly ? '✓ SOLO CON DEMO JUGABLE' : 'MOSTRAR TODOS'}
          </Button>
        </div>
      </Panel>

      {/* Filter and Search Controls */}
      <Panel variant="default" className="catalog-filters-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="cyber-input"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="Buscar entre 212 juegos (ej. Celeste, Doom, Half-Life, GTA, Balatro, Mario)..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
            {search && (
              <Button variant="ghost" onClick={() => setSearch('')}>
                LIMPIAR
              </Button>
            )}
          </div>

          {/* Letter Jump Bar */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '0.4rem' }}>
              ÍNDICE:
            </span>
            {letters.map((lettr) => (
              <button
                key={lettr}
                type="button"
                className={`cyber-chip ${selectedLetter === lettr ? 'active' : ''}`}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => setSelectedLetter(lettr)}
              >
                {lettr}
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '0.4rem' }}>
              TECNOLOGÍA:
            </span>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              />
            ))}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--neon-cyan)' }}>
              MOSTRANDO: {filteredPorts.length} DE {WEB_GAME_PORTS.length}
            </span>
          </div>
        </div>
      </Panel>

      {/* Grid of Web Ports */}
      <div className="catalog-grid" style={{ minHeight: '300px' }}>
        {filteredPorts.length === 0 ? (
          <Panel title="SIN RESULTADOS" variant="magenta" className="col-span-full">
            <p style={{ color: 'var(--text-dim)' }}>
              No se encontraron ports con el criterio "{search}". Prueba seleccionando otra letra o tecnología.
            </p>
          </Panel>
        ) : (
          filteredPorts.map((item) => (
            <article
              key={item.id}
              className={`cyber-panel game-card variant-${item.accentColor}`}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className={`cyber-badge ${item.playUrl ? 'green' : 'yellow'}`}>
                    {item.playUrl ? '▶ JUGABLE' : '📦 SOURCE ONLY'}
                  </span>
                  <span className="cyber-badge cyan">
                    {item.category}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    color: 'var(--text)',
                    margin: '0.25rem 0 0.5rem',
                    letterSpacing: '0.03em'
                  }}
                >
                  {item.title}
                </h3>

                <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
                  {item.tagline}
                </p>

                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-1)',
                        padding: '0.15rem 0.4rem',
                        border: '1px solid var(--line)',
                        color: 'var(--text-dim)'
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                {item.playUrl ? (
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => handleLaunchGame(item)}
                  >
                    ▶ JUGAR
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => handleLaunchGame(item)}
                  >
                    📦 VER CÓDIGO
                  </Button>
                )}

                {item.sourceUrl && item.playUrl && (
                  <Button
                    variant="ghost"
                    ariaLabel="Ver repositorio en GitHub"
                    onClick={() => window.open(item.sourceUrl!, '_blank', 'noopener,noreferrer')}
                  >
                    📦
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Embedded Player Modal */}
      {activePlayItem && activePlayItem.playUrl && (
        <div
          className="cyber-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 4, 10, 0.94)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem'
          }}
        >
          {/* Modal Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 1rem',
              background: 'var(--bg-0)',
              border: '1px solid var(--neon-cyan)',
              boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
              marginBottom: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--neon-green)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                ● EN VIVO (WASM / WEBGL)
              </span>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)' }}>
                {activePlayItem.title}
              </strong>
              <span className="cyber-badge cyan">GAMEPAD ON</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="ghost"
                onClick={() => window.open(activePlayItem.playUrl!, '_blank', 'noopener,noreferrer')}
              >
                ↗ ABRIR EN PESTAÑA NUEVA
              </Button>
              <Button
                variant="danger"
                onClick={() => setActivePlayItem(null)}
              >
                ✕ SALIR DEL JUEGO
              </Button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div
            style={{
              flex: 1,
              background: '#000',
              border: '1px solid var(--line)',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <iframe
              src={activePlayItem.playUrl}
              title={activePlayItem.title}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
              allow="autoplay; fullscreen; gamepad; focus-without-user-activation *"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
            />
          </div>
        </div>
      )}
    </div>
  );
}
