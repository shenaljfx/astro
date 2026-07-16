import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verifyAdmin';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

const EDGE_TTS_PATH = path.resolve(process.cwd(), '..', '.venv', 'Scripts', 'edge-tts');
const PYTHON_PATH = path.resolve(process.cwd(), '..', '.venv', 'Scripts', 'python');
const KOKORO_SCRIPT = path.resolve(process.cwd(), 'scripts', 'kokoro_tts.py');

function getFfmpegPath(): string {
  // Next.js webpack rewrites ffmpeg-static to a non-existent vendor-chunks path — resolve directly
  const direct = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (existsSync(direct)) return direct;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fromPkg = require('ffmpeg-static') as string;
  if (fromPkg && existsSync(fromPkg)) return fromPkg;

  throw new Error('ffmpeg binary not found — run npm install ffmpeg-static in admin/');
}

const KOKORO_TIMEOUT_MS = 300_000; // cold start can download models (~2-3 min first run)
const KOKORO_VOICE_RE = /^[ab][fm]_/; // af_heart, am_adam, bf_emma, etc.

function resolveEngine(voice: string, engine?: string): 'kokoro' | 'edge' {
  if (engine === 'kokoro' || engine === 'edge') return engine;
  return KOKORO_VOICE_RE.test(voice) ? 'kokoro' : 'edge';
}
const EDGE_TIMEOUT_MS = 30_000;
const FFMPEG_TIMEOUT_MS = 30_000;

async function runEdgeTTS(opts: {
  voice: string;
  text: string;
  outputFile: string;
  subsFile: string;
  rate?: string;
  pitch?: string;
}) {
  const args = [
    '--voice', opts.voice,
    '--text', opts.text,
    '--write-media', opts.outputFile,
    '--write-subtitles', opts.subsFile,
  ];
  if (opts.rate) args.push(`--rate=${opts.rate}`);
  if (opts.pitch) args.push(`--pitch=${opts.pitch}`);

  await execFileAsync(EDGE_TTS_PATH, args, { timeout: EDGE_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 });
}

async function runKokoroTTS(opts: {
  voice: string;
  text: string;
  wavFile: string;
  outputFile: string;
  tmpDir: string;
  timestamp: number;
}): Promise<number> {
  const configFile = path.join(opts.tmpDir, `kokoro_${opts.timestamp}.json`);
  await writeFile(configFile, JSON.stringify({
    text: opts.text,
    voice: opts.voice,
    wav: opts.wavFile,
    speed: 1.0,
  }), 'utf-8');

  const { stdout, stderr } = await execFileAsync(
    PYTHON_PATH,
    [KOKORO_SCRIPT, configFile],
    { timeout: KOKORO_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
  );

  if (stderr) {
    console.log('Kokoro stderr:', stderr.slice(0, 500));
  }

  let kokoroDuration = 0;
  try {
    const jsonLine = stdout.trim().split('\n').find((line) => line.startsWith('{'));
    const result = JSON.parse(jsonLine || '{}');
    kokoroDuration = result.duration || 0;
  } catch {
    // duration will be estimated from text below
  }

  if (!existsSync(opts.wavFile)) {
    throw new Error('Kokoro output file not created');
  }

  await execFileAsync(
    getFfmpegPath(),
    ['-y', '-i', opts.wavFile, '-codec:a', 'libmp3lame', '-b:a', '128k', opts.outputFile],
    { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
  );

  await unlink(configFile).catch(() => {});
  await unlink(opts.wavFile).catch(() => {});

  return kokoroDuration;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { voice, text, rate, pitch, engine: engineParam } = await request.json();

    if (!voice || !text) {
      return NextResponse.json({ error: 'voice and text are required' }, { status: 400 });
    }

    const engine = resolveEngine(voice, engineParam);

    const tmpDir = path.join(os.tmpdir(), 'grahachara-tts');
    await mkdir(tmpDir, { recursive: true });

    const timestamp = Date.now();
    const outputFile = path.join(tmpDir, `tts_${timestamp}.mp3`);
    const wavFile = path.join(tmpDir, `tts_${timestamp}.wav`);
    const subsFile = path.join(tmpDir, `tts_${timestamp}.vtt`);

    let kokoroDuration = 0;

    if (engine === 'kokoro') {
      try {
        kokoroDuration = await runKokoroTTS({
          voice,
          text,
          wavFile,
          outputFile,
          tmpDir,
          timestamp,
        });
      } catch (kokoroErr: any) {
        console.log('Kokoro failed, falling back to Edge-TTS:', kokoroErr.message);
        if (kokoroErr.stderr) console.log('Kokoro stderr:', kokoroErr.stderr.slice(0, 500));
        await runEdgeTTS({
          voice: 'en-US-AriaNeural',
          text,
          outputFile,
          subsFile,
          rate,
        });
      }
    } else {
      await runEdgeTTS({
        voice,
        text,
        outputFile,
        subsFile,
        rate,
        pitch,
      });
    }

    const audioBuffer = await readFile(outputFile);
    const audioBase64 = audioBuffer.toString('base64');

    let wordTimings: Array<{ word: string; start: number; end: number }> = [];
    let duration = kokoroDuration;

    try {
      const vttContent = await readFile(subsFile, 'utf-8');
      wordTimings = parseVTT(vttContent);
      if (wordTimings.length > 0) {
        duration = wordTimings[wordTimings.length - 1].end;
      }
    } catch {
      // Kokoro has no VTT — synthetic timings generated below
    }

    if (duration <= 0) {
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      duration = wordCount / 2.5;
    }

    if (wordTimings.length === 0) {
      const words = text.split(/\s+/).filter(Boolean);
      const totalChars = words.reduce((sum: number, w: string) => sum + w.length, 0);
      let t = 0;
      for (const w of words) {
        const wordDur = (w.length / totalChars) * duration;
        wordTimings.push({ word: w, start: t, end: t + wordDur });
        t += wordDur;
      }
    }

    await unlink(outputFile).catch(() => {});
    await unlink(subsFile).catch(() => {});

    console.log(`TTS (${engine || 'edge'}): ${wordTimings.length} words, ${duration.toFixed(1)}s duration`);

    return NextResponse.json({
      audio: audioBase64,
      wordTimings,
      duration,
    });
  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: error.message || 'TTS generation failed' },
      { status: 500 }
    );
  }
}

function parseVTT(vttContent: string): Array<{ word: string; start: number; end: number }> {
  const phraseCues: Array<{ text: string; start: number; end: number }> = [];
  const lines = vttContent.split('\n');
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
      const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;

      const textParts: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].trim().match(timeRegex) && !lines[i].trim().match(/^\d+$/)) {
        textParts.push(lines[i].trim());
        i++;
      }
      const text = textParts.join(' ').trim();
      if (text) {
        phraseCues.push({ text, start, end });
      }
    } else {
      i++;
    }
  }

  const wordTimings: Array<{ word: string; start: number; end: number }> = [];

  for (const cue of phraseCues) {
    const words = cue.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    const cueDuration = Math.max(0.1, cue.end - cue.start);
    const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;

    let currentTime = cue.start;
    for (const word of words) {
      const wordDuration = (word.length / totalChars) * cueDuration;
      wordTimings.push({
        word: word.replace(/[<>]/g, ''),
        start: currentTime,
        end: currentTime + wordDuration,
      });
      currentTime += wordDuration;
    }
  }

  return wordTimings;
}
