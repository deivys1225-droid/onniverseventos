export type WikipediaSummaryResult = {
  title: string;
  shortText: string;
  fullText: string;
  canonicalUrl: string;
};

function sanitizeTopic(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?¿!¡]+$/g, "")
    .trim();
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const cut = cleaned.match(/^(.{40,260}?[.!?])(\s|$)/);
  if (cut?.[1]) return cut[1].trim();
  if (cleaned.length <= 260) return cleaned;
  return `${cleaned.slice(0, 257).trimEnd()}...`;
}

export function extractWikipediaTopic(inputRaw: string): string | null {
  const input = sanitizeTopic(inputRaw).toLowerCase();
  if (!input) return null;

  const direct = input.match(/\bwikipedia\s+(de|sobre)?\s*(.+)$/i);
  if (direct?.[2]) return sanitizeTopic(direct[2]);

  const patterns = [
    /\bquien(es)?\s+(es|fue)\s+(.+)$/i,
    /\bque\s+es\s+(.+)$/i,
    /\bque\s+fue\s+(.+)$/i,
    /\bhistoria\s+de\s+(.+)$/i,
    /\bresumen\s+de\s+(.+)$/i,
    /\binformacion\s+de\s+(.+)$/i,
    /\binformaci[oó]n\s+de\s+(.+)$/i,
    /\bhablame\s+de\s+(.+)$/i,
    /\bh[aá]blame\s+de\s+(.+)$/i,
    /\bdime\s+sobre\s+(.+)$/i,
    /\binvestiga\s+(.+)$/i,
    /\bbusca\s+en\s+wikipedia\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const hit = input.match(pattern);
    if (!hit) continue;
    const topic = sanitizeTopic(hit[hit.length - 1] ?? "");
    if (topic.length >= 2) return topic;
  }

  return null;
}

type WikipediaSearchResponse = {
  query?: {
    search?: Array<{ title?: string }>;
  };
};

type WikipediaPageResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        extract?: string;
        fullurl?: string;
      }
    >;
  };
};

async function resolveBestWikipediaTitle(topic: string): Promise<string | null> {
  const searchUrl = new URL("https://es.wikipedia.org/w/api.php");
  searchUrl.searchParams.set("action", "query");
  searchUrl.searchParams.set("list", "search");
  searchUrl.searchParams.set("srsearch", topic);
  searchUrl.searchParams.set("utf8", "1");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("origin", "*");

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!searchRes.ok) return null;
  const searchData = (await searchRes.json()) as WikipediaSearchResponse;
  const first = searchData.query?.search?.[0]?.title?.trim();
  return first || null;
}

export async function fetchWikipediaSummary(topicRaw: string): Promise<WikipediaSummaryResult | null> {
  const topic = sanitizeTopic(topicRaw);
  if (!topic) return null;

  const bestTitle = (await resolveBestWikipediaTitle(topic)) || topic;
  const infoUrl = new URL("https://es.wikipedia.org/w/api.php");
  infoUrl.searchParams.set("action", "query");
  infoUrl.searchParams.set("prop", "extracts|info");
  infoUrl.searchParams.set("inprop", "url");
  infoUrl.searchParams.set("titles", bestTitle);
  infoUrl.searchParams.set("explaintext", "1");
  infoUrl.searchParams.set("exintro", "1");
  infoUrl.searchParams.set("format", "json");
  infoUrl.searchParams.set("origin", "*");

  const res = await fetch(infoUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as WikipediaPageResponse;
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  const page = pages.find((p) => p?.extract?.trim());
  if (!page?.extract) {
    return null;
  }

  const fullText = page.extract.trim();
  if (!fullText) return null;

  const canonicalTitle = page.title?.trim() || bestTitle;
  const canonicalUrl =
    page.fullurl?.trim() ||
    `https://es.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle.replace(/\s+/g, "_"))}`;

  return {
    title: canonicalTitle,
    shortText: firstSentence(fullText),
    fullText,
    canonicalUrl,
  };
}
