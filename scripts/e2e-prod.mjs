import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.argv[2] ?? "https://majlis.novinic.org";
const pass = [], fail = [];
const ok = (c, label, detail = "") => (c ? pass : fail).push(`${c ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });

const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 120)); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + e.message.slice(0, 120)));
let posts = 0;
page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/api/discover")) posts++; });

// 1 Landing
await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
const home = await page.evaluate(() => ({
  title: document.title,
  hasComposer: !!document.querySelector("#brief"),
  chips: [...document.querySelectorAll("button")].filter(b => b.type === "button" && b.textContent.includes("AED")).length,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  brick: document.body.textContent.includes("Brick"),
  rera: document.body.textContent.includes("48328"),
  howItWorks: document.body.textContent.includes("How it works"),
  favicon: !!document.querySelector('link[rel*="icon"]'),
}));
ok(home.title === "Majlis", "landing title is Majlis", home.title);
ok(home.hasComposer, "composer present");
ok(home.chips >= 2, "example chips render", String(home.chips));
ok(!home.overflow, "no horizontal overflow @1440");
ok(!home.brick && !home.rera, "no client branding or RERA numbers");
ok(home.howItWorks, "How it works section present");

// 2 Real search
await page.type("#brief", "AED 3M, 2-bed I can rent out, family-friendly, near a good school");
await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 60000 }), page.click('button[type="submit"]')]);
ok(page.url().includes("/discover?q="), "submitting navigates to /discover", page.url().slice(0, 60));

await page.waitForFunction(() => !!document.querySelector('a[href^="/property/"]'), { timeout: 120000 }).catch(() => {});
await new Promise(r => setTimeout(r, 6000));
const res = await page.evaluate(() => ({
  props: document.querySelectorAll('a[href^="/property/"]').length,
  brokers: document.querySelectorAll('a[href^="/broker/"]').length,
  comms: document.querySelectorAll('a[href^="/listings?community="]').length,
  narrative: (document.body.textContent.match(/[‒-―−]/g) || []).length,
  nullish: /(\bnull\b|\bNaN\b|\bundefined\b)/.test(document.body.innerText),
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  stillSearching: document.body.textContent.includes("Searching Dubai for your match"),
}));
ok(res.props > 0, "properties returned", String(res.props));
ok(res.brokers > 0, "brokers matched", String(res.brokers));
ok(res.comms > 0, "communities returned", String(res.comms));
ok(res.narrative === 0, "no em dashes rendered", String(res.narrative));
ok(!res.nullish, "no null/NaN/undefined on screen");
ok(!res.stillSearching, "search completed");
ok(!res.overflow, "no overflow on results");

// 3 Property detail
const propHref = await page.$eval('a[href^="/property/"]', a => a.getAttribute("href"));
await page.goto(BASE + propHref, { waitUntil: "networkidle0" });
const detail = await page.evaluate(() => ({
  aed: /AED\s[\d,]/.test(document.body.innerText),
  nullish: /(\bnull\b|\bNaN\b|\bundefined\b)/.test(document.body.innerText),
  overflow: document.documentElement.scrollWidth > window.innerWidth,
}));
ok(detail.aed, "property page shows AED figures");
ok(!detail.nullish, "property page has no null/NaN");
ok(!detail.overflow, "property page no overflow");

// 4 Back-nav must not re-POST
const before = posts;
await page.goBack({ waitUntil: "domcontentloaded" });
await new Promise(r => setTimeout(r, 4000));
const restored = await page.evaluate(() => document.querySelectorAll('a[href^="/property/"]').length);
ok(posts === before, "back does not re-run the search", `POSTs ${before}->${posts}`);
ok(restored > 0, "results restored from cache", String(restored));

// 5 Broker + community links
const brokerHref = await page.$eval('a[href^="/broker/"]', a => a.getAttribute("href"));
let r = await page.goto(BASE + brokerHref, { waitUntil: "networkidle0" });
ok(r.status() === 200, "broker profile loads", brokerHref);
const cb = await page.evaluate(() => !!([...document.querySelectorAll("button")].find(b => b.textContent.includes("Request a callback"))));
ok(cb, "callback button present on broker page");

// 6 Listings filters actually filter
const counts = {};
for (const qs of ["", "?type=BUY", "?type=RENT", "?community=does-not-exist"]) {
  r = await page.goto(`${BASE}/listings${qs}`, { waitUntil: "networkidle0" });
  counts[qs || "(none)"] = await page.evaluate(() => new Set([...document.querySelectorAll('a[href^="/property/"]')].map(a => a.getAttribute("href"))).size);
}
ok(counts["(none)"] > counts["?type=BUY"], "type=BUY narrows results", JSON.stringify(counts));
ok(counts["?type=RENT"] > 0 && counts["?type=RENT"] !== counts["?type=BUY"], "RENT differs from BUY");
ok(counts["?community=does-not-exist"] === 0, "bogus community returns nothing");
const empty = await page.evaluate(() => document.body.textContent.includes("Nothing matches these filters"));
ok(empty, "empty state renders");

// 7 /discover with no query must not error
await page.goto(`${BASE}/discover`, { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 2000));
ok(!(await page.content()).includes("SOMETHING WENT WRONG"), "no-query /discover shows no error", page.url());

// 8 Mobile
await page.setViewport({ width: 390, height: 844 });
for (const path of ["/", "/listings", "/brokers"]) {
  await page.goto(BASE + path, { waitUntil: "networkidle0" });
  const o = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!o, `no overflow @390 ${path}`);
}

await browser.close();
console.log([...pass, ...fail].join("\n"));
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (consoleErrors.length) console.log("\nconsole errors:\n  " + [...new Set(consoleErrors)].slice(0, 6).join("\n  "));
