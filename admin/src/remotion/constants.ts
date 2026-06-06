export const INTRO_SECONDS = 4;
export const CTA_SECONDS = 4;
export const DURATION_BUFFER_SECONDS = 1;

/** Audio includes hook + body + CTA; intro is a visual overlay, not extra duration. */
export function calcVideoDuration(audioSeconds: number): number {
  return audioSeconds + CTA_SECONDS + DURATION_BUFFER_SECONDS;
}
