/** Screen previews use explicit controls; horizontal gestures belong to the project carousel. */
class ProjectStory extends HTMLElement {
  private cleanup?: () => void;
  connectedCallback() {
    if (this.cleanup) return;
    const stage = this.querySelector<HTMLElement>('.story-stage')!;
    const track = this.querySelector<HTMLElement>('.story-track')!;
    const gallery = this.querySelector<HTMLElement>('.story-gallery')!;
    const windowEl = this.querySelector<HTMLElement>('.story-window')!;
    const scenes = Array.from(this.querySelectorAll<HTMLElement>('[data-work-scene]'));
    const indicators = Array.from(this.querySelectorAll<HTMLElement>('[data-scene-target]'));
    const previous = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-scene-prev]'));
    const next = Array.from(this.querySelectorAll<HTMLButtonElement>('[data-scene-next]'));
    const counter = this.querySelector<HTMLElement>('[data-scene-counter]')!;
    const announcement = this.querySelector<HTMLElement>('.story-announcement')!;
    const abort = new AbortController();
    let active = 0;
    const playback = this.querySelector<HTMLButtonElement>('[data-carousel-playback]')!;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const slideDuration = this.dataset.format === 'presentation' ? 8000 : 2000;
    let paused = reducedMotion.matches;
    let visible = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopAuto = () => { clearTimeout(timer); timer = undefined; };
    const scheduleAuto = () => {
      stopAuto();
      playback.setAttribute('aria-pressed', String(paused));
      playback.setAttribute('aria-label', paused ? 'Reanudar presentación automática' : 'Pausar presentación automática');
      playback.textContent = paused ? '▷' : 'Ⅱ';
      if (paused || !visible || document.hidden || this.querySelector(':focus-visible')) return;
      timer = setTimeout(() => { active = (active + 1) % scenes.length; render(); scheduleAuto(); }, slideDuration);
    };
    this.setAttribute('data-enhanced', '');
    const positionControls = () => {
      const demo = scenes[active].querySelector<HTMLElement>('[data-scene-demo]');
      if (!demo) return;
      const bottom = demo.getBoundingClientRect().bottom - gallery.getBoundingClientRect().top;
      gallery.style.setProperty('--visual-bottom', `${bottom + 12}px`);
    };
    const fitViews = () => {
      const mobile = matchMedia('(max-width:767px)').matches;
      const copy = this.querySelector<HTMLElement>('[data-scene-copy]');
      const heading = this.querySelector<HTMLElement>('.story-heading');
      const budget = stage.clientHeight - (copy?.offsetHeight || 0) - (heading?.offsetHeight || 0) - 164;
      const mobileHeight = Math.max(140, Math.min(520, budget));
      if (!mobile) gallery.style.removeProperty('--mobile-preview-height');
      const fits = scenes.map(scene => {
        const demo = scene.querySelector<HTMLElement>('[data-scene-demo]');
        if (!demo) return 1;
        const styles = getComputedStyle(scene);
        const caption = scene.querySelector<HTMLElement>('[data-scene-caption]');
        const available = mobile ? mobileHeight - 52 : scene.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
          - (caption?.offsetHeight || 0) - 18;
        const natural = demo.offsetHeight;
        scene.style.setProperty('--demo-natural-height', `${natural}px`);
        return Math.min(1, Math.max(.1, available / Math.max(1,natural)));
      });
      const sharedScale = Math.min(1,...fits);
      const halfWidths = scenes.map((scene,index)=>{
        const scale=scene.querySelector('[data-screen-image]')?fits[index]:sharedScale;
        scene.style.setProperty('--demo-scale',String(scale));
        const demo=scene.querySelector<HTMLElement>('[data-scene-demo]')!;
        const surface=demo.querySelector<HTMLElement>('[data-device-frame]' )||demo;
        let width=surface.offsetWidth;
        if(surface instanceof HTMLImageElement)width=Math.min(width,surface.offsetHeight*Number(surface.getAttribute('width'))/Number(surface.getAttribute('height')));
        return width*scale/2;
      });
      if (mobile) {
        const demo = scenes[active].querySelector<HTMLElement>('[data-scene-demo]')!;
        const scale = scenes[active].querySelector('[data-screen-image]') ? fits[active] : sharedScale;
        // Reserve the rendered screen height, including its shadow gutter.
        gallery.style.setProperty('--mobile-preview-height', `${demo.offsetHeight * scale + 52}px`);
      }
      // Controls stay in place while only the screen track moves.
      gallery.style.setProperty('--visual-half-width',`${Math.max(...halfWidths)}px`);
      positionControls();
    };
    const render = (announce=false) => {
      this.dataset.layout = scenes[active].querySelector('.device-frame.phone') ? 'phone' : 'wide';
      track.style.transform = `translate3d(${-active * windowEl.clientWidth}px,0,0)`;
      scenes.forEach((scene,i)=>{scene.inert=i!==active;scene.toggleAttribute('data-active',i===active);scene.style.setProperty('--scene-focus',i===active?'1':'0');});
      indicators.forEach((indicator,i)=>{if(i===active)indicator.setAttribute('aria-current','step');else indicator.removeAttribute('aria-current');});
      previous.forEach(button=>button.disabled=false);next.forEach(button=>button.disabled=false);
      counter.textContent=String(active+1).padStart(2,'0');
      fitViews();
      if(announce)announcement.textContent=indicators[active].getAttribute('aria-label')||'';
    };
    const goTo=(index:number)=>{
      active=(index+scenes.length)%scenes.length;render(true);
      scheduleAuto();
    };
    previous.forEach(button=>button.addEventListener('click',()=>goTo(active-1),{signal:abort.signal}));
    next.forEach(button=>button.addEventListener('click',()=>goTo(active+1),{signal:abort.signal}));
    this.querySelector('.story-carousel-controls')?.addEventListener('keydown',event=>{
      const key=(event as KeyboardEvent).key;
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
      event.preventDefault();goTo(key==='Home'?0:key==='End'?scenes.length-1:active+(key==='ArrowRight'?1:-1));
      (key==='ArrowLeft'||key==='Home'?previous[0]:next[0]).focus({preventScroll:true});
    },{signal:abort.signal});
    playback.addEventListener('click', () => { paused = !paused; scheduleAuto(); }, {signal:abort.signal});
    document.addEventListener('visibilitychange', scheduleAuto, {signal:abort.signal});
    this.addEventListener('focusin', scheduleAuto, {signal:abort.signal});
    this.addEventListener('focusout', () => queueMicrotask(scheduleAuto), {signal:abort.signal});
    reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches; scheduleAuto(); }, {signal:abort.signal});
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].intersectionRatio >= .6;
      scheduleAuto();
    }, {threshold:[0,.6,1]});
    visibility.observe(stage);
    windowEl.addEventListener('dragstart',event=>event.preventDefault(),{signal:abort.signal});
    const sync=()=>{render();};
    const resize=new ResizeObserver(sync);resize.observe(stage);resize.observe(windowEl);
    scenes.forEach(scene=>{const demo=scene.querySelector('[data-scene-demo]');if(demo)resize.observe(demo);});
    document.fonts.ready.then(()=>{if(!abort.signal.aborted)sync();});
    sync();
    this.cleanup=()=>{stopAuto();visibility.disconnect();abort.abort();resize.disconnect();};
  }
  disconnectedCallback(){this.cleanup?.();this.cleanup=undefined;}
}
if(!customElements.get('project-story'))customElements.define('project-story',ProjectStory);
