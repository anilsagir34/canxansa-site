/*
 * CANXANSA — hero port scene ("living photo")
 * A single fullscreen WebGL quad that animates the port photograph:
 *  · the container + spreader swing as a pendulum around a pivot above the frame
 *  · the hoist ropes stretch and swing with it
 *  · water and the wet apron ripple, the sun breathes, the quay lamps flicker
 * Masks (R = load, G = rope corridor, B = water) come from hero-port-masks.png.
 */

const VERT = `#version 300 es
in vec2 p;
out vec2 vUV;
void main(){ vUV = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 outColor;

uniform sampler2D uPhoto;
uniform sampler2D uMask;
uniform vec2  uRes;
uniform float uTime;
uniform float uImgAspect;
uniform vec2  uPointer;
uniform float uIntro;      // 0..1 fade-in of the motion
uniform float uAmp;        // global motion amount (0 = frozen)

const float PI2 = 6.2831853;

// image-space constants (y = 0 top, 1 bottom — matches the mask authoring)
const vec2  PIVOT   = vec2(0.585, -0.42);   // trolley, above the frame
const float SWAY    = 0.0090;               // radians
const float SWAY_T  = 13.0;                 // seconds per swing
const float HOIST   = 0.0120;               // uv units the load travels down
const float HOIST_T = 26.0;
const vec2  SUN     = vec2(0.049, 0.828);
const float ROPE_END = 0.34;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void main(){
  // ── cover-fit the photo into the viewport ──
  // on narrow screens the crop slides so the CX mark on the container stays
  // in frame — the reason the photo is there in the first place
  float ca = uRes.x / uRes.y;
  vec2 s = (ca > uImgAspect) ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
  float portrait = smoothstep(1.15, 0.62, ca);
  float cx = clamp(mix(0.5, 0.37, portrait), s.x * 0.5, 1.0 - s.x * 0.5);
  vec2 uv = (vUV - 0.5) * s + vec2(cx, 0.5);
  uv.y = 1.0 - uv.y;                       // to image space (y down)

  float t = uTime;
  float amp = uAmp * uIntro;

  // slow camera float + pointer parallax
  uv += vec2(sin(t * 0.061) * 0.0035, cos(t * 0.047) * 0.0026) * amp;
  uv += uPointer * vec2(0.0075, 0.0055);
  // gentle push-in so the frame never feels locked
  uv = (uv - vec2(0.5)) * (1.0 - 0.012 * (0.5 + 0.5 * sin(t * 0.043))) + vec2(0.5);

  vec3 m = texture(uMask, uv).rgb;
  float mLoad = m.r, mRope = m.g, mWater = m.b;
  float mSwing = max(mLoad, mRope);

  // ── pendulum ──
  float th = SWAY * sin(t * PI2 / SWAY_T) * amp;
  vec2 rel = (uv - PIVOT) * vec2(uImgAspect, 1.0);
  vec2 rot = vec2(cos(th) * rel.x - sin(th) * rel.y,
                  sin(th) * rel.x + cos(th) * rel.y) - rel;
  rot /= vec2(uImgAspect, 1.0);
  vec2 disp = rot * mSwing;

  // ── hoist: the load creeps down, the ropes pay out ──
  float hoist = HOIST * (0.5 - 0.5 * cos(t * PI2 / HOIST_T)) * amp;
  disp.y += hoist * mLoad;
  disp.y += hoist * mRope * clamp(uv.y / ROPE_END, 0.0, 1.0);

  // load parallax (it is nearer than the port behind it)
  disp += uPointer * vec2(0.011, 0.008) * mLoad;

  // ── water + wet apron ──
  if (mWater > 0.002) {
    float w = mWater;
    float wave = sin(uv.y * 300.0 + t * 1.15) + sin(uv.x * 96.0 - t * 0.72);
    disp.x += wave * 0.00055 * w * amp;
    disp.y += sin(uv.x * 150.0 + t * 1.6) * 0.00035 * w * amp;
  }

  // both textures are uploaded top-row-first, so v matches image-space y
  vec2 suv = uv + disp;
  vec3 col = texture(uPhoto, suv).rgb;

  // sparse sun glints on the water, strongest in the sun's column
  if (mWater > 0.002) {
    float lane = exp(-pow((uv.x - SUN.x) * 2.4, 2.0)) + 0.10;
    vec2 cell = floor(uv * vec2(520.0, 900.0));
    float n = hash(cell);
    float tw = 0.5 + 0.5 * sin(t * 2.3 + n * PI2);
    float sp = smoothstep(0.972, 0.999, n) * tw * tw;
    col += vec3(1.0, 0.80, 0.50) * sp * mWater * lane * 0.42 * amp;
  }

  // ── sun breathing + haze ──
  float d = distance(uv * vec2(uImgAspect, 1.0), SUN * vec2(uImgAspect, 1.0));
  float pulse = 0.052 + 0.014 * sin(t * 0.55) + 0.008 * sin(t * 1.7);
  col += vec3(1.0, 0.62, 0.28) * exp(-d * 6.2) * (pulse * amp + 0.030);

  // ── quay lamps ──
  vec3 lampCol = vec3(1.0, 0.66, 0.30);
  vec2 lamps[4] = vec2[4](vec2(0.630, 0.918), vec2(0.735, 0.926),
                          vec2(0.500, 0.808), vec2(0.804, 0.845));
  for (int i = 0; i < 4; i++) {
    float ld = distance(uv * vec2(uImgAspect, 1.0), lamps[i] * vec2(uImgAspect, 1.0));
    float fl = 0.85 + 0.15 * sin(t * (3.1 + float(i) * 1.7) + float(i));
    col += lampCol * exp(-ld * 150.0) * 0.30 * fl;
  }

  // ── grade: subtle breath, vignette, grain ──
  col *= 1.0 + 0.012 * sin(t * 0.33) * amp;
  vec2 q = vUV - 0.5;
  col *= 1.0 - dot(q, q) * 0.28;
  col += (hash(gl_FragCoord.xy + fract(t) * 91.7) - 0.5) * 0.016;

  outColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

/*
 * Dokular RGBA8 olarak yüklenir, SRGB8_ALPHA8 olarak DEĞİL: sRGB iç formatı
 * örneklemede doğrusal uzaya çevirir, bu shader ise çıkışta geri kodlamaz —
 * o yüzden sRGB formatı kareyi yaklaşık gama kadar koyultur. Pass-through
 * fotoğrafı olduğu gibi gösterir.
 */
function loadTexture(gl, url, unit, srgb) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, srgb ? gl.SRGB8_ALPHA8 : gl.RGBA8,
        img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      resolve({ tex, img });
    };
    img.onerror = () => reject(new Error('image failed: ' + url));
    img.src = url;
  });
}

/**
 * @param {HTMLElement} host      element the canvas fills
 * @param {object} opts           { photo, photoSmall, masks, onReady }
 */
export function initHeroPort(host, opts = {}) {
  const photoUrl = opts.photo || '/images/hero-port.webp';
  const smallUrl = opts.photoSmall || photoUrl;
  const maskUrl = opts.masks || '/images/hero-port-masks.png';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .9s ease;';
  const gl = canvas.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserveDrawingBuffer
  });
  if (!gl) return null;                       // caller keeps the static <img>
  host.appendChild(canvas);

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  for (const n of ['uPhoto', 'uMask', 'uRes', 'uTime', 'uImgAspect', 'uPointer', 'uIntro', 'uAmp']) {
    U[n] = gl.getUniformLocation(prog, n);
  }
  gl.uniform1i(U.uPhoto, 0);
  gl.uniform1i(U.uMask, 1);
  gl.uniform1f(U.uAmp, reduced ? 0 : 1);

  const dprCap = window.matchMedia('(max-width: 900px)').matches ? 1.5 : 2;
  let w = 1, h = 1;
  function resize() {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    w = Math.max(1, Math.round(r.width * dpr));
    h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // pointer parallax, smoothed
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  function onMove(e) {
    const r = host.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', onMove, { passive: true });
  }

  let alive = true, raf = 0, t0 = performance.now(), intro = 0, ready = false, frames = 0;
  let onScreen = true;

  function frame(now) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!ready) return;
    if ((frames++ % 15) === 0) {
      const r = host.getBoundingClientRect();
      onScreen = r.bottom > 0 && r.top < window.innerHeight;
    }
    if (!onScreen || document.hidden) return;      // hero scrolled away: stop drawing
    const t = (now - t0) / 1000;
    intro = Math.min(1, intro + 0.012);
    ptr.x += (ptr.tx - ptr.x) * 0.045;
    ptr.y += (ptr.ty - ptr.y) * 0.045;
    resizeIfNeeded();
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uIntro, intro * intro);
    gl.uniform2f(U.uPointer, ptr.x, ptr.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let lastW = 0, lastH = 0;
  function resizeIfNeeded() {
    const r = host.getBoundingClientRect();
    if (Math.abs(r.width - lastW) > 0.5 || Math.abs(r.height - lastH) > 0.5) {
      lastW = r.width; lastH = r.height;
      resize();
    }
  }

  const useSmall = window.matchMedia('(max-width: 760px)').matches;
  Promise.all([
    loadTexture(gl, useSmall ? smallUrl : photoUrl, 0, false),
    loadTexture(gl, maskUrl, 1, false)
  ]).then(([photo]) => {
    gl.uniform1f(U.uImgAspect, photo.img.width / photo.img.height);
    resize();
    ready = true;
    canvas.style.opacity = '1';
    if (opts.onReady) opts.onReady();
  }).catch((e) => {
    console.warn('[hero-port]', e.message);
    canvas.remove();
  });

  raf = requestAnimationFrame(frame);

  return {
    canvas, gl,
    /** deterministic frame, used by the preview harness */
    step(t) { gl.uniform1f(U.uTime, t); gl.uniform1f(U.uIntro, 1); gl.drawArrays(gl.TRIANGLES, 0, 3); },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      canvas.remove();
    }
  };
}

export default initHeroPort;
