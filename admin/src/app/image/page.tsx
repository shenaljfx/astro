'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import AppShell from '@/components/AppShell';
import { PageHeader, Panel, Field, Btn, Chip, Select, inputCls, EmptyState, SIGN_ART } from '@/components/ui';
import { addHistory } from '@/lib/history';
import { listBgs, saveBg, deleteBg, SavedBg } from '@/lib/bgStore';
import { SINHALA_VOICE, SIGN_SI, ENGLISH_READING_VOICE } from '@/lib/promptStyle';
import {
  Download, Package, Upload, Image as ImageIcon, X, Bookmark, Sparkles, RefreshCw,
  ChevronDown, AlignLeft, AlignCenter, AlignRight, ArrowLeftRight, Dices, Heart,
} from 'lucide-react';

/* ── Data ───────────────────────────────────────────────────────────────── */

type Sign = {
  english: string; sinhala: string; symbol: string;
  quote: string; quoteSi: string; rating: string; score: number;
  chandrashtama: boolean; lucky: { number: number; color: string };
  goodDays?: number; totalDays?: number;
  bestDay?: { weekday: string; weekdaySi: string; dayOfMonth: number };
  cautionDates?: string[]; sadeSati?: boolean; jupiterFavorable?: boolean;
};

const FORMATS: Record<string, [number, number]> = {
  Square: [1080, 1080],
  Portrait: [1080, 1350],
  Story: [1080, 1920],
};

type Period = 'daily' | 'weekly' | 'monthly';
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

/* ── Persona & couple posts ─────────────────────────────────────────────── */

type PostType = 'rashi' | 'persona' | 'couple';

const ROLES = [
  { key: 'girlfriend', en: 'Girlfriend', si: 'පෙම්වතිය' },
  { key: 'boyfriend', en: 'Boyfriend', si: 'පෙම්වතා' },
  { key: 'girl', en: 'Girl', si: 'කෙල්ල' },
  { key: 'boy', en: 'Boy', si: 'කොල්ලා' },
  { key: 'wife', en: 'Wife', si: 'බිරිඳ' },
  { key: 'husband', en: 'Husband', si: 'සැමියා' },
] as const;
type RoleKey = (typeof ROLES)[number]['key'];
const roleOf = (k: RoleKey) => ROLES.find((r) => r.key === k)!;

interface PairSide { sign: string; role: RoleKey }
interface PairData { score: number; chemistry: string; element1: string; element2: string; description: string }

/** Engine fallback lines per chemistry band (deterministic — used before AI runs). */
const SI_CHEMISTRY: Record<string, string> = {
  High: 'ඉහළ ගැළපීමක් — එකිනෙකාව ඉහළට ඔසවන ජෝඩුවක්.',
  Moderate: 'මධ්‍යම ගැළපීමක් — අවබෝධයෙන් දිනෙන් දින වැඩෙන බැඳීමක්.',
  Challenging: 'අභියෝගාත්මක ගැළපීමක් — ඉවසීමෙන් ශක්තිමත් වන ආදරයක්.',
};

/** Deterministic persona fallbacks by element (before AI runs). */
const ELEMENT_PERSONA: Record<string, { en: string; si: string }> = {
  fire: { en: 'Fire heart — loves loud, forgives fast.', si: 'ගිනි හදවතක් — හයියෙන් ආදරෙයි, ඉක්මනින් සමාව දෙයි.' },
  earth: { en: 'Earth heart — steady hands, deep roots.', si: 'පොළොවේ හදවතක් — ස්ථිර අත්, ගැඹුරු මුල්.' },
  air: { en: 'Air heart — quick mind, light-as-words love.', si: 'සුළං හදවතක් — ඉක්මන් හිතක්, සැහැල්ලු ආදරයක්.' },
  water: { en: 'Water heart — feels everything, remembers it all.', si: 'ජල හදවතක් — හැමදේම දැනෙනවා, හැමදේම මතකයි.' },
};

const RASHI_LORD: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

/** Zodiac symbol glyphs (FE0E = text presentation, never emoji). */
const SIGN_GLYPH: Record<string, string> = {
  Aries: '♈︎', Taurus: '♉︎', Gemini: '♊︎', Cancer: '♋︎', Leo: '♌︎', Virgo: '♍︎',
  Libra: '♎︎', Scorpio: '♏︎', Sagittarius: '♐︎', Capricorn: '♑︎', Aquarius: '♒︎', Pisces: '♓︎',
};

/* ── Typography library (10 styles, canvas-safe via next/font CSS vars) ─── */

type TextStyleKey =
  | 'fraunces' | 'playfair' | 'cinzel' | 'cormorant' | 'lora'
  | 'montserrat' | 'poppins' | 'oswald' | 'black' | 'script';

const TEXT_STYLES: Record<TextStyleKey, {
  label: string;
  varName: string;      // CSS variable holding the loaded family name
  generic: string;      // fallback stack tail
  titleWeight: number;
  quoteWeight: number;
  sizeMul: number;
  lineMul: number;
}> = {
  fraunces: { label: 'Elegant', varName: '--font-display', generic: 'Georgia, serif', titleWeight: 700, quoteWeight: 600, sizeMul: 1, lineMul: 1.32 },
  playfair: { label: 'Classic', varName: '--font-playfair', generic: 'Georgia, serif', titleWeight: 700, quoteWeight: 600, sizeMul: 0.98, lineMul: 1.34 },
  cinzel: { label: 'Royal', varName: '--font-cinzel', generic: 'Georgia, serif', titleWeight: 700, quoteWeight: 600, sizeMul: 0.84, lineMul: 1.42 },
  cormorant: { label: 'Garamond', varName: '--font-cormorant', generic: 'Georgia, serif', titleWeight: 700, quoteWeight: 600, sizeMul: 1.08, lineMul: 1.26 },
  lora: { label: 'Editorial', varName: '--font-lora', generic: 'Georgia, serif', titleWeight: 700, quoteWeight: 500, sizeMul: 0.95, lineMul: 1.36 },
  montserrat: { label: 'Modern', varName: '--font-montserrat', generic: `'Segoe UI', Arial, sans-serif`, titleWeight: 800, quoteWeight: 600, sizeMul: 0.88, lineMul: 1.4 },
  poppins: { label: 'Clean', varName: '--font-poppins', generic: `'Segoe UI', Arial, sans-serif`, titleWeight: 700, quoteWeight: 500, sizeMul: 0.88, lineMul: 1.42 },
  oswald: { label: 'Condensed', varName: '--font-oswald', generic: `'Segoe UI', Arial, sans-serif`, titleWeight: 600, quoteWeight: 500, sizeMul: 0.96, lineMul: 1.36 },
  black: { label: 'Impact', varName: '--font-black', generic: `'Arial Black', Arial, sans-serif`, titleWeight: 400, quoteWeight: 400, sizeMul: 0.8, lineMul: 1.32 },
  script: { label: 'Script', varName: '--font-script', generic: 'cursive', titleWeight: 700, quoteWeight: 700, sizeMul: 1.12, lineMul: 1.34 },
};

/** Resolve a style to a concrete canvas font stack ('Nirmala UI' carries Sinhala). */
function resolveFamily(key: TextStyleKey): string {
  const st = TEXT_STYLES[key];
  const fam =
    typeof window !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue(st.varName).trim().split(',')[0].replace(/['"]/g, '')
      : '';
  return `${fam ? `'${fam}', ` : ''}'Nirmala UI', ${st.generic}`;
}

type Align = 'left' | 'center' | 'right';
type TextPos = 'top' | 'middle' | 'bottom';
type Badge = 'art' | 'symbol' | 'none';
type BadgePos = 'left' | 'center' | 'right';
type LogoPos = 'tl' | 'tr' | 'bl' | 'br';

/* ── Canvas direct-editing (Canva-style) ────────────────────────────────── */

type ElementId = 'badge' | 'score' | 'title' | 'date' | 'quote' | 'lucky' | 'footer' | 'logo';
interface ElOffset { dx: number; dy: number; scale: number }
type Offsets = Partial<Record<ElementId, Partial<ElOffset>>>;
/** Typography of a text element — lets the in-place editor sit exactly on it. */
interface EditMeta {
  px: number;
  family: string;
  weight: number;
  color: string;
  align: CanvasTextAlign;
  lineHeight: number;
  anchorX: number;   // the canvas x the text is drawn from
  maxW: number;      // the wrap width used
  baseline: number;  // first line's baseline y
}
interface Box { x: number; y: number; w: number; h: number; edit?: EditMeta }
type Boxes = Partial<Record<ElementId, Box>>;

const EL_LABEL: Record<ElementId, string> = {
  badge: 'Sign art', score: 'Score', title: 'Title', date: 'Date', quote: 'Quote',
  lucky: 'Lucky strip', footer: 'Footer', logo: 'Logo',
};
/** Hit-test priority — smaller/top-most elements first. */
const EL_ZORDER: ElementId[] = ['logo', 'lucky', 'footer', 'score', 'date', 'title', 'badge', 'quote'];
/** Elements whose TEXT can be edited right on the canvas (double-click / ✎). */
const EDITABLE = new Set<ElementId>(['title', 'date', 'quote', 'footer']);

/* ── Small helpers ──────────────────────────────────────────────────────── */

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = r.result as string;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Pure canvas renderer (shared by live preview + batch ZIP) ──────────── */

interface PostOpts {
  W: number;
  H: number;
  bg: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  signArt: HTMLImageElement | null;
  symbol: string;
  title: string;
  dateText: string;
  quote: string;
  textColor: string;
  accent: string;
  scrim: number;
  footer: string;
  lucky?: { number: number; color: string; chandrashtama: boolean } | null;
  // layout tools
  family: string;
  titleWeight: number;
  quoteWeight: number;
  sizeMul: number;
  lineMul: number;
  align: Align;
  textPos: TextPos;
  textScale: number;
  lineScale: number;
  margin: number;
  badge: Badge;
  badgePos: BadgePos;
  badgeScale: number;
  logoPos: LogoPos;
  logoScale: number;
  /** Title typography (may differ from quote style). */
  titleFamily: string;
  titleFontWeight: number;
  titleScale: number;
  /** Persona/couple header: sign arts or glyphs, optional engine score. */
  couple?: {
    artA: HTMLImageElement | null;
    artB: HTMLImageElement | null; // null → solo persona layout
    glyphA: string;
    glyphB?: string;
    useArt: boolean;               // Illustrated vs Symbol, user's choice
    score?: number;
    chemistry?: string;
    showScore: boolean;
  };
  /** Per-element drag/resize deltas layered over the auto layout. */
  offsets?: Offsets;
  /** Element currently being typed in-place — its canvas text is not painted
   *  (the live editor sits exactly on its spot instead). */
  hideEl?: ElementId | null;
}

/** Shrink a font size until `text` fits within maxW (single line). */
function fitFontPx(
  ctx: CanvasRenderingContext2D, text: string, basePx: number, maxW: number,
  weight: number, family: string, minPx = 18,
): number {
  let px = basePx;
  while (px > minPx) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  return px;
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height);
  const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function renderPost(canvas: HTMLCanvasElement, o: PostOpts): Boxes {
  canvas.width = o.W;
  canvas.height = o.H;
  const boxes: Boxes = {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return boxes;
  const { W, H } = o;
  const pad = Math.round(W * o.margin);
  const serif = o.family;
  const sans = `'Segoe UI', Arial, 'Nirmala UI', sans-serif`;
  const off = (id: ElementId): ElOffset => ({ dx: 0, dy: 0, scale: 1, ...(o.offsets?.[id] || {}) });

  // Background
  if (o.bg) drawCover(ctx, o.bg, W, H);
  else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a1140');
    g.addColorStop(1, '#070512');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Legibility scrim
  const g2 = ctx.createLinearGradient(0, 0, 0, H);
  g2.addColorStop(0, `rgba(5,3,18,${o.scrim * 0.35})`);
  g2.addColorStop(0.45, `rgba(5,3,18,${o.scrim * 0.15})`);
  g2.addColorStop(1, `rgba(5,3,18,${Math.min(0.92, o.scrim * 1.35)})`);
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  /* ── Header: badge + title + date ── */
  let headerBottom = pad + W * 0.13;
  const titleFam = o.titleFamily || serif;
  const titleW = o.titleFontWeight || o.titleWeight;
  const baseTitlePx = Math.round(W * 0.058 * o.titleScale);
  const dateSize = Math.round(W * 0.028);

  // Draws the title and (separately selectable) date, each with its own offset.
  // The date's BASE position hangs under the title's BASE position, so dragging
  // the title leaves the date where it is — they are independent elements.
  const drawTitleBlock = (x: number, alignMode: CanvasTextAlign, titleBase: number, maxW: number) => {
    const oT = off('title');
    const tx = x + oT.dx;
    const tBase = titleBase + oT.dy;
    ctx.textAlign = alignMode;
    ctx.fillStyle = o.textColor;
    const px = Math.round(fitFontPx(ctx, o.title || '', baseTitlePx, maxW, titleW, titleFam) * oT.scale);
    ctx.font = `${titleW} ${px}px ${titleFam}`;
    if (o.hideEl !== 'title') ctx.fillText(o.title || '', tx, tBase);
    const tw = ctx.measureText(o.title || '').width;
    const bx = alignMode === 'center' ? tx - tw / 2 : alignMode === 'right' ? tx - tw : tx;
    boxes.title = {
      x: bx, y: tBase - px, w: Math.max(tw, W * 0.08), h: px * 1.3,
      edit: { px, family: titleFam, weight: titleW, color: o.textColor, align: alignMode, lineHeight: px * 1.25, anchorX: tx, maxW, baseline: tBase },
    };

    if (o.dateText) {
      const oD = off('date');
      const dPx = Math.round(dateSize * oD.scale);
      const dxp = x + oD.dx;
      const dBase = titleBase + W * 0.043 + oD.dy;
      ctx.textAlign = alignMode;
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = `500 ${dPx}px ${sans}`;
      if (o.hideEl !== 'date') ctx.fillText(o.dateText, dxp, dBase);
      const dw = ctx.measureText(o.dateText).width;
      const dbx = alignMode === 'center' ? dxp - dw / 2 : alignMode === 'right' ? dxp - dw : dxp;
      boxes.date = {
        x: dbx, y: dBase - dPx, w: Math.max(dw, W * 0.06), h: dPx * 1.4,
        edit: { px: dPx, family: sans, weight: 500, color: 'rgba(255,255,255,.75)', align: alignMode, lineHeight: dPx * 1.3, anchorX: dxp, maxW, baseline: dBase },
      };
    }
  };

  if (o.couple) {
    /* ── Persona / couple header: arts or glyphs, optional score, title ── */
    const solo = !o.couple.artB && !o.couple.glyphB;
    const baseArt = (solo ? W * 0.34 : W * 0.30) * o.badgeScale;
    const baseArtY = pad * 0.9;
    const baseCx = W / 2;
    const oB = off('badge');
    const art = baseArt * oB.scale;
    const cx = baseCx + oB.dx;
    const artY = baseArtY + oB.dy;
    const overlap = art * 0.16;

    const drawBadgeAt = (img: HTMLImageElement | null, glyph: string, x: number, deg: number) => {
      ctx.save();
      ctx.translate(x + art / 2, artY + art / 2);
      ctx.rotate((deg * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = W * 0.03;
      if (o.couple!.useArt && img) {
        ctx.drawImage(img, -art / 2, -art / 2, art, art);
      } else {
        // Symbol style — glyph in a ringed disc.
        ctx.beginPath();
        ctx.arc(0, 0, art / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,6,24,0.72)';
        ctx.fill();
        ctx.lineWidth = Math.max(2, W * 0.004);
        ctx.strokeStyle = o.accent;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = o.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${Math.round(art * 0.52)}px ${serif}`;
        ctx.fillText(glyph, 0, art * 0.02);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
    };

    if (o.badge !== 'none') {
      if (solo) {
        drawBadgeAt(o.couple.artA, o.couple.glyphA, cx - art / 2, 0);
        boxes.badge = { x: cx - art / 2, y: artY, w: art, h: art };
      } else {
        drawBadgeAt(o.couple.artA, o.couple.glyphA, cx - art + overlap / 2, -6);
        drawBadgeAt(o.couple.artB, o.couple.glyphB || '✷', cx - overlap / 2, 6);
        // heart at the seam
        ctx.textAlign = 'center';
        ctx.fillStyle = o.accent;
        ctx.font = `700 ${Math.round(W * 0.085)}px ${sans}`;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = W * 0.02;
        ctx.fillText('♥', cx, artY + art * 0.98);
        ctx.restore();
        boxes.badge = { x: cx - art + overlap / 2, y: artY, w: art * 2 - overlap, h: art };
      }
    }

    // Flow uses BASE geometry so dragging one element never shoves the others.
    let yCursor = o.badge !== 'none' ? baseArtY + baseArt + W * 0.035 : pad * 0.9;

    // engine score (pairs only)
    if (!solo && o.couple.showScore && typeof o.couple.score === 'number') {
      const oS = off('score');
      const sx = baseCx + oS.dx;
      const sBase = yCursor + W * 0.04 + oS.dy;
      ctx.textAlign = 'center';
      ctx.fillStyle = o.accent;
      const scorePx = Math.round(W * 0.062 * oS.scale);
      ctx.font = `800 ${scorePx}px ${sans}`;
      ctx.fillText(`${o.couple.score}%`, sx, sBase);
      const sw = ctx.measureText(`${o.couple.score}%`).width;
      let sh = scorePx * 1.15;
      if (o.couple.chemistry) {
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = `600 ${Math.round(W * 0.026 * oS.scale)}px ${sans}`;
        ctx.fillText(`${o.couple.chemistry} chemistry — computed`, sx, sBase + W * 0.035);
        sh += W * 0.035;
      }
      boxes.score = { x: sx - Math.max(sw, W * 0.22) / 2, y: sBase - scorePx, w: Math.max(sw, W * 0.22), h: sh };
      yCursor += W * 0.1;
    }

    // centred title lockup (auto-fits the width)
    {
      const oT = off('title');
      const tx = baseCx + oT.dx;
      const tBase = yCursor + W * 0.045 + oT.dy;
      ctx.textAlign = 'center';
      ctx.fillStyle = o.textColor;
      const tPx = Math.round(
        fitFontPx(ctx, o.title || '', Math.round(W * 0.052 * o.titleScale), W - pad * 2, titleW, titleFam) * oT.scale,
      );
      ctx.font = `${titleW} ${tPx}px ${titleFam}`;
      if (o.hideEl !== 'title') ctx.fillText(o.title || '', tx, tBase);
      const tw = ctx.measureText(o.title || '').width;
      boxes.title = {
        x: tx - tw / 2, y: tBase - tPx, w: Math.max(tw, W * 0.1), h: tPx * 1.3,
        edit: { px: tPx, family: titleFam, weight: titleW, color: o.textColor, align: 'center', lineHeight: tPx * 1.25, anchorX: tx, maxW: W - pad * 2, baseline: tBase },
      };
    }
    headerBottom = yCursor + W * 0.075;
  } else if (o.badge !== 'none') {
    const baseArt = W * 0.165 * o.badgeScale;
    const baseArtY = pad * 0.7;
    const oB = off('badge');
    const art = baseArt * oB.scale;
    const drawBadgeAt = (baseX: number) => {
      const x = baseX + oB.dx + (baseArt - art) / 2;
      const yTop = baseArtY + oB.dy + (baseArt - art) / 2;
      if (o.badge === 'art' && o.signArt) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = W * 0.02;
        ctx.drawImage(o.signArt, x, yTop, art, art);
        ctx.restore();
      } else {
        // U+FE0E keeps the monochrome text glyph (Windows draws emoji otherwise).
        ctx.textAlign = 'left';
        ctx.fillStyle = o.accent;
        ctx.font = `600 ${Math.round(art * 0.72)}px ${serif}`;
        ctx.fillText((o.symbol || '✷') + '︎', x, yTop + art * 0.66);
      }
      boxes.badge = { x, y: yTop, w: art, h: art };
    };

    if (o.badgePos === 'center') {
      drawBadgeAt((W - baseArt) / 2);
      drawTitleBlock(W / 2, 'center', baseArtY + baseArt + W * 0.055, W - pad * 2);
      headerBottom = baseArtY + baseArt + W * 0.055 + W * 0.055;
    } else if (o.badgePos === 'right') {
      drawBadgeAt(W - pad - baseArt);
      drawTitleBlock(pad, 'left', pad + W * 0.072, W - pad * 2 - baseArt - W * 0.04);
      headerBottom = Math.max(baseArtY + baseArt, pad + W * 0.115) + W * 0.02;
    } else {
      drawBadgeAt(pad);
      drawTitleBlock(pad + baseArt + W * 0.04, 'left', pad + W * 0.072, W - pad * 2 - baseArt - W * 0.04);
      headerBottom = Math.max(baseArtY + baseArt, pad + W * 0.115) + W * 0.02;
    }
  } else {
    drawTitleBlock(o.align === 'center' ? W / 2 : pad, o.align === 'center' ? 'center' : 'left', pad + W * 0.062, W - pad * 2);
    headerBottom = pad + W * 0.115;
  }

  /* ── Quote block ── */
  // Auto-fit: the quote must never overflow its zone — shrink until it fits
  // between the header and the bottom furniture. A manual resize (offset
  // scale) is applied AFTER the fit, so the user can still override it.
  const bottomReserve = H - pad - (o.lucky ? W * 0.11 : W * 0.035);
  const availH = Math.max(W * 0.2, bottomReserve - headerBottom - W * 0.05);

  let qSize = Math.round(W * 0.062 * o.sizeMul * o.textScale);
  let lines: string[] = [];
  let lh = 0;
  for (let pass = 0; pass < 6; pass++) {
    ctx.font = `${o.quoteWeight} ${qSize}px ${serif}`;
    lines = wrapText(ctx, o.quote || '', W - pad * 2);
    lh = qSize * o.lineMul * o.lineScale;
    if (lines.length * lh <= availH || qSize <= W * 0.03) break;
    qSize = Math.max(Math.round(W * 0.03), Math.round(qSize * Math.sqrt(availH / (lines.length * lh)) * 0.98));
  }
  const oQ = off('quote');
  if (oQ.scale !== 1) {
    qSize = Math.max(Math.round(W * 0.022), Math.round(qSize * oQ.scale));
    ctx.font = `${o.quoteWeight} ${qSize}px ${serif}`;
    lines = wrapText(ctx, o.quote || '', W - pad * 2);
    lh = qSize * o.lineMul * o.lineScale;
  }
  const totalH = lines.length * lh;

  const anchorX = (o.align === 'center' ? W / 2 : o.align === 'right' ? W - pad : pad) + oQ.dx;
  ctx.textAlign = o.align;

  let y: number;
  if (o.textPos === 'top') y = headerBottom + W * 0.07 + qSize;
  else if (o.textPos === 'middle') y = Math.max(headerBottom + qSize, (H - totalH) / 2 + qSize * 0.8);
  else y = bottomReserve - totalH;
  y += oQ.dy;

  ctx.font = `${o.quoteWeight} ${qSize}px ${serif}`;
  ctx.fillStyle = o.textColor;
  let maxLineW = 0;
  const firstY = y;
  for (const ln of lines) {
    if (o.hideEl !== 'quote') ctx.fillText(ln, anchorX, y);
    maxLineW = Math.max(maxLineW, ctx.measureText(ln).width);
    y += lh;
  }
  if (o.quote) {
    const qx = o.align === 'center' ? anchorX - maxLineW / 2 : o.align === 'right' ? anchorX - maxLineW : anchorX;
    boxes.quote = {
      x: qx, y: firstY - qSize, w: Math.max(maxLineW, W * 0.1), h: totalH + qSize * 0.2,
      edit: { px: qSize, family: serif, weight: o.quoteWeight, color: o.textColor, align: o.align, lineHeight: lh, anchorX, maxW: W - pad * 2, baseline: firstY },
    };
  }

  /* ── Bottom furniture (lucky + footer swap sides away from the logo) ── */
  const logoAtBL = !!o.logo && o.logoPos === 'bl';
  const bottomAlign: CanvasTextAlign = logoAtBL ? 'right' : 'left';
  const baseBottomX = logoAtBL ? W - pad : pad;

  if (o.lucky) {
    const oL = off('lucky');
    const lx = baseBottomX + oL.dx;
    const lBase = H - pad - W * 0.045 + oL.dy;
    const luckyPx = Math.round(W * 0.03 * oL.scale);
    ctx.textAlign = bottomAlign;
    ctx.font = `600 ${luckyPx}px ${sans}`;
    ctx.fillStyle = o.accent;
    const luckyText = `Lucky ${o.lucky.number} · ${o.lucky.color}${o.lucky.chandrashtama ? '  ·  ⚠ Chandrashtama' : ''}`;
    ctx.fillText(luckyText, lx, lBase);
    const lw = ctx.measureText(luckyText).width;
    boxes.lucky = { x: bottomAlign === 'right' ? lx - lw : lx, y: lBase - luckyPx, w: lw, h: luckyPx * 1.3 };
  }
  {
    const oF = off('footer');
    const fx = baseBottomX + oF.dx;
    const fBase = H - pad + W * 0.005 + oF.dy;
    const footPx = Math.round(W * 0.028 * oF.scale);
    ctx.textAlign = bottomAlign;
    ctx.font = `500 ${footPx}px ${sans}`;
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    if (o.hideEl !== 'footer') ctx.fillText(o.footer, fx, fBase);
    if (o.footer) {
      const fw = ctx.measureText(o.footer).width;
      boxes.footer = {
        x: bottomAlign === 'right' ? fx - fw : fx, y: fBase - footPx, w: Math.max(fw, W * 0.06), h: footPx * 1.3,
        edit: { px: footPx, family: sans, weight: 500, color: 'rgba(255,255,255,.8)', align: bottomAlign, lineHeight: footPx * 1.3, anchorX: fx, maxW: W - pad * 2, baseline: fBase },
      };
    }
  }

  /* ── Logo (movable + resizable) ── */
  if (o.logo) {
    const oLg = off('logo');
    const lw = W * 0.13 * o.logoScale * oLg.scale;
    const lh2 = (o.logo.height / o.logo.width) * lw;
    const pos: Record<LogoPos, [number, number]> = {
      tl: [pad, pad * 0.65],
      tr: [W - pad - lw, pad * 0.65],
      bl: [pad, H - pad - lh2 + W * 0.01],
      br: [W - pad - lw, H - pad - lh2 + W * 0.01],
    };
    const [lx, ly] = pos[o.logoPos];
    ctx.drawImage(o.logo, lx + oLg.dx, ly + oLg.dy, lw, lh2);
    boxes.logo = { x: lx + oLg.dx, y: ly + oLg.dy, w: lw, h: lh2 };
  }

  return boxes;
}

/* ── AI quote persistence (per period window) ───────────────────────────── */

type GenQuotes = Record<string, { en: string; si: string }>;

const quotesKey = (p: Period) => `gc_img_quotes_${p}`;

function loadGenQuotes(p: Period, tag: string): GenQuotes {
  try {
    const raw = JSON.parse(localStorage.getItem(quotesKey(p)) || 'null');
    return raw && raw.tag === tag && raw.quotes ? raw.quotes : {};
  } catch {
    return {};
  }
}
function persistGenQuotes(p: Period, tag: string, quotes: GenQuotes) {
  try {
    localStorage.setItem(quotesKey(p), JSON.stringify({ tag, quotes }));
  } catch { /* quota — quotes are re-generatable */ }
}

/* ── Style persistence (the studio remembers your look) ─────────────────── */

const STYLE_KEY = 'gc_img_style_v3';

/* ── Collapsible group ──────────────────────────────────────────────────── */

function Group({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between bg-surface-2/50 px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-2 transition-colors hover:text-ink"
      >
        {title}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3.5 border-t border-line p-3">{children}</div>}
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <Field label={label} hint={fmt ? fmt(value) : `${Math.round(value * 100)}%`}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
    </Field>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

const ALL_SIGNS = Object.keys(SIGN_ART);

export default function ImagePostPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Engine data
  const [signs, setSigns] = useState<Sign[]>([]);
  const [period, setPeriod] = useState<Period>('daily');
  const [periodLabel, setPeriodLabel] = useState({ en: '', si: '', tag: '' });
  const [loadErr, setLoadErr] = useState('');

  // Selection & preview
  const [selected, setSelected] = useState<string[]>([...ALL_SIGNS]);
  const [previewSign, setPreviewSign] = useState<string>('Aries');

  // AI quotes — generated ONLY on button press.
  const [genQuotes, setGenQuotes] = useState<GenQuotes>({});
  const [genState, setGenState] = useState<{ status: 'idle' | 'generating' | 'error'; msg?: string }>({ status: 'idle' });

  // Couple posts
  const [postType, setPostType] = useState<PostType>('rashi');
  const [pairA, setPairA] = useState<PairSide>({ sign: 'Gemini', role: 'girlfriend' });
  const [pairB, setPairB] = useState<PairSide>({ sign: 'Aries', role: 'boyfriend' });
  const [matrix, setMatrix] = useState<Record<string, PairData> | null>(null);
  const [pairArts, setPairArts] = useState<{ a: HTMLImageElement | null; b: HTMLImageElement | null }>({ a: null, b: null });
  const [pairQuotes, setPairQuotes] = useState<Record<string, { en: string; si: string }>>({});
  const [showScore, setShowScore] = useState(true);

  // Copy
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [title, setTitle] = useState('');
  const [quoteDraft, setQuoteDraft] = useState('');
  const [footer, setFooter] = useState('grahachara.com');
  const [showLucky, setShowLucky] = useState(true);

  // Style & layout tools
  const [format, setFormat] = useState<keyof typeof FORMATS>('Portrait');
  const [textStyle, setTextStyle] = useState<TextStyleKey>('fraunces');
  const [titleStyle, setTitleStyle] = useState<'match' | TextStyleKey>('match');
  const [titleScale, setTitleScale] = useState(1);
  const [align, setAlign] = useState<Align>('left');
  const [textPos, setTextPos] = useState<TextPos>('bottom');
  const [textScale, setTextScale] = useState(1);
  const [lineScale, setLineScale] = useState(1);
  const [margin, setMargin] = useState(0.085);
  const [badge, setBadge] = useState<Badge>('art');
  const [badgePos, setBadgePos] = useState<BadgePos>('left');
  const [badgeScale, setBadgeScale] = useState(1);
  const [logoPos, setLogoPos] = useState<LogoPos>('br');
  const [logoScale, setLogoScale] = useState(1);
  const [textColor, setTextColor] = useState('#ffffff');
  const [accent, setAccent] = useState('#e3b84f');
  const [scrim, setScrim] = useState(0.6);

  // Imagery
  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [signArt, setSignArt] = useState<HTMLImageElement | null>(null);
  const [savedBgs, setSavedBgs] = useState<SavedBg[]>([]);
  const [bgSavedId, setBgSavedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zipping, setZipping] = useState(false);

  // Canva-style direct editing: per-element drag/resize deltas over the auto layout.
  const [offsets, setOffsets] = useState<Offsets>({});
  const [selectedEl, setSelectedEl] = useState<ElementId | null>(null);
  const [editingEl, setEditingEl] = useState<ElementId | null>(null);
  const [dateOverride, setDateOverride] = useState<string | null>(null); // canvas-edited date text (not persisted — dates go stale)
  const [boxes, setBoxes] = useState<Boxes>({});
  const boxesRef = useRef<Boxes>({});
  const dragRef = useRef<{
    mode: 'move' | 'resize';
    el: ElementId;
    startX: number;
    startY: number;
    start: ElOffset;
    startBox: Box;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  /* ── Boot ── */

  useEffect(() => {
    loadImg('/logo.png').then((img) => img && setLogo(img));
    listBgs().then(setSavedBgs);
    try {
      const pq = JSON.parse(localStorage.getItem('gc_pair_quotes_v1') || 'null');
      if (pq && typeof pq === 'object') setPairQuotes(pq);
    } catch { /* fresh */ }
    // Restore the saved look.
    try {
      const s = JSON.parse(localStorage.getItem(STYLE_KEY) || 'null');
      if (s) {
        if (s.format in FORMATS) setFormat(s.format);
        if (s.textStyle in TEXT_STYLES) setTextStyle(s.textStyle);
        if (s.titleStyle === 'match' || s.titleStyle in TEXT_STYLES) setTitleStyle(s.titleStyle);
        if (typeof s.titleScale === 'number') setTitleScale(s.titleScale);
        if (['left', 'center', 'right'].includes(s.align)) setAlign(s.align);
        if (['top', 'middle', 'bottom'].includes(s.textPos)) setTextPos(s.textPos);
        if (typeof s.textScale === 'number') setTextScale(s.textScale);
        if (typeof s.lineScale === 'number') setLineScale(s.lineScale);
        if (typeof s.margin === 'number') setMargin(s.margin);
        if (['art', 'symbol', 'none'].includes(s.badge)) setBadge(s.badge);
        if (['left', 'center', 'right'].includes(s.badgePos)) setBadgePos(s.badgePos);
        if (typeof s.badgeScale === 'number') setBadgeScale(s.badgeScale);
        if (['tl', 'tr', 'bl', 'br'].includes(s.logoPos)) setLogoPos(s.logoPos);
        if (typeof s.logoScale === 'number') setLogoScale(s.logoScale);
        if (s.textColor) setTextColor(s.textColor);
        if (s.accent) setAccent(s.accent);
        if (typeof s.scrim === 'number') setScrim(s.scrim);
        if (s.footer) setFooter(s.footer);
        if (s.offsets && typeof s.offsets === 'object') setOffsets(s.offsets);
      }
    } catch { /* fresh defaults */ }
  }, []);

  // Persist the look whenever it changes.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STYLE_KEY, JSON.stringify({
          format, textStyle, titleStyle, titleScale, align, textPos, textScale, lineScale, margin,
          badge, badgePos, badgeScale, logoPos, logoScale, textColor, accent, scrim, footer, offsets,
        }));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [format, textStyle, titleStyle, titleScale, align, textPos, textScale, lineScale, margin, badge, badgePos, badgeScale, logoPos, logoScale, textColor, accent, scrim, footer, offsets]);

  // REAL calculation for the chosen period.
  useEffect(() => {
    const url =
      period === 'daily'
        ? '/api/astro/api/marketing/rashi-daily'
        : `/api/astro/api/marketing/rashi-period?mode=${period}`;
    setLoadErr('');
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.signs?.length) { setLoadErr(d?.error || 'No data from engine'); return; }
        setSigns(d.signs);
        let label: { en: string; si: string; tag: string };
        if (period === 'daily') {
          const dt = d.date ? new Date(d.date) : new Date();
          label = { en: dt.toDateString(), si: dt.toDateString(), tag: d.date || 'today' };
        } else {
          label = { en: d.label || '', si: d.labelSi || d.label || '', tag: `${period}-${d.start || ''}` };
        }
        setPeriodLabel(label);
        setGenQuotes(loadGenQuotes(period, label.tag));
      })
      .catch((e) => setLoadErr(String(e?.message || e)));
  }, [period]);

  // Compatibility matrix — one request, only when persona/couple mode opens
  // (persona uses the self-pair for the sign's element).
  useEffect(() => {
    if (postType === 'rashi' || matrix) return;
    fetch('/api/astro/api/marketing/compatibility-matrix')
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.pairs)) return;
        const out: Record<string, PairData> = {};
        for (const p of d.pairs) {
          out[`${p.sign1}|${p.sign2}`] = p;
          out[`${p.sign2}|${p.sign1}`] = { ...p, element1: p.element2, element2: p.element1 };
        }
        setMatrix(out);
      })
      .catch(() => {});
  }, [postType, matrix]);

  // Pair sign arts.
  useEffect(() => {
    if (postType === 'rashi') return;
    let alive = true;
    Promise.all([loadImg(SIGN_ART[pairA.sign]), loadImg(SIGN_ART[pairB.sign])]).then(([a, b]) => {
      if (alive) setPairArts({ a, b });
    });
    return () => { alive = false; };
  }, [postType, pairA.sign, pairB.sign]);

  const sign = signs.find((s) => s.english === previewSign);
  const [W, H] = FORMATS[format];
  const dateText = postType !== 'rashi' ? '' : dateOverride ?? (lang === 'si' ? periodLabel.si : periodLabel.en);

  const pairKey =
    postType === 'persona'
      ? `solo:${pairA.sign}|${pairA.role}`
      : `${pairA.sign}|${pairA.role}|${pairB.sign}|${pairB.role}`;
  const pairData = matrix?.[`${pairA.sign}|${pairB.sign}`] || null;
  const personaElement = matrix?.[`${pairA.sign}|${pairA.sign}`]?.element1 || '';

  const coupleTitle = useCallback(
    (l: 'en' | 'si') =>
      postType === 'persona'
        ? l === 'si'
          ? `${SIGN_SI[pairA.sign]} ${roleOf(pairA.role).si}`
          : `${pairA.sign} ${roleOf(pairA.role).en}`
        : l === 'si'
          ? `${SIGN_SI[pairA.sign]} ${roleOf(pairA.role).si} + ${SIGN_SI[pairB.sign]} ${roleOf(pairB.role).si}`
          : `${pairA.sign} ${roleOf(pairA.role).en} × ${pairB.sign} ${roleOf(pairB.role).en}`,
    [postType, pairA, pairB],
  );

  const resolvePairQuote = useCallback(
    (l: 'en' | 'si'): string => {
      const g = pairQuotes[pairKey];
      if (g && (l === 'si' ? g.si : g.en)) return l === 'si' ? g.si : g.en;
      if (postType === 'persona') {
        const f = ELEMENT_PERSONA[personaElement];
        return f ? (l === 'si' ? f.si : f.en) : '';
      }
      if (!pairData) return '';
      return l === 'si' ? SI_CHEMISTRY[pairData.chemistry] || '' : pairData.description;
    },
    [pairQuotes, pairKey, pairData, postType, personaElement],
  );

  const resolveQuote = useCallback(
    (english: string, l: 'en' | 'si'): string => {
      const g = genQuotes[english];
      if (g && (l === 'si' ? g.si : g.en)) return l === 'si' ? g.si : g.en;
      const s = signs.find((x) => x.english === english);
      return s ? (l === 'si' ? s.quoteSi : s.quote) : '';
    },
    [genQuotes, signs],
  );

  useEffect(() => {
    if (postType !== 'rashi' || !sign) return;
    setTitle(lang === 'si' ? sign.sinhala : sign.english);
    setQuoteDraft(resolveQuote(sign.english, lang));
  }, [postType, sign, lang, resolveQuote]);

  // Persona/couple mode: title lockup + quote follow the pair, language and AI state.
  useEffect(() => {
    if (postType === 'rashi') return;
    setTitle(coupleTitle(lang));
    setQuoteDraft(resolvePairQuote(lang));
  }, [postType, lang, coupleTitle, resolvePairQuote]);

  // Illustrated art for the preview sign.
  useEffect(() => {
    if (badge !== 'art') { setSignArt(null); return; }
    const src = SIGN_ART[previewSign];
    if (!src) { setSignArt(null); return; }
    let alive = true;
    loadImg(src).then((img) => alive && setSignArt(img));
    return () => { alive = false; };
  }, [previewSign, badge]);

  /* ── Draw ── */

  const styleResolved = useMemo(() => {
    const st = TEXT_STYLES[textStyle];
    const tKey = titleStyle === 'match' ? textStyle : titleStyle;
    const ts = TEXT_STYLES[tKey];
    return {
      family: resolveFamily(textStyle),
      titleWeight: st.titleWeight,
      quoteWeight: st.quoteWeight,
      sizeMul: st.sizeMul,
      lineMul: st.lineMul,
      titleFamily: resolveFamily(tKey),
      titleFontWeight: ts.titleWeight,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textStyle, titleStyle]);

  /** The current post as renderPost options — shared by preview and exports. */
  const buildOpts = useCallback(
    (hide: ElementId | null): PostOpts => ({
      W, H, bg, logo, signArt,
      symbol: sign?.symbol || '✷',
      title, dateText, quote: quoteDraft, textColor, accent, scrim, footer,
      lucky: postType === 'rashi' && showLucky && sign ? { ...sign.lucky, chandrashtama: sign.chandrashtama } : null,
      ...styleResolved,
      titleScale,
      align, textPos, textScale, lineScale, margin,
      badge, badgePos, badgeScale, logoPos, logoScale,
      offsets,
      hideEl: hide,
      couple: postType !== 'rashi'
        ? {
            artA: pairArts.a,
            artB: postType === 'couple' ? pairArts.b : null,
            glyphA: SIGN_GLYPH[pairA.sign] || '✷',
            glyphB: postType === 'couple' ? SIGN_GLYPH[pairB.sign] || '✷' : undefined,
            useArt: badge !== 'symbol',
            score: pairData?.score,
            chemistry: pairData?.chemistry,
            showScore,
          }
        : undefined,
    }),
    [W, H, bg, logo, signArt, sign, title, dateText, quoteDraft, textColor, accent, scrim, footer, showLucky,
     styleResolved, titleScale, align, textPos, textScale, lineScale, margin, badge, badgePos, badgeScale, logoPos, logoScale,
     offsets, postType, pairArts, pairA.sign, pairB.sign, pairData, showScore],
  );

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const nextBoxes = renderPost(c, buildOpts(editingEl));
    boxesRef.current = nextBoxes;
    setBoxes(nextBoxes);
  }, [buildOpts, editingEl]);

  useEffect(() => {
    draw();
    // Web fonts load lazily — redraw once the picked family is actually ready.
    const spec = `${styleResolved.quoteWeight} 24px ${styleResolved.family}`;
    (document as any).fonts?.load?.(spec)?.then?.(() => draw()).catch?.(() => {});
  }, [draw, styleResolved]);

  /* ── Direct-manipulation editing (select · drag · resize on the canvas) ── */

  const pendingRef = useRef<{ el: ElementId; off: ElOffset } | null>(null);

  const toCanvasXY = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const hitTest = (x: number, y: number): ElementId | null => {
    const slack = W * 0.012;
    for (const id of EL_ZORDER) {
      const b = boxesRef.current[id];
      if (b && x >= b.x - slack && x <= b.x + b.w + slack && y >= b.y - slack && y <= b.y + b.h + slack) return id;
    }
    return null;
  };

  const scheduleOffset = (el: ElementId, next: ElOffset) => {
    pendingRef.current = { el, off: next };
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingRef.current;
      if (p) setOffsets((prev) => ({ ...prev, [p.el]: p.off }));
    });
  };

  function onWinMove(e: PointerEvent) {
    const d = dragRef.current;
    if (!d || !canvasRef.current) return;
    const { x, y } = toCanvasXY(e);
    if (d.mode === 'move') {
      scheduleOffset(d.el, { ...d.start, dx: d.start.dx + (x - d.startX), dy: d.start.dy + (y - d.startY) });
    } else {
      const delta = x - d.startX + (y - d.startY);
      const base = Math.max(d.startBox.w + d.startBox.h, 1);
      const scale = Math.min(3, Math.max(0.3, d.start.scale * (1 + delta / base)));
      scheduleOffset(d.el, { ...d.start, scale });
    }
  }
  function onWinUp() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onWinMove);
    window.removeEventListener('pointerup', onWinUp);
  }

  function beginDrag(el: ElementId, mode: 'move' | 'resize', x: number, y: number) {
    const box = boxesRef.current[el];
    if (!box) return;
    dragRef.current = {
      mode, el, startX: x, startY: y,
      start: { dx: 0, dy: 0, scale: 1, ...(offsets[el] || {}) },
      startBox: box,
    };
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
  }

  function onStagePointerDown(e: React.PointerEvent) {
    if (!canvasRef.current || e.button !== 0) return;
    const { x, y } = toCanvasXY(e);
    const hit = hitTest(x, y);
    if (editingEl && hit !== editingEl) closeEditor();
    setSelectedEl(hit);
    if (!hit || hit === editingEl) return;
    e.preventDefault();
    beginDrag(hit, 'move', x, y);
  }

  function onHandlePointerDown(e: React.PointerEvent) {
    if (!selectedEl) return;
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = toCanvasXY(e);
    beginDrag(selectedEl, 'resize', x, y);
  }

  function resetElement(el: ElementId) {
    setOffsets((prev) => {
      const n = { ...prev };
      delete n[el];
      return n;
    });
    if (el === 'date') setDateOverride(null);
  }

  /* ── In-place text editing (double-click a text element and type) ── */

  const textValueOf = (el: ElementId): string =>
    el === 'title' ? title : el === 'quote' ? quoteDraft : el === 'footer' ? footer : el === 'date' ? dateText : '';

  const setTextValueOf = (el: ElementId, v: string) => {
    if (el === 'title') setTitle(v);
    else if (el === 'quote') onQuoteEdit(v);
    else if (el === 'footer') setFooter(v);
    else if (el === 'date') setDateOverride(v);
  };

  function closeEditor() {
    setEditingEl(null);
    // An emptied date reverts to the computed one (hiding was never a thing).
    setDateOverride((d) => (d !== null && d.trim() === '' ? null : d));
  }

  function onStageDoubleClick(e: React.MouseEvent) {
    if (!canvasRef.current) return;
    const { x, y } = toCanvasXY(e);
    const hit = hitTest(x, y);
    if (!hit) return;
    if (EDITABLE.has(hit)) {
      setSelectedEl(hit);
      setEditingEl(hit);
    } else {
      resetElement(hit);
    }
  }

  // Escape: close the editor first, then deselect.
  useEffect(() => {
    if (!selectedEl && !editingEl) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingEl) closeEditor();
      else setSelectedEl(null);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEl, editingEl]);

  const hasOffsets = Object.keys(offsets).length > 0;

  /* ── AI generation (button-only — never automatic) ── */

  async function generateQuotes(fresh = false) {
    const targets = signs.filter((s) => selected.includes(s.english));
    if (targets.length === 0 || genState.status === 'generating') return;
    setGenState({ status: 'generating' });
    try {
      const facts = targets
        .map((s) => {
          const extra = period === 'daily'
            ? `verdict ${s.rating} (${s.score}); ${s.chandrashtama ? 'CHANDRASHTAMA rest-day; ' : ''}${s.sadeSati ? 'Sade Sati; ' : ''}${s.jupiterFavorable ? 'Jupiter favourable; ' : ''}engine says: "${s.quote}"`
            : `verdict ${s.rating} (${s.score}); ${s.goodDays}/${s.totalDays} bright days; best ${s.bestDay?.weekday || ''}${s.bestDay?.weekdaySi ? ` (${s.bestDay.weekdaySi})` : ''}${s.cautionDates?.length ? `; rest days ${s.cautionDates.join(', ')}` : ''}${s.sadeSati ? '; Sade Sati' : ''}${s.jupiterFavorable ? '; Jupiter favourable' : ''}; engine says: "${s.quote}"`;
          return `- ${s.english} (${SIGN_SI[s.english] || s.sinhala}): ${extra}`;
        })
        .join('\n');

      const periodGuide =
        period === 'daily'
          ? 'DAILY register: one concrete feel for the day + ONE actionable nudge tied to a moment ("before noon", "tonight", "when the message comes").'
          : period === 'weekly'
            ? 'WEEKLY register: the week is an arc — weave the computed peak day into the sentence naturally (English lines use the English day name, Sinhala lines use the Sinhala day name from the facts). If there is a rest day, protect it gently.'
            : 'MONTHLY register: the month is a chapter — name the computed best-window dates as plain numbers ("the 2nd to the 4th"). Caution dates stay soft and caring, never scary.';

      const prompt = `You voice ${period} astrology post quotes for Grahachara (Sri Lankan Vedic astrology app). Period: ${periodLabel.en}.

THE COMPUTED RESULTS (real ephemeris — the engine already decided every verdict):
${facts}

YOU ARE A VOICE, NOT AN ORACLE: rewrite each sign's message in a magnetic, personal register — every claim MUST match that sign's computed verdict and facts. Never invent transits, dates or outcomes not listed. A caution/rest note must stay in (gently).

${periodGuide}

${ENGLISH_READING_VOICE}
- Keep each reading 16-32 words; it MUST carry one concrete detail from that sign's facts (day name, date window, bright-day count).

SINHALA VOICE (NOT a translation — write natively):
${SINHALA_VOICE}

${fresh ? `Give a completely fresh wording, different from any previous phrasing (seed ${Date.now()}).\n` : ''}Return JSON exactly: {"items":[{"sign":"<English sign name>","english":"...","sinhala":"..."} x ${targets.length}]}`;

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const items: any[] = Array.isArray(data.result?.items) ? data.result.items : [];
      if (!items.length) throw new Error('Model returned no quotes — try again.');

      const matchSign = (raw: string): string | undefined => {
        const low = raw.toLowerCase();
        return ALL_SIGNS.find(
          (n) => low.includes(n.toLowerCase()) || (SIGN_SI[n] && raw.includes(SIGN_SI[n])),
        );
      };
      const next: GenQuotes = { ...genQuotes };
      let mapped = 0;
      items.forEach((it, idx) => {
        const name =
          matchSign(String(it.sign || '')) ||
          (items.length === targets.length ? targets[idx].english : undefined);
        if (name && (it.english || it.sinhala)) {
          next[name] = { en: String(it.english || '').trim(), si: String(it.sinhala || '').trim() };
          mapped += 1;
        }
      });
      if (mapped === 0) throw new Error('Could not map the model output to signs — try again.');
      setGenQuotes(next);
      persistGenQuotes(period, periodLabel.tag, next);
      setGenState({ status: 'idle' });
      addHistory('image', `AI quotes — ${targets.length} sign${targets.length > 1 ? 's' : ''}`, `${period} · Gemini + real calc`);
    } catch (err: any) {
      setGenState({ status: 'error', msg: err.message || 'Generation failed' });
    }
  }

  /** Couple quote — Gemini voices the ENGINE's computed chemistry, on demand. */
  async function generateCouple(fresh = false) {
    if (!pairData || genState.status === 'generating') return;
    setGenState({ status: 'generating' });
    try {
      const a = pairA, b = pairB;
      const prompt = `You voice a couple-compatibility post quote for Grahachara (Sri Lankan Vedic astrology app).

THE COMPUTED PAIR (real engine calculation — do not change the verdict):
${a.sign} ${roleOf(a.role).en} (${SIGN_SI[a.sign]} ${roleOf(a.role).si}) + ${b.sign} ${roleOf(b.role).en} (${SIGN_SI[b.sign]} ${roleOf(b.role).si})
Elements: ${pairData.element1} + ${pairData.element2} · Score: ${pairData.score}/100 · Chemistry: ${pairData.chemistry}
Engine says: "${pairData.description}"

REGISTER — the viral couple-page post (tag-your-person energy, spoken to the two of them):
- The verdict MUST match the computed chemistry band: High → celebrate the ease; Moderate → name the growth honestly, with warmth; Challenging → honest but loving (magnetic friction that builds, never doom).
- Mention their roles naturally (a ${roleOf(a.role).en.toLowerCase()} and her/his ${roleOf(b.role).en.toLowerCase()} — playful, warm, never crude).

${ENGLISH_READING_VOICE}
- ENGLISH: 18-34 words, spoken to the couple ("you two"), one concrete image of them together (a shared meal, a long call, a quiet ride).

SINHALA (NOT a translation — write natively, couple register, "ඔබ දෙදෙනා"):
${SINHALA_VOICE}
Calibre: "${SIGN_SI[a.sign]} ${roleOf(a.role).si}යි ${SIGN_SI[b.sign]} ${roleOf(b.role).si}යි එකතු වුණාම — රණ්ඩුවක් වුණත් විනාඩි පහයි. ඒ තරමට ම හිත ළඟයි."

${fresh ? `Give a completely fresh wording, different from any previous phrasing (seed ${Date.now()}).\n` : ''}Return JSON exactly: {"items":[{"english":"...","sinhala":"..."}]}`;

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const it = data.result?.items?.[0];
      if (!it || (!it.english && !it.sinhala)) throw new Error('Model returned no quote — try again.');

      const next = { ...pairQuotes, [pairKey]: { en: String(it.english || '').trim(), si: String(it.sinhala || '').trim() } };
      setPairQuotes(next);
      try { localStorage.setItem('gc_pair_quotes_v1', JSON.stringify(next)); } catch { /* ignore */ }
      setGenState({ status: 'idle' });
      addHistory('image', `Couple quote — ${a.sign} × ${b.sign}`, `${pairData.score} · Gemini + real calc`);
    } catch (err: any) {
      setGenState({ status: 'error', msg: err.message || 'Generation failed' });
    }
  }

  /** Persona quote — a single sign+role archetype, grounded in the sign's real element & lord. */
  async function generatePersona(fresh = false) {
    if (genState.status === 'generating') return;
    setGenState({ status: 'generating' });
    try {
      const a = pairA;
      const element = personaElement || 'fire';
      const prompt = `You voice a single-persona astrology post for Grahachara (Sri Lankan Vedic astrology app).

THE PERSONA (grounded in the real sign data — this is an archetype post, NOT a prediction):
${a.sign} ${roleOf(a.role).en} (${SIGN_SI[a.sign]} ${roleOf(a.role).si}) — element ${element}, rashi lord ${RASHI_LORD[a.sign]}.

REGISTER — the viral "${a.sign} ${roleOf(a.role).en} be like" persona post (tag-yourself energy):
- Describe HOW this persona loves/behaves — traits only, never future events or predictions.
- Traits must grow from the element (${element}) and lord (${RASHI_LORD[a.sign]}): fire=bold/impulsive warmth, earth=steady/loyal, air=witty/talkative/light, water=deep-feeling/remembers everything.
- Warm teasing, lovable flaws included — the reader should smile and tag someone.

${ENGLISH_READING_VOICE}
- ENGLISH: 16-30 words, third person about "the ${a.sign.toLowerCase()} ${roleOf(a.role).en.toLowerCase()}", one concrete everyday image (texts back, remembers dates, wins arguments).

SINHALA (NOT a translation — write natively, persona-page register):
${SINHALA_VOICE}
Calibre: "${SIGN_SI[a.sign]} ${roleOf(a.role).si} — රණ්ඩු කරලා විනාඩි පහෙන් හිනා වෙන, ආදරේ නම් මුළු ලෝකෙටම පෙන්නන කෙනෙක්."

${fresh ? `Give a completely fresh wording, different from any previous phrasing (seed ${Date.now()}).\n` : ''}Return JSON exactly: {"items":[{"english":"...","sinhala":"..."}]}`;

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const it = data.result?.items?.[0];
      if (!it || (!it.english && !it.sinhala)) throw new Error('Model returned no quote — try again.');

      const next = { ...pairQuotes, [pairKey]: { en: String(it.english || '').trim(), si: String(it.sinhala || '').trim() } };
      setPairQuotes(next);
      try { localStorage.setItem('gc_pair_quotes_v1', JSON.stringify(next)); } catch { /* ignore */ }
      setGenState({ status: 'idle' });
      addHistory('image', `Persona quote — ${a.sign} ${roleOf(a.role).en}`, 'Gemini + sign element');
    } catch (err: any) {
      setGenState({ status: 'error', msg: err.message || 'Generation failed' });
    }
  }

  function onQuoteEdit(text: string) {
    setQuoteDraft(text);
    if (postType !== 'rashi') {
      const existing = pairQuotes[pairKey] || { en: resolvePairQuote('en'), si: resolvePairQuote('si') };
      const next = { ...pairQuotes, [pairKey]: { ...existing, [lang === 'si' ? 'si' : 'en']: text } };
      setPairQuotes(next);
      try { localStorage.setItem('gc_pair_quotes_v1', JSON.stringify(next)); } catch { /* ignore */ }
      return;
    }
    if (!sign) return;
    const existing = genQuotes[sign.english] || { en: sign.quote, si: sign.quoteSi };
    const next = { ...genQuotes, [sign.english]: { ...existing, [lang === 'si' ? 'si' : 'en']: text } };
    setGenQuotes(next);
    persistGenQuotes(period, periodLabel.tag, next);
  }

  /* ── Imagery handlers ── */

  async function onBg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setBg(await fileToImage(f)); setBgSavedId(null); }
    e.target.value = '';
  }
  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setLogo(await fileToImage(f));
    e.target.value = '';
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
    if (f) { setBg(await fileToImage(f)); setBgSavedId(null); }
  }
  async function saveCurrentBg() {
    if (!bg || bgSavedId) return;
    const item = await saveBg(`bg-${new Date().toISOString().slice(0, 10)}`, bg);
    setSavedBgs(await listBgs());
    setBgSavedId(item.id);
  }
  async function applySavedBg(b: SavedBg) {
    const img = await loadImg(b.dataUrl);
    if (img) { setBg(img); setBgSavedId(b.id); }
  }
  async function removeSavedBg(id: string) {
    await deleteBg(id);
    setSavedBgs(await listBgs());
    if (bgSavedId === id) setBgSavedId(null);
  }

  /* ── Downloads ── */

  function downloadPng() {
    const c = canvasRef.current;
    if (!c) return;
    // If the in-place editor is open, repaint with every element visible first —
    // otherwise the element being typed would be missing from the PNG.
    if (editingEl) {
      renderPost(c, buildOpts(null));
      setEditingEl(null);
    }
    c.toBlob((blob) => {
      if (!blob) return;
      const base =
        postType === 'couple'
          ? `grahachara-couple-${pairA.sign}-${pairA.role}-${pairB.sign}-${pairB.role}`
          : postType === 'persona'
            ? `grahachara-${pairA.sign}-${pairA.role}`
            : `grahachara-${title || 'post'}-${periodLabel.tag || 'today'}`;
      downloadBlob(blob, `${base}.png`.replace(/\s+/g, '-').toLowerCase());
      addHistory(
        'image',
        postType === 'couple'
          ? `Couple post — ${pairA.sign} × ${pairB.sign}`
          : postType === 'persona'
            ? `Persona post — ${pairA.sign} ${roleOf(pairA.role).en}`
            : `Post — ${sign?.english || title || 'custom'}`,
        `${postType === 'couple' ? `score ${pairData?.score ?? '—'}` : postType === 'persona' ? personaElement : period} · ${format} · ${lang === 'si' ? 'සිංහල' : 'English'}`,
      );
    }, 'image/png');
  }

  async function downloadZip() {
    const targets = signs.filter((s) => selected.includes(s.english));
    if (!targets.length) return;
    setZipping(true);
    try {
      // Make sure the picked font is loaded before offscreen renders.
      await (document as any).fonts?.load?.(`${styleResolved.quoteWeight} 24px ${styleResolved.family}`)?.catch?.(() => {});
      const zip = new JSZip();
      const off = document.createElement('canvas');
      for (const s of targets) {
        const art = badge === 'art' && SIGN_ART[s.english] ? await loadImg(SIGN_ART[s.english]) : null;
        renderPost(off, {
          W, H, bg, logo,
          signArt: art,
          symbol: s.symbol,
          title: lang === 'si' ? s.sinhala : s.english,
          dateText,
          quote: resolveQuote(s.english, lang),
          textColor, accent, scrim, footer,
          lucky: showLucky ? { ...s.lucky, chandrashtama: s.chandrashtama } : null,
          ...styleResolved,
          titleScale,
          align, textPos, textScale, lineScale, margin,
          badge, badgePos, badgeScale, logoPos, logoScale,
          offsets,
        });
        const blob: Blob | null = await new Promise((res) => off.toBlob(res, 'image/png'));
        if (blob) zip.file(`${s.english.toLowerCase()}.png`, blob);
      }
      const bundle = await zip.generateAsync({ type: 'blob' });
      downloadBlob(bundle, `grahachara-${period}-posts-${periodLabel.tag || 'today'}-${format.toLowerCase()}.zip`);
      addHistory('image', `Post pack — ${targets.length} signs`, `${period} · ${format} · ${lang === 'si' ? 'සිංහල' : 'English'}`);
      draw();
    } finally {
      setZipping(false);
    }
  }

  /* ── UI ── */

  const nSelected = selected.length;
  const hasAnyGen = Object.keys(genQuotes).length > 0;
  const quoteSource =
    postType !== 'rashi'
      ? pairQuotes[pairKey]
        ? 'AI · editable'
        : `engine ${postType === 'couple' ? 'chemistry' : 'element'} — generate for AI voice`
      : sign && genQuotes[sign.english]
        ? 'AI · editable'
        : 'engine calc — generate for AI voice';

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Generator · 02"
          title="Image posts"
          description="Real ephemeris calculation → Gemini voices it on demand. One sign or all twelve, daily · weekly · monthly."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[360px,1fr]">
          {/* ── Live preview (first on mobile, right column on desktop) ── */}
          <div className="rise order-first lg:order-last lg:sticky lg:top-8" style={{ ['--i' as any]: 5 }}>
            {postType === 'rashi' && selected.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {selected.map((name) => (
                  <button
                    key={name}
                    onClick={() => setPreviewSign(name)}
                    title={name}
                    className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-medium transition-all ${
                      previewSign === name ? 'border-accent/70 bg-accent-glow text-accent-ink' : 'border-line text-ink-3 hover:text-ink'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SIGN_ART[name]} alt="" className="h-5 w-5 rounded-full object-cover" />
                    {name.slice(0, 3)}
                    {genQuotes[name] && <Sparkles size={9} className="text-gold" />}
                  </button>
                ))}
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`grid place-items-center rounded-2xl border bg-surface p-4 transition-colors sm:p-8 ${
                dragOver ? 'border-accent/70 bg-accent-glow' : 'border-line'
              }`}
            >
              {signs.length === 0 && loadErr && !title ? (
                <EmptyState
                  icon={ImageIcon}
                  title="Engine offline"
                  hint="Live per-sign data isn't available — type a custom title & quote to design anyway."
                />
              ) : (
                <div
                  className="relative w-full select-none"
                  style={{ maxWidth: format === 'Story' ? 320 : 420, touchAction: 'none' }}
                  onPointerDown={onStagePointerDown}
                  onDoubleClick={onStageDoubleClick}
                >
                  <canvas
                    ref={canvasRef}
                    className="h-auto w-full cursor-pointer rounded-xl border border-line shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                  />
                  {selectedEl && boxes[selectedEl] && (() => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    const sc = rect && rect.width > 0 ? rect.width / W : 0;
                    if (!sc) return null;
                    const b = boxes[selectedEl]!;
                    const editable = EDITABLE.has(selectedEl);
                    return (
                      <div
                        className="pointer-events-none absolute"
                        style={{ left: b.x * sc, top: b.y * sc, width: b.w * sc, height: b.h * sc }}
                      >
                        <div className="absolute -inset-1 cursor-move rounded border-2 border-dashed border-accent" />
                        <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-accent px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#0b0918]">
                          {EL_LABEL[selectedEl]}{editable ? ' · dbl-click to edit text' : ' · drag to move'}
                        </span>
                        <button
                          onPointerDown={onHandlePointerDown}
                          title="Drag to resize"
                          className="pointer-events-auto absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-bg bg-accent shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                        />
                        {editable && !editingEl && (
                          <button
                            onClick={() => setEditingEl(selectedEl)}
                            onPointerDown={(e) => e.stopPropagation()}
                            title="Edit text"
                            className="pointer-events-auto absolute -left-2 -top-2 grid h-4 w-4 place-items-center rounded-full border border-bg bg-accent text-[9px] leading-none text-[#0b0918]"
                          >
                            ✎
                          </button>
                        )}
                        <button
                          onClick={() => resetElement(selectedEl)}
                          onPointerDown={(e) => e.stopPropagation()}
                          title="Reset this element to auto layout"
                          className="pointer-events-auto absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full border border-bg bg-surface-2 text-[10px] leading-none text-ink-2 hover:text-ink"
                        >
                          ↺
                        </button>
                      </div>
                    );
                  })()}
                  {/* In-place editor — a transparent textarea sitting exactly on
                      the text, in its real font/size/colour. The canvas text is
                      hidden meanwhile, so you type on the post itself. */}
                  {editingEl && boxes[editingEl]?.edit && (() => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    const sc = rect && rect.width > 0 ? rect.width / W : 0;
                    if (!sc) return null;
                    const m = boxes[editingEl]!.edit!;
                    const left = (m.align === 'center' ? m.anchorX - m.maxW / 2 : m.align === 'right' ? m.anchorX - m.maxW : m.anchorX) * sc;
                    // The first line's box top: baseline sits at ~0.5*(lh - px) + 0.8*px inside it.
                    const top = (m.baseline - (m.lineHeight - m.px) / 2 - m.px * 0.8) * sc;
                    const rows = editingEl === 'quote' ? Math.max(2, (textValueOf(editingEl).match(/\n/g)?.length ?? 0) + 3) : 1;
                    return (
                      <textarea
                        autoFocus
                        spellCheck={false}
                        value={textValueOf(editingEl)}
                        onChange={(e) => setTextValueOf(editingEl, e.target.value)}
                        onBlur={closeEditor}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (editingEl !== 'quote' || !e.shiftKey)) { e.preventDefault(); closeEditor(); }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="absolute z-20 resize-none overflow-hidden rounded-[3px] border border-dashed border-accent bg-accent-glow p-0 focus:outline-none"
                        style={{
                          left,
                          top,
                          width: m.maxW * sc,
                          height: m.lineHeight * sc * rows,
                          fontFamily: m.family,
                          fontWeight: m.weight,
                          fontSize: m.px * sc,
                          lineHeight: `${m.lineHeight * sc}px`,
                          color: m.color,
                          textAlign: m.align as any,
                          caretColor: 'var(--accent)',
                        }}
                      />
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="text-center font-mono text-[10.5px] tabular-nums text-ink-3">
                {W} × {H}px · click any element to select · drag to move · corner to resize · double-click resets
              </p>
              {hasOffsets && (
                <button
                  onClick={() => { setOffsets({}); setSelectedEl(null); }}
                  className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[10px] font-medium text-warn transition-colors hover:brightness-125"
                >
                  ↺ Reset layout
                </button>
              )}
            </div>
          </div>

          {/* ── Config rail ── */}
          <div className="rise space-y-4" style={{ ['--i' as any]: 4 }}>
            <Panel
              title="Content"
              aside={
                postType === 'couple'
                  ? pairData && (
                      <span className="font-mono text-[10.5px] tabular-nums text-gold">
                        {pairData.score} · {pairData.chemistry}
                      </span>
                    )
                  : postType === 'persona'
                    ? personaElement && <span className="font-mono text-[10.5px] text-gold">{personaElement} · {RASHI_LORD[pairA.sign]}</span>
                    : sign && <span className="font-mono text-[10.5px] tabular-nums text-ink-3">{sign.rating} ({sign.score})</span>
              }
            >
              {loadErr && (
                <p className="mb-3 rounded-lg border border-[rgba(224,101,95,0.3)] bg-[rgba(224,101,95,0.08)] px-3 py-2 text-[11.5px] text-danger">
                  Engine fetch failed: {loadErr}
                </p>
              )}

              <Field label="Post type">
                <div className="flex gap-1.5">
                  <Chip active={postType === 'rashi'} onClick={() => setPostType('rashi')} className="flex-1 text-center">
                    Rashi
                  </Chip>
                  <Chip active={postType === 'persona'} onClick={() => setPostType('persona')} className="flex-1 text-center">
                    Persona
                  </Chip>
                  <Chip active={postType === 'couple'} onClick={() => setPostType('couple')} className="flex flex-1 items-center justify-center gap-1.5">
                    <Heart size={11} /> Couple
                  </Chip>
                </div>
              </Field>

              {postType !== 'rashi' ? (
                <div className="mt-4 space-y-3">
                  {(postType === 'couple'
                    ? ([['Person 1', pairA, setPairA], ['Person 2', pairB, setPairB]] as Array<[string, PairSide, (v: PairSide) => void]>)
                    : ([['Who is this about?', pairA, setPairA]] as Array<[string, PairSide, (v: PairSide) => void]>)
                  ).map(([label, side, setSide]) => (
                    <Field key={label} label={label}>
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={SIGN_ART[side.sign]} alt={side.sign} className="h-10 w-10 shrink-0 rounded-full border border-line-strong object-cover" />
                        <Select
                          value={side.sign}
                          onChange={(e) => setSide({ ...side, sign: e.target.value })}
                          className="flex-1"
                        >
                          {ALL_SIGNS.map((s) => (
                            <option key={s} value={s}>{s} · {SIGN_SI[s]}</option>
                          ))}
                        </Select>
                        <Select
                          value={side.role}
                          onChange={(e) => setSide({ ...side, role: e.target.value as RoleKey })}
                          className="flex-1"
                        >
                          {ROLES.map((r) => (
                            <option key={r.key} value={r.key}>{r.en} · {r.si}</option>
                          ))}
                        </Select>
                      </div>
                    </Field>
                  ))}
                  <div className="flex gap-2">
                    {postType === 'couple' && (
                      <button
                        onClick={() => { const a = pairA; setPairA(pairB); setPairB(a); }}
                        className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[11.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <ArrowLeftRight size={12} /> Swap
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const pick = () => ALL_SIGNS[Math.floor(Math.random() * 12)];
                        setPairA({ sign: pick(), role: pairA.role });
                        if (postType === 'couple') setPairB({ sign: pick(), role: pairB.role });
                      }}
                      className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line text-[11.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Dices size={12} /> Shuffle
                    </button>
                  </div>
                  {postType === 'couple' && pairData && (
                    <p className="font-mono text-[10.5px] text-gold">
                      ✦ engine: {pairData.score}/100 · {pairData.chemistry} chemistry · {pairData.element1} + {pairData.element2}
                    </p>
                  )}
                  {postType === 'persona' && personaElement && (
                    <p className="font-mono text-[10.5px] text-gold">
                      ✦ engine: {pairA.sign} — {personaElement} element · lord {RASHI_LORD[pairA.sign]}
                    </p>
                  )}
                </div>
              ) : (
                <>
              <div className="mt-4">
              <Field label="Period">
                <div className="flex gap-1.5">
                  {PERIODS.map((p) => (
                    <Chip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)} className="flex-1 text-center">
                      {p.label}
                    </Chip>
                  ))}
                </div>
              </Field>
              </div>
              {periodLabel.en && (
                <p className="mt-2 font-mono text-[10.5px] text-gold">✦ {periodLabel.en} · computed from the ephemeris</p>
              )}

              <div className="mt-4">
                <Field label={`Signs — ${nSelected} selected`}>
                  <div className="mb-1.5 flex gap-2">
                    <button onClick={() => setSelected([...ALL_SIGNS])} className="text-[11px] font-medium text-accent-ink hover:brightness-125">All 12</button>
                    <span className="text-ink-3">·</span>
                    <button onClick={() => setSelected(sign ? [sign.english] : [])} className="text-[11px] font-medium text-ink-3 hover:text-ink">Just previewed</button>
                    <span className="text-ink-3">·</span>
                    <button onClick={() => setSelected([])} className="text-[11px] font-medium text-ink-3 hover:text-ink">None</button>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {ALL_SIGNS.map((name) => {
                      const isSel = selected.includes(name);
                      const isPrev = previewSign === name;
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setPreviewSign(name);
                            setSelected((prev) => (prev.includes(name) ? prev : [...prev, name]));
                          }}
                          onDoubleClick={() => setSelected((prev) => prev.filter((s) => s !== name))}
                          title={`${name} — click to preview & include, double-click to exclude`}
                          className={`relative flex h-11 items-center justify-center rounded-lg border transition-all duration-150 active:scale-[0.95] ${
                            isPrev ? 'border-accent bg-accent-glow' : isSel ? 'border-line-strong' : 'border-line opacity-40'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={SIGN_ART[name]} alt={name} className="h-8 w-8 rounded-full object-cover" />
                          {isSel && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-ink-3">Click = preview + include · double-click = exclude</p>
                </Field>
              </div>
              </>
              )}

              <div className="mt-4">
                <Field label="Language">
                  <div className="flex gap-1.5">
                    {(['en', 'si'] as const).map((l) => (
                      <Chip key={l} active={lang === l} onClick={() => setLang(l)} className="flex-1 text-center">
                        {l === 'en' ? 'English' : 'සිංහල'}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="mt-4 flex gap-2">
                <Btn
                  variant="primary"
                  size="md"
                  className="flex-1"
                  disabled={
                    genState.status === 'generating' ||
                    (postType === 'couple' ? !pairData : postType === 'persona' ? false : nSelected === 0 || signs.length === 0)
                  }
                  onClick={() =>
                    postType === 'couple' ? generateCouple(false) : postType === 'persona' ? generatePersona(false) : generateQuotes(false)
                  }
                >
                  <Sparkles size={14} className={genState.status === 'generating' ? 'animate-pulse' : ''} />
                  {genState.status === 'generating'
                    ? 'Writing…'
                    : postType === 'couple'
                      ? 'Generate couple quote with AI'
                      : postType === 'persona'
                        ? `Generate ${pairA.sign} ${roleOf(pairA.role).en} with AI`
                        : `Generate ${nSelected} with AI`}
                </Btn>
                {(postType !== 'rashi' ? !!pairQuotes[pairKey] : hasAnyGen) && (
                  <Btn
                    variant="ghost"
                    size="md"
                    title="Re-generate a fresh wording"
                    disabled={genState.status === 'generating' || (postType === 'couple' ? !pairData : postType === 'rashi' && nSelected === 0)}
                    onClick={() =>
                      postType === 'couple' ? generateCouple(true) : postType === 'persona' ? generatePersona(true) : generateQuotes(true)
                    }
                  >
                    <RefreshCw size={13} className={genState.status === 'generating' ? 'animate-spin' : ''} />
                  </Btn>
                )}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-ink-3">
                Gemini · grounded in {postType === 'couple' ? 'the computed chemistry score' : postType === 'persona' ? "the sign's element & lord" : `the real ${period} calculation`} · runs only when you press it
              </p>
              {genState.status === 'error' && (
                <p className="mt-2 rounded-lg border border-[rgba(224,101,95,0.3)] bg-[rgba(224,101,95,0.08)] px-3 py-2 text-[11.5px] text-danger">
                  {genState.msg}
                </p>
              )}
            </Panel>

            <Panel title="Copy">
              <div className="space-y-3.5">
                <Field label="Title">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Quote" hint={quoteSource}>
                  <textarea value={quoteDraft} onChange={(e) => onQuoteEdit(e.target.value)} rows={4} className={`${inputCls} resize-y leading-relaxed`} />
                </Field>
                <Field label="Footer">
                  <input value={footer} onChange={(e) => setFooter(e.target.value)} className={inputCls} />
                </Field>
                {postType === 'couple' && (
                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                    <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-3.5 w-3.5 accent-[#8b7cff]" />
                    Show the computed score on the post
                  </label>
                )}
                {postType === 'rashi' && (
                  <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
                    <input type="checkbox" checked={showLucky} onChange={(e) => setShowLucky(e.target.checked)} className="h-3.5 w-3.5 accent-[#8b7cff]" />
                    Show lucky number + colour
                  </label>
                )}
              </div>
            </Panel>

            <Panel title="Design" pad={false}>
              <div className="space-y-2.5 p-3">
                <Group title="Layout" defaultOpen>
                  <Field label="Format">
                    <div className="flex gap-1.5">
                      {Object.keys(FORMATS).map((f) => (
                        <Chip key={f} active={format === f} onClick={() => setFormat(f as any)} className="flex-1 text-center">
                          {f}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Text position">
                    <div className="flex gap-1.5">
                      {(['top', 'middle', 'bottom'] as TextPos[]).map((p) => (
                        <Chip key={p} active={textPos === p} onClick={() => setTextPos(p)} className="flex-1 text-center capitalize">
                          {p}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Field label="Text alignment">
                    <div className="flex gap-1.5">
                      {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as Array<[Align, any]>).map(([a, Icon]) => (
                        <Chip key={a} active={align === a} onClick={() => setAlign(a)} className="flex flex-1 items-center justify-center">
                          <Icon size={14} />
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Slider label="Margins" value={margin} min={0.05} max={0.14} step={0.005} onChange={setMargin} fmt={(v) => `${Math.round(v * 1000) / 10}%`} />
                </Group>

                <Group title="Typography" defaultOpen>
                  <Field label="Font style">
                    <div className="grid grid-cols-2 gap-1.5">
                      {(Object.keys(TEXT_STYLES) as TextStyleKey[]).map((k) => (
                        <Chip key={k} active={textStyle === k} onClick={() => setTextStyle(k)} className="text-center">
                          <span style={{ fontFamily: `var(${TEXT_STYLES[k].varName})` }} className="text-[13px]">
                            {TEXT_STYLES[k].label}
                          </span>
                        </Chip>
                      ))}
                    </div>
                  </Field>
                  <Slider label="Text size" value={textScale} min={0.7} max={1.4} step={0.05} onChange={setTextScale} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Line spacing" value={lineScale} min={0.85} max={1.3} step={0.05} onChange={setLineScale} fmt={(v) => `${Math.round(v * 100)}%`} />

                  <Field label="Title font">
                    <Select value={titleStyle} onChange={(e) => setTitleStyle(e.target.value as 'match' | TextStyleKey)}>
                      <option value="match">Match text style</option>
                      {(Object.keys(TEXT_STYLES) as TextStyleKey[]).map((k) => (
                        <option key={k} value={k}>{TEXT_STYLES[k].label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Slider label="Title size" value={titleScale} min={0.6} max={1.6} step={0.05} onChange={setTitleScale} fmt={(v) => `${Math.round(v * 100)}%`} />
                </Group>

                <Group title="Sign badge & logo">
                  {postType !== 'rashi' ? (
                    <>
                      <Field label="Sign style">
                        <div className="flex gap-1.5">
                          <Chip active={badge !== 'symbol' && badge !== 'none'} onClick={() => setBadge('art')} className="flex-1 text-center">Illustrated</Chip>
                          <Chip active={badge === 'symbol'} onClick={() => setBadge('symbol')} className="flex-1 text-center">Symbol ♌︎</Chip>
                          <Chip active={badge === 'none'} onClick={() => setBadge('none')} className="flex-1 text-center">None</Chip>
                        </div>
                      </Field>
                      {badge !== 'none' && (
                        <Slider label="Art size" value={badgeScale} min={0.6} max={1.4} step={0.05} onChange={setBadgeScale} fmt={(v) => `${Math.round(v * 100)}%`} />
                      )}
                    </>
                  ) : (
                    <>
                      <Field label="Sign badge">
                        <div className="flex gap-1.5">
                          <Chip active={badge === 'art'} onClick={() => setBadge('art')} className="flex-1 text-center">Illustrated</Chip>
                          <Chip active={badge === 'symbol'} onClick={() => setBadge('symbol')} className="flex-1 text-center">Symbol ♌︎</Chip>
                          <Chip active={badge === 'none'} onClick={() => setBadge('none')} className="flex-1 text-center">None</Chip>
                        </div>
                      </Field>
                      {badge !== 'none' && (
                        <>
                          <Field label="Badge position">
                            <div className="flex gap-1.5">
                              {(['left', 'center', 'right'] as BadgePos[]).map((p) => (
                                <Chip key={p} active={badgePos === p} onClick={() => setBadgePos(p)} className="flex-1 text-center capitalize">
                                  {p}
                                </Chip>
                              ))}
                            </div>
                          </Field>
                          <Slider label="Badge size" value={badgeScale} min={0.6} max={1.6} step={0.05} onChange={setBadgeScale} fmt={(v) => `${Math.round(v * 100)}%`} />
                        </>
                      )}
                    </>
                  )}

                  <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
                  <Field label="Logo">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
                      >
                        <Upload size={12} /> {logo ? 'Replace' : 'Upload'}
                      </button>
                      {logo && (
                        <button
                          type="button"
                          onClick={() => setLogo(null)}
                          title="Remove logo"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger/50 hover:text-danger"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </Field>
                  {logo && (
                    <>
                      <Field label="Logo position">
                        <div className="grid grid-cols-4 gap-1.5">
                          {([['tl', '↖ TL'], ['tr', '↗ TR'], ['bl', '↙ BL'], ['br', '↘ BR']] as Array<[LogoPos, string]>).map(([p, label]) => (
                            <Chip key={p} active={logoPos === p} onClick={() => setLogoPos(p)} className="text-center">
                              {label}
                            </Chip>
                          ))}
                        </div>
                      </Field>
                      <Slider label="Logo size" value={logoScale} min={0.6} max={2} step={0.05} onChange={setLogoScale} fmt={(v) => `${Math.round(v * 100)}%`} />
                    </>
                  )}
                </Group>

                <Group title="Colours & background">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Text colour">
                      <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-full" />
                    </Field>
                    <Field label="Accent">
                      <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-full" />
                    </Field>
                  </div>
                  <Slider label="Scrim" value={scrim} min={0} max={1} step={0.05} onChange={setScrim} />

                  <input ref={bgInputRef} type="file" accept="image/*" onChange={onBg} className="hidden" />
                  <Field label="Background">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => bgInputRef.current?.click()}
                        className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[12px] font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
                      >
                        <Upload size={12} /> {bg ? 'Replace' : 'Upload'}
                      </button>
                      {bg && (
                        <button
                          type="button"
                          onClick={() => { setBg(null); setBgSavedId(null); }}
                          title="Remove background"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger/50 hover:text-danger"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </Field>
                  <p className="text-[10.5px] leading-snug text-ink-3">Tip: drop any image straight onto the preview.</p>

                  {(savedBgs.length > 0 || bg) && (
                    <Field label="Saved backgrounds" hint={savedBgs.length ? `${savedBgs.length} saved` : undefined}>
                      {bg && !bgSavedId && (
                        <button
                          type="button"
                          onClick={saveCurrentBg}
                          className="mb-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-gold-dim text-[12px] font-medium text-gold transition-all hover:brightness-125 active:scale-[0.98]"
                        >
                          <Bookmark size={12} /> Save current background to library
                        </button>
                      )}
                      {savedBgs.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {savedBgs.map((b) => (
                            <div key={b.id} className="group relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={b.dataUrl}
                                alt={b.name}
                                onClick={() => applySavedBg(b)}
                                className={`h-12 w-full cursor-pointer rounded-lg border object-cover transition-all ${
                                  bgSavedId === b.id ? 'border-accent/70' : 'border-line hover:border-line-strong'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => removeSavedBg(b.id)}
                                title="Delete from library"
                                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] leading-none text-white group-hover:flex"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </Field>
                  )}
                </Group>
              </div>
            </Panel>

            <div className="space-y-2">
              <Btn variant="primary" size="lg" className="w-full" onClick={downloadPng} disabled={!sign && !title}>
                <Download size={15} /> Download PNG — {postType === 'couple' ? `${pairA.sign} × ${pairB.sign}` : postType === 'persona' ? `${pairA.sign} ${roleOf(pairA.role).en}` : previewSign}
              </Btn>
              {postType === 'rashi' && (
                <Btn
                  variant="soft"
                  size="md"
                  className="w-full"
                  onClick={downloadZip}
                  disabled={zipping || signs.length === 0 || nSelected === 0}
                >
                  <Package size={14} />
                  {zipping ? `Rendering ${nSelected} posts…` : `Download ${nSelected} sign${nSelected === 1 ? '' : 's'} (ZIP)`}
                </Btn>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
