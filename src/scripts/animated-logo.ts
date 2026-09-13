/** Flat SVG playback of the native mercury motion. No canvas, filters or WebGL. */
interface LogoMotion {
  version: number;
  fps: number;
  duration: number;
  frames: string[];
}

export interface AnimatedLogoController {
  play(): void;
  pause(): void;
  destroy(): void;
}

const motionRequests = new Map<string, Promise<LogoMotion>>();
const instances = new Map<HTMLElement, AnimatedLogoController>();
let installed = false;

function loadMotion(url: string): Promise<LogoMotion> {
  let request = motionRequests.get(url);
  if (!request) {
    request = fetch(url, { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Logo motion: ${response.status}`);
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object') throw new Error('Invalid logo motion');
        const encoded = data as LogoMotion & { paths?: string[]; timeline?: number[] };
        const frames = Array.isArray(encoded.frames) ? encoded.frames
          : Array.isArray(encoded.paths) && Array.isArray(encoded.timeline)
            && encoded.timeline.every((index) => Number.isInteger(index) && index >= 0 && index < encoded.paths!.length)
            ? encoded.timeline.map((index) => encoded.paths![index]) : [];
        const motion: LogoMotion = { version: encoded.version, fps: encoded.fps, duration: encoded.duration, frames };
        if (motion.version !== 1 || !Number.isFinite(motion.fps) || motion.fps < 1 || motion.fps > 60
          || !Number.isFinite(motion.duration) || motion.duration <= 0
          || !Array.isArray(motion.frames) || motion.frames.length < 2 || motion.frames.length > 500
          || motion.frames.length !== Math.round(motion.duration * motion.fps)
          || !motion.frames.every((frame) => typeof frame === 'string' && frame.startsWith('M'))) {
          throw new Error('Invalid logo frames');
        }
        return motion;
      })
      .catch((error: unknown) => {
        motionRequests.delete(url);
        throw error;
      });
    motionRequests.set(url, request);
  }
  return request;
}

export function initAnimatedLogo(root: HTMLElement): AnimatedLogoController {
  const previous = instances.get(root);
  if (previous) return previous;
  const path = root.querySelector<SVGPathElement>('[data-logo-path]');
  if (!path) throw new Error('AnimatedLogo requires its SVG path');
  const restingPath = path.getAttribute('d') || '';
  const toggle = root.querySelector<HTMLButtonElement>('[data-logo-toggle]');
  const pauseIcon = root.querySelector<SVGPathElement>('[data-logo-pause-icon]');
  const playIcon = root.querySelector<SVGPathElement>('[data-logo-play-icon]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = root.dataset.paused === 'true';
  let visible = !('IntersectionObserver' in window);
  let destroyed = false;
  let pending = false;
  let failed = false;
  let motion: LogoMotion | undefined;
  let raf: number | undefined;
  let lastTime: number | undefined;
  let elapsed = 0;
  let lastFrame = -1;

  function updateControl() {
    if (!toggle) return;
    toggle.hidden = reducedMotion.matches || failed;
    toggle.setAttribute('aria-label', paused ? 'Reproducir animación del logo' : 'Pausar animación del logo');
    toggle.setAttribute('aria-pressed', String(paused));
    pauseIcon?.toggleAttribute('hidden', paused);
    playIcon?.toggleAttribute('hidden', !paused);
  }

  function stop() {
    if (raf !== undefined) cancelAnimationFrame(raf);
    raf = undefined;
    lastTime = undefined;
  }

  function canRun() {
    return !destroyed && !paused && visible && !document.hidden && !reducedMotion.matches;
  }

  function tick(now: number) {
    raf = undefined;
    if (!canRun() || !motion) return;
    if (lastTime !== undefined) elapsed += now - lastTime;
    lastTime = now;
    const frame = Math.floor(elapsed * motion.fps / 1000) % motion.frames.length;
    if (frame !== lastFrame) {
      path!.setAttribute('d', motion.frames[frame]);
      lastFrame = frame;
    }
    raf = requestAnimationFrame(tick);
  }

  async function reconcile() {
    updateControl();
    if (!canRun()) {
      stop();
      return;
    }
    if (!motion && !pending && !failed) {
      pending = true;
      try {
        motion = await loadMotion(root.dataset.motionSrc || '/models/neuraz-logo-motion.json');
      } catch {
        // A missing asset leaves the exact original SVG visible and usable.
        failed = true;
      } finally {
        pending = false;
      }
      if (destroyed) return;
      updateControl();
    }
    if (motion && canRun() && raf === undefined) raf = requestAnimationFrame(tick);
  }

  function setPaused(value: boolean) {
    paused = value;
    root.dataset.paused = String(value);
    void reconcile();
  }

  const onToggle = () => setPaused(!paused);
  const onPlay = () => setPaused(false);
  const onPause = () => setPaused(true);
  const onVisibility = () => { void reconcile(); };
  const onMotionChange = () => {
    if (reducedMotion.matches) {
      stop();
      elapsed = 0;
      lastFrame = -1;
      path!.setAttribute('d', restingPath);
    }
    void reconcile();
  };

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    void reconcile();
  }) : undefined;
  observer?.observe(root);
  const attributes = new MutationObserver(() => {
    paused = root.dataset.paused === 'true';
    void reconcile();
  });
  attributes.observe(root, { attributes: true, attributeFilter: ['data-paused'] });
  toggle?.addEventListener('click', onToggle);
  root.addEventListener('animated-logo:play', onPlay);
  root.addEventListener('animated-logo:pause', onPause);
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', onMotionChange);

  const controller: AnimatedLogoController = {
    play: onPlay,
    pause: onPause,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      observer?.disconnect();
      attributes.disconnect();
      toggle?.removeEventListener('click', onToggle);
      root.removeEventListener('animated-logo:play', onPlay);
      root.removeEventListener('animated-logo:pause', onPause);
      document.removeEventListener('visibilitychange', onVisibility);
      reducedMotion.removeEventListener('change', onMotionChange);
      path!.setAttribute('d', restingPath);
      if (toggle) toggle.hidden = true;
      instances.delete(root);
    },
  };
  instances.set(root, controller);
  void reconcile();
  return controller;
}

/** Astro navigation can replace the DOM while keeping this module loaded. */
export function installAnimatedLogos() {
  const scan = () => {
    for (const [root, controller] of instances) if (!root.isConnected) controller.destroy();
    document.querySelectorAll<HTMLElement>('[data-animated-logo]').forEach((root) => initAnimatedLogo(root));
  };
  if (!installed) {
    installed = true;
    document.addEventListener('astro:page-load', scan);
    document.addEventListener('astro:before-swap', () => {
      for (const controller of [...instances.values()]) controller.destroy();
    });
    window.addEventListener('pagehide', () => {
      for (const controller of [...instances.values()]) controller.destroy();
    });
    window.addEventListener('pageshow', scan);
  }
  scan();
}
