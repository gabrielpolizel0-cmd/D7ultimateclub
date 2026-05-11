// ============================================================
// Helper de tracking do Meta Pixel
// Centraliza os disparos pra não duplicar código nem dar erro
// quando o pixel não tiver carregado ainda.
// ============================================================

type FbqEvent =
  | 'PageView'
  | 'Lead'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'CompleteRegistration'
  | 'Purchase';

type FbqParams = Record<
  string,
  string | number | boolean | string[] | number[] | undefined
>;

export function fbqTrack(event: FbqEvent, params?: FbqParams) {
  if (typeof window === 'undefined') return;
  const fbq = (window as any).fbq;
  if (typeof fbq !== 'function') return;

  try {
    if (params) {
      fbq('track', event, params);
    } else {
      fbq('track', event);
    }
  } catch (e) {
    // Silencioso: bloqueador de anúncio pode derrubar o fbq.
    // Não queremos quebrar o site por causa do pixel.
    console.warn('[fbq] erro ao disparar evento', event, e);
  }
}