export function routeTitle(slug: string): string {
  // Dynamic params retain URL escapes in this runtime. Decode once before
  // constructing the separately encoded Wikipedia query.
  try { return decodeURIComponent(slug).replaceAll('_',' '); }
  catch { return slug.replaceAll('_',' '); }
}
