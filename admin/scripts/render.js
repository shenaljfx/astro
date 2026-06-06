/**
 * Standalone render script — called via child_process from Next.js API route.
 * This avoids webpack issues with Remotion's native binaries.
 * 
 * Usage: node scripts/render.js --composition="ReelShort" --output="path/to/out.mp4" --props="base64encodedJSON"
 */
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=').slice(1).join('=') : null;
  };

  const compositionId = getArg('composition');
  const outputFile = getArg('output');
  const propsB64 = getArg('props');

  if (!compositionId || !outputFile || !propsB64) {
    console.error('Usage: node scripts/render.js --composition=ID --output=FILE --props=BASE64');
    process.exit(1);
  }

  const inputProps = JSON.parse(Buffer.from(propsB64, 'base64').toString('utf-8'));

  console.log(`Rendering ${compositionId} → ${outputFile}`);
  console.log(`Props: sign=${inputProps.sign}, theme=${inputProps.theme}, duration=${inputProps.duration}`);

  try {
    const { bundle } = require('@remotion/bundler');
    const { renderMedia, selectComposition } = require('@remotion/renderer');

    // Bundle the Remotion project
    console.log('Bundling...');
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '..', 'src', 'remotion', 'index.tsx'),
      webpackOverride: (config) => config,
    });

    // Select the composition
    console.log('Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    // Render
    console.log('Rendering video...');
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputFile,
      inputProps,
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 10 === 0) {
          console.log(`Progress: ${Math.round(progress * 100)}%`);
        }
      },
    });

    console.log(`✅ Rendered successfully: ${outputFile}`);
    process.exit(0);
  } catch (err) {
    console.error('Render failed:', err.message);
    process.exit(1);
  }
}

main();
