import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Platform } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Path, G, ClipPath } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring, withDelay, interpolate, Easing } from 'react-native-reanimated';

var cachedColorPixels = null;
var cachedNormPixels = null;
var TWIDTH = 512;
var THEIGHT = 256;

var _rngState = 42;
function _nextRand() {
  _rngState = (_rngState * 16807) % 2147483647;
  return (_rngState - 1) / 2147483646;
}
function _resetRng() { _rngState = 42; }

function buildLunarColorMap() {
  if (cachedColorPixels) return cachedColorPixels;
  _resetRng();
  var w = TWIDTH, h = THEIGHT;
  var px = new Uint8Array(w * h * 4);

  // Pre-generate crater definitions
  var numCraters = 200;
  var craterList = [];
  for (var ci = 0; ci < numCraters; ci++) {
    var cRadius;
    if (ci < 6) cRadius = 14 + _nextRand() * 22;
    else if (ci < 25) cRadius = 6 + _nextRand() * 12;
    else if (ci < 70) cRadius = 2 + _nextRand() * 5;
    else cRadius = 0.8 + _nextRand() * 2.5;
    craterList.push({
      px: _nextRand() * w, py: _nextRand() * h,
      rad: cRadius,
      dep: 0.10 + _nextRand() * 0.25,
      rim: 0.03 + _nextRand() * 0.09
    });
  }

  // Dark plains (maria) regions
  var darkPlains = [
    {cx:0.38,cy:0.35,rx:0.13,ry:0.11,strength:0.17},
    {cx:0.55,cy:0.40,rx:0.10,ry:0.09,strength:0.15},
    {cx:0.60,cy:0.50,rx:0.11,ry:0.09,strength:0.14},
    {cx:0.28,cy:0.52,rx:0.12,ry:0.18,strength:0.12},
    {cx:0.48,cy:0.63,rx:0.10,ry:0.07,strength:0.11},
    {cx:0.72,cy:0.42,rx:0.06,ry:0.05,strength:0.16},
    {cx:0.66,cy:0.56,rx:0.08,ry:0.06,strength:0.12},
    {cx:0.34,cy:0.71,rx:0.06,ry:0.05,strength:0.13},
    {cx:0.43,cy:0.46,rx:0.07,ry:0.11,strength:0.11},
    {cx:0.24,cy:0.38,rx:0.08,ry:0.06,strength:0.10},
  ];

  for (var row = 0; row < h; row++) {
    for (var col = 0; col < w; col++) {
      var offset = (row * w + col) * 4;
      // Base highland brightness with subtle variation
      var bright = 0.72 + _nextRand() * 0.04;
      // Low frequency terrain undulation
      var angX = col / w * 6.283;
      var angY = row / h * 3.142;
      bright += Math.sin(angX * 2.3 + angY * 1.7) * 0.028;
      bright += Math.sin(angX * 5.1 - angY * 3.3) * 0.020;
      bright += Math.sin(angX * 0.8 + angY * 4.2) * 0.016;
      bright += Math.sin(angX * 8.5 + angY * 6.1) * 0.008;

      // Apply dark plains
      for (var pi = 0; pi < darkPlains.length; pi++) {
        var dp = darkPlains[pi];
        var fx = (col / w - dp.cx) / dp.rx;
        var fy = (row / h - dp.cy) / dp.ry;
        var fdist2 = fx * fx + fy * fy;
        if (fdist2 < 1) {
          var falloff = 1 - Math.sqrt(fdist2);
          bright -= dp.strength * falloff * falloff;
        }
      }

      // Apply craters
      for (var ki = 0; ki < craterList.length; ki++) {
        var cr = craterList[ki];
        var dx = col - cr.px;
        var dy = row - cr.py;
        // Wrap horizontally for seamless tiling
        if (dx > w / 2) dx -= w;
        if (dx < -w / 2) dx += w;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cr.rad * 1.35) {
          var normDist = dist / cr.rad;
          if (normDist < 0.75) {
            bright -= cr.dep * (1 - normDist / 0.75) * 0.5;
          } else if (normDist < 1.0) {
            bright -= cr.dep * 0.08 * (1 - (normDist - 0.75) / 0.25);
          } else if (normDist < 1.25) {
            bright += cr.rim * (1 - (normDist - 1.0) / 0.25);
          }
        }
      }

      // Micro-noise for grain
      bright += (_nextRand() - 0.5) * 0.018;
      bright = Math.max(0.04, Math.min(0.97, bright));

      // Slightly warm-tinted gray (like real regolith)
      px[offset]     = Math.floor(bright * 228);
      px[offset + 1] = Math.floor(bright * 220);
      px[offset + 2] = Math.floor(bright * 206);
      px[offset + 3] = 255;
    }
  }
  cachedColorPixels = px;
  return px;
}

function buildLunarNormalMap() {
  if (cachedNormPixels) return cachedNormPixels;
  var colorPx = buildLunarColorMap();
  var w = TWIDTH, h = THEIGHT;
  var norms = new Uint8Array(w * h * 4);
  var bumpStrength = 2.5;
  for (var row = 0; row < h; row++) {
    for (var col = 0; col < w; col++) {
      var off = (row * w + col) * 4;
      var heightL = colorPx[(row * w + ((col - 1 + w) % w)) * 4] / 255;
      var heightR = colorPx[(row * w + ((col + 1) % w)) * 4] / 255;
      var heightU = colorPx[(Math.max(row - 1, 0) * w + col) * 4] / 255;
      var heightD = colorPx[(Math.min(row + 1, h - 1) * w + col) * 4] / 255;
      var gradX = (heightL - heightR) * bumpStrength;
      var gradY = (heightU - heightD) * bumpStrength;
      var gradZ = 1.0;
      var mag = Math.sqrt(gradX * gradX + gradY * gradY + gradZ * gradZ);
      norms[off]     = Math.floor(((gradX / mag) * 0.5 + 0.5) * 255);
      norms[off + 1] = Math.floor(((gradY / mag) * 0.5 + 0.5) * 255);
      norms[off + 2] = Math.floor(((gradZ / mag) * 0.5 + 0.5) * 255);
      norms[off + 3] = 255;
    }
  }
  cachedNormPixels = norms;
  return norms;
}

function computeLightAngle(tithiNum) {
  // tithi 1 = new moon → sun behind moon (angle π, z=-5)
  // tithi 15 = full moon → sun behind camera (angle 0, z=+5)
  return ((tithiNum - 1) / 29) * Math.PI * 2 + Math.PI;
}

function computeIllumFraction(tithiNum) {
  return (1 - Math.cos(computeLightAngle(tithiNum))) / 2;
}

function assembleMoonScene(THREE, rendererObj, sunAngle, shouldAnimate, stateHolder) {
  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.z = 3.2;

  var colorBytes = buildLunarColorMap();
  var colorDataTex = new THREE.DataTexture(colorBytes, TWIDTH, THEIGHT, THREE.RGBAFormat);
  colorDataTex.needsUpdate = true;
  colorDataTex.wrapS = THREE.RepeatWrapping;
  colorDataTex.wrapT = THREE.ClampToEdgeWrapping;
  colorDataTex.magFilter = THREE.LinearFilter;
  colorDataTex.minFilter = THREE.LinearMipmapLinearFilter;
  colorDataTex.generateMipmaps = true;

  var normBytes = buildLunarNormalMap();
  var normDataTex = new THREE.DataTexture(normBytes, TWIDTH, THEIGHT, THREE.RGBAFormat);
  normDataTex.needsUpdate = true;
  normDataTex.wrapS = THREE.RepeatWrapping;
  normDataTex.wrapT = THREE.ClampToEdgeWrapping;
  normDataTex.magFilter = THREE.LinearFilter;
  normDataTex.minFilter = THREE.LinearMipmapLinearFilter;
  normDataTex.generateMipmaps = true;

  var sphereGeo = new THREE.SphereGeometry(1, 64, 48);
  var surfaceMat = new THREE.MeshPhongMaterial({
    map: colorDataTex,
    normalMap: normDataTex,
    normalScale: new THREE.Vector2(1.0, 1.0),
    bumpMap: colorDataTex,
    bumpScale: 0.015,
    shininess: 4,
    specular: new THREE.Color(0x222222),
    emissive: new THREE.Color(0x030306),
  });
  var moonMesh = new THREE.Mesh(sphereGeo, surfaceMat);
  moonMesh.rotation.x = 0.15;
  scene.add(moonMesh);
  stateHolder.moonMesh = moonMesh;

  var sx = Math.sin(sunAngle) * 5;
  var sz = Math.cos(sunAngle) * 5;

  var mainSun = new THREE.DirectionalLight(0xFFF5E0, 2.0);
  mainSun.position.set(sx, 0.3, sz);
  scene.add(mainSun);
  stateHolder.mainSun = mainSun;

  var reflectedEarth = new THREE.DirectionalLight(0x4466AA, 0.22);
  reflectedEarth.position.set(-sx, -0.2, -sz);
  scene.add(reflectedEarth);
  stateHolder.reflectedEarth = reflectedEarth;

  // Rim light so dark side is never pure black
  var rimFill = new THREE.PointLight(0x223355, 0.12, 20);
  rimFill.position.set(0, 2, -3);
  scene.add(rimFill);

  var ambientFill = new THREE.AmbientLight(0x12122E, 0.35);
  scene.add(ambientFill);

  stateHolder.sceneObj = scene;
  stateHolder.camObj = cam;
  stateHolder.rendererObj = rendererObj;
  stateHolder.spinY = 0;
  stateHolder.spinSpeed = 0.0006;       // base idle spin speed
  stateHolder.currentSunAngle = sunAngle;
  stateHolder.targetSunAngle = sunAngle;
  stateHolder.transitioning = false;
}

function repositionLights(stateHolder, sunAngle) {
  if (!stateHolder.mainSun) return;
  var sx = Math.sin(sunAngle) * 5;
  var sz = Math.cos(sunAngle) * 5;
  stateHolder.mainSun.position.set(sx, 0.3, sz);
  if (stateHolder.reflectedEarth) stateHolder.reflectedEarth.position.set(-sx, -0.2, -sz);
}

// Trigger a fast-spin transition to new phase
function triggerPhaseTransition(stateHolder, newSunAngle) {
  if (!stateHolder.moonMesh) return;
  stateHolder.targetSunAngle = newSunAngle;
  stateHolder.transitioning = true;
  stateHolder.transitionStart = Date.now();
  stateHolder.transitionDuration = 700; // ms
  stateHolder.startSunAngle = stateHolder.currentSunAngle;
  stateHolder.burstSpinSpeed = 0.045; // fast spin during transition
}

// Call this every frame instead of simple idle spin
function tickMoonFrame(stateHolder, animate) {
  if (!stateHolder.moonMesh) return;
  var now = Date.now();

  if (stateHolder.transitioning) {
    var elapsed = now - stateHolder.transitionStart;
    var t = Math.min(elapsed / stateHolder.transitionDuration, 1);
    // Smooth ease-in-out
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Interpolate sun angle (light position)
    var angleDiff = stateHolder.targetSunAngle - stateHolder.startSunAngle;
    // Normalize to shortest path
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    stateHolder.currentSunAngle = stateHolder.startSunAngle + angleDiff * ease;
    repositionLights(stateHolder, stateHolder.currentSunAngle);

    // Fast spin that decelerates
    var spinEase = 1 - ease; // fast at start, slow at end
    var currentBurstSpeed = stateHolder.burstSpinSpeed * spinEase * spinEase + 0.0006;
    stateHolder.spinY += currentBurstSpeed;
    stateHolder.moonMesh.rotation.y = stateHolder.spinY;

    if (t >= 1) {
      stateHolder.transitioning = false;
      stateHolder.currentSunAngle = stateHolder.targetSunAngle;
      repositionLights(stateHolder, stateHolder.currentSunAngle);
    }
  } else if (animate) {
    // Normal slow idle rotation
    stateHolder.spinY += 0.0006;
    stateHolder.moonMesh.rotation.y = stateHolder.spinY;
  }
}

function MoonCanvasWeb({ size, tithiNum, animate }) {
  var boxRef = useRef(null);
  var state = useRef({}).current;
  var rafRef = useRef(null);

  var sunAngle = useMemo(function() { return computeLightAngle(tithiNum); }, [tithiNum]);
  var dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  var pxSize = Math.floor(size * dpr);

  useEffect(function() {
    var box = boxRef.current;
    if (!box) return;
    var THREE;
    try { THREE = require('three'); } catch(e) { return; }

    var cvs = document.createElement('canvas');
    cvs.width = pxSize;
    cvs.height = pxSize;
    cvs.style.width = size + 'px';
    cvs.style.height = size + 'px';
    cvs.style.borderRadius = '50%';
    cvs.style.display = 'block';
    box.innerHTML = '';
    box.appendChild(cvs);

    var glRenderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
    glRenderer.setSize(pxSize, pxSize, false);
    glRenderer.setPixelRatio(1);
    glRenderer.setClearColor(0x000000, 0);

    assembleMoonScene(THREE, glRenderer, sunAngle, animate, state);

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      tickMoonFrame(state, animate);
      glRenderer.render(state.sceneObj, state.camObj);
    }
    tick();

    return function() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      glRenderer.dispose();
      if (box) box.innerHTML = '';
    };
  }, [size, pxSize]);

  // When tithiNum changes, trigger spin transition instead of instant reposition
  useEffect(function() {
    if (state.moonMesh) {
      triggerPhaseTransition(state, sunAngle);
    }
  }, [sunAngle]);

  var illum = computeIllumFraction(tithiNum);
  var glowR = Math.round(illum * 20 + 4);
  var glowA = (illum * 0.5 + 0.1).toFixed(2);

  return (
    <div ref={boxRef} style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      boxShadow: '0 0 ' + glowR + 'px ' + Math.round(glowR * 0.6) + 'px rgba(200,195,230,' + glowA + ')',
      background: '#020208',
    }} />
  );
}

var _nativeGLView = null;
var _nativeTHREE = null;
var _nativeReady = false;
var _nativeChecked = false;

function ensureNativeModules() {
  if (_nativeChecked) return _nativeReady;
  _nativeChecked = true;
  try {
    _nativeTHREE = require('three');
    _nativeGLView = require('expo-gl').GLView;
    _nativeReady = true;
  } catch(e) { _nativeReady = false; }
  return _nativeReady;
}

function MoonGLNative({ size, tithiNum, animate }) {
  var state = useRef({}).current;
  var rafRef = useRef(null);

  var sunAngle = useMemo(function() { return computeLightAngle(tithiNum); }, [tithiNum]);

  var handleGLReady = useCallback(function(gl) {
    var THREE = _nativeTHREE;
    var canvasShim = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: function() {},
      removeEventListener: function() {},
      clientHeight: gl.drawingBufferHeight,
    };
    var glRenderer = new THREE.WebGLRenderer({
      canvas: canvasShim, context: gl, antialias: true,
    });
    glRenderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    glRenderer.setPixelRatio(1);
    glRenderer.setClearColor(0x000000, 0);

    assembleMoonScene(THREE, glRenderer, sunAngle, animate, state);

    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      tickMoonFrame(state, animate);
      glRenderer.render(state.sceneObj, state.camObj);
      gl.endFrameEXP();
    }
    tick();
  }, [sunAngle, animate]);

  // When tithiNum changes, trigger spin transition
  useEffect(function() {
    if (state.moonMesh) {
      triggerPhaseTransition(state, sunAngle);
    }
  }, [sunAngle]);

  useEffect(function() {
    return function() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (state.rendererObj) { state.rendererObj.dispose(); state.rendererObj = null; }
    };
  }, []);

  var pulse = useSharedValue(0);
  useEffect(function() {
    if (animate) {
      pulse.value = withRepeat(withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ), -1, true);
    }
  }, [animate]);

  var illum = computeIllumFraction(tithiNum);
  var glowStyle = useAnimatedStyle(function() {
    var gr = interpolate(pulse.value, [0, 1], [8, 22]) * illum;
    var ga = interpolate(pulse.value, [0, 1], [0.2, 0.5]) * illum;
    return {
      shadowColor: illum > 0.5 ? '#D8D0FF' : '#9088C0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: ga,
      shadowRadius: gr,
      elevation: 0,
    };
  });

  var NativeGL = _nativeGLView;
  return (
    <Animated.View style={[{
      width: size, height: size, borderRadius: size / 2,
      overflow: 'hidden', backgroundColor: '#020208',
    }, animate && glowStyle]}>
      <NativeGL style={{ width: size, height: size }} onContextCreate={handleGLReady} msaaSamples={4} />
    </Animated.View>
  );
}

function TinyMoonSVG({ size, tithiNum }) {
  var mid = size / 2;
  var R = size * 0.42;
  var angle = computeLightAngle(tithiNum);
  var illum = computeIllumFraction(tithiNum);

  // Full moon
  if (illum > 0.997) {
    return (
      <Svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <Defs>
          <RadialGradient id='tfg' cx='42%' cy='40%' r='58%'>
            <Stop offset='0%' stopColor='#EAE4D8' />
            <Stop offset='60%' stopColor='#D8D0C4' />
            <Stop offset='100%' stopColor='#C0B8AC' />
          </RadialGradient>
        </Defs>
        <Circle cx={mid} cy={mid} r={R} fill='url(#tfg)' />
        <Circle cx={mid * 0.85} cy={mid * 0.80} r={R * 0.22} fill='rgba(140,132,122,0.28)' />
        <Circle cx={mid * 1.2} cy={mid * 0.70} r={R * 0.14} fill='rgba(140,132,122,0.22)' />
        <Circle cx={mid * 0.75} cy={mid * 1.15} r={R * 0.17} fill='rgba(140,132,122,0.20)' />
      </Svg>
    );
  }

  // New moon
  if (illum < 0.003) {
    return (
      <Svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
        <Circle cx={mid} cy={mid} r={R} fill='#12101E' />
        <Circle cx={mid} cy={mid} r={R} fill='rgba(70,90,130,0.06)' />
      </Svg>
    );
  }

  // Partial phase
  var terminatorBulge = Math.cos(angle) * R;
  var waxing = tithiNum <= 15;
  var topY = mid - R;
  var botY = mid + R;
  var absT = Math.max(Math.abs(terminatorBulge), 0.5);
  var litArc;
  if (waxing) {
    var sweepFlag = terminatorBulge > 0 ? 0 : 1;
    litArc = 'M ' + mid + ' ' + topY + ' A ' + R + ' ' + R + ' 0 0 1 ' + mid + ' ' + botY + ' A ' + absT + ' ' + R + ' 0 0 ' + sweepFlag + ' ' + mid + ' ' + topY + ' Z';
  } else {
    var sweepFlag2 = terminatorBulge > 0 ? 1 : 0;
    litArc = 'M ' + mid + ' ' + topY + ' A ' + R + ' ' + R + ' 0 0 0 ' + mid + ' ' + botY + ' A ' + absT + ' ' + R + ' 0 0 ' + sweepFlag2 + ' ' + mid + ' ' + topY + ' Z';
  }
  var uid = 'tm' + size + 'p' + tithiNum;
  return (
    <Svg width={size} height={size} viewBox={'0 0 ' + size + ' ' + size}>
      <Defs>
        <ClipPath id={uid + 'disc'}><Circle cx={mid} cy={mid} r={R} /></ClipPath>
        <ClipPath id={uid + 'lit'}><Path d={litArc} /></ClipPath>
        <RadialGradient id={uid + 'rg'} cx='42%' cy='40%' r='58%'>
          <Stop offset='0%' stopColor='#EAE4D8' />
          <Stop offset='60%' stopColor='#D8D0C4' />
          <Stop offset='100%' stopColor='#C0B8AC' />
        </RadialGradient>
      </Defs>
      <G clipPath={'url(#' + uid + 'disc)'}>
        <Circle cx={mid} cy={mid} r={R} fill='#12101E' />
        <Path d={litArc} fill={'url(#' + uid + 'rg)'} />
        <G clipPath={'url(#' + uid + 'lit)'}>
          <Circle cx={mid * 0.85} cy={mid * 0.80} r={R * 0.22} fill='rgba(140,132,122,0.28)' />
          <Circle cx={mid * 1.2} cy={mid * 0.70} r={R * 0.14} fill='rgba(140,132,122,0.22)' />
        </G>
        <Circle cx={mid} cy={mid} r={R} fill='none' stroke='rgba(20,15,40,0.30)' strokeWidth={R * 0.12} />
      </G>
    </Svg>
  );
}

/* ================================================================
   STAR FIELD — twinkling stars around the moon
   ================================================================ */
var _starCache = {};
var STAR_COLORS = ['#E8E4FF', '#D4D0FF', '#FFFAE8', '#FFE8D4', '#C8D8FF', '#FFFFFF', '#F0E0FF'];

function getStarsForSize(outerSize) {
  var key = outerSize;
  if (_starCache[key]) return _starCache[key];
  var stars = [];
  var moonR = outerSize * 0.30;
  var center = outerSize / 2;
  var seed2 = 137;
  function r2() { seed2 = (seed2 * 16807) % 2147483647; return (seed2 - 1) / 2147483646; }
  var count = Math.min(Math.floor(outerSize * 0.7), 100);
  for (var i = 0; i < count; i++) {
    var angle = r2() * Math.PI * 2;
    var minDist = moonR + outerSize * 0.04;
    var maxDist = outerSize * 0.49;
    var dist = minDist + r2() * (maxDist - minDist);
    var sx = center + Math.cos(angle) * dist;
    var sy = center + Math.sin(angle) * dist;
    if (sx < 0.5 || sx > outerSize - 0.5 || sy < 0.5 || sy > outerSize - 0.5) continue;
    var brightness = 0.25 + r2() * 0.75;
    var sz = r2() < 0.08 ? 2.0 + r2() * 1.5 : r2() < 0.25 ? 1.0 + r2() * 1.2 : 0.4 + r2() * 0.9;
    var twinkleSpeed = 1200 + r2() * 3500;
    var color = STAR_COLORS[Math.floor(r2() * STAR_COLORS.length)];
    var hasGlow = sz > 1.8;
    stars.push({ x: sx, y: sy, brightness: brightness, size: sz, speed: twinkleSpeed, color: color, hasGlow: hasGlow });
  }
  _starCache[key] = stars;
  return stars;
}

function TwinklingStar({ x, y, brightness, starSize, speed, color, hasGlow }) {
  var opacity = useSharedValue(brightness * 0.2);
  useEffect(function() {
    var minO = brightness * 0.1;
    var maxO = brightness;
    opacity.value = withRepeat(
      withSequence(
        withTiming(maxO, { duration: speed, easing: Easing.inOut(Easing.sin) }),
        withTiming(minO, { duration: speed * 0.8, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);
  var animStyle = useAnimatedStyle(function() {
    return { opacity: opacity.value, transform: [{ scale: interpolate(opacity.value, [0, brightness], [0.6, 1.2]) }] };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', left: x - starSize / 2, top: y - starSize / 2,
      width: starSize, height: starSize, borderRadius: starSize / 2,
      backgroundColor: color || '#E8E4FF',
    }, hasGlow && Platform.OS === 'web' ? { boxShadow: '0 0 3px 1px ' + (color || '#E8E4FF') } : {},
    animStyle]} />
  );
}

function StarFieldWrap({ size, children }) {
  var outerSize = size * 1.6;
  var stars = useMemo(function() { return getStarsForSize(Math.round(outerSize)); }, [outerSize]);
  return (
    <View style={{ width: outerSize, height: outerSize, alignItems: 'center', justifyContent: 'center' }}>
      {stars.map(function(s, i) {
        return <TwinklingStar key={i} x={s.x} y={s.y} brightness={s.brightness} starSize={s.size} speed={s.speed} color={s.color} hasGlow={s.hasGlow} />;
      })}
      {children}
    </View>
  );
}

/* ================================================================
   PHASE TRANSITION — subtle scale pulse to complement the 3D spin
   ================================================================ */
function PhaseTransition({ tithiNum, children }) {
  var scale = useSharedValue(1);
  var glow = useSharedValue(0);
  var prevTithi = useRef(tithiNum);

  useEffect(function() {
    if (prevTithi.current !== tithiNum) {
      prevTithi.current = tithiNum;
      // Gentle pulse: slight shrink then overshoot back
      scale.value = withSequence(
        withTiming(0.93, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1.0, { damping: 10, stiffness: 150, mass: 0.5 })
      );
      // Brief brightness burst
      glow.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) })
      );
    }
  }, [tithiNum]);

  var transStyle = useAnimatedStyle(function() {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={transStyle}>
      {children}
    </Animated.View>
  );
}

function RealisticMoon({ size, tithiNum, animate, showStars }) {
  if (size === undefined) size = 160;
  if (tithiNum === undefined) tithiNum = 8;
  if (animate === undefined) animate = true;
  if (showStars === undefined) showStars = false;

  // Tiny thumbnails: lightweight SVG on all platforms, no stars
  if (size < 60) {
    return <TinyMoonSVG size={size} tithiNum={tithiNum} />;
  }

  var moonContent;
  if (Platform.OS === 'web') {
    moonContent = <MoonCanvasWeb size={size} tithiNum={tithiNum} animate={animate} />;
  } else if (ensureNativeModules()) {
    moonContent = <MoonGLNative size={size} tithiNum={tithiNum} animate={animate} />;
  } else {
    moonContent = <TinyMoonSVG size={size} tithiNum={tithiNum} />;
  }

  if (showStars) {
    return <StarFieldWrap size={size}>{moonContent}</StarFieldWrap>;
  }
  return moonContent;
}
// Memoized to prevent re-renders when props are stable.
export default React.memo(RealisticMoon);