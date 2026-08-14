/*
 * CANXANSA — Port Scene (KULLANILMIYOR / prototip)
 * Ship-to-shore gantry crane loading a 40' container onto a container vessel.
 * Pure three.js, no external assets: all geometry and textures are generated at runtime.
 *
 * Ana sayfa 2026-08-14'te fotoğraf tabanlı sahneye (hero-port.js) geçti; bu dosya
 * hiçbir sayfadan yüklenmiyor. Çalıştırmak için three.js r180 gerekir:
 *   mkdir -p js/vendor && cd js/vendor
 *   curl -sLO https://unpkg.com/three@0.180.0/build/three.module.min.js
 *   curl -sLO https://unpkg.com/three@0.180.0/build/three.core.min.js
 */
import * as THREE from './vendor/three.module.min.js';

/* ────────────────────────────── constants ────────────────────────────── */

const ORANGE = 0xe8521a;

// 40' GP container, real ISO dimensions (metres)
const C_LEN = 12.192, C_WID = 2.438, C_HGT = 2.591;

// corrugation profile
const CORR_PITCH = 0.29, CORR_DEPTH = 0.036, CORR_FLAT = 0.10, CORR_SLOPE = 0.045;

const SUN_DIR = new THREE.Vector3(-0.40, 0.155, -0.90).normalize();

const QUAY_Y = 5.2;          // quay deck level above water
const QUAY_EDGE = 0;         // quay face at z = 0, water is z < 0
const SHIP_Z = -19.5;        // ship centreline
const RAIL_WATER = 3.4;      // crane rail, waterside
const RAIL_LAND = 33.4;      // crane rail, landside

/* ────────────────────────────── small utils ────────────────────────────── */

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

function rnd(seed) {           // deterministic prng
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Collects transformed geometries and bakes them into one mesh (few draw calls). */
class Batch {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.count = 0; }
  add(geo, matrix) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone());
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const uvA = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length; i++) { this.pos.push(p[i]); this.nor.push(n[i]); }
    const vc = p.length / 3;
    for (let i = 0; i < vc; i++) {
      this.uv.push(uvA ? uvA[i * 2] : 0, uvA ? uvA[i * 2 + 1] : 0);
    }
    this.count += vc;
    g.dispose();
    return this;
  }
  /** box helper: size + position (+ optional quaternion) */
  box(sx, sy, sz, x, y, z, quat) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), quat || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    return this.add(g, m);
  }
  /** beam between two points, cross-section w x h */
  beam(p1, p2, w, h) {
    const dir = tmpV.subVectors(p2, p1);
    const len = dir.length();
    if (len < 1e-4) return this;
    const mid = tmpV2.addVectors(p1, p2).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
    return this.box(w, h, len, mid.x, mid.y, mid.z, q);
  }
  mesh(material, { shadow = true } = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = shadow; m.receiveShadow = shadow;
    return m;
  }
}

function v(x, y, z) { return new THREE.Vector3(x, y, z); }

/* ────────────────────────────── textures ────────────────────────────── */

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d') };
}

function texFrom(canvas, repeatX = 1, repeatY = 1, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  return t;
}

/** grain / dirt overlay used by several surfaces */
function grain(x, w, h, n, alpha, size, colors) {
  for (let i = 0; i < n; i++) {
    const px = Math.random() * w, py = Math.random() * h;
    x.fillStyle = colors[(Math.random() * colors.length) | 0];
    x.globalAlpha = Math.random() * alpha;
    x.fillRect(px, py, Math.random() * size + 1, Math.random() * size + 1);
  }
  x.globalAlpha = 1;
}

/** vertical rust / water streaks, the single most "real" detail on a container */
function streaks(x, w, h, count, from, len, dark) {
  for (let i = 0; i < count; i++) {
    const px = Math.random() * w;
    const y0 = from + Math.random() * 40;
    const l = len * (0.35 + Math.random() * 0.9);
    const gr = x.createLinearGradient(0, y0, 0, y0 + l);
    gr.addColorStop(0, dark ? 'rgba(20,14,10,0.30)' : 'rgba(96,52,24,0.34)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.globalAlpha = 0.35 + Math.random() * 0.5;
    x.fillRect(px, y0, 1 + Math.random() * 3.5, l);
  }
  x.globalAlpha = 1;
}

function containerSideTexture() {
  const W = 2048, H = 448;
  const { c, x } = cv(W, H);
  x.fillStyle = '#c9481a'; x.fillRect(0, 0, W, H);
  // panel paint unevenness
  for (let i = 0; i < 220; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#d4531f' : '#b23f16';
    x.globalAlpha = 0.05 + Math.random() * 0.09;
    x.fillRect(Math.random() * W, Math.random() * H, 40 + Math.random() * 260, 8 + Math.random() * 70);
  }
  x.globalAlpha = 1;
  // scuffs along the bottom rail
  const gb = x.createLinearGradient(0, H * 0.80, 0, H);
  gb.addColorStop(0, 'rgba(30,18,10,0)'); gb.addColorStop(1, 'rgba(28,17,9,0.45)');
  x.fillStyle = gb; x.fillRect(0, H * 0.80, W, H * 0.2);
  streaks(x, W, H, 150, 6, H * 0.85, false);
  streaks(x, W, H, 70, H * 0.45, H * 0.5, true);
  grain(x, W, H, 2600, 0.12, 3, ['#7a3210', '#e26a2f', '#4a2410', '#f0a070']);

  // ── markings ──
  x.textBaseline = 'middle';
  x.fillStyle = '#f3ece4';
  x.font = '700 132px Helvetica, Arial, sans-serif';
  x.globalAlpha = 0.94;
  x.fillText('CANXANSA', 150, 168);
  x.globalAlpha = 1;
  x.font = '600 52px Helvetica, Arial, sans-serif';
  x.fillStyle = 'rgba(243,236,228,0.86)';
  x.fillText('CXSU 400123 4', 152, 252);
  // ISO size/type box
  x.strokeStyle = 'rgba(243,236,228,0.8)'; x.lineWidth = 3;
  x.strokeRect(152, 286, 130, 58);
  x.font = '600 40px Helvetica, Arial, sans-serif';
  x.fillText('42G1', 168, 316);
  // weight block, far end
  x.font = '500 34px Helvetica, Arial, sans-serif';
  x.fillStyle = 'rgba(243,236,228,0.78)';
  const wx = W - 470;
  x.fillText('MAX GROSS   30,480 KG   67,200 LB', wx, 250);
  x.fillText('TARE            3,750 KG    8,265 LB', wx, 292);
  x.fillText('NET            26,730 KG   58,935 LB', wx, 334);
  x.fillText('CUBE              67.7 M3    2,390 FT3', wx, 376);
  // small CSC / owner strip
  x.fillStyle = 'rgba(20,14,10,0.55)'; x.fillRect(wx - 6, 120, 300, 70);
  x.fillStyle = 'rgba(243,236,228,0.7)';
  x.font = '500 30px Helvetica, Arial, sans-serif';
  x.fillText('CANXANSA OU  ·  TALLINN', wx + 8, 156);
  // faded top edge dirt
  const gt = x.createLinearGradient(0, 0, 0, 60);
  gt.addColorStop(0, 'rgba(25,16,10,0.35)'); gt.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gt; x.fillRect(0, 0, W, 60);
  return c;
}

function containerRoughTexture() {
  const W = 1024, H = 256;
  const { c, x } = cv(W, H);
  x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, W, H);
  grain(x, W, H, 3000, 0.5, 6, ['#ffffff', '#5a5a5a', '#b9b9b9', '#404040']);
  streaks(x, W, H, 120, 4, H * 0.9, true);
  return c;
}

function containerDoorTexture() {
  const W = 1024, H = 1024;
  const { c, x } = cv(W, H);
  x.fillStyle = '#c9481a'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#d4531f' : '#b23f16';
    x.globalAlpha = 0.06 + Math.random() * 0.1;
    x.fillRect(Math.random() * W, Math.random() * H, 30 + Math.random() * 200, 10 + Math.random() * 60);
  }
  x.globalAlpha = 1;
  streaks(x, W, H, 90, 10, H * 0.8, false);
  x.textBaseline = 'middle';
  x.fillStyle = 'rgba(243,236,228,0.9)';
  x.font = '700 66px Helvetica, Arial, sans-serif';
  x.fillText('CXSU', 90, 150);
  x.fillText('400123 4', 90, 226);
  x.font = '600 42px Helvetica, Arial, sans-serif';
  x.fillStyle = 'rgba(243,236,228,0.75)';
  x.fillText('42G1', 90, 300);
  // CSC plate
  x.fillStyle = 'rgba(24,26,30,0.9)'; x.fillRect(W - 300, H - 300, 210, 150);
  x.strokeStyle = 'rgba(200,200,200,0.5)'; x.lineWidth = 3; x.strokeRect(W - 300, H - 300, 210, 150);
  x.fillStyle = 'rgba(220,220,220,0.75)';
  x.font = '500 22px Helvetica, Arial, sans-serif';
  x.fillText('CSC SAFETY APPROVAL', W - 288, H - 268);
  x.fillText('EST/BV/2025/1189', W - 288, H - 236);
  x.fillText('MAX GROSS 30,480 KG', W - 288, H - 204);
  grain(x, W, H, 1400, 0.12, 3, ['#7a3210', '#4a2410', '#f0a070']);
  return c;
}

function concreteTexture() {
  const W = 1024, H = 1024;
  const { c, x } = cv(W, H);
  x.fillStyle = '#6d6a64'; x.fillRect(0, 0, W, H);
  grain(x, W, H, 9000, 0.22, 7, ['#7d7a73', '#5b5852', '#84817a', '#4e4b46']);
  // slab joints
  x.strokeStyle = 'rgba(35,33,30,0.55)'; x.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(i * W / 4, 0); x.lineTo(i * W / 4, H); x.stroke();
    x.beginPath(); x.moveTo(0, i * H / 4); x.lineTo(W, i * H / 4); x.stroke();
  }
  // oil stains / tyre marks
  for (let i = 0; i < 26; i++) {
    const g = x.createRadialGradient(Math.random() * W, Math.random() * H, 2, Math.random() * W, Math.random() * H, 60 + Math.random() * 90);
    g.addColorStop(0, 'rgba(24,22,20,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  return c;
}

function hullTexture() {
  const W = 2048, H = 512;
  const { c, x } = cv(W, H);
  // above waterline: charcoal; boot top band; below: dark red
  x.fillStyle = '#22252b'; x.fillRect(0, 0, W, H * 0.62);
  x.fillStyle = '#0f1114'; x.fillRect(0, H * 0.62, W, H * 0.06);
  x.fillStyle = '#5a1f18'; x.fillRect(0, H * 0.68, W, H * 0.32);
  // plate seams
  x.strokeStyle = 'rgba(255,255,255,0.045)'; x.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const px = i * W / 60; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); }
  for (let i = 1; i < 9; i++) { const py = i * H / 9; x.beginPath(); x.moveTo(0, py); x.lineTo(W, py); x.stroke(); }
  streaks(x, W, H * 0.62, 260, 4, H * 0.5, false);
  grain(x, W, H, 4000, 0.14, 5, ['#2c3038', '#171a1f', '#6a4a3a']);
  // draft marks near bow
  x.fillStyle = 'rgba(235,235,235,0.55)';
  x.font = '600 26px Helvetica, Arial, sans-serif';
  for (let i = 0; i < 6; i++) x.fillText(String(6 + i * 2) + 'M', 44, H * 0.66 - i * 26);
  return c;
}

function makeGlowSprite(color, size = 128) {
  const { c, x } = cv(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const col = new THREE.Color(color);
  g.addColorStop(0, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},1)`);
  g.addColorStop(0.25, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},0.35)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ────────────────────────────── sky & water shaders ────────────────────────────── */

const SKY_GLSL = /* glsl */`
uniform vec3 uSun;
vec3 skyColor(vec3 d){
  float y = clamp(d.y, -0.25, 1.0);
  float t = pow(1.0 - clamp(y, 0.0, 1.0), 4.2);
  vec3 zen = vec3(0.045, 0.078, 0.145);
  vec3 mid = vec3(0.20, 0.24, 0.32);
  vec3 hor = vec3(0.62, 0.47, 0.34);
  vec3 c = mix(zen, mid, smoothstep(0.0, 0.55, t));
  c = mix(c, hor, smoothstep(0.55, 1.0, t));
  float sd = max(dot(normalize(d), uSun), 0.0);
  c += vec3(1.0, 0.52, 0.22) * pow(sd, 6.0) * 0.34;
  c += vec3(1.0, 0.62, 0.30) * pow(sd, 64.0) * 0.9;
  c += vec3(1.0, 0.86, 0.66) * smoothstep(0.9994, 0.99975, sd) * 14.0;
  // ground haze below horizon
  c = mix(c, vec3(0.16, 0.15, 0.15), smoothstep(0.0, -0.16, d.y));
  return c;
}`;

function makeSky(sunUniform) {
  const geo = new THREE.SphereGeometry(4000, 40, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: sunUniform },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: SKY_GLSL + `
      varying vec3 vDir;
      void main(){
        vec3 c = skyColor(normalize(vDir));
        // subtle cloud banding near the horizon
        float b = sin(vDir.x*3.1 + vDir.z*2.2) * 0.5 + 0.5;
        c *= 1.0 + 0.06 * b * smoothstep(0.35, 0.02, vDir.y);
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

function makeWater(sunUniform, reflectTex, resUniform) {
  const geo = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uSun: sunUniform, uTime: { value: 0 },
      uRefl: { value: reflectTex }, uRes: resUniform,
      uCam: { value: new THREE.Vector3() }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: SKY_GLSL + `
      uniform float uTime; uniform sampler2D uRefl; uniform vec2 uRes; uniform vec3 uCam;
      varying vec3 vWorld;

      // sum of directional waves -> analytic normal
      vec3 waveNormal(vec2 p, float t, float damp){
        vec2 n = vec2(0.0);
        float amp = 1.0, frq = 0.085, spd = 1.0;
        vec2 dirs[5];
        dirs[0]=normalize(vec2( 1.0, 0.32));
        dirs[1]=normalize(vec2(-0.72, 0.66));
        dirs[2]=normalize(vec2( 0.34, 1.0));
        dirs[3]=normalize(vec2( 0.92,-0.51));
        dirs[4]=normalize(vec2(-0.24,-1.0));
        for(int i=0;i<5;i++){
          vec2 d = dirs[i];
          float ph = dot(d, p) * frq + t * spd;
          n += d * cos(ph) * amp * frq;
          amp *= 0.62; frq *= 2.05; spd *= 1.28;
        }
        n *= damp;
        return normalize(vec3(-n.x, 1.0, -n.y));
      }

      void main(){
        vec3 vd = normalize(vWorld - uCam);
        float dist = length(vWorld.xz - uCam.xz);
        float damp = 1.0 / (1.0 + dist * 0.0075);          // flatten with distance (anti-aliasing)
        vec3 nrm = waveNormal(vWorld.xz, uTime * 0.9, 1.35 * damp);
        // fine chop
        nrm = normalize(nrm + vec3(sin(vWorld.x*2.1 + uTime*2.4), 0.0, cos(vWorld.z*1.9 - uTime*2.1)) * 0.020 * damp);

        vec3 refl = reflect(vd, nrm);
        refl.y = abs(refl.y);
        vec3 skyRefl = skyColor(refl);

        // planar reflection buffer, screen-space with normal distortion
        vec2 suv = gl_FragCoord.xy / uRes;
        vec2 dist2 = nrm.xz * (0.055 + 0.75 / (1.0 + dist * 0.06));
        vec3 mirror = texture2D(uRefl, clamp(suv + dist2 * vec2(0.35, 0.9), vec2(0.001), vec2(0.999))).rgb;
        float mAmt = smoothstep(0.0, 1.0, mirror.r + mirror.g + mirror.b) ;
        vec3 reflection = mix(skyRefl, mirror, clamp(mAmt * 1.6, 0.0, 0.88));

        vec3 deep = vec3(0.021, 0.036, 0.045);
        float fres = pow(1.0 - max(dot(-vd, nrm), 0.0), 4.0);
        fres = mix(0.035, 1.0, fres);

        vec3 col = mix(deep, reflection, clamp(fres, 0.0, 1.0));

        // sun glitter
        vec3 h = normalize(uSun - vd);
        float spec = pow(max(dot(nrm, h), 0.0), 340.0);
        col += vec3(1.0, 0.70, 0.40) * spec * 5.0;
        float spec2 = pow(max(dot(nrm, h), 0.0), 26.0);
        col += vec3(1.0, 0.55, 0.28) * spec2 * 0.16;

        // horizon haze blend
        float hz = smoothstep(900.0, 3000.0, dist);
        col = mix(col, skyColor(normalize(vec3(vd.x, 0.02, vd.z))), hz);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = -1;
  return m;
}

/* ────────────────────────────── container ────────────────────────────── */

function corrOffset(u) {
  const p = ((u % CORR_PITCH) + CORR_PITCH) % CORR_PITCH;
  const half = CORR_PITCH / 2;
  const flat = CORR_FLAT, slope = CORR_SLOPE;
  const d = CORR_DEPTH / 2;
  if (p < flat) return d;
  if (p < flat + slope) return d - ((p - flat) / slope) * 2 * d;
  if (p < half + flat / 2 + slope) return -d;
  if (p < half + flat / 2 + 2 * slope) return -d + ((p - (half + flat / 2 + slope)) / slope) * 2 * d;
  return d;
}

/** Ruled corrugated strip in XY plane, corrugation along X, offsets along +Z. */
function corrugatedPanel(len, hgt, segPerPitch = 6, flipU = false) {
  const steps = Math.max(24, Math.round((len / CORR_PITCH) * segPerPitch));
  const pos = [], uv = [];
  const p = (i) => {
    const u = -len / 2 + (i / steps) * len;
    return [u, corrOffset(u + len / 2)];
  };
  for (let i = 0; i < steps; i++) {
    const [x0, z0] = p(i), [x1, z1] = p(i + 1);
    const u0 = flipU ? 1 - i / steps : i / steps;
    const u1 = flipU ? 1 - (i + 1) / steps : (i + 1) / steps;
    pos.push(x0, -hgt / 2, z0, x1, -hgt / 2, z1, x1, hgt / 2, z1);
    uv.push(u0, 0, u1, 0, u1, 1);
    pos.push(x0, -hgt / 2, z0, x1, hgt / 2, z1, x0, hgt / 2, z0);
    uv.push(u0, 0, u1, 1, u0, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function makeContainer(textures) {
  const grp = new THREE.Group();
  const halfW = C_WID / 2, halfL = C_LEN / 2;

  const paint = new THREE.MeshStandardMaterial({
    map: textures.side, roughnessMap: textures.rough, roughness: 0.78, metalness: 0.28,
    side: THREE.DoubleSide
  });
  const paintMirror = paint.clone();
  const roof = new THREE.MeshStandardMaterial({
    map: textures.roof, roughnessMap: textures.rough, roughness: 0.86, metalness: 0.25, side: THREE.DoubleSide
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.62, metalness: 0.75 });
  const casting = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.55, metalness: 0.85 });
  const doorMat = new THREE.MeshStandardMaterial({
    map: textures.door, roughnessMap: textures.rough, roughness: 0.78, metalness: 0.28, side: THREE.DoubleSide
  });

  const panelH = C_HGT - 0.30;
  const bodyY = C_HGT / 2 + 0.015;

  // side panels (corrugation runs along the length)
  for (const s of [1, -1]) {
    const g = corrugatedPanel(C_LEN - 0.22, panelH, 6, s < 0);
    const m = new THREE.Mesh(g, s > 0 ? paint : paintMirror);
    m.rotation.y = s > 0 ? 0 : Math.PI;
    m.position.set(0, bodyY, s * (halfW - 0.02));
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
  }

  // front panel (corrugation across the width)
  {
    const g = corrugatedPanel(C_WID - 0.18, panelH, 7);
    const m = new THREE.Mesh(g, paint);
    m.rotation.y = -Math.PI / 2;
    m.position.set(-halfL + 0.02, bodyY, 0);
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
  }

  // roof (shallow corrugation across the width, slight camber)
  {
    const g = corrugatedPanel(C_WID - 0.16, C_LEN - 0.20, 5);
    g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(g, roof);
    m.position.set(0, C_HGT - 0.075, 0);
    m.rotation.set(0, 0, 0);
    m.castShadow = m.receiveShadow = true;
    grp.add(m);
  }

  // doors
  const doorGrp = new THREE.Group();
  for (const s of [1, -1]) {
    const dg = corrugatedPanel(C_WID / 2 - 0.13, panelH - 0.06, 7);
    const dm = new THREE.Mesh(dg, doorMat);
    dm.rotation.y = Math.PI / 2;
    dm.position.set(0, bodyY, s * (C_WID / 4 - 0.005));
    dm.castShadow = dm.receiveShadow = true;
    doorGrp.add(dm);

    // locking bars (4 per leaf) + cams + handles
    const bars = new Batch();
    for (let i = 0; i < 4; i++) {
      const z = s * (0.18 + i * 0.28);
      bars.box(0.055, panelH - 0.10, 0.055, 0.055, bodyY, z);
      bars.box(0.10, 0.13, 0.10, 0.055, bodyY + panelH / 2 - 0.14, z);   // top cam
      bars.box(0.10, 0.13, 0.10, 0.055, bodyY - panelH / 2 + 0.14, z);   // bottom cam
      bars.box(0.16, 0.055, 0.05, 0.10, bodyY + 0.05, z);                // handle
      bars.box(0.05, 0.16, 0.09, 0.075, bodyY - 0.02, z);                // keeper
    }
    const bm = bars.mesh(steel);
    doorGrp.add(bm);

    // hinges
    const hg = new Batch();
    for (let i = 0; i < 3; i++) {
      hg.box(0.09, 0.16, 0.11, 0.04, 0.42 + i * 0.85, s * (halfW - 0.07));
    }
    doorGrp.add(hg.mesh(steel));
  }
  doorGrp.position.x = halfL - 0.03;
  grp.add(doorGrp);

  // frame: rails, posts, corner castings, underside cross-members
  const frame = new Batch();
  const railY = [0.075, C_HGT - 0.075];
  for (const y of railY) {
    for (const s of [1, -1]) frame.box(C_LEN - 0.30, 0.15, 0.13, 0, y, s * (halfW - 0.06));
    for (const s of [1, -1]) frame.box(0.13, 0.15, C_WID - 0.30, s * (halfL - 0.06), y, 0);
  }
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    frame.box(0.16, C_HGT - 0.30, 0.16, sx * (halfL - 0.08), C_HGT / 2, sz * (halfW - 0.08));
  }
  const cast = new Batch();
  for (const sx of [1, -1]) for (const sz of [1, -1]) for (const sy of [0, 1]) {
    cast.box(0.30, 0.185, 0.20, sx * (halfL - 0.15), sy ? C_HGT - 0.09 : 0.09, sz * (halfW - 0.10));
  }
  // underside cross members
  for (let i = -5; i <= 5; i++) frame.box(0.10, 0.11, C_WID - 0.22, i * 1.0, 0.045, 0);
  grp.add(frame.mesh(steel));
  grp.add(cast.mesh(casting));

  grp.userData.top = C_HGT;
  return grp;
}

/** simplified container for the hundreds in the background (instanced) */
function simpleContainerGeometry() {
  const b = new Batch();
  b.box(C_LEN, C_HGT, C_WID, 0, C_HGT / 2, 0);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  return g;
}

/* ────────────────────────────── quay ────────────────────────────── */

function makeQuay(mats) {
  const grp = new THREE.Group();

  // deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(620, 1.2, 300), mats.concrete);
  deck.position.set(0, QUAY_Y - 0.6, QUAY_EDGE + 150);
  deck.receiveShadow = true; deck.castShadow = true;
  grp.add(deck);

  // quay face down into the water
  const face = new THREE.Mesh(new THREE.BoxGeometry(620, 14, 1.6), mats.concreteDark);
  face.position.set(0, QUAY_Y - 7.2, QUAY_EDGE - 0.8);
  face.receiveShadow = true; face.castShadow = true;
  grp.add(face);

  const steel = new Batch();
  // crane rails
  for (const rz of [RAIL_WATER, RAIL_LAND]) {
    steel.box(620, 0.16, 0.62, 0, QUAY_Y + 0.06, rz);
    steel.box(620, 0.22, 0.20, 0, QUAY_Y + 0.20, rz);
  }
  // kerb / edge coping
  steel.box(620, 0.28, 0.5, 0, QUAY_Y + 0.08, QUAY_EDGE + 0.25);
  grp.add(steel.mesh(mats.railSteel));

  // fenders on the quay face
  const fend = new Batch();
  for (let i = -13; i <= 13; i++) {
    const x = i * 22;
    fend.box(1.5, 3.2, 0.55, x, QUAY_Y - 3.2, QUAY_EDGE - 1.05);
    fend.box(0.5, 3.6, 0.9, x - 0.7, QUAY_Y - 3.2, QUAY_EDGE - 1.2);
    fend.box(0.5, 3.6, 0.9, x + 0.7, QUAY_Y - 3.2, QUAY_EDGE - 1.2);
  }
  grp.add(fend.mesh(mats.rubber));

  // bollards
  const bol = new Batch();
  for (let i = -13; i <= 13; i++) {
    const x = i * 22 + 11;
    const cyl = new THREE.CylinderGeometry(0.42, 0.55, 1.15, 12);
    const m = new THREE.Matrix4().makeTranslation(x, QUAY_Y + 0.55, QUAY_EDGE + 2.4);
    bol.add(cyl, m);
    const cap = new THREE.SphereGeometry(0.44, 12, 8);
    bol.add(cap, new THREE.Matrix4().makeTranslation(x, QUAY_Y + 1.1, QUAY_EDGE + 2.4));
  }
  grp.add(bol.mesh(mats.bollard));

  // painted lane markings on the apron
  const paint = new Batch();
  for (let i = -20; i <= 20; i++) paint.box(0.9, 0.02, 22, i * 14, QUAY_Y + 0.02, RAIL_LAND + 22);
  paint.box(620, 0.02, 0.35, 0, QUAY_Y + 0.02, RAIL_LAND + 10);
  paint.box(620, 0.02, 0.35, 0, QUAY_Y + 0.02, RAIL_LAND + 34);
  grp.add(paint.mesh(mats.paintYellow, { shadow: false }));

  return grp;
}

/* ────────────────────────────── ship ────────────────────────────── */

function makeShip(mats) {
  const grp = new THREE.Group();
  const LOA = 232, BEAM = 32.2, DEPTH = 19.4, DRAFT = 11.0;
  const halfB = BEAM / 2;

  // hull loft ------------------------------------------------------------
  const STA = 64, SEC = 22;
  const pos = [], uv = [], nrm = [];
  const halfBeamAt = (t) => {                    // t: 0 stern .. 1 bow
    if (t < 0.06) return halfB * (0.62 + t / 0.06 * 0.38);
    if (t < 0.72) return halfB;
    const k = (t - 0.72) / 0.28;
    return halfB * Math.pow(Math.max(0.0, 1 - k * k * 0.995), 0.62) + 0.25;
  };
  const deckYAt = (t) => DEPTH - DRAFT + 1.4 + Math.pow(Math.abs(t - 0.46) * 2, 2.4) * 2.6; // sheer
  const keelYAt = (t) => {
    const rise = t > 0.80 ? Math.pow((t - 0.80) / 0.20, 2.0) * (DRAFT * 0.86) : 0;
    const rise2 = t < 0.05 ? Math.pow((0.05 - t) / 0.05, 2.0) * 4.2 : 0;
    return -DRAFT + rise + rise2;
  };
  const sectionPoint = (t, s) => {              // s: 0 keel .. 1 deck edge
    const hb = halfBeamAt(t), dy = deckYAt(t), ky = keelYAt(t);
    const bilge = 0.30;
    let z, y;
    if (s < bilge) {                             // bottom, flat -> bilge turn
      const k = s / bilge;
      z = hb * Math.sin(k * Math.PI / 2) * 0.995;
      y = ky + (1 - Math.cos(k * Math.PI / 2)) * (hb * 0.44);
    } else {                                     // topside, slight flare
      const k = (s - bilge) / (1 - bilge);
      const y0 = ky + hb * 0.44;
      y = y0 + k * (dy - y0);
      z = hb * (1 + 0.035 * k * k);
    }
    // bow stem rake
    let x = (t - 0.5) * LOA;
    if (t > 0.86) x += (t - 0.86) / 0.14 * (6.0 + 4.5 * (y / DEPTH));
    return [x, y, z];
  };
  const push = (a, b, c, ua, ub, uc) => {
    pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc);
  };
  for (let i = 0; i < STA; i++) {
    const t0 = i / STA, t1 = (i + 1) / STA;
    for (let j = 0; j < SEC; j++) {
      const s0 = j / SEC, s1 = (j + 1) / SEC;
      for (const side of [1, -1]) {
        const A = sectionPoint(t0, s0), B = sectionPoint(t1, s0), C = sectionPoint(t1, s1), D = sectionPoint(t0, s1);
        const a = [A[0], A[1], A[2] * side], b = [B[0], B[1], B[2] * side];
        const c = [C[0], C[1], C[2] * side], d = [D[0], D[1], D[2] * side];
        const ua = [t0 * 8, s0], ub = [t1 * 8, s0], uc = [t1 * 8, s1], ud = [t0 * 8, s1];
        if (side > 0) { push(a, b, c, ua, ub, uc); push(a, c, d, ua, uc, ud); }
        else { push(a, c, b, ua, uc, ub); push(a, d, c, ua, ud, uc); }
      }
    }
  }
  // transom
  for (let j = 0; j < SEC; j++) {
    const s0 = j / SEC, s1 = (j + 1) / SEC;
    const A = sectionPoint(0, s0), D = sectionPoint(0, s1);
    push([A[0], A[1], A[2]], [A[0], A[1], -A[2]], [D[0], D[1], -D[2]], [0, s0], [1, s0], [1, s1]);
    push([A[0], A[1], A[2]], [D[0], D[1], -D[2]], [D[0], D[1], D[2]], [0, s0], [1, s1], [0, s1]);
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, mats.hull);
  hull.castShadow = hull.receiveShadow = true;
  grp.add(hull);

  // main deck surface
  const deckB = new Batch();
  for (let i = 0; i < STA; i++) {
    const t0 = i / STA, t1 = (i + 1) / STA;
    const A = sectionPoint(t0, 1), B = sectionPoint(t1, 1);
    const g = new THREE.BufferGeometry();
    const p = [A[0], A[1] - 0.05, A[2], B[0], B[1] - 0.05, B[2], B[0], B[1] - 0.05, -B[2],
      A[0], A[1] - 0.05, A[2], B[0], B[1] - 0.05, -B[2], A[0], A[1] - 0.05, -A[2]];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    g.computeVertexNormals();
    deckB.add(g);
  }
  grp.add(deckB.mesh(mats.deckSteel));

  // bulwark / hand rails along the deck edge
  const rails = new Batch();
  for (let i = 0; i < STA; i += 1) {
    const t = i / STA;
    const A = sectionPoint(t, 1), B = sectionPoint((i + 1) / STA, 1);
    for (const side of [1, -1]) {
      rails.beam(v(A[0], A[1] + 1.05, A[2] * side), v(B[0], B[1] + 1.05, B[2] * side), 0.07, 0.07);
      if (i % 2 === 0) rails.box(0.07, 1.1, 0.07, A[0], A[1] + 0.55, A[2] * side);
    }
  }
  grp.add(rails.mesh(mats.railSteel));

  const deckY = deckYAt(0.5);

  // hatch coamings + cell guides
  const hatch = new Batch();
  const bays = 13;
  for (let i = 0; i < bays; i++) {
    const x = -LOA * 0.40 + i * 13.4;
    hatch.box(12.6, 1.9, BEAM - 3.4, x, deckY + 0.9, 0);
  }
  grp.add(hatch.mesh(mats.deckSteel));

  // deck container stacks
  const stack = new THREE.Group();
  const r = rnd(9271);
  const colors = [0x2f6f8f, 0x9a3b2c, 0x3d6b4a, 0x7b6a34, 0x8a3f5c, 0x30506e, 0xa8562a, 0x4a4a52, 0xc9481a];
  const inst = [];
  for (let b = 0; b < bays; b++) {
    const x = -LOA * 0.40 + b * 13.4;
    if (x > 62) continue;                       // forward bays left empty
    const rows = 7;
    const maxTier = b < 2 ? 3 : (b > 9 ? 2 : (r() > 0.5 ? 5 : 4));
    for (let row = 0; row < rows; row++) {
      const z = (row - (rows - 1) / 2) * (C_WID + 0.10);
      const tiers = Math.max(0, maxTier - ((r() > 0.75) ? 1 : 0) - (Math.abs(row - 3) > 2 ? 1 : 0));
      for (let t = 0; t < tiers; t++) {
        inst.push({ x: x + (r() - 0.5) * 0.06, y: deckY + 1.9 + t * (C_HGT + 0.04), z, c: colors[(r() * colors.length) | 0] });
      }
    }
  }
  const geoSimple = simpleContainerGeometry();
  const imesh = new THREE.InstancedMesh(geoSimple, mats.boxPaint, inst.length);
  imesh.castShadow = imesh.receiveShadow = true;
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  inst.forEach((o, i) => {
    mtx.makeTranslation(o.x, o.y, o.z);
    imesh.setMatrixAt(i, mtx);
    imesh.setColorAt(i, col.setHex(o.c).convertSRGBToLinear());
  });
  imesh.instanceMatrix.needsUpdate = true;
  stack.add(imesh);
  grp.add(stack);
  grp.userData.deckY = deckY;
  grp.userData.stackTopY = deckY + 1.9 + 4 * (C_HGT + 0.04);

  // lashing bridges
  const lash = new Batch();
  for (let b = 0; b < bays; b++) {
    const x = -LOA * 0.40 + b * 13.4 + 6.7;
    if (x > 62) continue;
    for (let t = 0; t < 2; t++) {
      lash.box(0.5, 0.35, BEAM - 4.0, x, deckY + 3.0 + t * 2.6, 0);
    }
    for (let row = -3; row <= 3; row++) {
      lash.box(0.4, 5.6, 0.4, x, deckY + 4.2, row * (C_WID + 0.10) + C_WID / 2 + 0.05);
    }
  }
  grp.add(lash.mesh(mats.deckSteel));

  // accommodation block, aft
  const house = new Batch();
  const hx = -LOA * 0.36;
  for (let d = 0; d < 5; d++) {
    house.box(17.5 - d * 0.4, 3.1, 26 - d * 0.9, hx, deckY + 1.55 + d * 3.1, 0);
  }
  house.box(21, 3.0, 17, hx - 1.0, deckY + 1.55 + 5 * 3.1, 0);        // bridge deck, wings
  house.box(6.5, 5.0, 9.0, hx - 6.0, deckY + 1.55 + 6 * 3.1, 0);      // mast house
  grp.add(house.mesh(mats.white));

  // bridge windows + window bands
  const glass = new Batch();
  for (let d = 0; d < 5; d++) {
    for (const s of [1, -1]) glass.box(17.6 - d * 0.4, 1.05, 0.2, hx, deckY + 2.2 + d * 3.1, s * (13 - d * 0.45));
  }
  glass.box(21.2, 1.7, 0.2, hx - 1.0, deckY + 1.55 + 5 * 3.1 + 0.4, 8.6);
  glass.box(21.2, 1.7, 0.2, hx - 1.0, deckY + 1.55 + 5 * 3.1 + 0.4, -8.6);
  glass.box(0.2, 1.7, 17.2, hx - 11.4, deckY + 1.55 + 5 * 3.1 + 0.4, 0);
  grp.add(glass.mesh(mats.glass));

  // funnel
  const fun = new Batch();
  fun.box(9.0, 12.0, 11.0, hx - 9.5, deckY + 1.55 + 5.6 * 3.1, 0);
  grp.add(fun.mesh(mats.funnel));
  const band = new Batch();
  band.box(9.2, 3.0, 11.2, hx - 9.5, deckY + 1.55 + 5.6 * 3.1 + 3.2, 0);
  grp.add(band.mesh(mats.orange));
  const stacks = new Batch();
  for (const s of [1, -1]) {
    const c = new THREE.CylinderGeometry(0.9, 0.9, 4.0, 10);
    stacks.add(c, new THREE.Matrix4().makeTranslation(hx - 9.5, deckY + 1.55 + 5.6 * 3.1 + 7.5, s * 2.6));
  }
  grp.add(stacks.mesh(mats.railSteel));

  // bow mast + forecastle gear
  const bow = new Batch();
  bow.box(0.6, 12, 0.6, LOA * 0.44, deckY + 6, 0);
  bow.box(3.2, 1.6, 9.0, LOA * 0.455, deckY + 0.9, 0);
  grp.add(bow.mesh(mats.railSteel));

  return grp;
}

/* ────────────────────────────── STS gantry crane ────────────────────────────── */

function makeCrane(mats) {
  const grp = new THREE.Group();
  const Y0 = QUAY_Y + 0.3;                 // rail top
  const SILL = Y0 + 2.2;
  const PORTAL = Y0 + 21.0;                // portal beam (under it: truck lanes)
  const GIRDER = Y0 + 47.0;                // boom / girder level
  const APEX = Y0 + 74.0;                  // pylon apex
  const BOOM_TIP = -63;                    // outreach over the water
  const BACK_TIP = 62;                     // back reach
  const GA = 9.0;                          // half gauge in X (crane is 18 m along the quay)

  const steel = new Batch();

  // ── portal legs (waterside + landside), each a braced A of two X-legs ──
  const legZ = [RAIL_WATER, RAIL_LAND];
  for (const lz of legZ) {
    for (const sx of [1, -1]) {
      const foot = v(sx * GA, Y0, lz);
      const mid = v(sx * GA, SILL, lz);
      const head = v(sx * (GA - 1.2), GIRDER, lz + (lz === RAIL_WATER ? 1.0 : -1.0));
      steel.beam(foot, mid, 2.4, 2.4);
      steel.beam(mid, head, 1.9, 1.9);
      // lattice bracing on the leg
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = mid.clone().lerp(head, i / n), b = mid.clone().lerp(head, (i + 1) / n);
        const off = (i % 2 ? 1 : -1) * 1.5;
        steel.beam(v(a.x, a.y, a.z + off), v(b.x, b.y, b.z - off), 0.36, 0.36);
      }
    }
    // sill beam + portal tie between the two X-legs
    steel.beam(v(-GA, SILL, lz), v(GA, SILL, lz), 1.6, 1.8);
    steel.beam(v(-GA + 1.2, PORTAL, lz), v(GA - 1.2, PORTAL, lz), 1.4, 1.6);
    for (let i = 0; i < 6; i++) {
      const a = v(-GA + 1.2 + i * (2 * GA - 2.4) / 6, SILL, lz);
      const b = v(-GA + 1.2 + (i + 1) * (2 * GA - 2.4) / 6, PORTAL, lz);
      steel.beam(a, b, 0.34, 0.34);
    }
  }
  // portal beams along the travel direction (waterside <-> landside)
  for (const sx of [1, -1]) {
    steel.beam(v(sx * GA, SILL, RAIL_WATER), v(sx * GA, SILL, RAIL_LAND), 1.5, 1.5);
    steel.beam(v(sx * (GA - 0.6), PORTAL, RAIL_WATER), v(sx * (GA - 0.6), PORTAL, RAIL_LAND), 1.3, 1.5);
    for (let i = 0; i < 7; i++) {
      const z0 = RAIL_WATER + i * (RAIL_LAND - RAIL_WATER) / 7;
      const z1 = RAIL_WATER + (i + 1) * (RAIL_LAND - RAIL_WATER) / 7;
      steel.beam(v(sx * (GA - 0.3), SILL, z0), v(sx * (GA - 0.3), PORTAL, z1), 0.32, 0.32);
    }
  }

  // ── boom / girder: twin box girders with truss between ──
  const gyTop = GIRDER + 3.2;
  for (const sx of [1, -1]) {
    const x = sx * (GA - 1.2);
    steel.beam(v(x, GIRDER, BOOM_TIP), v(x, GIRDER, BACK_TIP), 1.5, 1.5);           // lower chord (rail beam)
    steel.beam(v(x, gyTop, BOOM_TIP + 6), v(x, gyTop, BACK_TIP - 4), 1.0, 1.0);     // upper chord
    const n = 34;
    for (let i = 0; i < n; i++) {
      const z0 = BOOM_TIP + 6 + i * (BACK_TIP - 10 - BOOM_TIP) / n;
      const z1 = BOOM_TIP + 6 + (i + 1) * (BACK_TIP - 10 - BOOM_TIP) / n;
      steel.beam(v(x, GIRDER, z0), v(x, gyTop, z1), 0.30, 0.30);
      if (i % 3 === 0) steel.beam(v(x, GIRDER, z1), v(x, gyTop, z1), 0.26, 0.26);
    }
    // boom tip taper
    steel.beam(v(x, GIRDER, BOOM_TIP), v(x, gyTop, BOOM_TIP + 6), 0.5, 0.5);
  }
  // cross ties between the two girders
  for (let i = 0; i <= 26; i++) {
    const z = BOOM_TIP + i * (BACK_TIP - BOOM_TIP) / 26;
    steel.beam(v(-(GA - 1.2), GIRDER - 0.4, z), v(GA - 1.2, GIRDER - 0.4, z), 0.34, 0.34);
    if (i % 2 === 0) steel.beam(v(-(GA - 1.2), gyTop, z), v(GA - 1.2, gyTop, z), 0.26, 0.26);
  }

  // ── pylon + stays ──
  for (const sx of [1, -1]) {
    const x = sx * (GA - 1.2);
    steel.beam(v(x, GIRDER, RAIL_WATER + 2), v(x, APEX, RAIL_WATER + 7), 1.3, 1.3);
    steel.beam(v(x, GIRDER, RAIL_LAND - 2), v(x, APEX, RAIL_WATER + 7), 1.3, 1.3);
    // forestays to the boom tip, backstay to the rear
    steel.beam(v(x, APEX, RAIL_WATER + 7), v(x, gyTop + 0.4, BOOM_TIP + 8), 0.42, 0.42);
    steel.beam(v(x, APEX, RAIL_WATER + 7), v(x, gyTop + 0.4, -22), 0.36, 0.36);
    steel.beam(v(x, APEX, RAIL_WATER + 7), v(x, gyTop + 0.4, BACK_TIP - 8), 0.42, 0.42);
  }
  steel.beam(v(-(GA - 1.2), APEX, RAIL_WATER + 7), v(GA - 1.2, APEX, RAIL_WATER + 7), 0.9, 0.9);

  // machinery house (behind the pylon, over the landside legs)
  steel.box(15.5, 6.4, 16.0, 0, GIRDER + 6.6, RAIL_LAND + 6);
  // operator cabin rail area / catwalks
  steel.box(2 * GA - 1.0, 0.25, 3.0, 0, GIRDER - 1.0, RAIL_WATER - 6);
  grp.add(steel.mesh(mats.craneOrange));

  // dark accents: bogies, machinery, cabin
  const dark = new Batch();
  for (const lz of legZ) for (const sx of [1, -1]) {
    dark.box(6.2, 1.5, 2.2, sx * GA, Y0 - 0.35, lz);
    for (let i = 0; i < 4; i++) {
      const cyl = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 12);
      cyl.rotateZ(Math.PI / 2);
      dark.add(cyl, new THREE.Matrix4().makeTranslation(sx * GA - 2.3 + i * 1.55, Y0 - 0.55, lz));
    }
  }
  grp.add(dark.mesh(mats.craneDark));

  // ── trolley + operator cab (moves along Z) ──
  const trolley = new THREE.Group();
  const tb = new Batch();
  tb.box(2 * GA - 2.0, 1.5, 7.0, 0, GIRDER + 0.9, 0);
  tb.box(2.4, 0.9, 8.2, 0, GIRDER + 1.9, 0);
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12); cyl.rotateZ(Math.PI / 2);
    tb.add(cyl, new THREE.Matrix4().makeTranslation(sx * (GA - 1.2), GIRDER + 0.2, sz * 2.6));
  }
  trolley.add(tb.mesh(mats.craneDark));
  const cab = new Batch();
  cab.box(3.0, 2.6, 3.4, 0, GIRDER - 1.6, -3.0);
  trolley.add(cab.mesh(mats.craneDark));
  const cabGlass = new Batch();
  cabGlass.box(3.05, 1.5, 0.15, 0, GIRDER - 1.5, -4.68);
  cabGlass.box(2.6, 1.3, 0.15, 0, GIRDER - 2.7, -4.5);
  for (const sx of [1, -1]) cabGlass.box(0.15, 1.5, 3.0, sx * 1.5, GIRDER - 1.5, -3.0);
  trolley.add(cabGlass.mesh(mats.glass));
  grp.add(trolley);

  // ── headblock + spreader ──
  const spreader = new THREE.Group();
  const sp = new Batch();
  sp.box(2.6, 1.1, 5.6, 0, 1.5, 0);                       // headblock
  sp.box(1.9, 0.55, C_LEN - 0.4, 0, 0.55, 0);             // main beam
  sp.box(C_WID + 0.4, 0.5, 1.0, 0, 0.55, C_LEN / 2 - 0.9);
  sp.box(C_WID + 0.4, 0.5, 1.0, 0, 0.55, -C_LEN / 2 + 0.9);
  for (const sx of [1, -1]) sp.box(0.35, 0.42, C_LEN - 1.0, sx * (C_WID / 2 - 0.1), 0.5, 0);
  grp.add(spreader);
  const spMesh = sp.mesh(mats.spreader);
  spreader.add(spMesh);
  const twist = new Batch();
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    twist.box(0.26, 0.42, 0.26, sx * (C_WID / 2 - 0.1), 0.12, sz * (C_LEN / 2 - 0.30));
    // flippers
    twist.box(0.14, 1.5, 0.5, sx * (C_WID / 2 + 0.25), 0.65, sz * (C_LEN / 2 - 0.1));
  }
  spreader.add(twist.mesh(mats.craneDark));

  // ── hoist ropes (updated each frame) ──
  const ropeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 5, 1, true);
  ropeGeo.translate(0, 0.5, 0);
  const ropes = [];
  const ropeAnchors = [];
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    for (const d of [-0.35, 0.35]) {
      const m = new THREE.Mesh(ropeGeo, mats.rope);
      m.castShadow = false;
      grp.add(m);
      ropes.push(m);
      ropeAnchors.push({ x: sx * (GA - 2.2) + d, z: sz * 2.3, hx: sx * (C_WID / 2 - 0.6) + d * 0.4, hz: sz * 2.3 });
    }
  }

  grp.userData = { trolley, spreader, ropes, ropeAnchors, GIRDER, Y0 };
  return grp;
}

/* ────────────────────────────── yard, lights, misc ────────────────────────────── */

function makeYard(mats) {
  const grp = new THREE.Group();
  const r = rnd(4471);
  const colors = [0x2f6f8f, 0x9a3b2c, 0x3d6b4a, 0x7b6a34, 0x30506e, 0xa8562a, 0x4a4a52, 0x8a8377, 0xc9481a];
  const inst = [];
  for (let block = 0; block < 6; block++) {
    const z = RAIL_LAND + 46 + block * 21;
    for (let row = 0; row < 6; row++) {
      const zz = z + row * (C_WID + 0.6);
      for (let bay = -9; bay <= 9; bay++) {
        if (r() > 0.86) continue;
        const x = bay * (C_LEN + 1.1);
        const tiers = 1 + ((r() * 4) | 0);
        for (let t = 0; t < tiers; t++) {
          inst.push({ x, y: QUAY_Y + t * (C_HGT + 0.05), z: zz, c: colors[(r() * colors.length) | 0] });
        }
      }
    }
  }
  const im = new THREE.InstancedMesh(simpleContainerGeometry(), mats.boxPaint, inst.length);
  im.castShadow = im.receiveShadow = true;
  const mtx = new THREE.Matrix4(), col = new THREE.Color();
  inst.forEach((o, i) => {
    mtx.makeTranslation(o.x, o.y, o.z);
    im.setMatrixAt(i, mtx);
    im.setColorAt(i, col.setHex(o.c).convertSRGBToLinear());
  });
  im.instanceMatrix.needsUpdate = true;
  grp.add(im);
  return grp;
}

function makeLightMasts(mats, lamps) {
  const grp = new THREE.Group();
  const b = new Batch();
  const positions = [];
  for (let i = -4; i <= 4; i++) positions.push({ x: i * 78 + 20, z: RAIL_LAND + 36 });
  for (const p of positions) {
    b.box(1.1, 40, 1.1, p.x, QUAY_Y + 20, p.z);
    b.box(5.0, 0.5, 2.6, p.x, QUAY_Y + 40.3, p.z);
    for (let k = -1; k <= 1; k++) lamps.push({ x: p.x + k * 1.7, y: QUAY_Y + 40.1, z: p.z });
  }
  grp.add(b.mesh(mats.craneDark));
  return grp;
}

/** terminal tractor + chassis carrying the hero container at the start of the cycle */
function makeChassis(mats) {
  const grp = new THREE.Group();
  const b = new Batch();
  // chassis frame
  b.box(2.5, 0.35, 12.6, 0, 1.15, 0);
  for (const sz of [-1, 1]) b.box(2.6, 0.2, 0.4, 0, 1.35, sz * 6.0);
  grp.add(b.mesh(mats.craneDark));
  // tractor
  const t = new Batch();
  t.box(2.5, 1.5, 5.2, 0, 1.5, 8.8);
  t.box(2.3, 2.0, 2.4, 0, 2.9, 9.6);
  grp.add(t.mesh(mats.tractor));
  const g = new Batch();
  g.box(2.05, 0.9, 0.12, 0, 3.2, 8.42);
  grp.add(g.mesh(mats.glass));
  // wheels
  const w = new Batch();
  const wheel = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 14); wheel.rotateZ(Math.PI / 2);
  for (const sx of [-1, 1]) for (const z of [-5.2, -4.0, -2.8, 7.4, 10.4]) {
    w.add(wheel, new THREE.Matrix4().makeTranslation(sx * 1.15, 0.55, z));
  }
  grp.add(w.mesh(mats.tyre));
  return grp;
}

function makeMooringLines(shipGroup, mats) {
  const grp = new THREE.Group();
  const deckY = shipGroup.userData.deckY + shipGroup.position.y;
  const pairs = [
    [-95, -80], [-70, -55], [55, 42], [90, 76], [-30, -20], [30, 20]
  ];
  for (const [sx, bx] of pairs) {
    const a = v(sx, deckY + 1.2, SHIP_Z + 15.5);
    const b = v(bx, QUAY_Y + 0.9, QUAY_EDGE + 2.4);
    const mid = a.clone().lerp(b, 0.5); mid.y -= 2.6;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const g = new THREE.TubeGeometry(curve, 22, 0.075, 5, false);
    const m = new THREE.Mesh(g, mats.rope);
    m.castShadow = true;
    grp.add(m);
  }
  return grp;
}

/* ────────────────────────────── planar water reflection ────────────────────────────── */

class PlanarReflection {
  constructor(renderer, width, height) {
    this.rt = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, depthBuffer: true
    });
    this.rt.texture.colorSpace = THREE.NoColorSpace;
    this.cam = new THREE.PerspectiveCamera();
    this.reflectMatrix = new THREE.Matrix4().makeScale(1, -1, 1);
    this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.05);
  }
  setSize(w, h) { this.rt.setSize(w, h); }
  render(renderer, scene, camera, water) {
    const c = this.cam;
    c.copy(camera);
    c.matrixAutoUpdate = false;
    c.matrixWorld.copy(camera.matrixWorld).premultiply(this.reflectMatrix);
    c.matrixWorldInverse.copy(c.matrixWorld).invert();
    c.projectionMatrix.copy(camera.projectionMatrix);
    c.projectionMatrixInverse.copy(camera.projectionMatrixInverse);

    const visible = water.visible;
    water.visible = false;
    const gl = renderer.getContext();
    const prevTarget = renderer.getRenderTarget();
    renderer.clippingPlanes = [this.clip];
    gl.frontFace(gl.CW);                       // mirror flips winding
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, c);
    gl.frontFace(gl.CCW);
    renderer.clippingPlanes = [];
    renderer.setRenderTarget(prevTarget);
    water.visible = visible;
  }
  dispose() { this.rt.dispose(); }
}

/* ────────────────────────────── main ────────────────────────────── */

export function initPortScene(container, opts = {}) {
  const quality = opts.quality || 'high';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: quality !== 'low', powerPreference: 'high-performance', alpha: false,
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x3b3a3c, 0.0022);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 6000);

  const sunUniform = { value: SUN_DIR.clone() };
  const resUniform = { value: new THREE.Vector2(1, 1) };

  // sky + environment
  const sky = makeSky(sunUniform);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const skyForEnv = new THREE.Mesh(sky.geometry, sky.material);
  envScene.add(skyForEnv);
  const envRT = pmrem.fromScene(envScene, 0, 1, 5000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;

  // lights
  const sun = new THREE.DirectionalLight(0xffcf9b, 3.4);
  sun.position.copy(SUN_DIR).multiplyScalar(420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
  const sc = sun.shadow.camera;
  sc.left = -150; sc.right = 150; sc.top = 120; sc.bottom = -120; sc.near = 40; sc.far = 900;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.9;
  sun.target.position.set(0, 20, -10);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0x8fa8c8, 0x2a241d, 0.45));
  const fill = new THREE.DirectionalLight(0x9fb8d8, 0.35);
  fill.position.set(120, 90, 140);
  scene.add(fill);

  // ── materials ──
  const texSide = texFrom(containerSideTexture());
  const texRough = texFrom(containerRoughTexture(), 1, 1, false);
  const texDoor = texFrom(containerDoorTexture());
  const texRoof = texFrom(containerRoughTexture(), 1, 1);
  const texConcrete = texFrom(concreteTexture(), 40, 20);
  const texConcreteN = texFrom(concreteTexture(), 40, 4);
  const texHull = texFrom(hullTexture(), 1, 1);

  const mats = {
    concrete: new THREE.MeshStandardMaterial({ map: texConcrete, roughness: 0.95, metalness: 0.02, color: 0xbdb8ae }),
    concreteDark: new THREE.MeshStandardMaterial({ map: texConcreteN, roughness: 0.98, metalness: 0.0, color: 0x6a675f }),
    railSteel: new THREE.MeshStandardMaterial({ color: 0x8b8880, roughness: 0.45, metalness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x14140f, roughness: 0.95, metalness: 0.0 }),
    bollard: new THREE.MeshStandardMaterial({ color: 0x1e1c19, roughness: 0.7, metalness: 0.4 }),
    paintYellow: new THREE.MeshStandardMaterial({ color: 0xc8a23a, roughness: 0.9, metalness: 0.0 }),
    hull: new THREE.MeshStandardMaterial({ map: texHull, roughness: 0.52, metalness: 0.55, side: THREE.DoubleSide }),
    deckSteel: new THREE.MeshStandardMaterial({ color: 0x4a4a44, roughness: 0.78, metalness: 0.6, side: THREE.DoubleSide }),
    white: new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.62, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0d1418, roughness: 0.12, metalness: 0.85 }),
    funnel: new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.6, metalness: 0.5 }),
    orange: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.6, metalness: 0.25 }),
    boxPaint: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.22 }),
    craneOrange: new THREE.MeshStandardMaterial({ color: 0xcf5a20, roughness: 0.68, metalness: 0.42 }),
    craneDark: new THREE.MeshStandardMaterial({ color: 0x25262a, roughness: 0.6, metalness: 0.6 }),
    spreader: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.55, metalness: 0.55 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.75, metalness: 0.4 }),
    tractor: new THREE.MeshStandardMaterial({ color: 0x2d3238, roughness: 0.55, metalness: 0.5 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0.0 })
  };

  // ── build ──
  const water = makeWater(sunUniform, null, resUniform);
  scene.add(water);

  const quay = makeQuay(mats);
  scene.add(quay);

  const ship = makeShip(mats);
  ship.position.set(-14, 0, SHIP_Z);
  ship.rotation.y = 0;
  scene.add(ship);

  scene.add(makeMooringLines(ship, mats));

  const crane = makeCrane(mats);
  crane.position.set(6, 0, 0);
  scene.add(crane);

  const crane2 = makeCrane(mats);
  crane2.position.set(-96, 0, 0);
  scene.add(crane2);
  const crane3 = makeCrane(mats);
  crane3.position.set(118, 0, 0);
  scene.add(crane3);

  scene.add(makeYard(mats));

  const lamps = [];
  scene.add(makeLightMasts(mats, lamps));
  const glowTex = makeGlowSprite(0xffd9a0);
  const lampGroup = new THREE.Group();
  for (const l of lamps) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55
    }));
    s.position.set(l.x, l.y, l.z);
    s.scale.set(9, 9, 1);
    lampGroup.add(s);
  }
  scene.add(lampGroup);

  const heroBox = makeContainer({ side: texSide, rough: texRough, door: texDoor, roof: texRoof });
  scene.add(heroBox);

  const chassis = makeChassis(mats);
  chassis.position.set(6, QUAY_Y, 17.5);
  scene.add(chassis);

  // a couple of static boxes already on the quay, for depth
  const quayBoxes = new THREE.Group();
  {
    const r = rnd(881);
    const inst = [];
    const colors = [0x2f6f8f, 0x9a3b2c, 0x3d6b4a, 0x30506e, 0x4a4a52];
    for (let i = 0; i < 26; i++) {
      inst.push({
        x: -180 + r() * 360, y: QUAY_Y + (r() > 0.6 ? C_HGT : 0), z: RAIL_LAND + 4 + r() * 14,
        c: colors[(r() * colors.length) | 0]
      });
    }
    const im = new THREE.InstancedMesh(simpleContainerGeometry(), mats.boxPaint, inst.length);
    im.castShadow = im.receiveShadow = true;
    const m = new THREE.Matrix4(), col = new THREE.Color();
    inst.forEach((o, i) => {
      m.makeTranslation(o.x, o.y, o.z); im.setMatrixAt(i, m);
      im.setColorAt(i, col.setHex(o.c).convertSRGBToLinear());
    });
    quayBoxes.add(im);
  }
  scene.add(quayBoxes);

  // ── reflection ──
  const reflection = new PlanarReflection(renderer, 1024, 512);
  water.material.uniforms.uRefl.value = reflection.rt.texture;

  /* ── animation state ── */
  const { trolley, spreader, ropes, ropeAnchors, GIRDER } = crane.userData;
  const CYCLE = 40;
  const PICK_Z = 17.5, DROP_Z = SHIP_Z + 3.0;
  const PICK_Y = QUAY_Y + 1.55;                     // container bottom on the chassis
  const HIGH_Y = QUAY_Y + 40;
  const DROP_Y = ship.userData.deckY + 1.9 + 3 * (C_HGT + 0.04);

  const ease = (t) => t <= 0 ? 0 : t >= 1 ? 1 : (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const seg = (t, a, b) => ease((t - a) / (b - a));

  let prevTrolleyZ = PICK_Z, trolleyVel = 0, sway = 0, swayVel = 0;

  function cycleState(t) {
    // t in [0, CYCLE)
    const T = t / CYCLE;
    let z, y, attached = true;
    if (T < 0.06) { z = PICK_Z; y = PICK_Y; }                                  // locking on
    else if (T < 0.20) { z = PICK_Z; y = PICK_Y + seg(T, 0.06, 0.20) * (HIGH_Y - PICK_Y); }
    else if (T < 0.42) { z = PICK_Z + seg(T, 0.20, 0.42) * (DROP_Z - PICK_Z); y = HIGH_Y; }
    else if (T < 0.56) { z = DROP_Z; y = HIGH_Y + seg(T, 0.42, 0.56) * (DROP_Y - HIGH_Y); }
    else if (T < 0.62) { z = DROP_Z; y = DROP_Y; }                             // release
    else if (T < 0.74) { z = DROP_Z; y = DROP_Y + seg(T, 0.62, 0.74) * (HIGH_Y - DROP_Y); attached = false; }
    else if (T < 0.93) { z = DROP_Z + seg(T, 0.74, 0.93) * (PICK_Z - DROP_Z); y = HIGH_Y; attached = false; }
    else { z = PICK_Z; y = HIGH_Y + seg(T, 0.93, 1.0) * (PICK_Y - HIGH_Y); attached = false; }
    return { z, y, attached, T };
  }

  const clock = new THREE.Clock();
  let time = reduced ? 6 : 0;

  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function updateCamera(t) {
    // slow cinematic drift: high three-quarter view of the crane and ship
    const a = (t / CYCLE) * Math.PI * 2;
    const orbit = Math.sin(a) * 0.5;
    camPos.set(
      74 + Math.sin(a * 0.5) * 12,
      33 + Math.sin(a + 1.2) * 5.5,
      66 + Math.cos(a * 0.5) * 10
    );
    camTarget.set(-4 + orbit * 8, 20 + Math.sin(a * 0.7) * 4, -14);
    camera.position.lerp(camPos, 0.06);
    camera.lookAt(camTarget);
  }

  function updateRig(dt, t) {
    const st = cycleState(t % CYCLE);

    // trolley
    trolley.position.z = st.z;
    trolleyVel = (st.z - prevTrolleyZ) / Math.max(dt, 1e-3);
    const accel = (trolleyVel - (trolley.userData.pv || 0)) / Math.max(dt, 1e-3);
    trolley.userData.pv = trolleyVel;
    prevTrolleyZ = st.z;

    // pendulum sway of the load
    const target = THREE.MathUtils.clamp(-accel * 0.0022, -0.05, 0.05);
    swayVel += (target - sway) * dt * 9.0;
    swayVel *= Math.pow(0.13, dt);
    sway += swayVel * dt * 4.0;

    spreader.position.set(0, st.y + C_HGT, st.z + Math.sin(sway) * (GIRDER - st.y) * 0.35);
    spreader.rotation.x = sway;

    if (st.attached) {
      heroBox.position.set(crane.position.x, spreader.position.y - C_HGT, spreader.position.z);
      heroBox.rotation.x = sway;
    } else if (st.T > 0.62 && st.T < 0.90) {
      heroBox.position.set(crane.position.x, DROP_Y, DROP_Z);
      heroBox.rotation.x = 0;
    } else {
      heroBox.position.set(chassis.position.x, PICK_Y, PICK_Z);   // reset onto the chassis
      heroBox.rotation.x = 0;
    }

    // ropes
    const wx = crane.position.x;
    for (let i = 0; i < ropes.length; i++) {
      const a = ropeAnchors[i];
      const top = tmpV.set(wx + a.x, GIRDER + 1.1, st.z + a.z);
      const bot = tmpV2.set(
        spreader.position.x + wx + a.hx,
        spreader.position.y + 1.6,
        spreader.position.z + a.z * 0.55
      );
      const d = bot.clone().sub(top);
      const len = d.length();
      const m = ropes[i];
      m.position.copy(top);
      m.scale.set(1, len, 1);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
    }
  }

  // hide the chassis' hero container slot when the box is in the air
  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    resUniform.value.set(w * pr, h * pr);
    reflection.setSize(Math.min(1280, Math.floor(w * 0.5)), Math.min(720, Math.floor(h * 0.5)));
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  let alive = true, rafId = 0, frame = 0, onScreen = true;

  function loop() {
    if (!alive) return;
    rafId = requestAnimationFrame(loop);
    if ((frame++ % 12) === 0) {                       // cheap on-screen test
      const r = container.getBoundingClientRect();
      onScreen = r.bottom > 0 && r.top < (window.innerHeight || 0) && r.width > 0;
    }
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduced && !window.__paused) time += dt;
    draw(dt);
  }

  function draw(dt) {
    water.material.uniforms.uTime.value = time * 0.55;
    water.material.uniforms.uCam.value.copy(camera.position);

    if (!window.__freeCam) updateCamera(time);
    updateRig(dt, time);
    camera.updateMatrixWorld();

    if (quality !== 'low') reflection.render(renderer, scene, camera, water);
    renderer.render(scene, camera);
  }
  loop();

  if (opts.onReady) requestAnimationFrame(() => opts.onReady());

  return {
    renderer, scene, camera,
    debug: { heroBox, crane, ship, spreader, trolley, chassis, water, sun, quay },
    setTime(t) { time = t; },
    /** deterministic single frame — used for previews and poster rendering */
    step(t, settle = 4) {
      time = t;
      for (let i = 0; i < settle; i++) draw(1 / 60);
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      reflection.dispose();
      envRT.dispose(); pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };
}

export default initPortScene;
