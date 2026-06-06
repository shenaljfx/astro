import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'generate-script' });
}

function repairTruncatedJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Gemini sometimes truncates mid-string. Try common repairs.
  }

  let repaired = text.trim();

  // Close any unterminated strings
  const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Close open arrays/objects from the end
  const opens: string[] = [];
  for (const ch of repaired) {
    if (ch === '{' || ch === '[') opens.push(ch);
    else if (ch === '}' && opens[opens.length - 1] === '{') opens.pop();
    else if (ch === ']' && opens[opens.length - 1] === '[') opens.pop();
  }

  // Remove any trailing comma before we close
  repaired = repaired.replace(/,\s*$/, '');

  for (let i = opens.length - 1; i >= 0; i--) {
    repaired += opens[i] === '{' ? '}' : ']';
  }

  try {
    return JSON.parse(repaired);
  } catch {
    // Last resort: extract whatever fields we can
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured in .env.local' }, { status: 500 });
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

    if (!text) {
      const reason = candidate?.finishReason || 'unknown';
      return NextResponse.json({ error: `Gemini returned empty response (reason: ${reason})` }, { status: 500 });
    }

    const parsed = repairTruncatedJson(text);
    if (!parsed) {
      console.error('Gemini returned unparseable JSON:', text.slice(0, 500));
      return NextResponse.json({ error: 'Gemini returned invalid JSON that could not be repaired' }, { status: 500 });
    }

    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    console.error('Gemini Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
