import React, { useEffect } from 'react';

const SITE_ORIGIN = 'https://sumiopay.sumiotech.in';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/sumiopay-logo.png`;

export interface SeoHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  noIndex?: boolean;
  ogType?: 'website' | 'article';
  structuredData?: Record<string, any> | Array<Record<string, any>>;
}

function upsertMetaTag(
  attr: 'name' | 'property',
  key: string,
  content: string
): void {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMetaTag(attr: 'name' | 'property', key: string): void {
  const el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

/**
 * Dynamic Route-Level SEO, GEO, AEO & Anti-Indexing Guard.
 * Automatically injects canonical tags, OpenGraph/Twitter metadata, and Schema.org JSON-LD
 * for public pages while strictly marking SuperAdmin, Login, Checkout & Dashboard routes noindex.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  keywords,
  canonicalPath,
  noIndex = false,
  ogType = 'website',
  structuredData,
}) => {
  const schemaSerialized = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    document.title = title;

    const robotsValue = noIndex
      ? 'noindex, nofollow, noarchive, nosnippet'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

    upsertMetaTag('name', 'robots', robotsValue);
    upsertMetaTag('name', 'googlebot', robotsValue);
    upsertMetaTag('name', 'description', description);

    if (noIndex) {
      removeMetaTag('name', 'keywords');
      const existingCanonical = document.head.querySelector('link[rel="canonical"]');
      if (existingCanonical && existingCanonical.parentNode) {
        existingCanonical.parentNode.removeChild(existingCanonical);
      }
      // Remove base/previous structured data scripts when entering restricted routes like SuperAdmin
      document.head
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((node) => {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
      return;
    }

    if (keywords) {
      upsertMetaTag('name', 'keywords', keywords);
    }

    const cleanPath = canonicalPath
      ? canonicalPath.startsWith('/')
        ? canonicalPath
        : `/${canonicalPath}`
      : window.location.pathname || '/';
    const canonicalUrl = `${SITE_ORIGIN}${cleanPath === '/' ? '/' : cleanPath.replace(/\/+$/, '')}`;

    let canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    upsertMetaTag('property', 'og:type', ogType);
    upsertMetaTag('property', 'og:site_name', 'SumioPay by SumioTech');
    upsertMetaTag('property', 'og:locale', 'en_IN');
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:image', DEFAULT_OG_IMAGE);
    upsertMetaTag('property', 'og:image:alt', 'SumioPay — Self-Hosted 0% Fee UPI Payment Gateway SaaS');

    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE);

    // Replace previous route-specific JSON-LD cleanly
    const existingRouteSchemas = document.head.querySelectorAll('script[data-sumio-route-schema="true"]');
    existingRouteSchemas.forEach((n) => n.parentNode?.removeChild(n));

    if (schemaSerialized) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-sumio-route-schema', 'true');
      script.textContent = schemaSerialized;
      document.head.appendChild(script);
    }

    return () => {
      document.head
        .querySelectorAll('script[data-sumio-route-schema="true"]')
        .forEach((n) => n.parentNode?.removeChild(n));
    };
  }, [title, description, keywords, canonicalPath, noIndex, ogType, schemaSerialized]);

  return null;
};

export default SeoHead;
