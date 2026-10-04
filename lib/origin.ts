export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    // Next may reconstruct request.url with localhost even when the browser
    // opened 127.0.0.1. Compare with the host actually used by the client.
    const internal = new URL(request.url);
    const host = request.headers.get('host') || internal.host;
    const protocol = request.headers.get('x-forwarded-proto') || internal.protocol.replace(':','');
    if (protocol !== 'https' && protocol !== 'http') return false;
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch { return false; }
}
