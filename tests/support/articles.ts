export interface Article {
  url: string;
  source: string;
  title: string;
  summary: string;
  published_at: string | null;
  categories: string[];
  image: string | null;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

// Fixed dataset: dates are relative to "now" so the 7/14-day filter is stable.
// Counts asserted in the specs (8 articles, 4 AI, ...) depend on this list.
export const ARTICLES: Article[] = [
  { url: "https://example.com/ai-1", source: "OpenAI Blog", title: "New language model released", summary: "<p>A <b>bigger</b> model.</p>", published_at: daysAgo(1), categories: ["AI"], image: null },
  { url: "https://example.com/ai-sec", source: "MIT News", title: "Hacking an AI model with prompts", summary: "", published_at: daysAgo(3), categories: ["AI", "Security"], image: null },
  { url: "https://example.com/sec-1", source: "Krebs on Security", title: "Botnet takedown explained", summary: "Details.", published_at: daysAgo(5), categories: ["Security"], image: null },
  { url: "https://example.com/test-old", source: "Test Guild", title: "Flaky tests in 2026", summary: "Old but within 14 days.", published_at: daysAgo(10), categories: ["Testing"], image: null },
  { url: "https://example.com/dev-old", source: "Martin Fowler", title: "Refactoring revisited", summary: "", published_at: daysAgo(12), categories: ["Dev"], image: null },
  { url: "https://example.com/nodate", source: "Test Guild", title: "Article without a date", summary: "", published_at: null, categories: ["Testing"], image: null },
  { url: "https://example.com/img-ok", source: "Hugging Face Blog", title: "Article with image", summary: "", published_at: daysAgo(2), categories: ["AI"], image: "https://img.example.com/ok.png" },
  { url: "https://example.com/img-bad", source: "Hugging Face Blog", title: "Article with broken image", summary: "", published_at: daysAgo(2), categories: ["AI"], image: "https://img.example.com/broken.png" },
];
