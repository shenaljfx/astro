/* ═══════════════════════════════════════════════════════════════════
   starfield.js — Starfield + Milky Way band  (PERFORMANCE OPTIMIZED)
   12 star layers (down from 36), 3-octave FBM (down from 4),
   lower DPR, better frame-skipping
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
  var DPR = isMobile ? 0.35 : 0.5;   // much lower render resolution

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
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('STARFIELD SHADER:\n' + gl.getShaderInfoLog(s));
    return s;
  }

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

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
'  for(int i=0;i<3;i++){v+=a*vn(p);p=m*p*2.0+vec2(1.7,9.2);a*=0.5;}return v;\n' +
'}\n' +
'\n' +
'float mwBand(vec2 uv){\n' +
'  float ang=0.55,ca=cos(ang),sa=sin(ang);\n' +
'  vec2 r=vec2(ca*uv.x+sa*uv.y,-sa*uv.x+ca*uv.y);\n' +
'  float band=exp(-r.y*r.y*80.0);\n' +
'  band*=fbm(r*vec2(3.0,8.0)+vec2(0.0,T*0.003))*0.5+0.5;\n' +
'  float core=exp(-r.y*r.y*400.0)*0.45;\n' +
'  core*=fbm(r*vec2(5.0,12.0)+vec2(T*0.002,0.0))*0.5+0.5;\n' +
'  float mw=(band+core);\n' +
'  mw+=exp(-r.y*r.y*100.0)*0.25;\n' +
'  return clamp(mw,0.0,1.0);\n' +
'}\n' +
'\n' +
'vec3 stars(vec2 uv, float dens, float seed){\n' +
'  vec2 id=floor(uv*dens);\n' +
'  vec2 gv=fract(uv*dens)-0.5;\n' +
'  vec2 off=h22(id+seed)-0.5;\n' +
'  off*=0.72;\n' +
'  float d=length(gv-off);\n' +
'  float rnd=h21(id+seed+37.0);\n' +
'  float alive=step(0.3,rnd);\n' +
'  float sz=mix(0.006,0.024,h21(id+seed+11.0));\n' +
'  float tw=sin(T*(1.0+rnd*2.0)+rnd*6.283)*0.2+0.8;\n' +
'  float b=smoothstep(sz,sz*0.02,d)*mix(0.3,1.0,rnd)*tw*alive;\n' +
'  float hue=h21(id+seed+91.0)*6.283;\n' +
'  vec3 sc=vec3(0.5+0.5*sin(hue),0.5+0.5*sin(hue+2.094),0.5+0.5*sin(hue+4.189));\n' +
'  sc=mix(sc,sc*sc,0.3);\n' +
'  return sc*b;\n' +
'}\n' +
'\n' +
'void main(){\n' +
'  vec2 uv=(gl_FragCoord.xy-0.5*R)/R.y;\n' +
'  vec2 uv0=gl_FragCoord.xy/R;\n' +
'  vec3 col=mix(vec3(0.005,0.0,0.01),vec3(0.01,0.005,0.02),uv0.y);\n' +
'  float mw=mwBand(uv);\n' +
'  float bm=smoothstep(0.0,0.12,mw);\n' +
'\n' +
'  vec3 mwC=mix(vec3(0.06,0.04,0.10),vec3(0.12,0.10,0.18),mw);\n' +
'  float ang2=0.55,ca2=cos(ang2),sa2=sin(ang2);\n' +
'  vec2 r2=vec2(ca2*uv.x+sa2*uv.y,-sa2*uv.x+ca2*uv.y);\n' +
'  mwC+=vec3(0.05,0.03,0.01)*exp(-r2.y*r2.y*80.0);\n' +
'  mwC+=vec3(0.02,0.02,0.06)*exp(-r2.y*r2.y*15.0);\n' +
'  col+=mwC*mw*0.6;\n' +
'\n' +
'  /* ═══ 12 star layers (optimized from 36) ═══ */\n' +
'  col+=stars(uv, 25.0,  0.0)*bm;\n' +
'  col+=stars(uv, 50.0, 10.0)*bm;\n' +
'  col+=stars(uv, 80.0, 20.0)*bm;\n' +
'  col+=stars(uv,130.0, 30.0)*mix(0.03,1.0,bm);\n' +
'  col+=stars(uv,200.0, 40.0)*mix(0.02,1.0,bm);\n' +
'  col+=stars(uv,300.0, 50.0)*mix(0.01,1.0,bm);\n' +
'  col+=stars(uv,420.0, 60.0)*mw;\n' +
'  col+=stars(uv,560.0, 70.0)*mw;\n' +
'  col+=stars(uv,700.0, 80.0)*mw;\n' +
'  col+=stars(uv,850.0, 90.0)*mw;\n' +
'  col+=stars(uv,450.0,100.0)*mw;\n' +
'  col+=stars(uv,650.0,110.0)*mw;\n' +
'\n' +
'  /* nebula (simplified — 2 fbm instead of 5) */\n' +
'  float n1=fbm(uv*0.7+vec2(T*0.001,0.0));\n' +
'  vec3 neb=vec3(0.10,0.04,0.18)*n1+vec3(0.03,0.08,0.14)*fbm(uv*1.1+vec2(0.0,T*0.0015));\n' +
'  col+=neb*smoothstep(0.0,0.08,mw)*1.5;\n' +
'\n' +
'  col*=1.0-dot(uv0-0.5,uv0-0.5)*1.2;\n' +
'  col*=0.85;\n' +
'  col=clamp(col,0.0,1.0);\n' +
'  col=pow(col,vec3(0.85));\n' +
'  vec3 g=vec3(dot(col,vec3(0.299,0.587,0.114)));\n' +
'  col=clamp(mix(g,col,1.4),0.0,1.0);\n' +
'  gl_FragColor=vec4(col,1.0);\n' +
'}\n';

  var vs = makeShader(VERT, gl.VERTEX_SHADER);
  var fs = makeShader(FRAG, gl.FRAGMENT_SHADER);
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('STARFIELD LINK:\n' + gl.getProgramInfoLog(prog));
    return;
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
  var SKIP = isMobile ? 3 : 1;  // desktop: render every 2nd frame; mobile: every 4th
  var t0 = performance.now();

  function draw() {
    if (!running) { requestAnimationFrame(draw); return; }
    frame++;
    if (frame % (SKIP + 1) !== 0) { requestAnimationFrame(draw); return; }
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
