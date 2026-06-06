import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

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

    // Output directory
    const outputDir = path.join(process.cwd(), 'output', new Date().toISOString().split('T')[0]);
    await mkdir(outputDir, { recursive: true });

    const outputFile = path.join(
      outputDir,
      `${inputProps.sign || 'general'}_${inputProps.duration}_${Date.now()}.${outputFormat}`
    );

    // Spawn Remotion render as a separate process via the render script
    const propsB64 = Buffer.from(JSON.stringify(inputProps)).toString('base64');
    const cmd = `node scripts/render.js --composition="${compositionId}" --output="${outputFile}" --props="${propsB64}"`;

    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 180000, // 3 min max
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
