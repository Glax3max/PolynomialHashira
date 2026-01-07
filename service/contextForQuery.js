import axios from "axios";
import * as cheerio from "cheerio";

export async function searchAndExtract(query) {
  // Config
  
  // Modify query if it contains future year - search for current information instead
  let searchQuery = query;
  if (/\b2025\b/.test(query)) {
    // Replace "in 2025" with "recent" or "current" to get actual results
    searchQuery = query.replace(/\bin\s+2025\b/gi, 'recent').replace(/\b2025\b/g, '').trim();
    // Clean up any double spaces
    searchQuery = searchQuery.replace(/\s+/g, ' ');
    console.log(`[DEBUG] Modified query from "${query}" to "${searchQuery}" for better search results`);
  }

  const SEARCH_ENDPOINTS = [
    q => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    q => `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`
  ];

  const HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://duckduckgo.com/"
  };

  const MAX_RESULTS = 10;
  const MAX_REDIRECTS = 3;
  const visited = new Set();

  // Helper

  const fetchSearch = async () => {
    for (const build of SEARCH_ENDPOINTS) {
      try {
        return await axios.get(build(searchQuery), {
          headers: HEADERS,
          timeout: 10000
        });
      } catch {}
    }
    throw new Error("Search failed (DNS / network issue)");
  };

   const extractLinks = html => {
  const $ = cheerio.load(html);

  // For debugging purposes (Just logs)
  console.log('Total <a> tags:', $('a[href]').length);
  console.log('Results containers:', $('.results, #links, .result__body, .result, .web-result').length);

  const links = [];
  
  // Method 1: Find all DuckDuckGo redirect links (/l/?uddg=...)
  $('a[href*="/l/?"]').each((i, el) => {
    const $link = $(el);
    let href = $link.attr('href');
    let title = $link.text().trim();
    
    // Get title from parent or sibling if link text is empty
    if (!title || title.length < 5) {
      title = $link.closest('.result, .web-result, .result__body').find('.result__title, .result-title, h2, h3, .result__a').first().text().trim() || title;
    }
    
    if (href && href.includes('/l/?')) {
      // Extract the actual URL from DuckDuckGo redirect
      const match = href.match(/uddg=([^&"']+)/);
      if (match) {
        try {
          href = decodeURIComponent(match[1]);
          // Validate it's a proper URL
          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            if (title.length > 5) {
              links.push({ title, href });
            }
          }
        } catch (e) {
          // Skip if decoding fails
        }
      }
    }
  });

  // Method 2: Try finding links in result containers
  if (links.length < 3) {
    $('.result, .web-result, .result__body, [class*="result"]').each((i, el) => {
      const $result = $(el);
      const $link = $result.find('a[href]').first();
      
      if ($link.length) {
        let href = $link.attr('href');
        let title = $link.text().trim() || $result.find('.result__title, h2, h3').first().text().trim();
        
        // Handle DuckDuckGo redirect URLs
        if (href && href.includes('/l/?')) {
          const match = href.match(/uddg=([^&"']+)/);
          if (match) {
            try {
              href = decodeURIComponent(match[1]);
            } catch {
              return;
            }
          } else {
            return;
          }
        }
        
        // Only add if it's a valid external URL
        if (href && (href.startsWith('http://') || href.startsWith('https://')) && 
            !href.includes('duckduckgo.com') && title.length > 5) {
          links.push({ title, href });
        }
      }
    });
  }

  // Method 3: Fallback - find any external links (but be more lenient)
  if (links.length < 3) {
    $('a[href]').each((i, el) => {
      const $link = $(el);
      let href = $link.attr('href');
      const title = $link.text().trim();
      
      // Skip if it's a DuckDuckGo redirect we haven't processed
      if (href && href.includes('/l/?')) {
        const match = href.match(/uddg=([^&"']+)/);
        if (match) {
          try {
            href = decodeURIComponent(match[1]);
          } catch {
            return;
          }
        } else {
          return;
        }
      }
      
      // Only add external HTTP/HTTPS links
      if (href && (href.startsWith('http://') || href.startsWith('https://')) &&
          !href.includes('duckduckgo.com') &&
          !href.includes('javascript:') &&
          title.length > 5 &&
          !$link.closest('.header, .footer, nav, .sidebar, .no-results').length &&
          !href.match(/\.(jpg|jpeg|png|gif|pdf|css|js|ico|svg)$/i)) {
        links.push({ title, href });
      }
    });
  }

  // Remove duplicates based on URL
  const uniqueLinks = [];
  const seenUrls = new Set();
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

  console.log('Extracted links:', uniqueLinks.length);
  if (uniqueLinks.length > 0) {
    console.log('Sample links:', uniqueLinks.slice(0, 3).map(l => `${l.title.substring(0, 40)} -> ${l.href.substring(0, 50)}`));
  } else {
    // Debug: log some sample hrefs to see what we're missing
    const sampleHrefs = [];
    $('a[href]').slice(0, 10).each((i, el) => {
      const href = $(el).attr('href');
      if (href) sampleHrefs.push(href.substring(0, 100));
    });
    console.log('[DEBUG] Sample hrefs found:', sampleHrefs);
  }
  return uniqueLinks.slice(0, MAX_RESULTS);
};


// Extracting the redirect
  const extractRedirect = html =>
    html.match(/location\.replace\("([^"]+)"\)/)?.[1] ||
    html.match(/URL=([^">]+)/)?.[1] ||
    null;

    // Looking for blocked url it takes a html and if it contains these strings after redirect then return null
  const looksBlocked = html => {
    const t = html.toLowerCase();
    return (
      t.includes("access denied") ||
      t.includes("you don't have permission") ||
      t.includes("captcha") ||
      t.includes("enable javascript")
    );
  };

  // Extracting texts from the html 
  const extractText = html => {
    const $ = cheerio.load(html);
    $("script, style, noscript, iframe, svg").remove();
    return $("body").text().replace(/\s+/g, " ").trim();
  };

  const looksUseful = text => text && text.length > 300; // Lowered threshold to get more results

  const safeFetch = async (url, depth = 0) => {
    if (visited.has(url) || depth > MAX_REDIRECTS) return null;
    visited.add(url);

    try {
      const res = await axios.get(url, {
        headers: HEADERS,
        timeout: 15000, // Increased timeout
        maxRedirects: 5,
        validateStatus: s => s < 500,
        // Follow redirects automatically
        maxContentLength: 5000000, // 5MB limit
        maxBodyLength: 5000000
      });

      // Handle different content types
      let html = res.data;
      if (typeof html !== 'string') {
        // If response is not HTML, skip it
        return null;
      }

      if (looksBlocked(html)) return null;

      // Check for redirects in HTML (some sites use meta refresh)
      const redirect = extractRedirect(html);
      if (redirect) {
        let redirectUrl = redirect;
        if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
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
    } catch (error) {
      // Log error for debugging but don't fail completely
      if (error.code !== 'ECONNABORTED' && error.code !== 'ENOTFOUND') {
        // Only log non-timeout/network errors
      }
      return null;
    }
  };

  // Main task

  const searchRes = await fetchSearch();
  console.log("Search HTML length:", searchRes.data.length);
  const links = extractLinks(searchRes.data);
  console.log("Extracted links:", links.length);

  const results = await Promise.all(
  links.map(async (link, index) => {
    // Fix URL construction to handle existing protocols
    let url = link.href;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('//')) {
        url = `https:${url}`;
      } else if (url.startsWith('/')) {
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
      url: url
    };
  })
);

const successfulResults = results.filter(Boolean);
console.log("Final results:", successfulResults.length);
if (successfulResults.length < links.length) {
  console.log(`[DEBUG] Successfully scraped ${successfulResults.length} out of ${links.length} links`);
}

// If no results and query was modified, try a simpler query
if (successfulResults.length === 0 && searchQuery !== query) {
  console.log(`[DEBUG] No results with modified query, trying simpler search`);
  // Try searching without the year-specific part
  const simpleQuery = query.replace(/\bin\s+2025\b/gi, '').replace(/\b2025\b/g, '').replace(/\s+/g, ' ').trim();
  if (simpleQuery !== searchQuery && simpleQuery.length > 10) {
    try {
      const fallbackSearch = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(simpleQuery)}`, {
        headers: HEADERS,
        timeout: 10000
      });
      const fallbackLinks = extractLinks(fallbackSearch.data);
      if (fallbackLinks.length > 0) {
        const fallbackResults = await Promise.all(
          fallbackLinks.slice(0, 5).map(async (link) => {
            let url = link.href;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              if (url.startsWith('//')) {
                url = `https:${url}`;
              } else if (!url.startsWith('/')) {
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
            return { title: link.title, content, url: url };
          })
        );
        const fallbackSuccessful = fallbackResults.filter(Boolean);
        if (fallbackSuccessful.length > 0) {
          console.log(`[DEBUG] Fallback query returned ${fallbackSuccessful.length} results`);
          return fallbackSuccessful;
        }
      }
    } catch (e) {
      console.log(`[DEBUG] Fallback search failed:`, e.message);
    }
  }
}

// console.log(results);
return successfulResults;
}