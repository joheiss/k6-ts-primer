import { check, sleep } from "k6";
import { browser } from "k6/browser";
import type { Options } from "k6/options";

export const options: Options = {
  scenarios: {
    browser_scenario: {
      executor: "shared-iterations",
      maxDuration: "30s",
      options: {
        browser: {
          // headless: false,
          type: "chromium",
        },
      },
    },
  },
};

export default async function test() {
  const page = await browser.newPage();
  try {
    await page.goto("https://quickpizza.grafana.com/");
    await page.waitForNavigation();
    const title = await page.title();
    console.log("Page title:", title);
    check(title, { "title is correct": (t) => t === "QuickPizza" });
    page.screenshot({ path: "screenshots/screenshot.png" });
    sleep(1);
    // click login link
    await page.locator('a[href="/login"]').click();
    await page.waitForNavigation();
    // enter login data and login
    await page.locator("#username").type("default");
    await page.locator("#password").type("12345678");
    await page.locator('button[type="submit"]').click();
    // await page.waitForNavigation();
    await page.waitForSelector("h2");
    const text = await page.locator("h2").textContent();
    check(text, {
      "text is ok": (t) => !!t && t.includes("Your Pizza Ratings:"),
    });

    await page.locator("footer > div > p > a").click();
    await page.waitForNavigation();

    // back on main page
    const locator = page.locator('button[name="pizza-please"]');
    await locator.click();
    await page.waitForSelector('button[name="rate-5"]');
    // click another button
    const anotherBtn = page.locator('button[name="rate-5"]');
    anotherBtn.click();
    await page.waitForSelector("#rate-result");
    // verify message
    const message = page.locator("#rate-result");
    const messageText = await message.textContent();
    console.log("Rating message:", messageText);
    check(messageText, {
      "rating message is correct": (msg) => msg === "Please log in first.",
    });
  } finally {
    await page.close();
  }
}
