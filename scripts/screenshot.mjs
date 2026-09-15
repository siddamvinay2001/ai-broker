import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "/tmp/shot.png";
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 1000);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

// Report centring of the key hero elements so alignment is measured, not eyeballed.
const metrics = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), centre: Math.round(r.left + r.width / 2) };
  };
  return {
    viewport: window.innerWidth,
    docScrollW: document.documentElement.scrollWidth,
    h1: pick("h1"),
    form: pick("form#discover"),
    composer: pick("form#discover > div:last-child"),
    chips: pick("form#discover ~ * button") ?? null,
    chipWrap: (() => {
      const btns = [...document.querySelectorAll("button")].filter((b) => b.type === "button" && b.textContent.includes("AED"));
      if (!btns.length) return null;
      const ls = btns.map((b) => b.getBoundingClientRect());
      const left = Math.min(...ls.map((r) => r.left));
      const right = Math.max(...ls.map((r) => r.right));
      return { left: Math.round(left), right: Math.round(right), centre: Math.round((left + right) / 2), count: btns.length };
    })(),
  };
});
console.log(JSON.stringify(metrics, null, 1));
await page.screenshot({ path: out, fullPage: false });
await browser.close();
