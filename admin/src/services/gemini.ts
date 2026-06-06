export interface ScriptGenerationOptions {
  templateType: TemplateType;
  sign?: string;
  astroData: any;
  duration: 'short' | 'long';
  style: 'hook' | 'educational' | 'teaser' | 'promo';
  cta: CTAType;
}

export type TemplateType =
  | 'daily-horoscope'
  | 'weekly-lagna'
  | 'compatibility'
  | 'auspicious-times'
  | 'yoga-of-day'
  | 'educational'
  | 'app-promo';

export type CTAType = 'follow' | 'download' | 'website' | 'free-chart';

export interface GeneratedScript {
  hook: string;          // First 3 seconds - attention grabber
  body: string;          // Main content
  cta: string;           // Call to action
  fullScript: string;    // Combined
  hashtags: string[];    // Platform hashtags
  captions: {
    tiktok: string;
    instagram: string;
    facebook: string;
  };
  keyPhrases: string[];  // For long-form text overlays
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function generateScript(options: ScriptGenerationOptions): Promise<GeneratedScript> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const prompt = buildPrompt(options);
  
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API failed: ${res.status}`);
  
  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

function buildPrompt(options: ScriptGenerationOptions): string {
  const { templateType, sign, astroData, duration, style, cta } = options;
  const wordLimit = duration === 'short' ? '30-45 words' : '100-140 words';
  const hookLimit = duration === 'short' ? '5-8 words' : '8-12 words';

  const ctaTexts: Record<CTAType, string> = {
    follow: 'Follow for daily Vedic astrology readings',
    download: 'Download Grahachara free - link in bio',
    website: 'Get your free birth chart at grahachara.com',
    'free-chart': 'Your full Vedic chart is waiting - link in bio',
  };

  return `You are a viral social media scriptwriter for a Vedic astrology app called Grahachara.
Target audience: US women 18-35 who are into astrology, spirituality, and self-growth.

STYLE: ${style}
- Use hybrid terminology: lead with Western zodiac names (Aries, Scorpio) then reveal Vedic depth
- Conversational, confident, slightly mysterious tone
- Never say "um", "uh", or filler words
- Sound like a knowledgeable friend, not a textbook

TEMPLATE TYPE: ${templateType}
ZODIAC SIGN: ${sign || 'General'}
DURATION: ${duration} (${wordLimit} total for body)

ASTROLOGY DATA TO USE:
${JSON.stringify(astroData, null, 2)}

CALL TO ACTION: "${ctaTexts[cta]}"

Generate a JSON response with this exact structure:
{
  "hook": "string - ${hookLimit}, scroll-stopping opening line. Start with the sign name or a provocative question.",
  "body": "string - ${wordLimit}, the main astrology insight. Be specific, use the actual data provided. Reference planetary positions and what they mean.",
  "cta": "string - the call to action phrase",
  "fullScript": "string - hook + body + cta combined naturally",
  "hashtags": ["array of 20-30 hashtags mixing popular (#astrology #zodiac) with niche (#vedicastrology #nakshatra #${sign?.toLowerCase() || 'horoscope'})"],
  "captions": {
    "tiktok": "string - short punchy caption with emojis, 2-3 sentences max + hashtags",
    "instagram": "string - longer storytelling caption, 4-5 sentences + hashtags",
    "facebook": "string - conversational, question-based caption to drive comments"
  },
  "keyPhrases": ["array of 3-5 key phrases to display as text overlays in the video"]
}

Make the hook IRRESISTIBLE. Use patterns like:
- "[Sign], you NEED to hear this..."
- "If you're a [Sign], stop scrolling"
- "The universe has a message for [Sign]..."
- "[Planet] just entered [Sign] and everything is about to change"`;
}

/**
 * Generate a batch of scripts for all 12 signs
 */
export async function generateBatchScripts(
  templateType: TemplateType,
  astroData: any,
  duration: 'short' | 'long',
  cta: CTAType
): Promise<Map<string, GeneratedScript>> {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  const results = new Map<string, GeneratedScript>();
  
  // Generate in batches of 3 to avoid rate limits
  for (let i = 0; i < signs.length; i += 3) {
    const batch = signs.slice(i, i + 3);
    const promises = batch.map(sign =>
      generateScript({
        templateType,
        sign,
        astroData,
        duration,
        style: templateType === 'daily-horoscope' ? 'hook' : 'educational',
        cta,
      }).then(script => ({ sign, script }))
    );
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ sign, script }) => results.set(sign, script));
    
    // Small delay between batches
    if (i + 3 < signs.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}
