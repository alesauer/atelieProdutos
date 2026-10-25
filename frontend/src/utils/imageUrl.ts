/**
 * Utilitários para resolução e tratamento resiliente de imagens de produtos
 * Suporta ambientes de desenvolvimento local, Docker Compose e produção com Nginx.
 */

// Placeholder SVG com estética Casa Luma (tons terra, aconchego e artesanato)
export const FALLBACK_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">
      <rect width="400" height="300" fill="#F8F6F2"/>
      <g opacity="0.6">
        <circle cx="200" cy="120" r="42" fill="#EADBC8"/>
        <path d="M178 135L194 112L206 128L214 118L226 135H178Z" fill="#8B5E3C"/>
        <circle cx="218" cy="104" r="6" fill="#C5A059"/>
      </g>
      <text x="200" y="195" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#8B5E3C">Casa Luma</text>
      <text x="200" y="218" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#A89F91">Sem Foto Cadastrada</text>
    </svg>
  `);

/**
 * Normaliza e resolve a URL completa de uma foto de produto.
 * - Suporta blob/data URIs para previews locais imediatos
 * - Suporta URLs absolutas (http/https)
 * - Resolve caminhos relativos (/api/v1/media/uuid.jpg) usando VITE_API_URL ou origin atual
 */
export function getProductImageUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') {
    return FALLBACK_IMAGE_PLACEHOLDER;
  }

  const trimmed = urlOrPath.trim();
  if (!trimmed) {
    return FALLBACK_IMAGE_PLACEHOLDER;
  }

  // Previews locais em memória ou URLs completas
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Se for apenas o nome do arquivo puro (ex: "84729482.jpg")
  let cleanPath = trimmed;
  if (!cleanPath.startsWith('/') && !cleanPath.includes('/')) {
    cleanPath = `/api/v1/media/${cleanPath}`;
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // Verificar se o VITE_API_URL possui host absoluto (ex: http://localhost:8000/api/v1)
  const apiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    try {
      const parsed = new URL(apiUrl);
      return `${parsed.origin}${cleanPath}`;
    } catch {
      // Ignora erro de parsing e segue com path relativo
    }
  }

  return cleanPath;
}

/**
 * Handler utilitário para eventos onError de tags <img>.
 * Substitui automaticamente a imagem com erro pelo placeholder elegante.
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_IMAGE_PLACEHOLDER) {
    target.onerror = null; // Evita loop infinito se placeholder falhar
    target.src = FALLBACK_IMAGE_PLACEHOLDER;
  }
}
