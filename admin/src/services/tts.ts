export interface TTSOptions {
  voice: string;
  text: string;
  engine?: 'edge' | 'kokoro';
  rate?: string;  // e.g., '+10%', '-5%'
  pitch?: string; // e.g., '+5Hz', '-2Hz'
  volume?: string;
}

export interface TTSResult {
  audioBlob: Blob;
  audioUrl: string;
  wordTimings: WordTiming[];
  duration: number; // seconds
}

export interface WordTiming {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

export const VOICES = {
  aria: { id: 'en-US-AriaNeural', name: 'Aria', desc: 'Warm conversational female', engine: 'edge' as const },
  jenny: { id: 'en-US-JennyNeural', name: 'Jenny', desc: 'Trustworthy, calm female', engine: 'edge' as const },
  ana: { id: 'en-US-AnaNeural', name: 'Ana', desc: 'Young, expressive female', engine: 'edge' as const },
  michelle: { id: 'en-US-MichelleNeural', name: 'Michelle', desc: 'Deep, authoritative female', engine: 'edge' as const },
  guy: { id: 'en-US-GuyNeural', name: 'Guy', desc: 'Authoritative male', engine: 'edge' as const },
  davis: { id: 'en-US-DavisNeural', name: 'Davis', desc: 'Expressive storyteller male', engine: 'edge' as const },
  kokoro_heart: { id: 'af_heart', name: 'Heart (Kokoro)', desc: 'Ultra-realistic female (local)', engine: 'kokoro' as const },
  kokoro_sarah: { id: 'af_sarah', name: 'Sarah (Kokoro)', desc: 'Natural female narrator (local)', engine: 'kokoro' as const },
  kokoro_bella: { id: 'af_bella', name: 'Bella (Kokoro)', desc: 'Warm storyteller female (local)', engine: 'kokoro' as const },
  kokoro_nicole: { id: 'af_nicole', name: 'Nicole (Kokoro)', desc: 'ASMR-style female (local)', engine: 'kokoro' as const },
} as const;

export type VoiceKey = keyof typeof VOICES;

/**
 * Generate TTS audio using Edge TTS via the admin API route.
 * Edge TTS provides free, high-quality neural voices with word-level timing.
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS generation failed: ${err}`);
  }

  const data = await res.json();
  
  // Convert base64 audio to blob
  const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
  const audioBlob = new Blob([audioBytes], { type: 'audio/mp3' });
  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    audioBlob,
    audioUrl,
    wordTimings: data.wordTimings,
    duration: data.duration,
  };
}

/**
 * Estimate duration of text when spoken (for planning before actual TTS)
 * Average speaking rate: ~150 words per minute
 */
export function estimateDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return (wordCount / 150) * 60; // seconds
}
