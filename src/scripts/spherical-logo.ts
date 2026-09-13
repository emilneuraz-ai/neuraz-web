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
float neuralShape(vec3 p){
  float rest=maskAt(p.xy,0.);
  float phase=mod(time*.85+p.z*.25,8.);
  float a=floor(phase),t=fract(phase);
  float moving=mix(maskAt(p.xy,a+1.),maskAt(p.xy,mod(a+1.,8.)+1.),t);
  // Depth-dependent flow makes the connections change throughout the sphere.
  float channels=mix(rest,moving,fluid);
  channels-=fluid*.012*sin(p.z*8.+time*2.+p.x*6.);
  float shell=abs(length(p)-.93)-.17;
  float stems=2.;
  stems=min(stems,length(p.xy-vec2(-.46,.52))-.07);
  stems=min(stems,length(p.xy-vec2(-.02,.88))-.07);
  stems=min(stems,length(p.xy-vec2(.60,.69))-.07);
  stems=min(stems,length(p.xy-vec2(-.60,-.65))-.07);
  stems=min(stems,length(p.xy-vec2(-.04,-.89))-.07);
  stems=min(stems,length(p.xy-vec2(.56,-.72))-.07);
  float sphere=max(length(p)-1.1,min(shell,stems));
  // Rounded intersection; the SVG channels determine the orthographic silhouette.
  float k=.055;float h=clamp(.5+.5*(sphere-channels)/k,0.,1.);
  return mix(channels,sphere,h)+k*h*(1.-h);
}
float shape(vec3 p){ return min(neuralShape(p),length(p)-.99); }
void main(){
  vec2 xy=(gl_FragCoord.xy/resolution-.5)*2.65;
  vec3 ro=rotation*vec3(xy,3.);
  vec3 rd=rotation*vec3(0.,0.,-1.);
  float b=dot(ro,rd),c=dot(ro,ro)-1.12*1.12,disc=b*b-c;
  if(disc<0.)discard;
  float travel=max(0.,-b-sqrt(disc));float end=-b+sqrt(disc);
  vec3 p;bool hit=false;
  for(int i=0;i<150;i++){
    p=ro+rd*travel;float d=shape(p);
    if(d<.0009){hit=true;break;}
    travel+=max(d*.55,.00045);if(travel>end)break;
  }
  if(!hit)discard;
  vec2 e=vec2(.002,0.);
  vec3 n=normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));
  vec3 light=normalize(rotation*vec3(-.5,.8,1.5));
  float diffuse=max(dot(n,light),0.);
  float spec=pow(max(dot(reflect(-light,n),-rd),0.),24.);
  bool interior=length(p)<1.005 || dot(n,normalize(p))<.38;
  float shade=interior ? .68+.16*diffuse : .025+.09*diffuse+.09*spec;
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
    material=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:fragment,transparent:true,uniforms:{field:{value:texture},resolution:{value:new THREE.Vector2()},rotation:{value:rotation},time:{value:0},fluid:{value:0}}});
    const scene=new THREE.Scene();mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);const camera=new THREE.Camera();
    renderer.setSize(stage.clientWidth,stage.clientHeight,false);renderer.getDrawingBufferSize(material.uniforms.resolution.value);
    let x=0,y=0,tx=0,ty=0,amount=0,dragging=false,lastX=0,lastY=0,lastInteraction=-Infinity,demo=-Infinity,lastTime=performance.now();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const reset=()=>{tx=ty=0;demo=-Infinity;lastInteraction=-Infinity;};
    const step=Math.PI/4;
    const alignedRotation=(angle:number)=>{const sector=Math.floor(angle/step),f=angle/step-sector;const blend=THREE.MathUtils.smoothstep(f,.72,1);return angle-(sector+blend)*step;};
    const opts={signal};
    stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;demo=-Infinity;lastX=event.clientX;lastY=event.clientY;lastInteraction=performance.now();stage.setPointerCapture(event.pointerId);},opts);
    stage.addEventListener('pointermove',event=>{if(!dragging)return;ty+=(event.clientX-lastX)*.008;tx=THREE.MathUtils.clamp(tx+(event.clientY-lastY)*.008,-1.3,1.3);lastX=event.clientX;lastY=event.clientY;lastInteraction=performance.now();},opts);
    const end=()=>{dragging=false;lastInteraction=performance.now();};stage.addEventListener('pointerup',end,opts);stage.addEventListener('pointercancel',end,opts);
    stage.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='r'){reset();return;}if(!event.key.startsWith('Arrow'))return;event.preventDefault();demo=-Infinity;tx+=event.key==='ArrowDown'?.2:event.key==='ArrowUp'?-.2:0;ty+=event.key==='ArrowRight'?.25:event.key==='ArrowLeft'?-.25:0;lastInteraction=performance.now();},opts);
    root.querySelector('[data-sphere-reset]')?.addEventListener('click',reset,opts);
    root.querySelector('[data-sphere-horizontal]')?.addEventListener('click',()=>{tx=0;ty=(Math.round(ty/step)+1)*step;demo=-Infinity;lastInteraction=Infinity;},opts);
    root.querySelector('[data-sphere-vertical]')?.addEventListener('click',()=>{ty=0;tx=(Math.round(tx/step)+1)*step;demo=-Infinity;lastInteraction=Infinity;},opts);
    root.querySelector('[data-sphere-demo]')?.addEventListener('click',()=>{if(reduced.matches){tx=.45;ty=1;lastInteraction=performance.now();return;}demo=performance.now();},opts);
    const draw=(now:number)=>{
      if(disposed)return;frame=requestAnimationFrame(draw);const dt=Math.min((now-lastTime)/1000,.08);lastTime=now;
      if(!visible||document.hidden)return;
      const elapsed=(now-demo)/1000;
      let targetFluid=0;
      if(elapsed>=0&&elapsed<12){const progress=elapsed/12;const envelope=Math.sin(Math.PI*progress)**2;tx=.65*envelope;ty=Math.PI*2*(progress*progress*(3-2*progress));targetFluid=envelope;if(progress>.995)reset();}
      else if(Number.isFinite(demo)){y-=Math.PI*2;reset();}
      else if(!dragging&&now-lastInteraction>2600){tx=0;ty=0;}
      if(dragging||now-lastInteraction<2600)targetFluid=Math.min(1,Math.abs(tx)+Math.abs(ty));
      const ease=1-Math.exp(-dt*5);x+=(tx-x)*ease;y+=(ty-y)*ease;amount+=(targetFluid-amount)*ease;
      if(Math.abs(x)+Math.abs(y)<.001&&targetFluid===0){x=y=0;amount=0;}
      euler.set(alignedRotation(x),alignedRotation(y),0);matrix.makeRotationFromEuler(euler);rotation.setFromMatrix4(matrix);
      const alignment=Math.min(1,Math.sin(x*4)**2+Math.sin(y*4)**2);
      material!.uniforms.fluid.value=reduced.matches?0:amount*alignment;
      material!.uniforms.time.value+=reduced.matches?0:dt;
      renderer!.render(scene,camera);root.dataset.ready='true';root.dataset.pose=alignment<.0001?'logo':'sphere';
      const caption=root.querySelector('[data-sphere-angles]');if(caption)caption.textContent=`Horizontal ${Math.round(y*180/Math.PI)}° · Vertical ${Math.round(x*180/Math.PI)}°`;
    };draw(performance.now());
  } catch(error){root.dataset.error='true';console.warn('Spherical logo unavailable',error);dispose();}
}
let installed=false;
export function installSphericalLogos(){const scan=()=>{for(const[root,dispose]of instances)if(!root.isConnected)dispose();document.querySelectorAll<HTMLElement>('[data-spherical-logo]').forEach(init);};if(!installed){installed=true;document.addEventListener('astro:page-load',scan);document.addEventListener('astro:before-swap',()=>{for(const dispose of instances.values())dispose();});window.addEventListener('pagehide',()=>{for(const dispose of [...instances.values()])dispose();});window.addEventListener('pageshow',scan);}scan();}
