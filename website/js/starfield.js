/* ═══════════════════════════════════════════════════════════════════
   starfield.js — Starfield + Milky Way band
   Approach: simple single-cell grid per layer, NO nested loops.
   Guaranteed to compile on all WebGL / mediump GPUs.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('starfield');
  if (!canvas) return;
  var gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false,
    stencil: false, premultipliedAlpha: false
  });
  if (!gl) return;

  var isMobile = /Mobi|Android/i.test(navigator.userAgent);
  var DPR = Math.min(isMobile ? 0.5 : 0.75, devicePixelRatio);

  function resize() {
    canvas.width  = (canvas.clientWidth  * DPR) | 0;
    canvas.height = (canvas.clientHeight * DPR) | 0;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  function makeShader(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('STARFIELD SHADER ERROR:\n' + gl.getShaderInfoLog(s));
      console.error('SOURCE:\n' + src);
    }
    return s;
  }

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

  /*
   * SIMPLE APPROACH:
   * - stars(): one grid lookup per call. Very cheap.
   * - Call it 12 times at different densities in main().
   * - 12 flat calls = NO nested loops = compiles everywhere.
   * - Densities: 25,50,80,120,170,230,300,380,470,570,680,800
   *   Total grid cells ≈ 25²+50²+...+800² ≈ ~1.6M candidates
   *   with ~50% spawn → hundreds of thousands of stars
   */

  var FRAG =
'precision mediump float;\n' +
'uniform float T;\n' +
'uniform vec2 R;\n' +
'\n' +
'float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}\n' +
'vec2 h22(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5);}\n' +
'\n' +
'float vn(vec2 p){\n' +
'  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);\n' +
'  return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);\n' +
'}\n' +
'float fbm(vec2 p){\n' +
'  float v=0.0,a=0.5;mat2 m=mat2(0.8,0.6,-0.6,0.8);\n' +
'  for(int i=0;i<4;i++){v+=a*vn(p);p=m*p*2.0+vec2(1.7,9.2);a*=0.5;}return v;\n' +
'}\n' +
'\n' +
'/* Milky Way band - thin */\n' +
'float mwBand(vec2 uv){\n' +
'  float ang=0.55,ca=cos(ang),sa=sin(ang);\n' +
'  vec2 r=vec2(ca*uv.x+sa*uv.y,-sa*uv.x+ca*uv.y);\n' +
'  float band=exp(-r.y*r.y*80.0);\n' +
'  band*=fbm(r*vec2(3.0,8.0)+vec2(0.0,T*0.003))*0.5+0.5;\n' +
'  float core=exp(-r.y*r.y*400.0)*0.45;\n' +
'  core*=fbm(r*vec2(5.0,12.0)+vec2(T*0.002,0.0))*0.5+0.5;\n' +
'  float dust=fbm(r*vec2(6.0,16.0)+vec2(0.3,T*0.005));\n' +
'  dust=smoothstep(0.35,0.65,dust);\n' +
'  float mw=(band+core)*(1.0-dust*0.5);\n' +
'  mw+=exp(-r.y*r.y*100.0)*0.25;\n' +
'  return clamp(mw,0.0,1.0);\n' +
'}\n' +
'\n' +
'/* Single star layer — bright colourful dots */\n' +
'vec3 stars(vec2 uv, float dens, float seed){\n' +
'  vec2 id=floor(uv*dens);\n' +
'  vec2 gv=fract(uv*dens)-0.5;\n' +
'  vec2 off=h22(id+seed)-0.5;\n' +
'  off*=0.72;\n' +
'  float d=length(gv-off);\n' +
'  float rnd=h21(id+seed+37.0);\n' +
'  float alive=step(0.25,rnd);\n' +       // only 25% culled → 75% visible
'  float sz=mix(0.005,0.022,h21(id+seed+11.0));\n' +  // bigger dots
'  float phase=rnd*6.2831;\n' +
'  float tw=sin(T*(1.0+rnd*2.5)+phase)*0.2\n' +
'          +sin(T*(3.0+rnd*4.0)+phase*1.7)*0.15+0.7;\n' +
'  float b=smoothstep(sz,sz*0.02,d)*mix(0.3,1.0,rnd)*tw*alive;\n' + // brighter
'  /* vivid rainbow colour */\n' +
'  float hue=h21(id+seed+91.0)*6.2831;\n' +
'  vec3 sc=vec3(0.5+0.5*sin(hue),0.5+0.5*sin(hue+2.094),0.5+0.5*sin(hue+4.189));\n' + // full saturation
'  /* boost colour purity — push away from white */\n' +
'  sc=mix(sc,sc*sc,0.3);\n' +
'  return sc*b;\n' +
'}\n' +
'\n' +
'void main(){\n' +
'  vec2 uv=(gl_FragCoord.xy-0.5*R)/R.y;\n' +
'  vec2 uv0=gl_FragCoord.xy/R;\n' +
'\n' +
'  vec3 col=mix(vec3(0.005,0.0,0.01),vec3(0.01,0.005,0.02),uv0.y);\n' +
'\n' +
'  float mw=mwBand(uv);\n' +
'  float bm=smoothstep(0.0,0.12,mw);\n' +
'\n' +
'  /* band glow */\n' +
'  vec3 mwC=mix(vec3(0.06,0.04,0.10),vec3(0.12,0.10,0.18),mw);\n' +
'  float ang2=0.55,ca2=cos(ang2),sa2=sin(ang2);\n' +
'  vec2 r2=vec2(ca2*uv.x+sa2*uv.y,-sa2*uv.x+ca2*uv.y);\n' +
'  mwC+=vec3(0.05,0.03,0.01)*exp(-r2.y*r2.y*80.0);\n' +
'  mwC+=vec3(0.02,0.02,0.06)*exp(-r2.y*r2.y*15.0);\n' +
'  col+=mwC*mw*0.6;\n' +
'\n' +
'  /* ═══ 36 star layers — ~100k+ visible stars ═══ */\n' +
'  /* Bright sparse (3 layers × ~470ea = ~1,400) */\n' +
'  col+=stars(uv, 25.0,  0.0)*bm;\n' +
'  col+=stars(uv, 25.0,500.0)*bm;\n' +
'  col+=stars(uv, 50.0, 10.0)*bm;\n' +
'  col+=stars(uv, 50.0,510.0)*bm;\n' +
'  col+=stars(uv, 80.0, 20.0)*bm;\n' +
'  col+=stars(uv, 80.0,520.0)*bm;\n' +
'\n' +
'  /* Medium (6 layers × ~10k ea = ~60k) */\n' +
'  col+=stars(uv,120.0, 30.0)*mix(0.03,1.0,bm);\n' +
'  col+=stars(uv,120.0,530.0)*mix(0.03,1.0,bm);\n' +
'  col+=stars(uv,170.0, 40.0)*mix(0.02,1.0,bm);\n' +
'  col+=stars(uv,170.0,540.0)*mix(0.02,1.0,bm);\n' +
'  col+=stars(uv,230.0, 50.0)*mix(0.02,1.0,bm);\n' +
'  col+=stars(uv,230.0,550.0)*mix(0.02,1.0,bm);\n' +
'\n' +
'  /* Dense band (6 layers × ~68k ea = ~400k candidates) */\n' +
'  col+=stars(uv,300.0, 60.0)*mix(0.01,1.0,bm);\n' +
'  col+=stars(uv,300.0,560.0)*mix(0.01,1.0,bm);\n' +
'  col+=stars(uv,380.0, 70.0)*mw;\n' +
'  col+=stars(uv,380.0,570.0)*mw;\n' +
'  col+=stars(uv,470.0, 80.0)*mw;\n' +
'  col+=stars(uv,470.0,580.0)*mw;\n' +
'\n' +
'  /* Ultra dense core (12 layers × ~250k ea) */\n' +
'  col+=stars(uv,570.0, 90.0)*mw;\n' +
'  col+=stars(uv,570.0,590.0)*mw;\n' +
'  col+=stars(uv,680.0,100.0)*mw;\n' +
'  col+=stars(uv,680.0,600.0)*mw;\n' +
'  col+=stars(uv,800.0,110.0)*mw;\n' +
'  col+=stars(uv,800.0,610.0)*mw;\n' +
'\n' +
'  /* Extra packed stardust (6 more layers) */\n' +
'  col+=stars(uv,400.0,620.0)*mw;\n' +
'  col+=stars(uv,550.0,630.0)*mw;\n' +
'  col+=stars(uv,700.0,640.0)*mw;\n' +
'  col+=stars(uv,850.0,650.0)*mw;\n' +
'  col+=stars(uv,950.0,660.0)*mw;\n' +
'  col+=stars(uv,750.0,670.0)*mw;\n' +
'\n' +
'  /* nebula */\n' +
'  float n1=fbm(uv*0.7+vec2(T*0.001,0.0));\n' +
'  float n2=fbm(uv*1.1+vec2(0.0,T*0.0015));\n' +
'  vec3 neb=vec3(0.10,0.04,0.18)*n1+vec3(0.03,0.08,0.14)*n2+vec3(0.10,0.02,0.06)*fbm(uv*0.5+99.0);\n' +
'  col+=neb*smoothstep(0.0,0.08,mw)*1.8;\n' +
'\n' +
'  float em1=pow(max(fbm(uv*2.5+vec2(33.0,T*0.002))-0.45,0.0),2.0)*4.0;\n' +
'  float em2=pow(max(fbm(uv*3.0+vec2(T*0.001,77.0))-0.5,0.0),2.0)*3.0;\n' +
'  col+=vec3(0.12,0.03,0.08)*em1*mw;\n' +
'  col+=vec3(0.03,0.06,0.14)*em2*mw;\n' +
'\n' +
'  /* vignette */\n' +
'  col*=1.0-dot(uv0-0.5,uv0-0.5)*1.2;\n' +
'\n' +
'  col*=0.85;\n' +                          // less dimming
'  col=clamp(col,0.0,1.0);\n' +
'  col=pow(col,vec3(0.85));\n' +             // stronger gamma lift
'  vec3 g=vec3(dot(col,vec3(0.299,0.587,0.114)));\n' +
'  col=clamp(mix(g,col,1.4),0.0,1.0);\n' +  // 40% saturation boost
'\n' +
'  gl_FragColor=vec4(col,1.0);\n' +
'}\n';

  var vs = makeShader(VERT, gl.VERTEX_SHADER);
  var fs = makeShader(FRAG, gl.FRAGMENT_SHADER);
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('STARFIELD LINK ERROR:\n' + gl.getProgramInfoLog(prog));
    return;  // bail out — don't try to render broken program
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var aP = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(prog, 'T');
  var uR = gl.getUniformLocation(prog, 'R');

  var running = true;
  var frame = 0;
  var SKIP = isMobile ? 2 : 0;
  var t0 = performance.now();

  function draw() {
    if (!running) { requestAnimationFrame(draw); return; }
    frame++;
    if (SKIP && frame % (SKIP + 1) !== 0) { requestAnimationFrame(draw); return; }
    gl.uniform1f(uT, (performance.now() - t0) * 0.001);
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      running = e[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  draw();
})();
