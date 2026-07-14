/**
 * logTee — mirror console output to a size-capped file so the admin dashboard
 * can tail recent server/worker logs without docker-socket access.
 *
 * Both containers mount the same host dir (LOG_DIR, default /app/logs), so the
 * API container can read the worker's file too. Uses an append stream (async)
 * and a single .1 rotation at ~5MB. Fails silent: logging must never crash.
 */
const fs = require('fs');
const path = require('path');

const MAX_BYTES = Number(process.env.LOG_TEE_MAX_BYTES || 5 * 1024 * 1024);

let stream = null;
let filePath = null;
let written = 0;

function openStream() {
  stream = fs.createWriteStream(filePath, { flags: 'a' });
  stream.on('error', () => { stream = null; });
  try { written = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0; } catch { written = 0; }
}

function rotateIfNeeded() {
  if (written < MAX_BYTES) return;
  try {
    stream && stream.end();
    fs.renameSync(filePath, `${filePath}.1`);
  } catch { /* rotation is best-effort */ }
  openStream();
}

function fmt(args) {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.stack || a.message;
      try { return JSON.stringify(a); } catch { return String(a); }
    })
    .join(' ');
}

/** Patch console.{log,info,warn,error} to also append to LOG_DIR/<name>.log */
function initLogTee(name) {
  try {
    const dir = process.env.LOG_DIR || '/app/logs';
    fs.mkdirSync(dir, { recursive: true });
    filePath = path.join(dir, `${name}.log`);
    openStream();
  } catch (e) {
    console.warn(`[logTee] disabled (${e.message})`);
    return;
  }

  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const orig = console[level].bind(console);
    console[level] = (...args) => {
      orig(...args);
      if (!stream) return;
      try {
        const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${fmt(args)}\n`;
        written += Buffer.byteLength(line);
        stream.write(line);
        rotateIfNeeded();
      } catch { /* never throw from logging */ }
    };
  });
}

/**
 * Read the last `lines` lines of LOG_DIR/<name>.log (plus rolled .1 if the
 * live file is short), optionally filtered by substring and level.
 */
function tailLog(name, { lines = 300, q = '', level = '' } = {}) {
  const dir = process.env.LOG_DIR || '/app/logs';
  const file = path.join(dir, `${path.basename(name)}.log`);
  const READ_BACK = 768 * 1024;

  const readTail = (p, bytes) => {
    try {
      const size = fs.statSync(p).size;
      const start = Math.max(0, size - bytes);
      const fd = fs.openSync(p, 'r');
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      fs.closeSync(fd);
      return buf.toString('utf8');
    } catch { return ''; }
  };

  let text = readTail(file, READ_BACK);
  if (text.split('\n').length < lines + 1) {
    text = readTail(`${file}.1`, READ_BACK / 2) + text;
  }

  let out = text.split('\n').filter(Boolean);
  if (level) out = out.filter((l) => l.includes(`[${String(level).toUpperCase()}]`));
  if (q) {
    const needle = String(q).toLowerCase();
    out = out.filter((l) => l.toLowerCase().includes(needle));
  }
  return out.slice(-Math.min(Number(lines) || 300, 2000));
}

module.exports = { initLogTee, tailLog };
