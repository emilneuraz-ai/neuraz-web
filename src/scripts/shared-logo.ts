/** One persistent scene travels from the hero to an independent desktop service rail. */
let disposeCurrent: (() => void) | undefined;
let installed = false;
export function installSharedLogo() {
  const init = () => {
    disposeCurrent?.();
    const host = document.querySelector<HTMLElement>('[data-shared-logo-host]');
    const home = document.querySelector<HTMLElement>('[data-hero-logo-slot]');
    const logo = host?.querySelector<HTMLElement>('[data-hero-logo]');
    const renderer = host?.querySelector<HTMLElement>('neuraz-mercury');
    const services = document.querySelector<HTMLElement>('#servicios');
    const list = services?.querySelector<HTMLElement>('[data-services-list]');
    const desktopSlot = services?.querySelector<HTMLElement>('[data-desktop-service-logo-slot]');
    if (!host || !home || !logo || !renderer || !services || !list || !desktopSlot) return;
    const life = new AbortController();
    const desktop = matchMedia('(min-width: 1024px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
    let frame = 0;
    let selection: string | null | undefined;
    const update = () => {
      frame = 0;
      const homeRect = home.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>('.service-item[data-expanded="true"]');
      const content = panel?.querySelector<HTMLElement>('.service-content');
      const slot = panel?.querySelector<HTMLElement>('[data-service-logo-slot]');
      const panelRect = content?.getBoundingClientRect();
      let inServices: boolean;
      let rect: { left: number; top: number; width: number; height: number; bottom: number };
      let bottomClip = 0;

      if (desktop.matches) {
        const rail = desktopSlot.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        const sectionRect = services.getBoundingClientRect();
        const homeTop = homeRect.top + scrollY;
        const listTop = listRect.top + scrollY;
        const size = rail.width;
        // Follow the active reading area without adding height to any accordion panel.
        const railTop = clamp(scrollY + innerHeight * .5 - size / 2,
          listTop - 24, Math.max(listTop - 24, listRect.bottom + scrollY - size));
        const start = Math.max(0, homeTop + homeRect.height - innerHeight * .9);
        const end = Math.max(start + 1, listTop - innerHeight * .32);
        const linear = clamp((scrollY - start) / (end - start), 0, 1);
        const progress = motion.matches ? Number(linear >= .5) : linear * linear * (3 - 2 * linear);
        const top = lerp(homeTop, railTop, progress) - scrollY;
        const width = lerp(homeRect.width, size, progress);
        rect = { left: lerp(homeRect.left, rail.left, progress), top, width, height: width, bottom: top + width };
        inServices = linear >= .5;
        bottomClip = Math.max(0, rect.bottom - sectionRect.bottom);
        host.style.left = '0px';
        host.style.top = '0px';
        host.style.transform = `translate3d(${rect.left}px, ${rect.top + scrollY}px, 0)`;
        host.dataset.scrollProgress = progress.toFixed(3);
      } else {
        inServices = !!(slot && panelRect && panelRect.top < innerHeight * .85 && panelRect.bottom > 100 && homeRect.bottom < innerHeight * .45);
        rect = (inServices ? slot! : home).getBoundingClientRect();
        bottomClip = inServices ? Math.max(0, rect.bottom - panelRect!.bottom) : 0;
        host.style.transform = '';
        host.style.left = `${rect.left}px`;
        host.style.top = `${rect.top}px`;
        delete host.dataset.scrollProgress;
      }

      const visible = rect.width > 0 && rect.bottom > 80 && rect.top < innerHeight && (desktop.matches || !inServices || panelRect!.height > 30);
      host.hidden = !visible;
      host.dataset.destination = inServices ? 'services' : 'hero';
      host.style.width = `${rect.width}px`;
      host.style.height = `${rect.height}px`;
      const topClip = Math.max(0, 80 - rect.top, !desktop.matches && inServices ? panelRect!.top - rect.top : 0);
      host.style.clipPath = `inset(${topClip}px 0 ${bottomClip}px 0)`;
      const id = inServices ? panel?.dataset.serviceId || null : null;
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
    desktop.addEventListener('change', schedule, options);
    motion.addEventListener('change', schedule, options);
    document.addEventListener('services:layout', schedule, options);
    renderer.addEventListener('mercury:ready', schedule, options);
    const resize = new ResizeObserver(schedule);
    resize.observe(home);
    resize.observe(desktopSlot);
    resize.observe(list);
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
