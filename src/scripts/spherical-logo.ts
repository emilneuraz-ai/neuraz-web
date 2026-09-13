import * as THREE from 'three';
const instances = new Map<HTMLElement, () => void>();
const fragment = /* glsl */ `
precision highp float;
uniform sampler2D field;
uniform vec2 resolution;
uniform mat3 rotation;
uniform float time;
uniform float fluid;
float maskAt(vec2 p, float tile) {
  vec2 uv=vec2(p.x/2.2+.5,.5-p.y/2.2);
  if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.)))) return .2+max(abs(p.x)-1.1,abs(p.y)-1.1);
  vec2 cell=vec2(mod(tile,3.),floor(tile/3.));
  uv=(cell+(clamp(uv,0.,1.)*511.+.5)/512.)/3.;
  return (texture2D(field,uv).r-.5)*.4;
}
float surfaceMask(vec2 uv,float offset){
  float phase=mod(time*1.65+offset,8.);
  float a=floor(phase),progress=smoothstep(0.,1.,fract(phase));
  // Damped spring: stretch past the next connection, then settle exactly on it.
  float spring=(1.-exp(-7.*progress)*cos(10.*progress))/(1.-exp(-7.)*cos(10.));
  float t=mix(progress,clamp(spring,0.,1.16),.35);
  return mix(maskAt(uv,0.),mix(maskAt(uv,a+1.),maskAt(uv,mod(a+1.,8.)+1.),t),fluid*(1.-smoothstep(.72,1.04,length(uv))));
}
float neuralShape(vec3 p){
  // Opposing faces share one footprint: corresponding branches join through
  // the depth, without a mirrored mismatch or an empty equatorial band.
  float channels=surfaceMask(p.xy,0.);
  float radius=length(p);
  float shell=abs(radius-1.02)-.10;
  float rim=.88-length(p.xy);
  float unionWeight=clamp(.5+.5*(rim-shell)/.06,0.,1.);
  float joined=mix(rim,shell,unionWeight)-.06*unionWeight*(1.-unionWeight);
  // Narrow the existing bridges smoothly at their midpoint, without side holes.
  float waist=1.-smoothstep(0.,.65,abs(p.z));
  channels+=.018*waist;
  float envelope=max(radius-1.12,joined);
  float h=clamp(.5+.5*(envelope-channels)/.10,0.,1.);
  return mix(channels,envelope,h)+.10*h*(1.-h);
}
float shape(vec3 p){ return neuralShape(p); }

void main(){
  vec2 xy=(gl_FragCoord.xy/resolution-.5)*2.65;
  vec3 ro=rotation*vec3(xy,3.);
  vec3 rd=rotation*vec3(0.,0.,-1.);
  float b=dot(ro,rd),c=dot(ro,ro)-1.25*1.25,disc=b*b-c;
  if(disc<0.)discard;
  float travel=max(0.,-b-sqrt(disc));float end=-b+sqrt(disc);
  vec3 p;bool hit=false;
  for(int i=0;i<150;i++){
    p=ro+rd*travel;float d=shape(p);
    if(d<.0009){hit=true;break;}
    travel+=max(d*.55,.00045);if(travel>end)break;
  }
  if(!hit)discard;
  vec2 e=vec2(.007,0.);
  vec3 n=normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));
  vec3 light=normalize(rotation*vec3(-.5,.8,1.5));
  float diffuse=max(dot(n,light),0.);
  float spec=pow(max(dot(reflect(-light,n),-rd),0.),24.);
  float shade=dot(n,normalize(p))<-.12 ? .980392 : .025+.13*diffuse+.16*spec;
  gl_FragColor=vec4(vec3(shade),1.);
}`;
async function init(root: HTMLElement) {
  if(instances.has(root))return;
  const stage=root.querySelector<HTMLElement>('[data-sphere-stage]')!;
  const canvas=root.querySelector<HTMLCanvasElement>('canvas')!;
  const lifetime=new AbortController();const {signal}=lifetime;
  let renderer:THREE.WebGLRenderer|undefined, texture:THREE.Texture|undefined, material:THREE.ShaderMaterial|undefined, mesh:THREE.Mesh|undefined;
  let frame=0,disposed=false,visible=true;
  const dispose=()=>{disposed=true;lifetime.abort();cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();texture?.dispose();material?.dispose();mesh?.geometry.dispose();renderer?.dispose();instances.delete(root);};
  instances.set(root,dispose);
  let width=1,height=1;
  const resize=new ResizeObserver(()=>{width=stage.clientWidth;height=stage.clientHeight;renderer?.setSize(width,height,false);if(renderer&&material)renderer.getDrawingBufferSize(material.uniforms.resolution.value);});resize.observe(stage);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(stage);
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor(0,0);
    texture=await new THREE.TextureLoader().loadAsync('/models/neuraz-sphere-field.png');if(disposed){texture.dispose();return;}
    texture.flipY=false;texture.colorSpace=THREE.NoColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
    const rotation=new THREE.Matrix3(),matrix=new THREE.Matrix4(),euler=new THREE.Euler();
    material=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,transparent:true,uniforms:{field:{value:texture},resolution:{value:new THREE.Vector2()},rotation:{value:rotation},time:{value:0},fluid:{value:.8}}});
    const scene=new THREE.Scene();mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);const camera=new THREE.Camera();
    renderer.setSize(stage.clientWidth,stage.clientHeight,false);renderer.getDrawingBufferSize(material.uniforms.resolution.value);
    let x=0,y=0,tx=0,ty=0,dragging=false,lastX=0,lastY=0,lastTime=performance.now(),playing=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const play=root.querySelector<HTMLButtonElement>('[data-sphere-play]')!;
    const axis=root.querySelector<HTMLSelectElement>('[data-sphere-axis]')!;
    const setPlaying=(value:boolean)=>{playing=value;play.textContent=value?'Pausar giro ⏸':'Reproducir giro ▶';play.setAttribute('aria-pressed',String(value));root.dataset.rotating=String(value);};
    const reset=()=>{setPlaying(false);tx=ty=0;material!.uniforms.time.value=0;};
    const opts={signal};
    stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;stage.dataset.dragging='true';event.preventDefault();stage.focus({preventScroll:true});setPlaying(false);lastX=event.clientX;lastY=event.clientY;stage.setPointerCapture(event.pointerId);},opts);
    stage.addEventListener('pointermove',event=>{if(!dragging)return;event.preventDefault();ty+=(event.clientX-lastX)*.008;tx+=(event.clientY-lastY)*.008;lastX=event.clientX;lastY=event.clientY;},opts);
    const end=()=>{dragging=false;stage.dataset.dragging='false';};stage.addEventListener('pointerup',end,opts);stage.addEventListener('pointercancel',end,opts);stage.addEventListener('lostpointercapture',end,opts);
    stage.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='r'){reset();return;}if(!event.key.startsWith('Arrow'))return;event.preventDefault();setPlaying(false);tx+=event.key==='ArrowDown'?.2:event.key==='ArrowUp'?-.2:0;ty+=event.key==='ArrowRight'?.25:event.key==='ArrowLeft'?-.25:0;},opts);
    root.querySelector('[data-sphere-reset]')?.addEventListener('click',reset,opts);
    play.addEventListener('click',()=>setPlaying(!playing),opts);
    root.querySelector('[data-sphere-fullscreen]')?.addEventListener('click',()=>{
      const action=document.fullscreenElement?document.exitFullscreen():root.requestFullscreen();
      action.catch(()=>{root.dataset.fullscreenError='true';});
    },opts);
    const draw=(now:number)=>{
      if(disposed)return;frame=requestAnimationFrame(draw);const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;
      if(!visible||document.hidden)return;
      if(playing&&!dragging){if(axis.value!=='horizontal')tx+=dt*.84;if(axis.value!=='vertical')ty+=dt*1.08;}
      const ease=1-Math.exp(-dt*8);x+=(tx-x)*ease;y+=(ty-y)*ease;
      euler.set(x,y,0);matrix.makeRotationFromEuler(euler);rotation.setFromMatrix4(matrix);
      const facing=Math.abs(matrix.elements[10]);
      const recovery=THREE.MathUtils.smoothstep(facing,.7,.99);
      material!.uniforms.fluid.value=reduced.matches?0:(.7*(1-recovery)+.5*recovery)*Math.sin(material!.uniforms.time.value*Math.PI/3.5)**2;
      material!.uniforms.time.value+=reduced.matches?0:dt;
      renderer!.render(scene,camera);root.dataset.ready='true';root.dataset.pose=Math.abs(x)+Math.abs(y)<.001?'logo':'sphere';
      const caption=root.querySelector('[data-sphere-angles]');if(caption)caption.textContent=`Horizontal ${Math.round(y*180/Math.PI)}° · Vertical ${Math.round(x*180/Math.PI)}°`;
    };draw(performance.now());
  } catch(error){root.dataset.error='true';console.warn('Spherical logo unavailable',error);dispose();}
}
let installed=false;
export function installSphericalLogos(){const scan=()=>{for(const[root,dispose]of instances)if(!root.isConnected)dispose();document.querySelectorAll<HTMLElement>('[data-spherical-logo]').forEach(init);};if(!installed){installed=true;document.addEventListener('astro:page-load',scan);document.addEventListener('astro:before-swap',()=>{for(const dispose of instances.values())dispose();});window.addEventListener('pagehide',()=>{for(const dispose of [...instances.values()])dispose();});window.addEventListener('pageshow',scan);}scan();}
