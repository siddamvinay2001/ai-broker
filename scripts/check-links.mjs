import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = "http://localhost:3000";
const q = encodeURIComponent("AED 3M, 2-bed I can rent out, family-friendly, near a good school");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 2 });
await page.goto(`${base}/discover?q=${q}`, { waitUntil: "domcontentloaded", timeout: 60000 });

// Results stream in, so wait for the broker section rather than a fixed delay.
await page.waitForFunction(
  () => [...document.querySelectorAll('a[href^="/broker/"]')].length > 0,
  { timeout: 90000 },
).catch(() => console.log("WARN: no broker links appeared within 90s"));
await new Promise((r) => setTimeout(r, 1200));

const links = await page.evaluate(() => {
  const grab = (sel) => [...document.querySelectorAll(sel)].map((a) => ({
    href: a.getAttribute("href"),
    rect: (() => { const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  return {
    brokers: grab('a[href^="/broker/"]'),
    properties: grab('a[href^="/property/"]'),
    communities: grab('a[href^="/listings?community="]'),
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  };
});
console.log(JSON.stringify(links, null, 1));

await page.screenshot({ path: ".screenshots/discover.png", fullPage: false });

// A link that renders but 404s is still broken, so follow each unique target.
const targets = [...new Set([...links.brokers, ...links.properties, ...links.communities].map((l) => l.href))];
for (const href of targets.slice(0, 8)) {
  const res = await page.goto(base + href, { waitUntil: "domcontentloaded", timeout: 45000 });
  console.log(`  ${res.status()}  ${href}`);
}
await browser.close();
