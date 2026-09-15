import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = "http://localhost:3000";
const q = encodeURIComponent("AED 3M, 2-bed I can rent out, family-friendly");

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

let posts = 0;
page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/discover")) posts++; });

await page.goto(`${base}/discover?q=${q}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => !!document.querySelector('a[href^="/property/"]'), { timeout: 90000 });
await new Promise((r) => setTimeout(r, 2500));
console.log(`after initial search: POSTs=${posts}`);

const href = await page.$eval('a[href^="/property/"]', (a) => a.getAttribute("href"));
await page.goto(base + href, { waitUntil: "domcontentloaded" });
console.log(`navigated into ${href}`);

await page.goBack({ waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 3000));
const restored = await page.evaluate(() => ({
  properties: document.querySelectorAll('a[href^="/property/"]').length,
  stillSearching: document.body.textContent.includes("Searching Dubai for your match"),
}));
console.log(`after BACK: POSTs=${posts} restored=${JSON.stringify(restored)}`);
await browser.close();
