import * as T from "../node_modules/three/build/three.module.js";
import { head } from "./head-data.js";
import { AudioAnalysis } from "./audio.mjs";
const $ = (id) => document.getElementById(id),
  status = (s) => ($("status").textContent = s);
const transparent =
  new URLSearchParams(location.search).get("mode") === "transparent";
$("mode").value = new URLSearchParams(location.search).get("mode") || "normal";
let audio = new AudioAnalysis(),
  active = false,
  paused = false,
  gain = 1.5,
  count = 65536,
  renderScale = 1;
window.orb.onPCM((bytes) => {
  if (!active) return;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    samples = new Float32Array(bytes.byteLength / 4);
  for (let i = 0; i < samples.length; i++)
    samples[i] = data.getFloat32(i * 4, true);
  audio.push(samples);
});
window.orb.onError((message) => {
  active = false;
  audio = new AudioAnalysis();
  status(message);
});
async function refresh() {
  try {
    const current = $("input").value;
    const list = await window.orb.sources();
    $("input").replaceChildren(new Option("Select audio input", ""));
    for (const s of list)
      $("input").add(
        new Option(
          (s.monitor ? "SYSTEM · " : "MIC / SOURCE · ") + s.label,
          s.name,
        ),
      );
    $("input").value = current;
    if (!list.length) status("No audio sources found. Check PipeWire.");
  } catch (e) {
    status(e.message);
  }
}
$("refresh").onclick = refresh;
$("listen").onclick = async () => {
  if (!$("input").value) return status("Choose an audio input first.");
  active = false;
  audio = new AudioAnalysis();
  try {
    await window.orb.capture($("input").value);
    active = true;
    $("demo").checked = false;
    status("Listening · " + $("input").selectedOptions[0].text);
  } catch (e) {
    status(e.message);
  }
};
$("stop").onclick = async () => {
  active = false;
  await window.orb.stop();
  audio = new AudioAnalysis();
  status("Audio capture off · idle animation");
};
$("mode").onchange = () => window.orb.mode($("mode").value);
$("close").onclick = () => window.orb.close();
$("hide").onclick = () => document.body.classList.toggle("hidden");
window.addEventListener("keydown", (e) => {
  if (e.target.matches("input,select,button")) return;
  if (e.key.toLowerCase() === "h") document.body.classList.toggle("hidden");
  if (e.key === "Escape") document.body.classList.remove("hidden");
  if (e.code === "Space") {
    paused = !paused;
    e.preventDefault();
  }
});
$("demo").onchange = () => { audio = new AudioAnalysis(); if (!active) status($("demo").checked ? "Demo pulse · simulated audio, no capture" : "Audio capture off · idle float"); };
$("gain").oninput = () => (gain = +$("gain").value);
refresh();
try {
  init();
} catch (e) {
  status("GPU initialization failed: " + e.message);
  console.error(e);
}
function init() {
  const renderer = new T.WebGLRenderer({
    canvas: $("scene"),
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
  });
  renderer.setClearColor(0, 0);
  renderer.debug.checkShaderErrors = true;
  const gl = renderer.getContext();
  if (!gl.getExtension("EXT_color_buffer_float"))
    throw Error(
      "Floating-point render targets unavailable. Check NVIDIA hardware acceleration.",
    );
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.z = 6.6;
  const fftData = new Float32Array(128),
    fft = new T.DataTexture(fftData, 128, 1, T.RedFormat, T.FloatType);
  fft.needsUpdate = true;
  const uniforms = {
    time: { value: 0 },
    bass: { value: 0 },
    mids: { value: 0 },
    high: { value: 0 },
    energy: { value: 0 },
    beat: { value: 0 },
    fft: { value: fft },
    pixel: { value: 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms, transparent:true, depthWrite:false, blending:T.AdditiveBlending,
    vertexShader:`
      uniform float time,bass,mids,high,energy,beat,pixel;
      uniform sampler2D fft;
      attribute float seed; attribute float loose;
      varying float alpha; varying vec3 color;
      void main(){
        float low=min(bass,1.5), pulse=min(beat,1.);
        float band=texture2D(fft,vec2(clamp((position.y+1.7)/3.4,0.,1.),.5)).r;
        float wave=sin(position.y*5.-time*2.+seed*3.);
        vec3 p=position;
        float spread=loose*(.32+.24*sin(time*.45+seed*18.));
        vec3 direction=normalize(vec3(position.x,position.y*.55,position.z-.8)+vec3(.001));
        p+=direction*(spread+loose*loose*2.4);
        p+=vec3(sin(time*.37+seed*123.),cos(time*.46+seed*81.),sin(time*.31+seed*57.))*loose*.36;
        p*=1.+low*.16+pulse*.065;
        p+=normal*(low*.075+band*.12)*(.3+seed*.7);
        p+=direction*(low*.48+pulse*.36+min(high,1.)*.20)*(.07+loose+pow(seed,12.)*.28);
        p+=normal*wave*.006;
        p.y+=.055*sin(time*.65);
        float yaw=.08+.17*sin(time*.21), roll=.025*sin(time*.33);
        mat2 r=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw));p.xz=r*p.xz;
        p.xy=mat2(cos(roll),-sin(roll),sin(roll),cos(roll))*p.xy;
        vec3 n=normal;n.xz=r*n.xz;
        float facing=smoothstep(-.12,.4,n.z);
        float light=.35+.65*max(0.,dot(n,normalize(vec3(-.5,.7,1.))));
        alpha=(.15+seed*.45)*mix(facing*light*1.9,.045,smoothstep(0.,.65,loose))*(.8+min(energy,1.)*.3);
        color=mix(vec3(.015,.35,1.),vec3(.12,.85,1.),light);
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((1.5+pow(seed,6.)*2.4+loose*.8)*pixel*4.7/-mv.z,1.,7.);
      }`,
    fragmentShader:`varying float alpha;varying vec3 color;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,alpha*pow(1.-d,1.4));}`
  });
  // Area-weighted sampling of the head scan.
  const hp=head.positions, hn=head.normals, hi=head.indices, triangles=[],areas=[];
  let total=0;
  for(let t=0;t<hi.length;t+=3){
    const ids=hi.slice(t,t+3).map(i=>i*3);
    if(ids.some(i=>hp[i+1]<-1.35))continue;
    const a=new T.Vector3().fromArray(hp,ids[0]),b=new T.Vector3().fromArray(hp,ids[1]),c=new T.Vector3().fromArray(hp,ids[2]);
    const area=b.sub(a).cross(c.sub(a)).length()*.5;
    total+=area;triangles.push(ids);areas.push(total);
  }
  function geometry(n){
    let state=8731;const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
    const pos=new Float32Array(n*3),norm=new Float32Array(n*3),seeds=new Float32Array(n),loose=new Float32Array(n);
    for(let i=0;i<n;i++){
      const target=random()*total;let l=0,r=areas.length-1;
      while(l<r){const m=(l+r)>>1;if(areas[m]<target)l=m+1;else r=m;}
      const ids=triangles[l],u=Math.sqrt(random()),v=random(),weights=[1-u,u*(1-v),u*v];
      const point=[0,0,0],normal=[0,0,0];
      for(let k=0;k<3;k++)for(let axis=0;axis<3;axis++){point[axis]+=hp[ids[k]+axis]*weights[k];normal[axis]+=hn[ids[k]+axis]*weights[k];}
      // 3.1-unit head height, original human proportions preserved.
      pos.set([point[0]*.59,(point[1]-1.3)*.59,point[2]*.59],i*3);
      norm.set(normal,i*3);seeds[i]=random();
      const back=1-T.MathUtils.smoothstep(point[2],-.5,1.65);
      loose[i]=Math.min(1,back*(.25+random()*.75)+(random()<.07?random()*.85:0));
    }
    const g=new T.BufferGeometry();
    for(const [key,data,size] of [["position",pos,3],["normal",norm,3],["seed",seeds,1],["loose",loose,1]])g.setAttribute(key,new T.BufferAttribute(data,size));
    return g;
  }
  const points=new T.Points(geometry(count),material);points.frustumCulled=false;scene.add(points);
  $("count").onchange=()=>{count=+$("count").value;points.geometry.dispose();points.geometry=geometry(count);};
  // Half-float linear render targets; separable bloom and ping-pong temporal history.
  const target = () =>
    new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      depthBuffer: false,
    });
  const raw = target(),
    blurA = target(),
    blurB = target();
  let history = target(),
    next = target();
  const postScene = new T.Scene(),
    postCamera = new T.Camera(),
    quad = new T.Mesh(new T.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  postScene.add(quad);
  const vertex = `varying vec2 uvv;void main(){uvv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
  const blur = new T.ShaderMaterial({
    uniforms: { source: { value: null }, stepSize: { value: new T.Vector2() } },
    vertexShader: vertex,
    fragmentShader: `uniform sampler2D source;uniform vec2 stepSize;varying vec2 uvv;void main(){vec4 c=texture2D(source,uvv)*.227027;c+=(texture2D(source,uvv+stepSize*1.384615)+texture2D(source,uvv-stepSize*1.384615))*.316216;c+=(texture2D(source,uvv+stepSize*3.230769)+texture2D(source,uvv-stepSize*3.230769))*.070270;gl_FragColor=c;}`,
  });
  const combine = new T.ShaderMaterial({
    uniforms: {
      source: { value: raw.texture },
      bloom: { value: blurB.texture },
      history: { value: null },
      glow: { value: 0.9 },
      decay: { value: 0.78 },
    },
    vertexShader: vertex,
    fragmentShader: `uniform sampler2D source,bloom,history;uniform float glow,decay;varying vec2 uvv;void main(){vec3 current=texture2D(source,uvv).rgb+texture2D(bloom,uvv).rgb*glow*2.;vec3 old=texture2D(history,uvv).rgb;gl_FragColor=vec4(max(current,old*decay),1.);}`,
  });
  const output = new T.ShaderMaterial({
    uniforms: {
      source: { value: null },
      transparent: { value: transparent ? 1 : 0 },
    },
    vertexShader: vertex,
    fragmentShader: `uniform sampler2D source;uniform float transparent;varying vec2 uvv;void main(){vec3 c=1.-exp(-texture2D(source,uvv).rgb*1.3);c=pow(c,vec3(1./2.2));float a=clamp(max(c.r,max(c.g,c.b))*1.5,0.,1.);if(transparent>.5){gl_FragColor=vec4(c/max(a,.001),a);}else{vec3 bg=vec3(.018,.024,.046)*(1.-length(uvv-.5)*.65);gl_FragColor=vec4(c+bg,1.);}}`,
  });
  function pass(mat, out) {
    quad.material = mat;
    renderer.setRenderTarget(out);
    renderer.render(postScene, postCamera);
  }
  function resize() {
    const w = innerWidth,
      h = innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5) * renderScale;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.x = document.body.classList.contains("hidden") || w < 700 ? 0 : -.65;
    camera.updateProjectionMatrix();
    uniforms.pixel.value = ratio;
    raw.setSize(Math.ceil(w * ratio), Math.ceil(h * ratio));
    for (const rt of [history, next]) {
      rt.setSize(raw.width, raw.height);
      renderer.setRenderTarget(rt);
      renderer.clear();
    }
    for (const rt of [blurA, blurB])
      rt.setSize(
        Math.max(1, Math.ceil(raw.width / 2)),
        Math.max(1, Math.ceil(raw.height / 2)),
      );
    renderer.setRenderTarget(null);
  }
  window.addEventListener("resize", resize);
  $("scale").onchange = () => {
    renderScale = +$("scale").value;
    resize();
  };
  new MutationObserver(resize).observe(document.body,{attributes:true,attributeFilter:["class"]});
  resize();
  let last = performance.now(),
    time = 0,
    frames = 0,
    elapsed = 0;
  let demoPhase=0;
  function frame(now) {
    requestAnimationFrame(frame);
    const wallDt = (now - last) / 1000;
    const dt = Math.min(0.05, wallDt);
    last = now;
    if (paused) return;
    time += dt;
    if ($("demo").checked && !active) {
      const pcm=new Float32Array(2048),amp=.015+.25*Math.exp(-((time%(.6))*10));
      for(let i=0;i<pcm.length;i++) { demoPhase+=2*Math.PI*70/48000;pcm[i]=amp*Math.sin(demoPhase)+amp*.18*Math.sin(demoPhase*8); }
      audio.push(pcm);
    }
    audio.update(dt, time);
    uniforms.time.value = time;
    for (const [key, value] of Object.entries({
      bass: audio.bass,
      mids: audio.mid,
      high: audio.high,
      energy: audio.energy,
      beat: audio.beat,
    }))
      uniforms[key].value = Math.min(2, value * gain);
    for (let i = 0; i < 128; i++) fftData[i] = audio.spectrum[i] * gain;
    fft.needsUpdate = true;
    $("scene").dataset.expansion = (Math.min(uniforms.bass.value,1.5)*.16+Math.min(uniforms.beat.value,1)*.065).toFixed(4);
    renderer.setRenderTarget(raw);
    renderer.render(scene, camera);
    blur.uniforms.source.value = raw.texture;
    blur.uniforms.stepSize.value.set(1 / blurA.width, 0);
    pass(blur, blurA);
    blur.uniforms.source.value = blurA.texture;
    blur.uniforms.stepSize.value.set(0, 1 / blurA.height);
    pass(blur, blurB);
    combine.uniforms.history.value = history.texture;
    combine.uniforms.glow.value = +$("glow").value;
    combine.uniforms.decay.value = Math.pow(+$("trail").value, dt * 60);
    pass(combine, next);
    [history, next] = [next, history];
    output.uniforms.source.value = history.texture;
    pass(output, null);
    $("beat").style.opacity = 0.2 + audio.beat * 0.8;
    frames++;
    elapsed += wallDt;
    if (elapsed > 1) {
      $("stats").textContent =
        `${Math.round(frames / elapsed)} FPS · ${count.toLocaleString()} particles · WebGL2 · ${raw.width}×${raw.height}`;
      frames = 0;
      elapsed = 0;
    }
  }
  requestAnimationFrame(frame);
}
