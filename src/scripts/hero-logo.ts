/** Service cards anchored to the renderer's projected logo surface. */
const instances = new Map<HTMLElement, () => void>();
let installed = false;

export function initHeroLogo(root: HTMLElement): () => void {
  const existing = instances.get(root);
  if (existing) return existing;
  const renderer = root.querySelector<HTMLElement>('neuraz-mercury');
  const stage = root.querySelector<HTMLElement>('[data-mercury-stage]');
  const bubble = root.querySelector<HTMLElement>('[data-hero-logo-bubble]');
  const link = root.querySelector<HTMLAnchorElement>('[data-hero-logo-link]');
  const label = root.querySelector<HTMLElement>('[data-hero-logo-label]');
  const explanation = root.querySelector<HTMLElement>('[data-hero-logo-explanation]');
  const fallback = root.querySelector<HTMLElement>('[data-hero-logo-fallback]');
  const pins = [...root.querySelectorAll<HTMLButtonElement>('[data-mercury-pin]')];
  if (!renderer || !stage || !bubble || !link || !label || !explanation || !fallback || !pins.length) return () => {};

  const lifetime = new AbortController();
  const { signal } = lifetime;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const status = root.querySelector<HTMLElement>('[data-hero-logo-status]');
  let active: HTMLButtonElement | undefined;
  let sticky = false;
  let suppressFocus = false;
  let ready = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let width = 0;
  let height = 0;
  let bubbleWidth = 0;
  let bubbleHeight = 0;
  let copyRight = 0;

  const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = undefined; };

  function close(restoreFocus = false) {
    cancelClose();
    const previous = active;
    active?.setAttribute('aria-expanded', 'false');
    active = undefined;
    sticky = false;
    bubble!.hidden = true;
    if (status) status.textContent = '';
    if (restoreFocus && previous) {
      suppressFocus = true;
      previous.focus({ preventScroll: true });
      queueMicrotask(() => { suppressFocus = false; });
    }
  }

  function measure() {
    const rect = stage!.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    copyRight = 0;
    const copy = root.closest('.hero')?.querySelector<HTMLElement>('.hero-copy');
    if (copy && window.matchMedia('(min-width: 1024px)').matches) {
      const copyRect = copy.getBoundingClientRect();
      if (copyRect.bottom > rect.top && copyRect.top < rect.bottom) {
        copyRight = Math.max(0, copyRect.right - rect.left + 20);
      }
    }
    if (!bubble!.hidden) {
      bubbleWidth = bubble!.offsetWidth;
      bubbleHeight = bubble!.offsetHeight;
    }
    placeBubble();
  }

  function placeBubble() {
    if (!active || bubble!.hidden || !width || !height) return;
    if (active.dataset.visible === 'false') { close(); return; }
    const x = Number(active.dataset.screenX);
    const y = Number(active.dataset.screenY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const padding = 12;
    const leftLimit = clamp(copyRight, padding, width - bubbleWidth - padding);
    const left = clamp(x - bubbleWidth / 2, leftLimit, width - bubbleWidth - padding);
    const above = y - 31 - bubbleHeight >= padding;
    const top = clamp(above ? y - 31 - bubbleHeight : y + 31, padding, height - bubbleHeight - padding);
    bubble!.style.left = `${left.toFixed(1)}px`;
    bubble!.style.top = `${top.toFixed(1)}px`;
    bubble!.style.setProperty('--arrow-x', `${clamp(x - left, 16, bubbleWidth - 16).toFixed(1)}px`);
    bubble!.dataset.placement = above ? 'above' : 'below';
  }

  function show(pin: HTMLButtonElement, persist = false, announce = false) {
    if (!ready || pin.dataset.visible === 'false') return;
    cancelClose();
    if (active !== pin) active?.setAttribute('aria-expanded', 'false');
    active = pin;
    sticky = persist;
    label!.textContent = pin.dataset.label || '';
    explanation!.textContent = pin.dataset.explanation || '';
    link!.href = pin.dataset.href || '#servicios';
    pin.setAttribute('aria-expanded', 'true');
    bubble!.hidden = false;
    if (announce && status) status.textContent = pin.dataset.label || '';
    measure();
  }

  function scheduleClose() {
    cancelClose();
    if (sticky) return;
    closeTimer = setTimeout(() => {
      if (bubble!.contains(document.activeElement) || active === document.activeElement) return;
      close();
    }, 200);
  }

  function syncPins() {
    for (const pin of pins) {
      const tabIndex = ready && pin.dataset.visible !== 'false' ? 0 : -1;
      if (pin.tabIndex !== tabIndex) pin.tabIndex = tabIndex;
    }
    placeBubble();
  }

  function syncReady() {
    ready = renderer!.dataset.ready === 'true';
    root.dataset.ready = String(ready);
    fallback!.hidden = ready;
    if (!ready) close();
    syncPins();
    measure();
  }

  for (const [index, pin] of pins.entries()) {
    pin.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !sticky) show(pin);
    }, { signal });
    pin.addEventListener('pointerleave', scheduleClose, { signal });
    pin.addEventListener('focus', () => { if (!suppressFocus) show(pin); }, { signal });
    pin.addEventListener('blur', scheduleClose, { signal });
    pin.addEventListener('click', event => {
      event.stopPropagation();
      if (active === pin && sticky) close();
      else {
        show(pin, true, true);
        if (event.detail === 0) link!.focus({ preventScroll: true });
      }
    }, { signal });
    pin.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (['Enter', ' '].includes(event.key)) { event.stopPropagation(); return; }
      let next = index;
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % pins.length;
      else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index - 1 + pins.length) % pins.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = pins.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      const direction = ['ArrowLeft', 'ArrowUp', 'End'].includes(event.key) ? -1 : 1;
      for (let count = 0; count < pins.length; count++) {
        const candidate = pins[(next + count * direction + pins.length) % pins.length];
        if (candidate.dataset.visible !== 'false') { candidate.focus({ preventScroll: true }); break; }
      }
    }, { signal });
  }

  bubble.addEventListener('pointerenter', cancelClose, { signal });
  bubble.addEventListener('pointerleave', scheduleClose, { signal });
  bubble.addEventListener('focusin', cancelClose, { signal });
  bubble.addEventListener('focusout', scheduleClose, { signal });
  bubble.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
  }, { signal });
  root.querySelector('[data-hero-logo-close]')?.addEventListener('click', () => close(true), { signal });
  document.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('[data-mercury-pin], [data-hero-logo-bubble]')) close();
  }, { signal });
  renderer.addEventListener('mercury:ready', syncReady, { signal });
  renderer.addEventListener('mercury:error', syncReady, { signal });
  renderer.addEventListener('mercury:project', syncPins, { signal });
  motion.addEventListener('change', syncReady, { signal });
  window.addEventListener('resize', measure, { signal });
  const attributes = new MutationObserver(syncReady);
  attributes.observe(renderer, { attributes: true, attributeFilter: ['data-ready', 'data-state'] });
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  syncReady();

  const dispose = () => {
    close();
    lifetime.abort();
    attributes.disconnect();
    resize.disconnect();
    root.dataset.ready = 'false';
    fallback.hidden = false;
    pins.forEach(pin => { pin.tabIndex = -1; });
    instances.delete(root);
  };
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
