const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", name);
}

async function go(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await go(page, "http://localhost:3000/login?force=1");
  await go(page, "http://localhost:3000/");
  await shot(page, "01-landing.png");

  await go(page, "http://localhost:3000/login");
  await shot(page, "02-login.png");

  await page.fill("#email", "manager@hamsaye.local");
  await page.fill("#password", "123456");
  await page.locator("form button").first().click();
  await page.waitForURL("**/dashboard**", { timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot(page, "03-dashboard.png");

  await go(page, "http://localhost:3000/charges");
  await shot(page, "04-charges.png");

  await go(page, "http://localhost:3000/chat");
  await shot(page, "05-chat.png");

  await go(page, "http://localhost:3000/voting");
  await shot(page, "06-voting.png");

  await browser.close();
  console.log("done");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
