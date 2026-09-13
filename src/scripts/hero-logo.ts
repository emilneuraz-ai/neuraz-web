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
  const circle = root.querySelector<HTMLButtonElement>('[data-hero-logo-circle]');
  const circleIcon = root.querySelector<HTMLElement>('[data-hero-logo-circle-icon]');
  const pins = [...root.querySelectorAll<HTMLButtonElement>('[data-mercury-pin]')];
  if (!renderer || !stage || !bubble || !link || !label || !explanation || !fallback || !circle || !circleIcon || !pins.length) return () => {};

  const lifetime = new AbortController();
  const { signal } = lifetime;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  const host = root.closest<HTMLElement>('[data-shared-logo-host]');
  const status = root.querySelector<HTMLElement>('[data-hero-logo-status]');
  let active: HTMLButtonElement | undefined;
  let sticky = false;
  let suppressFocus = false;
  let ready = false;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;
  let expandFrame: number | undefined;
  let closing = false;
  let selectedId = root.dataset.activeService || null;
  let width = 0;
  let height = 0;
  let bubbleWidth = 0;
  let bubbleHeight = 0;
  let copyRight = 0;
  let badgeWidth = 180;
  let badgeDiameter = 32;
  let badgeDirection: 'left' | 'right' = 'right';

  const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = undefined; };
  const isAvailable = (pin: HTMLButtonElement) => host?.dataset.destination !== 'services' || pin.dataset.active === 'true';

  function restorePinFocus(pin?: HTMLButtonElement) {
    if (!pin) return;
    suppressFocus = true;
    pin.focus({ preventScroll: true });
    queueMicrotask(() => { suppressFocus = false; });
  }

  function close(restoreFocus = false, immediate = false) {
    cancelClose();
    if (closing && !immediate) return;
    clearTimeout(collapseTimer);
    if (expandFrame !== undefined) cancelAnimationFrame(expandFrame);
    const previous = active;
    active?.setAttribute('aria-expanded', 'false');
    sticky = false;
    bubble!.dataset.open = 'false';
    bubble!.inert = true;
    if (status) status.textContent = '';
    const finish = () => {
      bubble!.hidden = true;
      bubble!.inert = false;
      if (previous) delete previous.dataset.badgeOrigin;
      active = undefined;
      closing = false;
      syncPins();
      if (restoreFocus) restorePinFocus(previous);
    };
    if (previous && mobile.matches && !motion.matches && !immediate && !bubble!.hidden) {
      closing = true;
      collapseTimer = setTimeout(finish, 275);
    } else finish();
  }

  function selectService(id: string | null, source: 'interaction' | 'external', open: boolean) {
    selectedId = pins.some(pin => pin.dataset.heroLogoService === id) ? id : null;
    if (selectedId) root.dataset.activeService = selectedId;
    else delete root.dataset.activeService;
    for (const pin of pins) pin.dataset.active = String(pin.dataset.heroLogoService === selectedId);
    syncPins();
    root.dispatchEvent(new CustomEvent('hero-logo:change', { detail: { id: selectedId, open, source } }));
  }

  function measure() {
    const rect = stage!.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    copyRight = 0;
    const copy = host?.dataset.destination === 'services' ? null : document.querySelector<HTMLElement>('.hero .hero-copy');
    if (copy && window.matchMedia('(min-width: 1024px)').matches) {
      const copyRect = copy.getBoundingClientRect();
      if (copyRect.bottom > rect.top && copyRect.top < rect.bottom) {
        copyRight = Math.max(0, copyRect.right - rect.left + 20);
      }
    }
    if (!bubble!.hidden && !mobile.matches) {
      bubbleWidth = bubble!.offsetWidth;
      bubbleHeight = bubble!.offsetHeight;
    }
    if (active && mobile.matches) measureBadge();
    placeBubble();
  }

  function measureBadge() {
    if (!active || !width) return;
    const x = Number(active.dataset.screenX);
    if (!Number.isFinite(x)) return;
    badgeDiameter = active.offsetWidth;
    const radius = badgeDiameter / 2;
    const rightSpace = width - 12 - (x - radius);
    const leftSpace = x + radius - 12;
    // The integrated icon stays at the projected pin; only its label grows.
    const desiredWidth = Math.min(238, Math.max(110, label!.getBoundingClientRect().width + badgeDiameter + 25));
    badgeDirection = rightSpace >= desiredWidth || rightSpace >= leftSpace ? 'right' : 'left';
    badgeWidth = Math.max(badgeDiameter, Math.min(desiredWidth, badgeDirection === 'right' ? rightSpace : leftSpace));
    bubble!.dataset.direction = badgeDirection;
    bubble!.style.setProperty('--badge-width', `${badgeWidth.toFixed(1)}px`);
  }

  function placeBubble() {
    if (!active || bubble!.hidden || !width || !height) return;
    if (active.dataset.visible === 'false' || !isAvailable(active)) { close(false, true); return; }
    const x = Number(active.dataset.screenX);
    const y = Number(active.dataset.screenY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (mobile.matches) {
      const radius = badgeDiameter / 2;
      const available = badgeDirection === 'right' ? width - 12 - (x - radius) : x + radius - 12;
      const currentWidth = Math.max(badgeDiameter, Math.min(badgeWidth, available));
      bubble!.style.setProperty('--badge-width', `${currentWidth.toFixed(1)}px`);
      bubble!.style.left = `${(badgeDirection === 'right' ? x - radius : x + radius).toFixed(1)}px`;
      bubble!.style.top = `${clamp(y, radius + 2, height - radius - 2).toFixed(1)}px`;
      return;
    }
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
    if (!ready || pin.dataset.visible === 'false' || !isAvailable(pin)) return;
    cancelClose();
    const newlyOpened = active !== pin || bubble!.hidden || closing;
    if (active && active !== pin) close(false, true);
    clearTimeout(collapseTimer);
    closing = false;
    active = pin;
    sticky = persist;
    label!.textContent = pin.dataset.label || '';
    explanation!.textContent = pin.dataset.explanation || '';
    link!.href = pin.dataset.href || '#servicios';
    circle!.setAttribute('aria-label', `Cerrar ${pin.dataset.label || 'detalle del servicio'}`);
    const icon = pin.querySelector('svg');
    if (newlyOpened && icon) circleIcon!.replaceChildren(icon.cloneNode(true));
    pin.setAttribute('aria-expanded', 'true');
    bubble!.hidden = false;
    bubble!.inert = false;
    if (mobile.matches) pin.dataset.badgeOrigin = 'true';
    else delete pin.dataset.badgeOrigin;
    if (announce && status) status.textContent = pin.dataset.label || '';
    if (host?.dataset.destination !== 'services') {
      selectService(pin.dataset.heroLogoService || null, 'interaction', true);
    }
    measure();
    if (mobile.matches && newlyOpened && !motion.matches) {
      bubble!.dataset.open = 'false';
      // Measure the collapsed circle before expanding its actual outline.
      void bubble!.offsetWidth;
      if (expandFrame !== undefined) cancelAnimationFrame(expandFrame);
      expandFrame = requestAnimationFrame(() => { bubble!.dataset.open = 'true'; });
    } else bubble!.dataset.open = 'true';
    syncPins();
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
      const available = isAvailable(pin);
      const availableValue = String(available);
      if (pin.dataset.available !== availableValue) pin.dataset.available = availableValue;
      // Keep the selection gate authoritative for slotted, projected buttons.
      const visibility = available ? '' : 'hidden';
      const pointerEvents = available ? '' : 'none';
      if (pin.style.visibility !== visibility) pin.style.visibility = visibility;
      if (pin.style.pointerEvents !== pointerEvents) pin.style.pointerEvents = pointerEvents;
      if (pin.inert !== !available) pin.inert = !available;
      const tabIndex = ready && available && pin.dataset.visible !== 'false' && !(mobile.matches && active === pin) ? 0 : -1;
      if (pin.tabIndex !== tabIndex) pin.tabIndex = tabIndex;
    }
    placeBubble();
  }

  function syncReady() {
    ready = renderer!.dataset.ready === 'true';
    root.dataset.ready = String(ready);
    fallback!.hidden = ready;
    if (!ready) close(false, true);
    syncPins();
    measure();
  }

  for (const [index, pin] of pins.entries()) {
    pin.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && !sticky && host?.dataset.destination !== 'services') show(pin);
    }, { signal });
    pin.addEventListener('pointerleave', scheduleClose, { signal });
    pin.addEventListener('focus', () => {
      if (!suppressFocus && (!mobile.matches || pin.matches(':focus-visible'))) show(pin);
    }, { signal });
    pin.addEventListener('blur', scheduleClose, { signal });
    pin.addEventListener('click', event => {
      event.stopPropagation();
      if (active === pin && sticky && !closing) close();
      else {
        show(pin, true, true);
        if (event.detail === 0) link!.focus({ preventScroll: true });
        else if (mobile.matches) circle!.focus({ preventScroll: true });
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
        if (candidate.dataset.visible !== 'false' && isAvailable(candidate)) { candidate.focus({ preventScroll: true }); break; }
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
  circle.addEventListener('click', event => { event.stopPropagation(); close(true); }, { signal });
  document.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('[data-mercury-pin], [data-hero-logo-bubble]')) close();
  }, { signal });
  renderer.addEventListener('mercury:ready', syncReady, { signal });
  renderer.addEventListener('mercury:error', syncReady, { signal });
  renderer.addEventListener('mercury:project', syncPins, { signal });
  motion.addEventListener('change', syncReady, { signal });
  mobile.addEventListener('change', () => { close(false, true); measure(); }, { signal });
  const onExternalSelection = (event: Event) => {
    const detail = (event as CustomEvent<{ id?: string | null; open?: boolean; focus?: boolean }>).detail;
    if (!detail || !('id' in detail)) return;
    close(false, true);
    const id = typeof detail.id === 'string' ? detail.id : null;
    selectService(id, 'external', false);
    if (detail.open) {
      const pin = pins.find(candidate => candidate.dataset.heroLogoService === id);
      if (pin) { show(pin, true); if (detail.focus) link!.focus({ preventScroll: true }); }
    }
  };
  root.addEventListener('hero-logo:select', onExternalSelection, { signal });
  window.addEventListener('resize', measure, { signal });
  const attributes = new MutationObserver(syncReady);
  attributes.observe(renderer, { attributes: true, attributeFilter: ['data-ready', 'data-state'] });
  const selectionAttributes = new MutationObserver(() => {
    const requested = root.dataset.activeService || null;
    if (requested === selectedId) return;
    close(false, true);
    selectService(requested, 'external', false);
  });
  selectionAttributes.observe(root, { attributes: true, attributeFilter: ['data-active-service'] });
  const destinationAttributes = new MutationObserver(() => { syncPins(); measure(); });
  if (host) destinationAttributes.observe(host, { attributes: true, attributeFilter: ['data-destination'] });
  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  syncReady();
  selectService(selectedId, 'external', false);

  const dispose = () => {
    close(false, true);
    lifetime.abort();
    attributes.disconnect();
    selectionAttributes.disconnect();
    destinationAttributes.disconnect();
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
