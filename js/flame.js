/* =========================================================
   Festal — WebGL flame field
   Animated red→blue fluid flame via fragment shader (FBM + domain warp).
   Self-contained, no dependencies. Falls back gracefully.
   Usage: FestalFlame.mount(canvasEl, { intensity })
   ========================================================= */
(function (global) {
  'use strict';

  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform float u_int;',      // intensity / energy
    '',
    'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  float a = hash(i);',
    '  float b = hash(i+vec2(1.0,0.0));',
    '  float c = hash(i+vec2(0.0,1.0));',
    '  float d = hash(i+vec2(1.0,1.0));',
    '  vec2 u = f*f*(3.0-2.0*f);',
    '  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0; float a = 0.55; mat2 m = mat2(1.6,1.2,-1.2,1.6);',
    '  for(int i=0;i<6;i++){ v += a*noise(p); p = m*p; a *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res.xy;',
    '  vec2 q = uv;',
    '  q.x *= u_res.x/u_res.y;',
    '  float t = u_time * 0.12;',
    '  // rising flow: sample noise drifting upward + lateral sway',
    '  vec2 fl = vec2(q.x*1.6 + sin(q.y*3.0 + t)*0.18, q.y*2.2 - t*1.4);',
    '  // domain warp for fluid look',
    '  float w = fbm(fl + fbm(fl*0.6 + t)*1.2);',
    '  float w2 = fbm(fl*1.8 - vec2(0.0, t*2.0));',
    '  float flame = w*0.75 + w2*0.4;',
    '  // vertical gradient: hot/dense at bottom, fades up',
    '  float vert = smoothstep(1.15, -0.15, uv.y);',
    '  float field = flame * vert * (0.9 + u_int*0.5);',
    '',
    '  // Brand palette: deep blue -> magenta -> red -> hot core',
    '  vec3 cBlue = vec3(0.043, 0.184, 0.46);',   // #0b2f75-ish (deeper than brand blue for richness)
    '  vec3 cMag  = vec3(0.36, 0.10, 0.40);',
    '  vec3 cRed  = vec3(0.627, 0.082, 0.047);',   // #a0150c
    '  vec3 cHot  = vec3(0.98, 0.62, 0.30);',
    '  vec3 col = mix(cBlue, cMag, smoothstep(0.10, 0.45, field));',
    '  col = mix(col, cRed, smoothstep(0.40, 0.72, field));',
    '  col = mix(col, cHot, smoothstep(0.74, 1.05, field));',
    '  // base dark so it reads on a near-black stage',
    '  vec3 base = vec3(0.035, 0.043, 0.07);',
    '  col = mix(base, col, smoothstep(0.04, 0.5, field) * 0.96 + 0.04);',
    '  // subtle vignette',
    '  float vig = smoothstep(1.25, 0.35, length(uv-vec2(0.5,0.42)));',
    '  col *= 0.82 + 0.18*vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[flame] shader error', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }

  function mount(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');
    if (!gl) { canvas.classList.add('no-webgl'); return null; }

    var prog = gl.createProgram();
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.classList.add('no-webgl'); return null; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'u_res');
    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uInt = gl.getUniformLocation(prog, 'u_int');

    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      var pw = Math.max(1, Math.floor(w * DPR)), ph = Math.max(1, Math.floor(h * DPR));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw; canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }
      gl.uniform2f(uRes, pw, ph);
    }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = null, running = false, intensity = opts.intensity || 1.0, target = intensity;
    var start = performance.now();

    function frame(now) {
      var t = (now - start) / 1000;
      intensity += (target - intensity) * 0.05;
      resize();
      gl.uniform1f(uTime, t);
      gl.uniform1f(uInt, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(frame);
    }

    function play() {
      if (running || reduce) return;
      running = true; raf = requestAnimationFrame(frame);
    }
    function pause() { running = false; if (raf) cancelAnimationFrame(raf); }

    // single static frame for reduced-motion or initial paint
    resize(); gl.uniform1f(uTime, 8.0); gl.uniform1f(uInt, intensity); gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduce) {
      // pause when offscreen
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.isIntersecting ? play() : pause(); });
        }, { threshold: 0.01 });
        io.observe(canvas);
      } else { play(); }
    }
    window.addEventListener('resize', resize, { passive: true });

    return {
      play: play, pause: pause,
      setEnergy: function (v) { target = v; }
    };
  }

  global.FestalFlame = { mount: mount };
})(window);
