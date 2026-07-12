import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);

// Only allow safe, single-token values for anything that reaches the spawned
// process or the output filename. Prevents shell/argument injection and path
// traversal even though this tool is meant to run on localhost.
const SAFE_TOKEN = /^[A-Za-z0-9_-]+$/;
function safeToken(value: unknown, fallback: string): string {
  const s = String(value ?? '');
  return SAFE_TOKEN.test(s) ? s : fallback;
}

/**
 * Video rendering endpoint.
 * Spawns a separate Node.js process to run Remotion renderer,
 * avoiding native binary import issues in Next.js webpack.
 */
export async function POST(request: NextRequest) {
  try {
    const { compositionId, inputProps, outputFormat = 'mp4' } = await request.json();

    if (!compositionId || !inputProps) {
      return NextResponse.json(
        { error: 'compositionId and inputProps are required' },
        { status: 400 }
      );
    }

    // compositionId is passed to a spawned process — reject anything unsafe
    // rather than sanitizing, so an unexpected value never runs.
    if (!SAFE_TOKEN.test(String(compositionId))) {
      return NextResponse.json({ error: 'Invalid compositionId' }, { status: 400 });
    }
    const ext = safeToken(outputFormat, 'mp4');
    const signPart = safeToken(inputProps.sign, 'general');
    const durationPart = safeToken(inputProps.duration, '0');

    // Output directory
    const outputDir = path.join(process.cwd(), 'output', new Date().toISOString().split('T')[0]);
    await mkdir(outputDir, { recursive: true });

    const outputFile = path.join(
      outputDir,
      `${signPart}_${durationPart}_${Date.now()}.${ext}`
    );

    // Spawn Remotion render WITHOUT a shell — args are passed as an array so
    // no value can break out into shell metacharacters.
    const propsB64 = Buffer.from(JSON.stringify(inputProps)).toString('base64');
    const { stdout, stderr } = await execFileAsync('node', [
      'scripts/render.js',
      '--composition', String(compositionId),
      '--output', outputFile,
      '--props', propsB64,
    ], {
      cwd: process.cwd(),
      timeout: 180000, // 3 min max
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: '' },
    });

    return NextResponse.json({
      success: true,
      outputFile,
      stdout,
      message: 'Video rendered successfully',
    });
  } catch (error: any) {
    console.error('Render Error:', error);
    return NextResponse.json(
      { error: error.message || 'Rendering failed' },
      { status: 500 }
    );
  }
}
