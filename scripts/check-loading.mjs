import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = "http://localhost:3000";
const q = encodeURIComponent("AED 3M, 2-bed I can rent out, family-friendly, near a good school");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });

page.goto(`${base}/discover?q=${q}`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});

// Sample the loading UI a few times while the stream is still open.
for (const ms of [900, 2200, 4200]) {
  await new Promise((r) => setTimeout(r, ms === 900 ? 900 : 1300));
  const snap = await page.evaluate(() => {
    const h2 = document.querySelector("h2")?.textContent?.trim() ?? null;
    const stages = [...document.querySelectorAll("li")]
      .map((li) => li.textContent.trim())
      .filter((t) => /Reading your brief|Shortlisting areas|Searching Dubai inventory|Matching your specialist/.test(t));
    const ticks = document.querySelectorAll("svg path[d='M3 8.5l3.5 3.5L13 5']").length;
    return { h2, stages, completedTicks: ticks, hasResults: !!document.querySelector('a[href^="/property/"]') };
  });
  console.log(`t~${ms}ms:`, JSON.stringify(snap));
  if (!snap.hasResults) await page.screenshot({ path: `.screenshots/loading-${ms}.png` });
}

await page.waitForFunction(() => !!document.querySelector('a[href^="/property/"]'), { timeout: 90000 }).catch(() => console.log("WARN: results never arrived"));
await new Promise((r) => setTimeout(r, 1000));
const final = await page.evaluate(() => ({
  searchingGone: !document.body.textContent.includes("Searching Dubai for your match"),
  properties: document.querySelectorAll('a[href^="/property/"]').length,
  brokers: document.querySelectorAll('a[href^="/broker/"]').length,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
}));
console.log("final:", JSON.stringify(final));
await page.screenshot({ path: ".screenshots/discover-final.png" });
await browser.close();
