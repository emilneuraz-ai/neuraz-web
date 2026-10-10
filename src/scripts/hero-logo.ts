/** Keep the service preview and the 3D material in sync with the scroll selection. */
const instances = new Map<HTMLElement, () => void>();
let installed = false;

export function initHeroLogo(root: HTMLElement): () => void {
  const existing = instances.get(root);
  if (existing) return existing;
  const layer = root.querySelector<HTMLElement>('[data-service-preview-layer]');
  const previews = [...root.querySelectorAll<HTMLElement>('[data-service-preview]')];
  if (!layer) return () => {};
  const lifetime = new AbortController();
  const { signal } = lifetime;

  const select = (id: string | null, open: boolean) => {
    if (id) root.dataset.activeService = id;
    else delete root.dataset.activeService;
    const active = previews.find(preview => preview.dataset.servicePreview === id);
    layer.hidden = !active || !open;
    for (const preview of previews) preview.hidden = preview !== active || !open;
    root.dispatchEvent(new CustomEvent('hero-logo:change', { detail: { id, open, source: 'external' } }));
  };
  root.addEventListener('hero-logo:select', event => {
    const detail = (event as CustomEvent<{ id?: string | null; open?: boolean }>).detail;
    select(detail?.id || null, !!detail?.open);
  }, { signal });
  // Preview links have the same return behavior as the main service links.
  root.querySelectorAll<HTMLAnchorElement>('[data-service-modal-link]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      try { sessionStorage.setItem('serviceModalOpenedFromSite', 'true'); } catch { /* Storage is optional. */ }
    }, { signal });
  });
  select(root.dataset.activeService || null, !!root.dataset.activeService);
  const dispose = () => { lifetime.abort(); instances.delete(root); };
  instances.set(root, dispose);
  return dispose;
}

export function installHeroLogos() {
  const scan = () => {
    for (const [root, dispose] of instances) if (!root.isConnected) dispose();
    document.querySelectorAll<HTMLElement>('[data-hero-logo]').forEach(initHeroLogo);
  };
  if (!installed) {
    installed = true;
    document.addEventListener('astro:page-load', scan);
    document.addEventListener('astro:before-swap', () => { for (const dispose of [...instances.values()]) dispose(); });
    window.addEventListener('pagehide', () => { for (const dispose of [...instances.values()]) dispose(); });
    window.addEventListener('pageshow', scan);
  }
  scan();
}
