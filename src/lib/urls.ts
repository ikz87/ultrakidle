import { isRunningInDiscord } from './discord';

/**
 * Resolves an external URL.
 * If running in Discord, it uses the local proxy path defined in vite.config.ts.
 * If running in a normal browser (production on Render), it resolves to the direct external URL.
 */
export function resolveExternalUrl(url: string): string {
    if (!url) return url;

    // If we are in Discord, we need the proxy to bypass CSP
    if (isRunningInDiscord()) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && url.startsWith(supabaseUrl)) {
            // Convert to a relative path so it's handled by the Vite proxy
            // Ensure we don't end up with double slashes if supabaseUrl ends with /
            return url.replace(supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl, '');
        }

        if (url.startsWith('https://img.icons8.com/')) {
            return url.replace('https://img.icons8.com', '/external/icons8');
        }

        if (url.startsWith('https://bucket.ultrakidle.online')) {
            return url.replace('https://bucket.ultrakidle.online', '/external/infernoguessr-images');
        }

        return url;
    }

    // If not in Discord, we need to resolve to the direct URL because the /external proxy
    // only exists in the Vite dev/preview server, not in the production build on Render.

    // Handle Ko-fi proxy
    if (url.startsWith('/external/kofi/')) {
        return `https://cdn.prod.website-files.com/${url.replace('/external/kofi/', '')}`;
    }

    // Handle Wiki proxy
    if (url.startsWith('/external/wiki/')) {
        return `https://ultrakill.wiki.gg/${url.replace('/external/wiki/', '')}`;
    }

    return url;
}


// Kinda the same function as above but without the early return, useful in some places
export function toExternalUrl(url: string): string {
    if (!url) return url;

    if (url.startsWith("/external/kofi/")) {
        return `https://cdn.prod.website-files.com/${url.replace("/external/kofi/", "")}`;
    }

    if (url.startsWith("/external/wiki/")) {
        return `https://ultrakill.wiki.gg/${url.replace("/external/wiki/", "")}`;
    }

    if (url.startsWith("/external/icons8/")) {
        return `https://img.icons8.com/${url.replace("/external/icons8/", "")}`;
    }

    return url;
}
