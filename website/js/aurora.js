/* ═══════════════════════════════════════════════════════════════════════
   AURORA — Single Seamless Full-Page Background
   ═══════════════════════════════════════════════════════════════════════
   One fixed WebGL canvas covering the entire viewport.
   Colors shift smoothly as the user scrolls — no hard borders.
   The scroll position is passed to the shader as a uniform `S` (0→1)
   which blends through a palette of cosmic color zones:
     Top    → Cyan + Emerald + Magenta   (hero)
     ↓      → Deep Purple + Violet       (features)
     ↓      → Gold + Amber               (how)
     ↓      → Teal + Aqua                (screenshots)
     ↓      → Electric Indigo + Violet   (kendara)
     ↓      → Rose + Pink                (porondam)
     ↓      → Gold + Crimson             (fullreport)
     ↓      → Cyan + Teal               (weekly-lagna)
     ↓      → Royal Indigo + Gold        (pricing)
     ↓      → Peach + Coral              (testimonials)
     ↓      → Lavender + Deep Blue       (faq)
     Bottom → Bright Gold + Purple        (download)
   All content sits on top via z-index.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('heroAurora');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: false,
    antialias: false, powerPreference: 'low-power'
  });
  if (!gl) return;

  var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var dpr = isMobile ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.25);

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}';

  /* ─── Fragment shader with scroll-driven color blending ─── */
  var FRAG = [
'precision mediump float;',
'uniform float T;',       // time
'uniform float S;',       // scroll progress 0..1
'uniform vec2  R;',       // resolution
'',
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
'float gn(vec2 p){',
'  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);',
'  return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);',
'}',
'float rn(vec2 p){return 1.-abs(gn(p)*2.-1.);}',
'vec2 curl(vec2 p){',
'  float e=.05;',
'  return vec2(gn(p+vec2(0,e))-gn(p-vec2(0,e)),-(gn(p+vec2(e,0))-gn(p-vec2(e,0))))/(2.*e);',
'}',
'float cfbm(vec2 p,float t){',
'  p+=curl(p*.5+t*.03)*1.2;',
'  float v=0.,a=.5; mat2 m=mat2(.866,.5,-.5,.866);',
'  for(int i=0;i<4;i++){v+=a*gn(p);p=m*p*2.+vec2(1.7,9.2);a*=.5;}',
'  return v;',
'}',
'float rcfbm(vec2 p,float t){',
'  p+=curl(p*.4+t*.04)*1.5;',
'  float v=0.,a=.5; mat2 m=mat2(.866,.5,-.5,.866);',
'  for(int i=0;i<4;i++){float n=rn(p);v+=a*n*n;p=m*p*2.1+vec2(3.1,1.3);a*=.5;}',
'  return v;',
'}',
'float gas(vec2 uv,float seed,float spd,float sc){',
'  float t=T,ang=h(vec2(seed,seed*1.7))*6.28;',
'  vec2 drift=vec2(cos(ang),sin(ang))*spd*t*.04;',
'  vec2 org=vec2(h(vec2(seed*3.1,seed*.7))*4.-2.,h(vec2(seed*2.3,seed*1.1))*.5+.25);',
'  vec2 p=(uv-org)*sc+drift;',
'  float turb=cfbm(p,t*spd),folds=rcfbm(p*2.,t*spd*.6);',
'  float wind=.65+.35*sin(t*.06+seed*3.)+pow(sin(t*.08+seed*5.)*.5+.5,6.)*.5;',
'  float g=turb*.55+folds*.45; g*=wind;',
'  g*=smoothstep(.2,.6,cfbm(uv*1.2+vec2(seed*10.,seed*7.),t*.015));',
'  return clamp(g,0.,2.);',
'}',
'',
'/* Smooth color blending along scroll */',
'/* 12 color zones that blend seamlessly — avoid dynamic array indexing */',
'vec3 scrollColor(float s, float vary){',
'  /* Zone colors — explicit constants (no arrays) */',
'  vec3 cA0=vec3(.0,.95,1.);  vec3 cB0=vec3(.1,1.,.4);',
'  vec3 cA1=vec3(.6,.15,.95); vec3 cB1=vec3(.4,.05,.8);',
'  vec3 cA2=vec3(1.,.72,.15); vec3 cB2=vec3(.95,.5,.05);',
'  vec3 cA3=vec3(.0,.78,.88); vec3 cB3=vec3(.15,.92,1.);',
'  vec3 cA4=vec3(.35,.12,.92); vec3 cB4=vec3(.55,.22,1.);',
'  vec3 cA5=vec3(1.,.3,.55);  vec3 cB5=vec3(.95,.18,.72);',
'  vec3 cA6=vec3(1.,.65,.12); vec3 cB6=vec3(.92,.35,.05);',
'  vec3 cA7=vec3(.05,.88,.85); vec3 cB7=vec3(.2,1.,.88);',
'  vec3 cA8=vec3(.32,.12,.72); vec3 cB8=vec3(1.,.72,.18);',
'  vec3 cA9=vec3(1.,.6,.4);    vec3 cB9=vec3(.95,.45,.35);',
'  vec3 cA10=vec3(.4,.32,.82); vec3 cB10=vec3(.25,.2,.68);',
'  vec3 cA11=vec3(1.,.78,.2);  vec3 cB11=vec3(.65,.25,.92);',
'',
'  float zones=12.;',
'  float pos=clamp(s*(zones-1.), 0.0, zones-1.);',
'  /* Build colA by chaining smooth mixes across zones. This avoids any [] indexing. */',
'  vec3 colA = cA0;',
'  colA = mix(colA, cA1, smoothstep(0.0,1.0,pos));',
'  colA = mix(colA, cA2, smoothstep(1.0,2.0,pos));',
'  colA = mix(colA, cA3, smoothstep(2.0,3.0,pos));',
'  colA = mix(colA, cA4, smoothstep(3.0,4.0,pos));',
'  colA = mix(colA, cA5, smoothstep(4.0,5.0,pos));',
'  colA = mix(colA, cA6, smoothstep(5.0,6.0,pos));',
'  colA = mix(colA, cA7, smoothstep(6.0,7.0,pos));',
'  colA = mix(colA, cA8, smoothstep(7.0,8.0,pos));',
'  colA = mix(colA, cA9, smoothstep(8.0,9.0,pos));',
'  colA = mix(colA, cA10, smoothstep(9.0,10.0,pos));',
'  colA = mix(colA, cA11, smoothstep(10.0,11.0,pos));',
'',
'  vec3 colB = cB0;',
'  colB = mix(colB, cB1, smoothstep(0.0,1.0,pos));',
'  colB = mix(colB, cB2, smoothstep(1.0,2.0,pos));',
'  colB = mix(colB, cB3, smoothstep(2.0,3.0,pos));',
'  colB = mix(colB, cB4, smoothstep(3.0,4.0,pos));',
'  colB = mix(colB, cB5, smoothstep(4.0,5.0,pos));',
'  colB = mix(colB, cB6, smoothstep(5.0,6.0,pos));',
'  colB = mix(colB, cB7, smoothstep(6.0,7.0,pos));',
'  colB = mix(colB, cB8, smoothstep(7.0,8.0,pos));',
'  colB = mix(colB, cB9, smoothstep(8.0,9.0,pos));',
'  colB = mix(colB, cB10, smoothstep(9.0,10.0,pos));',
'  colB = mix(colB, cB11, smoothstep(10.0,11.0,pos));',
'',
'  return mix(colA, colB, clamp(vary,0.0,1.0));',
'}',
'',
'void main(){',
'  vec2 uv=gl_FragCoord.xy/R; float asp=R.x/R.y;',
'  vec2 uvA=vec2(uv.x*asp,uv.y);',
'  vec3 color=vec3(0);',
'  /* Faint base nebula */',
'  color+=vec3(.03,.01,.06)*cfbm(uvA*1.3,T)*.05;',
'',
'  /* 5 gas clouds, colored by scroll position */',
'  vec3 aurora=vec3(0);',
'  float g0=gas(uvA,1.0,.3,1.6);',
'  aurora+=scrollColor(S,uv.y)*g0*.30;',
'',
'  float g1=gas(uvA,7.5,.6,2.5);',
'  aurora+=scrollColor(S,cfbm(uvA*1.5,T*.05))*g1*.40;',
'',
'  float g2=gas(uvA,14.0,.8,3.2);',
'  aurora+=scrollColor(S,rn(uvA*2.+T*.1))*g2*.50;',
'',
'  float g3=gas(uvA,22.0,1.1,4.0);',
'  aurora+=scrollColor(S,sin(T*.15+uv.x*3.)*.5+.5)*g3*.35;',
'',
'  float g4=gas(uvA,35.0,1.4,5.0);',
'  aurora+=scrollColor(S,uv.y*.8+.1)*g4*.25;',
'',
'  color+=aurora;',
'',
'  /* Bloom */',
'  float totalG=(g0+g1+g2+g3+g4)*.2;',
'  color+=scrollColor(S,.5)*.08*pow(totalG,1.8);',
'',
'  /* Subtle horizon glow */',
'  float hz=exp(-(uv.y-.04)*(uv.y-.04)*30.);',
'  color+=scrollColor(S,.3)*.04*hz*(.2+totalG*.4);',
'',
'  /* Pulse */',
'  color*=.88+.12*sin(T*.07);',
'',
'  /* Gentle bottom fade */',
'  color*=smoothstep(0.,.06,uv.y);',
'',
'  /* Vignette */',
'  vec2 ctr=(gl_FragCoord.xy/R-.5)*vec2(1.4,1.);',
'  color*=1.-smoothstep(.5,1.6,length(ctr));',
'',
'  /* ACES tone map */',
'  color=clamp(color,0.,10.);',
'  color=(color*(color*2.51+.03))/(color*(color*2.43+.59)+.14);',
'',
'  /* Alpha from luminance */',
'  float lum=dot(color,vec3(.2126,.7152,.0722));',
'  gl_FragColor=vec4(color,smoothstep(.003,.05,lum));',
'}'
  ].join('\n');

  /* ─── Compile ───────────────────────────────────────── */
  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Aurora:', gl.getShaderInfoLog(s));
      gl.deleteShader(s); return null;
    }
    return s;
  }

  var vs = compileShader(gl.VERTEX_SHADER, VERT);
  var fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Aurora link:', gl.getProgramInfoLog(prog));
    canvas.style.display = 'none'; return;
  }
  gl.useProgram(prog);

  /* Geometry */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var aP = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(prog, 'T');
  var uS = gl.getUniformLocation(prog, 'S');
  var uR = gl.getUniformLocation(prog, 'R');

  /* ─── Resize — full viewport ────────────────────────── */
  function resize() {
    var w = Math.floor(window.innerWidth * dpr);
    var h = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt); rt = setTimeout(resize, 100);
  }, { passive: true });
  resize();

  /* ─── Scroll progress (0 at top, 1 at bottom) ──────── */
  var scrollProgress = 0;
  window.addEventListener('scroll', function () {
    var sy = window.pageYOffset || window.scrollY || 0;
    var maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress = maxScroll > 0 ? Math.min(sy / maxScroll, 1) : 0;
  }, { passive: true });

  /* ─── Loop ──────────────────────────────────────────── */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  var running = true;
  var t0 = performance.now();
  var frame = 0;

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && running) requestAnimationFrame(loop);
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.opacity = '0.12';
  }

  function loop() {
    if (!running) return;

    frame++;
    if (isMobile && frame % 2 !== 0) {
      requestAnimationFrame(loop); return;
    }

    var elapsed = (performance.now() - t0) / 1000.0;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uT, elapsed);
    gl.uniform1f(uS, scrollProgress);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(loop);
  }

  /* Fade in */
  canvas.style.transition = 'opacity 2.5s cubic-bezier(0.16,1,0.3,1)';
  canvas.style.opacity = '0';
  requestAnimationFrame(function () {
    resize();
    canvas.style.opacity = '0.7';
    running = true;
    loop();
  });

})();
