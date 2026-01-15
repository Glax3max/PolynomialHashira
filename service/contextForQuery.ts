import axios from "axios";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

type SearchLink = { title: string; href: string };
export type SearchExtractResult = { title: string; content: string; url: string };

export async function searchAndExtract(query: string): Promise<SearchExtractResult[]> {
  // Modify query if it contains future year - search for current information instead
  let searchQuery = query;
  if (/\b2025\b/.test(query)) {
    // Replace "in 2025" with "recent" or "current" to get actual results
    searchQuery = query.replace(/\bin\s+2025\b/gi, "recent").replace(/\b2025\b/g, "").trim();
    // Clean up any double spaces
    searchQuery = searchQuery.replace(/\s+/g, " ");
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] Modified query from "${query}" to "${searchQuery}" for better search results`);
  }

  const SEARCH_ENDPOINTS = [
    (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    (q: string) => `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`
  ];

  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://duckduckgo.com/"
  };

  // Some sites block requests that include a mismatched Referer (e.g. always DuckDuckGo).
  // Use a separate header set for fetching result pages.
  const PAGE_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": HEADERS["Accept-Language"]
  };

  const MAX_RESULTS = 10;
  const MAX_REDIRECTS = 3;
  const visited = new Set<string>();

  const normalizeDdGHref = (rawHref: string | null | undefined): string | null => {
    if (!rawHref) return null;

    let href = rawHref.trim();
    if (!href) return null;

    // Fix HTML entity encoding sometimes present in attribute values.
    href = href.replace(/&amp;/g, "&");

    if (href.startsWith("//")) href = `https:${href}`;

    // Resolve DuckDuckGo redirect links to the actual destination.
    // Examples:
    // - /l/?uddg=https%3A%2F%2Fexample.com
    // - https://duckduckgo.com/l/?uddg=...
    if (href.startsWith("/l/?") || href.includes("duckduckgo.com/l/?")) {
      try {
        const u = href.startsWith("http") ? new URL(href) : new URL(href, "https://duckduckgo.com");
        const uddg = u.searchParams.get("uddg");
        if (!uddg) return null;

        // DDG sometimes double-encodes; decode at most twice.
        let decoded = uddg;
        for (let i = 0; i < 2; i++) {
          try {
            const next = decodeURIComponent(decoded);
            if (next === decoded) break;
            decoded = next;
          } catch {
            break;
          }
        }
        href = decoded;
      } catch {
        return null;
      }
    }

    // Only allow absolute http(s) URLs at this point.
    if (!href.startsWith("http://") && !href.startsWith("https://")) return null;

    // Exclude obvious DDG ad/tracking endpoints that can slip through uddg decoding.
    try {
      const u = new URL(href);
      const host = u.hostname.toLowerCase();
      const path = u.pathname.toLowerCase();
      if (host.includes("duckduckgo.com") || host === "duck.com") return null;
      if (path.endsWith("/y.js") || u.searchParams.has("ad_domain") || u.searchParams.has("ad_provider"))
        return null;
    } catch {
      return null;
    }

    return href;
  };

  const fetchSearch = async () => {
    for (const build of SEARCH_ENDPOINTS) {
      try {
        return await axios.get<string>(build(searchQuery), {
          headers: HEADERS,
          timeout: 10000
        });
      } catch {
        // try next endpoint
      }
    }
    throw new Error("Search failed (DNS / network issue)");
  };

  const extractLinks = (html: string): SearchLink[] => {
    const $ = cheerio.load(html);

    // eslint-disable-next-line no-console
    console.log("Total <a> tags:", $("a[href]").length);
    // eslint-disable-next-line no-console
    console.log(
      "Results containers:",
      $(".results, #links, .result__body, .result, .web-result").length
    );

    const links: SearchLink[] = [];

    // Method 1 (preferred): Result title links on DuckDuckGo HTML.
    // This avoids picking up nav/footer links and ad tracking URLs.
    $(".result__a, .result__title a, a.result__a").each((_i, el) => {
      const $a = $(el);
      const title =
        ($a.text().trim() || $a.attr("aria-label") || $a.attr("title") || "").toString().trim();
      const href = normalizeDdGHref($a.attr("href"));
      if (!href) return;
      if (title.length <= 5) return;
      if (href.match(/\.(jpg|jpeg|png|gif|pdf|css|js|ico|svg)$/i)) return;
      links.push({ title, href });
    });

    // Method 2: Try finding links in result containers
    if (links.length < 3) {
      $('.result, .web-result, .result__body, [class*="result"]').each((_i, el) => {
        const $result = $(el);
        const $link = $result.find("a[href]").first();

        if ($link.length) {
          const href = normalizeDdGHref($link.attr("href"));
          const title =
            $link.text().trim() || $result.find(".result__title, h2, h3").first().text().trim();

          // Only add if it's a valid external URL
          if (
            href &&
            (href.startsWith("http://") || href.startsWith("https://")) &&
            title.length > 5
          ) {
            links.push({ title, href });
          }
        }
      });
    }

    // Method 3: Fallback - find any external links (but be more lenient)
    if (links.length < 3) {
      $("a[href]").each((_i, el) => {
        const $link = $(el);
        const href = normalizeDdGHref($link.attr("href"));
        const title = $link.text().trim();

        // Only add external HTTP/HTTPS links
        if (
          href &&
          (href.startsWith("http://") || href.startsWith("https://")) &&
          !href.includes("javascript:") &&
          title.length > 5 &&
          !$link.closest(".header, .footer, nav, .sidebar, .no-results").length &&
          !href.match(/\.(jpg|jpeg|png|gif|pdf|css|js|ico|svg)$/i)
        ) {
          links.push({ title, href });
        }
      });
    }

    // Remove duplicates based on URL
    const uniqueLinks: SearchLink[] = [];
    const seenUrls = new Set<string>();
    for (const link of links) {
      try {
        const url = new URL(link.href);
        const normalizedUrl = url.hostname + url.pathname;
        if (!seenUrls.has(normalizedUrl)) {
          seenUrls.add(normalizedUrl);
          uniqueLinks.push(link);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // eslint-disable-next-line no-console
    console.log("Extracted links:", uniqueLinks.length);
    if (uniqueLinks.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        "Sample links:",
        uniqueLinks.slice(0, 3).map(l => `${l.title.substring(0, 40)} -> ${l.href.substring(0, 50)}`)
      );
    } else {
      // Debug: log some sample hrefs to see what we're missing
      const sampleHrefs: string[] = [];
      $("a[href]")
        .slice(0, 10)
        .each((_i, el) => {
          const href = $(el).attr("href");
          if (href) sampleHrefs.push(href.substring(0, 100));
        });
      // eslint-disable-next-line no-console
      console.log("[DEBUG] Sample hrefs found:", sampleHrefs);
    }
    return uniqueLinks.slice(0, MAX_RESULTS);
  };

  const extractRedirect = (html: string) =>
    html.match(/location\.replace\("([^"]+)"\)/)?.[1] || html.match(/URL=([^">]+)/)?.[1] || null;

  const looksBlocked = (html: string) => {
    const t = html.toLowerCase();
    return (
      t.includes("access denied") ||
      t.includes("you don't have permission") ||
      t.includes("captcha") ||
      t.includes("enable javascript")
    );
  };

  const extractText = (html: string) => {
    // Prefer extracting the "main article" text when possible.
    // This improves content quality vs taking the entire <body> text (nav/menus/cookie banners).
    try {
      const dom = new JSDOM(html, { url: "https://example.com" });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      const text = (article?.textContent || "").replace(/\s+/g, " ").trim();
      dom.window.close();
      if (text.length > 0) return text;
    } catch {
      // fallback below
    }

    const $ = cheerio.load(html);
    $("script, style, noscript, iframe, svg").remove();
    return $("body").text().replace(/\s+/g, " ").trim();
  };

  const looksUseful = (text: string | null) => Boolean(text && text.length > 300);

  const safeFetch = async (url: string, depth = 0): Promise<string | null> => {
    if (visited.has(url) || depth > MAX_REDIRECTS) return null;
    visited.add(url);

    try {
      const res = await axios.get<string>(url, {
        headers: PAGE_HEADERS,
        timeout: 15000, // Increased timeout
        maxRedirects: 5,
        validateStatus: s => s < 500,
        maxContentLength: 5000000, // 5MB limit
        maxBodyLength: 5000000
      });

      // Treat 4xx as failures (often blocks or paywalls).
      if (res.status >= 400) return null;

      const contentType = (res.headers?.["content-type"] || "").toString().toLowerCase();
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml"))
        return null;

      let html = res.data;
      if (typeof html !== "string") {
        return null;
      }

      if (looksBlocked(html)) return null;

      // Check for redirects in HTML (some sites use meta refresh)
      const redirect = extractRedirect(html);
      if (redirect) {
        let redirectUrl = redirect;
        if (!redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
          try {
            const baseUrl = new URL(url);
            redirectUrl = new URL(redirectUrl, baseUrl).href;
          } catch {
            return null;
          }
        }
        return safeFetch(redirectUrl, depth + 1);
      }

      const text = extractText(html);
      if (!looksUseful(text)) return null;

      return text;
    } catch {
      return null;
    }
  };

  const searchRes = await fetchSearch();
  // eslint-disable-next-line no-console
  console.log("Search HTML length:", searchRes.data.length);
  const links = extractLinks(searchRes.data);
  // eslint-disable-next-line no-console
  console.log("Extracted links:", links.length);

  const results = await Promise.all(
    links.map(async link => {
      // Fix URL construction to handle existing protocols
      let url = link.href;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        if (url.startsWith("//")) {
          url = `https:${url}`;
        } else if (url.startsWith("/")) {
          // Skip relative URLs
          return null;
        } else {
          url = `https://${url}`;
        }
      }

      // Skip if URL is invalid
      try {
        new URL(url);
      } catch {
        return null;
      }

      let content = await safeFetch(url);
      if (!content) {
        return null;
      }

      if (content.length > 2000) {
        content = content.substring(0, 2000);
      }

      return {
        title: link.title,
        content,
        url
      } satisfies SearchExtractResult;
    })
  );

  const successfulResults = results.filter((r): r is SearchExtractResult => Boolean(r));
  // eslint-disable-next-line no-console
  console.log("Final results:", successfulResults.length);
  if (successfulResults.length < links.length) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] Successfully scraped ${successfulResults.length} out of ${links.length} links`);
  }

  // If no results and query was modified, try a simpler query
  if (successfulResults.length === 0 && searchQuery !== query) {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] No results with modified query, trying simpler search`);
    const simpleQuery = query
      .replace(/\bin\s+2025\b/gi, "")
      .replace(/\b2025\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (simpleQuery !== searchQuery && simpleQuery.length > 10) {
      try {
        const fallbackSearch = await axios.get<string>(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(simpleQuery)}`,
          {
            headers: HEADERS,
            timeout: 10000
          }
        );
        const fallbackLinks = extractLinks(fallbackSearch.data);
        if (fallbackLinks.length > 0) {
          const fallbackResults = await Promise.all(
            fallbackLinks.slice(0, 5).map(async link => {
              let url = link.href;
              if (!url.startsWith("http://") && !url.startsWith("https://")) {
                if (url.startsWith("//")) {
                  url = `https:${url}`;
                } else if (!url.startsWith("/")) {
                  url = `https://${url}`;
                } else {
                  return null;
                }
              }
              try {
                new URL(url);
              } catch {
                return null;
              }
              let content = await safeFetch(url);
              if (!content) return null;
              if (content.length > 2000) {
                content = content.substring(0, 2000);
              }
              return { title: link.title, content, url } satisfies SearchExtractResult;
            })
          );
          const fallbackSuccessful = fallbackResults.filter((r): r is SearchExtractResult => Boolean(r));
          if (fallbackSuccessful.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`[DEBUG] Fallback query returned ${fallbackSuccessful.length} results`);
            return fallbackSuccessful;
          }
        }
      } catch (e) {
        const msg = (e as { message?: string } | null)?.message || "unknown error";
        // eslint-disable-next-line no-console
        console.log("[DEBUG] Fallback search failed:", msg);
      }
    }
  }

  return successfulResults;
}

