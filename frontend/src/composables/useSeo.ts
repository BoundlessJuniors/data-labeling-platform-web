/**
 * SEO Composable - Route-based meta tag management
 */
import { useHead } from '@vueuse/head';

interface SeoOptions {
  title: string;
  description?: string;
  robots?: string;
}

const SITE_NAME = 'DataLabel';
const DEFAULT_DESCRIPTION =
  'Görsel veri etiketleme platformu. Dataset yönetimi, labeler ağı ve kalite kontrol sistemi.';

/**
 * Set page-specific SEO meta tags
 */
export function useSeo(options: SeoOptions) {
  const { title, description = DEFAULT_DESCRIPTION, robots = 'index, follow' } = options;

  useHead({
    title: `${title} | ${SITE_NAME}`,
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: robots },
      // Open Graph
      { property: 'og:title', content: `${title} | ${SITE_NAME}` },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      // Twitter
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${title} | ${SITE_NAME}` },
      { name: 'twitter:description', content: description },
    ],
  });
}

/**
 * Set SEO for error pages (noindex)
 */
export function useSeoError(title: string) {
  useSeo({
    title,
    description: 'Bu sayfa bulunamadı veya bir hata oluştu.',
    robots: 'noindex, nofollow',
  });
}
