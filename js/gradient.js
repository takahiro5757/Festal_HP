/* =========================================================
   Festal — animated mesh gradient
   Flowing brand red→blue field built from drifting colour
   centres blended smoothly (a "living gradient" surface).
   Self-contained WebGL fragment shader. Light or vivid mode.
   Usage: FestalGradient.mount(canvas, { mode: 'light' | 'vivid' })
   ========================================================= */
(function (global) {
  'use strict';

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res; uniform float u_time; uniform float u_light;',
    '',
    'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    '',
    'vec2 orbit(float t, float sp, float r, vec2 c){ return c + r*vec2(cos(t*sp), sin(t*sp*0.83+1.7)); }',
    '',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy/u_res.xy;',
    '  float a = u_res.x/u_res.y;',
    '  vec2 q = vec2(uv.x*a, uv.y);',
    '  float t = u_time*0.18;',
    '',
    '  // drifting colour centres',
    '  vec2 cRed  = orbit(t, 0.9, 0.34, vec2(0.32*a, 0.34));',
    '  vec2 cBlue = orbit(t, 0.7, 0.40, vec2(0.72*a, 0.66));',
    '  vec2 cMag  = orbit(t, 1.1, 0.30, vec2(0.58*a, 0.30));',
    '  vec2 cHot  = orbit(t, 1.3, 0.26, vec2(0.42*a, 0.70));',
    '',
    '  float dR = 1.0/(0.02+distance(q,cRed)*distance(q,cRed));',
    '  float dB = 1.0/(0.02+distance(q,cBlue)*distance(q,cBlue));',
    '  float dM = 1.0/(0.02+distance(q,cMag)*distance(q,cMag));',
    '  float dH = 1.0/(0.02+distance(q,cHot)*distance(q,cHot));',
    '  float s = dR+dB+dM+dH;',
    '',
    '  vec3 red  = vec3(0.627,0.082,0.047);',  // #a0150c
    '  vec3 blue = vec3(0.055,0.255,0.624);',  // #0e419f
    '  vec3 mag  = vec3(0.42,0.12,0.45);',
    '  vec3 hot  = vec3(0.95,0.45,0.22);',
    '  vec3 col = (red*dR + blue*dB + mag*dM + hot*dH)/s;',
    '',
    '  // light mode: lift toward luminous paper tints',
    '  vec3 lightCol = mix(col, vec3(1.0), 0.62);',
    '  lightCol = mix(lightCol, vec3(0.98,0.97,1.0), 0.18);',
    '  col = mix(col, lightCol, u_light);',
    '',
    '  // fine grain to avoid banding',
    '  float g = (hash(gl_FragCoord.xy)-0.5)*0.025;',
    '  col += g;',
    '  gl_FragColor = vec4(col,1.0);',
    '}'
  ].join('\n');

  function compile(gl, t, s) { var sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null; }

  function mount(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) || canvas.getContext('experimental-webgl');
    if (!gl) { canvas.classList.add('no-webgl'); return null; }
    var prog = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.classList.add('no-webgl'); return null; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uTime = gl.getUniformLocation(prog, 'u_time'), uLight = gl.getUniformLocation(prog, 'u_light');
    var light = opts.mode === 'vivid' ? 0.12 : (opts.mode === 'mid' ? 0.34 : 0.78);

    var DPR = Math.min(window.devicePixelRatio || 1, 1.4);
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var pw = Math.max(1, (w * DPR) | 0), ph = Math.max(1, (h * DPR) | 0);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; gl.viewport(0, 0, pw, ph); }
      gl.uniform2f(uRes, pw, ph);
    }
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = null, running = false, start = performance.now();
    function frame(now) { resize(); gl.uniform1f(uTime, (now - start) / 1000); gl.uniform1f(uLight, light); gl.drawArrays(gl.TRIANGLES, 0, 3); if (running) raf = requestAnimationFrame(frame); }
    function play() { if (running || reduce) return; running = true; raf = requestAnimationFrame(frame); }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); }
    resize(); gl.uniform1f(uTime, 4.0); gl.uniform1f(uLight, light); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!reduce) {
      if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? play() : pause(); }); }, { threshold: 0.01 }).observe(canvas); }
      else play();
    }
    window.addEventListener('resize', resize, { passive: true });
    return { play: play, pause: pause };
  }

  global.FestalGradient = { mount: mount };
})(window);
