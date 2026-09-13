/** One persistent scene follows layout slots; moving between services never reloads it. */
let disposeCurrent: (() => void) | undefined;
let installed = false;
export function installSharedLogo() {
  const init = () => {
    disposeCurrent?.();
    const host = document.querySelector<HTMLElement>('[data-shared-logo-host]');
    const home = document.querySelector<HTMLElement>('[data-hero-logo-slot]');
    const logo = host?.querySelector<HTMLElement>('[data-hero-logo]');
    const renderer = host?.querySelector<HTMLElement>('neuraz-mercury');
    if (!host || !home || !logo || !renderer) return;
    const life = new AbortController();
    let frame = 0;
    let selection: string | null | undefined;
    const update = () => {
      frame = 0;
      const homeRect = home.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>('.service-item[data-expanded="true"]');
      const content = panel?.querySelector<HTMLElement>('.service-content');
      const slot = panel?.querySelector<HTMLElement>('[data-service-logo-slot]');
      const panelRect = content?.getBoundingClientRect();
      const inServices = !!(slot && panelRect && panelRect.top < innerHeight * .85 && panelRect.bottom > 100 && homeRect.bottom < innerHeight * .45);
      const target = inServices ? slot! : home;
      const rect = target.getBoundingClientRect();
      const visible = rect.width > 0 && rect.bottom > 80 && rect.top < innerHeight && (!inServices || panelRect!.height > 30);
      host.hidden = !visible;
      host.dataset.destination = inServices ? 'services' : 'hero';
      host.style.left = `${rect.left}px`;
      host.style.top = `${rect.top}px`;
      host.style.width = `${rect.width}px`;
      host.style.height = `${rect.height}px`;
      const topClip = Math.max(0, 80 - rect.top, inServices ? panelRect!.top - rect.top : 0);
      const bottomClip = inServices ? Math.max(0, rect.bottom - panelRect!.bottom) : 0;
      host.style.clipPath = `inset(${topClip}px 0 ${bottomClip}px 0)`;
      const id = inServices ? panel!.dataset.serviceId || null : null;
      if (id !== selection) {
        selection = id;
        logo.dispatchEvent(new CustomEvent('hero-logo:select', { detail: { id } }));
      }
      home.dataset.sharedReady = String(renderer.dataset.ready === 'true');
      const fallback = home.querySelector<HTMLImageElement>('img');
      if (fallback) fallback.hidden = renderer.dataset.ready === 'true';
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const options = { signal: life.signal };
    window.addEventListener('scroll', schedule, { ...options, passive: true });
    window.addEventListener('resize', schedule, options);
    document.addEventListener('services:layout', schedule, options);
    renderer.addEventListener('mercury:ready', schedule, options);
    const resize = new ResizeObserver(schedule);
    resize.observe(home);
    document.querySelectorAll('.service-content').forEach(el => resize.observe(el));
    update();
    disposeCurrent = () => { life.abort(); resize.disconnect(); cancelAnimationFrame(frame); host.hidden = true; };
  };
  if (!installed) {
    installed = true;
    document.addEventListener('astro:page-load', init);
    document.addEventListener('astro:before-swap', () => disposeCurrent?.());
    window.addEventListener('pagehide', () => disposeCurrent?.());
    window.addEventListener('pageshow', init);
  }
  init();
}
