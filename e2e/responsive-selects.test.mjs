// Run against a running frontend: npm run test:responsive
// The browser session and all API responses are fixtures; no account data is changed.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const baseURL = process.env.RESPONSIVE_BASE_URL || "http://localhost:3000";
let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

async function fixture(touch = false) {
  const context = await browser.newContext({ hasTouch: touch });
  const page = await context.newPage();
  const permissions = {};
  for (const permissionModule of [
    "orders",
    "products",
    "customers",
    "channels",
    "finance",
    "procurement",
    "inventory",
    "reports",
    "settings",
    "staff",
    "roles",
    "billing",
    "activity",
    "branches",
    "discounts",
    "whatsapp",
    "feedback",
    "wholesale",
    "returns",
    "my_leave",
    "my_attendance",
    "check_in_out",
    "suppliers",
    "users",
    "audit",
    "support",
    "transfers",
    "attendance",
    "tenant",
    "customer_accounts",
    "price_lists",
    "leave_requests",
    "attendance_settings",
    "expenses",
  ]) {
    for (const action of [
      "view",
      "create",
      "update",
      "write",
      "manage",
      "delete",
      "receive",
      "adjust",
    ])
      permissions[`${permissionModule}:${action}`] = "*";
  }
  await page.addInitScript(
    (session) => {
      localStorage.setItem("erp_session", JSON.stringify(session));
      localStorage.setItem("erp_access_token", "responsive-test-fixture");
    },
    {
      id: "responsive-test",
      name: "Responsive test",
      roles: ["admin"],
      permissions,
      tenant: {
        id: "fixture",
        code: "FIXTURE",
        name: "Rosaya",
        currency: "INR",
      },
      branches: [
        { id: "b1", branch_code: "B01", branch_name: "Main branch" },
        { id: "b2", branch_code: "B02", branch_name: "Second branch" },
      ],
    },
  );
  const writes = [];
  await page.route("**/api/**", (route) => {
    if (!["GET", "OPTIONS"].includes(route.request().method()))
      writes.push(route.request().url());
    return route.fulfill({
      status: 503,
      json: { error: { message: "Fixture: API disabled" } },
    });
  });
  return { page, context, writes };
}

async function openAndCheck(page, trigger) {
  await trigger.click();
  const list = page.getByRole("listbox");
  await list.waitFor({ state: "visible" });
  // Wait for floating positioning and deferred outside-click listeners.
  await page.waitForTimeout(200);
  const popup = await list.locator("..").boundingBox();
  const anchor = await trigger.boundingBox();
  const viewport = page.viewportSize();
  assert(
    popup.x >= 0 && popup.x + popup.width <= viewport.width + 1,
    "Menu extends outside viewport",
  );
  assert(
    popup.y >= 0 && popup.y + popup.height <= viewport.height + 1,
    "Menu extends outside viewport vertically",
  );
  assert(Math.abs(popup.x - anchor.x) < 2, "Menu detached from its control");
  assert(
    Math.abs(popup.width - anchor.width) < 2,
    "Menu width differs from its control",
  );
  return list;
}

test(
  "Returns tabs and dropdowns fit phones, tablets and large screens with mouse and touch",
  { timeout: 120000 },
  async () => {
    for (const touch of [false, true]) {
      const { page, context, writes } = await fixture(touch);
      try {
        const queries = [];
        await page.route("**/api/v1/returns?*", (route) => {
          queries.push(new URL(route.request().url()));
          return route.fulfill({
            json: {
              items: [],
              counts: { returns: 1, exchanges: 0, requests: 12 },
            },
          });
        });
        await page.goto(`${baseURL}/portal/returns`);
        await page.getByRole("button", { name: /Sales returns/ }).waitFor();
        for (const width of touch
          ? [320, 390, 768]
          : [320, 360, 390, 430, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 844 });
          const tabs = page.getByLabel("Return views");
          const boxes = await tabs.getByRole("button").evaluateAll((elements) =>
            elements.map((el) => {
              const r = el.getBoundingClientRect();
              return {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                scroll: el.scrollWidth,
                client: el.clientWidth,
              };
            }),
          );
          assert(
            boxes.every(
              (box) =>
                Math.abs(box.y - boxes[0].y) < 1 &&
                Math.abs(box.height - boxes[0].height) < 1,
            ),
            "Tabs are not aligned",
          );
          assert(
            boxes.every(
              (box) => box.scroll <= box.client && box.x + box.width <= width,
            ),
            "Tab content clips",
          );
          const sizes = await page.evaluate(() => ({
            width: innerWidth,
            doc: document.documentElement.scrollWidth,
            main: document.querySelector("main").clientWidth,
            scroll: document.querySelector("main").scrollWidth,
          }));
          assert.equal(sizes.doc, sizes.width, "Document overflows");
          assert.equal(sizes.scroll, sizes.main, "Main content overflows");
          for (const name of ["Channel", "Period"]) {
            await openAndCheck(
              page,
              page.getByRole("combobox", { name, exact: true }),
            );
            await page.keyboard.press("Escape");
            await page.getByRole("listbox").waitFor({ state: "hidden" });
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("combobox", { name: "Channel", exact: true })
          .click();
        await Promise.all([
          page.waitForResponse(
            (response) =>
              response.url().includes("/api/v1/returns?") &&
              new URL(response.url()).searchParams.get("channel") === "online",
          ),
          page.getByRole("option", { name: "Website", exact: true }).click(),
        ]);
        const period = page.getByRole("combobox", {
          name: "Period",
          exact: true,
        });
        await openAndCheck(page, period);
        await page.keyboard.press("End");
        await page
          .getByRole("option", { name: "All time", exact: true })
          .waitFor({ state: "visible" });
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
        assert(
          (await period.innerText()).includes("All time"),
          "Keyboard selection failed",
        );
        assert.equal(queries.at(-1).searchParams.has("from"), false);
        await page.getByRole("button", { name: /New Request/ }).click();
        assert.equal(
          await page
            .getByRole("button", { name: /New Request/ })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page
            .getByRole("combobox", { name: "Period", exact: true })
            .count(),
          0,
        );
        await page.getByRole("button", { name: /Exchanges/ }).click();
        assert.equal(
          await page
            .getByRole("button", { name: /Exchanges/ })
            .getAttribute("aria-pressed"),
          "true",
        );
        assert.equal(
          await page.locator("select").count(),
          0,
          "Native selector remains",
        );
        assert.equal(writes.length, 0);
      } finally {
        await context.close();
      }
    }
  },
);

test(
  "Form selectors keep labels, values, keyboard control and rich-text selection",
  { timeout: 90000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${baseURL}/portal/products/new`);
      const tracking = page.getByRole("combobox", {
        name: "Tracking",
        exact: true,
      });
      await openAndCheck(page, tracking);
      await page
        .getByRole("option", { name: "Serial number", exact: true })
        .click();
      assert((await tracking.innerText()).includes("Serial number"));
      const description = page.getByRole("textbox", {
        name: "Description",
        exact: true,
      });
      await description.fill("Keep this description");
      await description.press("ControlOrMeta+A");
      const style = page.getByRole("combobox", {
        name: "Text style",
        exact: true,
      });
      await openAndCheck(page, style);
      await page
        .getByRole("option", { name: "Heading 2", exact: true })
        .click();
      assert.equal(
        await description.locator("h2").innerText(),
        "Keep this description",
      );
      await page.goto(`${baseURL}/portal/finance`);
      await page.getByRole("tab", { name: "Journal", exact: true }).click();
      await page
        .getByRole("button", { name: "Manual entry", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      const account = dialog
        .getByRole("combobox", { name: "Account", exact: true })
        .first();
      await openAndCheck(page, account);
      await page.keyboard.press("Escape");
      await page.getByRole("listbox").waitFor({ state: "hidden" });
      assert.equal(
        await dialog.isVisible(),
        true,
        "Escape dismissed dialog instead of menu",
      );
      await openAndCheck(page, account);
      await page.getByRole("option").first().click();
      assert.equal(
        await dialog.isVisible(),
        true,
        "Selecting an option dismissed the dialog",
      );
      assert.equal(await page.locator("select").count(), 0);
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Page actions fill the available width on phones across pages, toolbars and dialogs",
  { timeout: 180000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      await page.route("**/api/v1/feedback?*", (route) =>
        route.fulfill({ json: [] }),
      );
      const pages = [
        "products",
        "orders",
        "customers",
        "discounts",
        "feedback",
        "procurement",
        "inventory",
        "transfers",
        "support",
        "settings/roles",
        "settings/staff",
        "settings/branches",
        "settings/activity",
        "attendance",
      ];
      async function checkGroup(group, width) {
        await group.waitFor({ state: "visible" });
        const metrics = await group.evaluate((element) => {
          const r = element.getBoundingClientRect(),
            style = getComputedStyle(element);
          const buttons = [...element.querySelectorAll("button,a")]
            .filter((button) => {
              const box = button.getBoundingClientRect();
              return (
                box.width &&
                box.height &&
                button.getAttribute("role") !== "combobox"
              );
            })
            .map((button) => {
              const b = button.getBoundingClientRect();
              return {
                text: button.textContent,
                paired: !!button.closest(".mobile-page-actions-pair"),
                top: b.top,
                right: b.right,
                left: b.left,
                scroll: button.scrollWidth,
                client: button.clientWidth,
              };
            });
          return {
            left:
              r.left +
              parseFloat(style.paddingLeft) +
              parseFloat(style.borderLeftWidth),
            right:
              r.right -
              parseFloat(style.paddingRight) -
              parseFloat(style.borderRightWidth),
            buttons,
          };
        });
        assert(metrics.buttons.length > 0, "No action buttons found");
        for (const button of metrics.buttons) {
          assert(
            button.left >= 0 && button.right <= width + 1,
            `Action leaves viewport: ${button.text}`,
          );
          assert(
            button.scroll <= button.client,
            `Action label clips: ${button.text}`,
          );
          if (!button.paired) {
            assert(
              Math.abs(button.left - metrics.left) < 2 &&
                Math.abs(button.right - metrics.right) < 2,
              `Action does not fill its available width: ${button.text}`,
            );
          }
        }
        const paired = metrics.buttons.filter((button) => button.paired);
        if (paired.length) {
          assert.equal(paired.length, 2);
          assert(
            Math.abs(paired[0].top - paired[1].top) < 1,
            "Product actions stack",
          );
          assert(Math.abs(paired[0].left - metrics.left) < 2);
          assert(paired[0].right < paired[1].left, "Product actions overlap");
          assert(Math.abs(paired[1].right - metrics.right) < 2);
        }
        assert(
          Math.abs(
            Math.max(...metrics.buttons.map((b) => b.right)) - metrics.right,
          ) < 2,
          "Actions do not reach the right edge",
        );
      }
      for (const path of pages) {
        await page.goto(`${baseURL}/portal/${path}`);
        const group = page.locator("[data-page-actions]").first();
        await group.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
          throw new Error(`Missing page actions on /portal/${path}`);
        });
        for (const width of [320, 360, 390, 640]) {
          await page.setViewportSize({ width, height: 844 });
          await checkGroup(group, width);
        }
        // Mobile rules must stop at the desktop breakpoint.
        await page.setViewportSize({ width: 1440, height: 900 });
        assert.equal(
          await group.evaluate(
            (el) =>
              getComputedStyle(el).width ===
              `${el.parentElement.clientWidth}px`,
          ),
          false,
          "Desktop action area expanded to full width",
        );
      }
      await page.goto(`${baseURL}/portal/procurement`);
      await page.setViewportSize({ width: 360, height: 844 });
      await page
        .getByRole("button", { name: "New purchase order", exact: true })
        .click();
      const purchase = page.getByRole("dialog", {
        name: "New purchase order",
        exact: true,
      });
      await purchase.waitFor();
      await checkGroup(purchase.locator(".mobile-page-actions").last(), 360);
      await purchase
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
      await purchase.waitFor({ state: "hidden" });
      await page.goto(`${baseURL}/portal/finance`);
      for (const [tab, name] of [
        ["Journal", "Manual entry"],
        ["Expenses", "New expense"],
      ]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        const action = page.getByRole("button", { name, exact: true });
        for (const width of [320, 390, 640]) {
          await page.setViewportSize({ width, height: 844 });
          await checkGroup(action.locator(".."), width);
        }
      }
      await page.goto(`${baseURL}/portal/products/new`);
      await checkGroup(page.locator("main .mobile-page-actions").first(), 640);
      await page.goto(`${baseURL}/portal/collections/new`);
      await page.setViewportSize({ width: 360, height: 844 });
      const collectionActions = page
        .getByRole("button", { name: "Save", exact: true })
        .locator("..");
      await checkGroup(collectionActions, 360);
      assert.equal(writes.length, 0, "The layout test submitted data");
    } finally {
      await context.close();
    }
  },
);

test(
  "Merged theme editor keeps selected collections, live metadata and image validation",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    page.on("dialog", (dialog) => dialog.accept());
    try {
      const settings = Object.fromEntries(
        ["brand", "announcement", "header", "footer", "pages"].map((key) => [
          key,
          {},
        ]),
      );
      const draft = {
        settings,
        templates: {
          home: [
            {
              id: "tiles",
              type: "tiles",
              settings: { collections: ["sarees"] },
            },
          ],
        },
      };
      const definition = {
        key: "heritage",
        name: "Heritage",
        defaults: draft,
        schema: {
          settings: {
            ...Object.fromEntries(
              Object.keys(settings).map((key) => [key, []]),
            ),
            pages: [
              {
                type: "image",
                key: "banner",
                label: "Banner image",
                default: "",
              },
            ],
          },
          sections: [
            {
              type: "tiles",
              name: "Collection tiles",
              fields: [
                {
                  type: "collections",
                  key: "collections",
                  label: "Collections",
                  max: 4,
                  default: [],
                },
              ],
            },
          ],
        },
      };
      const collections = [
        { slug: "sarees", name: "Sarees", kind: "category", product_count: 14 },
        {
          slug: "dupattas",
          name: "Dupattas",
          kind: "category",
          product_count: 5,
        },
        {
          slug: "handblock",
          name: "Handblock",
          kind: "craft",
          product_count: 2,
        },
      ];
      await page.route("**/api/v1/store-admin/themes/heritage", (r) =>
        r.fulfill({
          json: {
            theme_key: "heritage",
            name: "Heritage",
            is_active: true,
            draft_version: 1,
            published_version: 1,
            draft,
            published: draft,
          },
        }),
      );
      await page.route("**/api/themes/heritage", (r) =>
        r.fulfill({ json: definition }),
      );
      await page.route("**/api/v1/store-admin/theme-collections", (r) =>
        r.fulfill({ json: collections }),
      );
      await page.route("**/api/v1/store-admin/themes/heritage/preview", (r) =>
        r.fulfill({ json: { token: "fixture", expires_at: 9999999999 } }),
      );
      await page.route("**/preview?*", (r) =>
        r.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Fixture preview</title>",
        }),
      );
      for (const width of [360, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${baseURL}/portal/channels/online/themes/heritage`);
        await page
          .getByRole("button", { name: "Collection tiles", exact: true })
          .click();
        const add = page.getByRole("combobox", {
          name: "Add a collection",
          exact: true,
        });
        assert.deepEqual(
          await page.locator("main li > span").allTextContents(),
          ["Sarees"],
        );
        for (const label of [
          "Dupattas · Category · 5 products",
          "Handblock · Craft · 2 products",
        ]) {
          const list = await openAndCheck(page, add);
          await list.getByRole("option", { name: label, exact: true }).click();
        }
        assert.deepEqual(
          await page.locator("main li > span").allTextContents(),
          ["Sarees", "Dupattas", "Handblock"],
        );
        await page
          .getByRole("button", { name: "Move up", exact: true })
          .last()
          .click();
        assert.deepEqual(
          await page.locator("main li > span").allTextContents(),
          ["Sarees", "Handblock", "Dupattas"],
        );
        await page
          .getByRole("button", { name: "Remove", exact: true })
          .nth(1)
          .click();
        assert.deepEqual(
          await page.locator("main li > span").allTextContents(),
          ["Sarees", "Dupattas"],
        );
        assert.equal(
          await page
            .getByRole("button", { name: "Save", exact: true })
            .isEnabled(),
          true,
        );
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await page.getByRole("button", { name: /^Store pages/ }).click();
        await page.getByLabel("Image file", { exact: true }).setInputFiles({
          name: "too-large.png",
          mimeType: "image/png",
          buffer: Buffer.alloc(1024 * 1024 + 1),
        });
        await page
          .getByText("Choose an image up to 1 MB", { exact: true })
          .first()
          .waitFor();
      }
      assert.equal(writes.length, 0, "The theme regression submitted data");
    } finally {
      await context.close();
    }
  },
);

test(
  "Settings navigation and action menus stay within phone and desktop viewports",
  { timeout: 60000 },
  async () => {
    for (const touch of [false, true]) {
      const { page, context, writes } = await fixture(touch);
      try {
        await page.goto(`${baseURL}/portal/settings/channels/pos`);
        for (const width of [320, 390, 768]) {
          await page.setViewportSize({ width, height: 568 });
          const trigger = page.getByRole("button", {
            name: "Open settings menu",
          });
          await trigger.click();
          const drawer = page.getByRole("dialog", {
            name: "Settings",
            exact: true,
          });
          await drawer.waitFor();
          const box = await drawer.boundingBox();
          assert(box.x >= 0 && box.x + box.width <= width + 1);
          const nav = drawer.getByRole("navigation", {
            name: "Settings",
            exact: true,
          });
          assert(
            await nav
              .getByRole("link", { name: "General", exact: true })
              .isVisible(),
          );
          assert.equal(
            await nav
              .getByRole("link", { name: "Sales channels", exact: true })
              .getAttribute("aria-current"),
            "page",
          );
          await drawer
            .getByRole("textbox", { name: "Search settings" })
            .fill("no-such-setting");
          await drawer.getByText("No match", { exact: true }).waitFor();
          await drawer
            .getByRole("textbox", { name: "Search settings" })
            .fill("");
          await nav
            .getByRole("link", { name: "General", exact: true })
            .waitFor();
          await page.keyboard.press("Escape");
          await drawer.waitFor({ state: "hidden" });
          assert(await trigger.evaluate((el) => el === document.activeElement));
          await trigger.click();
          await drawer
            .getByRole("link", { name: "General", exact: true })
            .click();
          await page.waitForURL("**/portal/settings");
          await drawer.waitFor({ state: "hidden" });
          await trigger.click();
          await page
            .getByRole("button", { name: "Close settings menu" })
            .click();
          await drawer.waitFor({ state: "hidden" });
          await trigger.click();
          await page.mouse.click(width - 1, 280);
          await drawer.waitFor({ state: "hidden" });
          await trigger.click();
          await page.setViewportSize({ width: 1440, height: 568 });
          await drawer.waitFor({ state: "hidden" });
          await page
            .getByRole("navigation", { name: "Settings", exact: true })
            .waitFor();
          assert.equal(await trigger.isVisible(), false);
          await page.goto(`${baseURL}/portal/settings/channels/pos`);
        }
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 568 });
          const user = page.getByRole("button", { name: /Account menu for/ });
          await user.click();
          const menu = page.getByRole("menu");
          await menu.waitFor();
          const box = await menu.boundingBox();
          assert(box.x >= 0 && box.x + box.width <= width + 1);
          assert(box.y >= 0 && box.y + box.height <= 569);
          await page.keyboard.press("Escape");
          await menu.waitFor({ state: "hidden" });
        }
        assert.equal(await page.locator("select").count(), 0);
        assert.equal(writes.length, 0);
      } finally {
        await context.close();
      }
    }
  },
);

test(
  "Customer, product and business search dropdowns fit viewports and support keyboard selection",
  { timeout: 90000 },
  async () => {
    const { page, context, writes } = await fixture(true);
    const customer = {
      id: "c1",
      name: "A customer with a very long name",
      phone: "1234567890",
      email: "long-email-address@example.com",
    };
    const product = {
      id: "p1",
      name: "A product with a very long name",
      sku: "LONG-SKU",
      serialization_type: "NONE",
      price_minor: 10000,
      tax_rate_bps: 0,
      status: "active",
    };
    const account = {
      id: "a1",
      legal_name: "A business with a very long registered name",
      account_code: "ACC-001",
      status: "active",
    };
    try {
      await page.route("**/api/v1/customers?*", (r) =>
        r.fulfill({ json: [customer] }),
      );
      await page.route("**/api/v1/products?*", (r) =>
        r.fulfill({ json: [product] }),
      );
      await page.route("**/api/v1/customer-accounts?*", (r) =>
        r.fulfill({ json: [account] }),
      );
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 568 });
        await page.goto(`${baseURL}/portal/orders/new`);
        const search = page.getByRole("combobox", {
          name: "Search customers",
          exact: true,
        });
        await search.fill("customer");
        await page.getByRole("option", { name: /A customer with/ }).waitFor();
        const popup = page.getByRole("listbox").locator("..");
        const box = await popup.boundingBox();
        assert(
          box.x >= 0 && box.x + box.width <= width + 1,
          "Customer popup overflows",
        );
        assert(
          box.y >= 0 && box.y + box.height <= 569,
          "Customer popup overflows vertically",
        );
        await search.press("Escape");
        await page.getByRole("listbox").waitFor({ state: "hidden" });
        assert.equal(await search.inputValue(), "customer");
        await search.press("ArrowDown");
        await page.getByRole("option").waitFor();
        await search.press("Enter");
        await page.getByRole("button", { name: "Clear customer" }).waitFor();
      }
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`${baseURL}/portal/transfers`);
      await page
        .getByRole("button", { name: "New transfer", exact: true })
        .click();
      const productSearch = page.getByRole("combobox", {
        name: "Search products",
        exact: true,
      });
      await productSearch.fill("product");
      await page.getByRole("option", { name: /A product with/ }).waitFor();
      let box = await page.getByRole("listbox").locator("..").boundingBox();
      assert(
        box.x >= 0 &&
          box.x + box.width <= 321 &&
          box.y >= 0 &&
          box.y + box.height <= 569,
      );
      await page.keyboard.press("Escape");
      assert(
        await page.getByRole("dialog").isVisible(),
        "Escape closed the transfer dialog",
      );
      await productSearch.press("ArrowDown");
      await page.getByRole("option", { name: /A product with/ }).click();
      assert.equal(await productSearch.inputValue(), "");
      assert(
        await page.getByRole("dialog").isVisible(),
        "Selection closed the transfer dialog",
      );
      await page.goto(`${baseURL}/portal/wholesale`);
      await page
        .getByRole("button", { name: "New sales order", exact: true })
        .click();
      const businessSearch = page.getByRole("combobox", {
        name: "Search business customers",
        exact: true,
      });
      await businessSearch.fill("business");
      await page.getByRole("option", { name: /A business with/ }).waitFor();
      box = await page.getByRole("listbox").locator("..").boundingBox();
      assert(
        box.x >= 0 &&
          box.x + box.width <= 321 &&
          box.y >= 0 &&
          box.y + box.height <= 569,
      );
      await page.getByRole("option", { name: /A business with/ }).click();
      await page
        .getByRole("button", { name: "Clear business customer" })
        .waitFor();
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Returns tables show customer display IDs, names and phone numbers across every view",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      const base = {
        id: "return-customer",
        return_number: "RTN-CUSTOMER",
        kind: "return",
        source: "portal",
        status: "completed",
        reason_code: "defective",
        reason_note: null,
        customer_preference: null,
        refund_mode: "cash",
        items_value_minor: 10000,
        refund_minor: 10000,
        difference_minor: 0,
        branch_id: "b1",
        branch_name: "Main branch",
        order_id: "order-1",
        order_number: "ORD1",
        bill_number: "INV1",
        order_channel: "pos",
        order_placed_at: new Date().toISOString(),
        order_total_minor: 10000,
        customer_id: "customer-uuid-42",
        customer_code: "CUS-00042",
        customer_name: "Asha Rao",
        customer_phone: "+919876543210",
        quantity: 1,
        first_item_name: "Cotton Saree",
        line_count: 1,
        exchange_order_id: null,
        exchange_order_number: null,
        exchange_total_minor: null,
        credit_note_number: null,
        created_by_name: "Administrator",
        decision_note: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };
      let current = base;
      await page.route("**/api/v1/returns?*", (route) => {
        const params = new URL(route.request().url()).searchParams;
        current = {
          ...base,
          kind: params.get("kind") || "return",
          status: params.get("status") === "open" ? "requested" : "completed",
        };
        return route.fulfill({
          json: {
            items: [
              current,
              {
                ...current,
                id: "walk-in",
                return_number: "RTN-WALKIN",
                customer_id: null,
                customer_code: null,
                customer_name: null,
                customer_phone: null,
              },
              {
                ...current,
                id: "legacy",
                return_number: "RTN-LEGACY",
                customer_id: "legacy-customer-uuid",
                customer_code: null,
                customer_name: "Bina Rao",
                customer_phone: "+919876543211",
              },
            ],
            counts: { returns: 3, exchanges: 3, requests: 3 },
          },
        });
      });
      await page.route("**/api/v1/returns/return-customer", (route) =>
        route.fulfill({
          json: {
            ...current,
            customer_email: "asha@example.test",
            customer_addresses: [
              {
                id: "home",
                label: "Home",
                name: "Asha Rao",
                phone: "+919876543210",
                line1: "12 Market Road",
                city: "Patna",
                state: "Bihar",
                pincode: "800001",
                is_default: true,
              },
            ],
            items: [],
            refunds: [],
            exchange_items: [],
            timeline: [],
          },
        }),
      );
      await page.goto(`${baseURL}/portal/returns`);
      const table = page.getByRole("table");
      for (const tab of [/Sales returns/, /Exchanges/, /New Request/]) {
        await page.getByRole("button", { name: tab }).click();
        await table
          .getByRole("columnheader", {
            name: "Customer ID & details",
            exact: true,
          })
          .waitFor();
        const customer = table
          .getByRole("row")
          .filter({ hasText: "RTN-CUSTOMER" });
        assert.equal(
          await customer
            .getByRole("link", { name: "CUS-00042", exact: true })
            .getAttribute("href"),
          "/portal/customers/customer-uuid-42",
        );
        assert((await customer.innerText()).includes("Asha Rao"));
        assert((await customer.innerText()).includes("+919876543210"));
        const walkIn = table.getByRole("row").filter({ hasText: "RTN-WALKIN" });
        assert((await walkIn.innerText()).includes("Walk-in"));
        assert.equal(await walkIn.getByRole("link").count(), 0);
        const legacy = table.getByRole("row").filter({ hasText: "RTN-LEGACY" });
        assert.equal(
          await legacy
            .getByRole("link", { name: "Customer details", exact: true })
            .getAttribute("href"),
          "/portal/customers/legacy-customer-uuid",
        );
        assert(!(await table.innerText()).includes("customer-uuid"));
        const details = page.getByRole("group", {
          name: "Customer details",
          exact: true,
        });
        await details.getByText("asha@example.test", { exact: true }).waitFor();
        assert((await details.innerText()).includes("CUS-00042"));
        assert((await details.innerText()).includes("Asha Rao"));
        assert((await details.innerText()).includes("+919876543210"));
        assert(
          (await details.innerText()).includes(
            "12 Market Road, Patna, Bihar, 800001",
          ),
        );
        for (const width of [320, 390, 1440]) {
          await page.setViewportSize({ width, height: 844 });
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          );
        }
      }
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/api/v1/returns?") &&
            new URL(response.url()).searchParams.get("q") === "CUS-00042",
        ),
        page.getByPlaceholder(/Search by bill/).fill("CUS-00042"),
      ]);
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Product editor removes tax classification and shows labels beside the barcode",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      const product = {
        id: "barcode-product",
        parent_product_id: "parent",
        product_name: "Cotton Saree",
        name: "Cotton Saree",
        variant_name: "Default",
        sku: "SAREE-1",
        price_minor: 10000,
        cost_minor: null,
        mrp_minor: null,
        tax_code: null,
        description: "",
        images: [],
        variant_attributes: {},
        lifecycle_status: "active",
        serialization_type: "NONE",
        barcode: "DAAP00000096",
        barcodes: [
          {
            id: "manufacturer",
            barcode: "3443543545612",
            is_primary: false,
            source: "manufacturer",
            supplier_name: null,
            maker_name: null,
          },
        ],
      };
      let saved;
      await page.route("**/api/v1/products/barcode-product", (route) => {
        if (route.request().method() === "PATCH")
          saved = route.request().postDataJSON();
        return route.fulfill({
          json: {
            ...product,
            ...(saved ? { product_name: saved.name, name: saved.name } : {}),
          },
        });
      });
      await page.goto(`${baseURL}/portal/products/barcode-product`);
      await page
        .getByRole("button", { name: "Save product", exact: true })
        .waitFor();
      assert.equal(
        await page.getByText("Tax classification", { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByLabel("HSN code", { exact: true }).count(),
        0,
      );
      const shop = page.getByText("Barcodes · DAAP00000096", { exact: true });
      const sendLabels = page.getByRole("button", {
        name: "Send labels to till",
        exact: true,
      });
      const manufacturer = page.locator("details").filter({
        has: page.locator("summary", { hasText: /^Manufacturer barcodes$/ }),
      });
      assert.equal(await shop.locator("xpath=ancestor::details").count(), 0);
      assert.equal(await manufacturer.count(), 1);
      await manufacturer.locator("summary").click();
      await manufacturer.getByText("3443543545612", { exact: true }).waitFor();
      await sendLabels.waitFor();
      await manufacturer.locator("summary").click();
      await sendLabels.waitFor();
      await manufacturer.locator("summary").click();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const labelBox = await shop.boundingBox();
        const buttonBox = await sendLabels.boundingBox();
        assert(
          buttonBox.x >= labelBox.x + labelBox.width,
          `Button should be right of barcode at ${width}`,
        );
        assert(
          buttonBox.y < labelBox.y + labelBox.height &&
            labelBox.y < buttonBox.y + buttonBox.height,
          `Barcode and button should share a row at ${width}`,
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `Overflow at ${width}`,
        );
      }
      await page
        .getByRole("textbox", { name: /^Title/ })
        .fill("Updated Cotton Saree");
      await page
        .getByRole("button", { name: "Save product", exact: true })
        .click();
      await page.getByText("Product updated", { exact: true }).waitFor();
      assert.equal(saved.name, "Updated Cotton Saree");
      assert(!Object.hasOwn(saved, "hsn_code"));
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Products with manual labels generate a barcode from the barcode row",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      let product = {
        id: "manual-product",
        parent_product_id: "parent",
        product_name: "Maker product",
        name: "Maker product",
        variant_name: "Default",
        sku: "MAKER-1",
        price_minor: 10000,
        cost_minor: null,
        mrp_minor: null,
        tax_code: null,
        description: "",
        images: [],
        variant_attributes: {},
        lifecycle_status: "active",
        serialization_type: "NONE",
        barcode: null,
        manual_barcode_generation: true,
        barcodes: [
          {
            id: "maker",
            barcode: "8901234567890",
            is_primary: false,
            source: "manufacturer",
          },
        ],
      };
      let calls = 0;
      let fail = true;
      await page.route("**/api/v1/products/manual-product", (route) =>
        route.fulfill({ json: product }),
      );
      await page.route(
        "**/api/v1/products/manual-product/generate-barcode",
        (route) => {
          calls++;
          if (fail)
            return route.fulfill({
              status: 503,
              json: { error: { message: "Please retry" } },
            });
          product = { ...product, barcode: "DAAP00000042" };
          return route.fulfill({ json: product });
        },
      );
      await page.goto(`${baseURL}/portal/products/manual-product`);
      const generate = page.getByRole("button", {
        name: "Generate barcode",
        exact: true,
      });
      await generate.waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Send labels to till", exact: true })
          .count(),
        0,
      );
      await page.getByRole("textbox", { name: /^Title/ }).fill("Unsaved title");
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        const label = await page
          .getByText("Barcodes · No label", { exact: true })
          .boundingBox();
        const button = await generate.boundingBox();
        assert(button.x >= label.x + label.width);
      }
      await generate.click();
      await page
        .getByText("Couldn't generate barcode", { exact: true })
        .waitFor();
      assert.equal(calls, 1);
      fail = false;
      await generate.click();
      await page
        .getByText("Barcodes · DAAP00000042", { exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Send labels to till", exact: true })
        .waitFor();
      assert.equal(await generate.count(), 0);
      assert.equal(
        await page.getByRole("textbox", { name: /^Title/ }).inputValue(),
        "Unsaved title",
      );
      assert.equal(calls, 2);
      // Existing shop codes must still offer the manual action under "Never label them".
      await page.getByRole("textbox", { name: /^Title/ }).fill("Maker product");
      await page.reload();
      await generate.waitFor();
      await page
        .getByText("Barcodes · DAAP00000042", { exact: true })
        .waitFor();
      await generate.click();
      await page.getByText("Barcode ready", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Send labels to till", exact: true })
        .waitFor();
      assert.equal(calls, 3);
      assert.equal(product.barcode, "DAAP00000042");
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Customer Management requires a name and either contact and configures all memberships",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      let created;
      let saved;
      const settings = {
        silver_min_points: 25,
        gold_min_points: 50,
        platinum_min_points: 100,
        inactive_after_days: 180,
        points_per_100: 1,
        redemption_points: 100,
        redemption_value_minor: 100,
      };
      const tiers = ["regular", "silver", "gold", "platinum", "inactive"];
      await page.route("**/api/v1/crm/customers?*", (route) =>
        route.fulfill({ json: { items: [], total: 0 } }),
      );
      await page.route("**/api/v1/crm/segments", (route) =>
        route.fulfill({
          json: {
            settings: { ...settings, ...saved },
            segments: tiers.map((key) => ({
              key,
              customers: 0,
              loyalty_points: 0,
            })),
          },
        }),
      );
      await page.route("**/api/v1/crm/settings", (route) => {
        saved = route.request().postDataJSON();
        return route.fulfill({ json: { ...settings, ...saved } });
      });
      await page.route("**/api/v1/customers", (route) => {
        created = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          json: { id: "created", ...created },
        });
      });
      await page.goto(`${baseURL}/portal/customers`);
      await page
        .getByRole("heading", { name: "Customer Management", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Add customer", exact: true })
        .click();
      const modal = page.getByRole("dialog", {
        name: "Add customer",
        exact: true,
      });
      const submit = modal.getByRole("button", {
        name: "Add customer",
        exact: true,
      });
      assert(await submit.isDisabled());
      await modal.getByLabel(/^Name/).fill("Asha");
      assert(await submit.isDisabled());
      await modal.getByLabel(/^Email/).fill("asha@example.test");
      assert(await submit.isEnabled());
      await submit.click();
      await modal.waitFor({ state: "hidden" });
      assert.deepEqual(created, {
        name: "Asha",
        phone: null,
        email: "asha@example.test",
      });
      await page
        .getByRole("button", { name: "Add customer", exact: true })
        .click();
      await modal.getByLabel(/^Phone/).fill("9876543210");
      assert(await submit.isDisabled());
      await modal.getByLabel(/^Name/).fill("Bina");
      assert(await submit.isEnabled());
      await submit.click();
      await modal.waitFor({ state: "hidden" });
      assert.deepEqual(created, {
        name: "Bina",
        phone: "9876543210",
        email: null,
      });
      const membership = page.getByRole("combobox", {
        name: "Membership",
        exact: true,
      });
      await membership.click();
      for (const tier of ["Regular", "Silver", "Gold", "Platinum", "Inactive"])
        await page.getByRole("option", { name: tier, exact: true }).waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("tab", { name: "Membership", exact: true }).click();
      for (const tier of ["Regular", "Silver", "Gold", "Platinum", "Inactive"])
        await page.getByText(tier, { exact: true }).waitFor();
      await page
        .getByLabel("Silver when loyalty points are at least", { exact: true })
        .fill("30");
      await page
        .getByLabel("Gold when loyalty points are at least", { exact: true })
        .fill("60");
      await page
        .getByLabel("Platinum when loyalty points are at least", {
          exact: true,
        })
        .fill("120");
      await page
        .getByRole("button", { name: "Save rules", exact: true })
        .click();
      await page.getByText("Membership rules saved", { exact: true }).waitFor();
      assert.equal(saved.silver_min_points, 30);
      assert.equal(saved.gold_min_points, 60);
      assert.equal(saved.platinum_min_points, 120);
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Discount targets can be combined: several categories, collections, memberships and private customers",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      const rows = [];
      let saved;
      const customer = {
        id: "target-customer",
        customer_code: "CUS-00042",
        name: "Asha Rao",
        phone: "+919876543210",
        email: "asha@example.test",
        status: "active",
        notes: null,
        created_at: "2026-01-01T00:00:00Z",
      };
      await page.route("**/api/v1/discounts", (route) => {
        if (route.request().method() === "GET")
          return route.fulfill({ json: rows });
        saved = route.request().postDataJSON();
        const discount = {
          ...saved,
          id: `discount-${rows.length}`,
          times_used: 0,
          branch_ids: null,
          contacts: saved.customer_ids.length ? [customer] : [],
        };
        rows.push(discount);
        return route.fulfill({ status: 201, json: discount });
      });
      await page.route("**/api/v1/categories", (route) =>
        route.fulfill({
          json: [
            { id: "category-sarees", name: "Sarees" },
            { id: "category-kurtas", name: "Kurtas" },
          ],
        }),
      );
      await page.route("**/api/v1/collections", (route) =>
        route.fulfill({
          json: [{ id: "collection-summer", name: "Summer collection" }],
        }),
      );
      await page.route("**/api/v1/customers?*", (route) =>
        route.fulfill({ json: [customer] }),
      );
      await page.goto(`${baseURL}/portal/discounts`);
      await page
        .getByRole("button", { name: "New discount", exact: true })
        .click();
      const modal = page.getByRole("dialog", {
        name: "New discount",
        exact: true,
      });
      await modal.getByLabel(/^Name/).fill("Combined");
      await modal.getByLabel("Coupon code", { exact: true }).fill("COMBINED");
      await modal.getByLabel(/^Percentage/).fill("10");
      const all = modal.getByLabel("All products and customers", {
        exact: true,
      });
      await all.waitFor();
      assert(await all.isChecked());
      for (const name of ["Category", "Collection", "Membership", "Individual"])
        await modal.getByLabel(name, { exact: true }).check();
      assert(!(await all.isChecked()));
      await modal.getByLabel("Sarees", { exact: true }).check();
      await modal.getByLabel("Kurtas", { exact: true }).check();
      await modal.getByLabel("Summer collection", { exact: true }).check();
      await modal.getByLabel("Gold", { exact: true }).check();
      await modal.getByLabel("Silver", { exact: true }).check();
      await modal
        .getByRole("combobox", { name: "Search customers", exact: true })
        .fill("Asha");
      await page.getByRole("option", { name: /Asha Rao/ }).click();
      assert(
        (await modal.innerText()).includes(
          "hidden from storefront coupon lists",
        ),
      );
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const box = await modal.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= width);
      }
      await modal
        .getByRole("button", { name: "Create discount", exact: true })
        .click();
      await modal.waitFor({ state: "hidden" });
      assert.deepEqual(saved.category_ids, [
        "category-sarees",
        "category-kurtas",
      ]);
      assert.deepEqual(saved.collection_ids, ["collection-summer"]);
      assert.deepEqual(saved.memberships.sort(), ["gold", "silver"]);
      assert.deepEqual(saved.customer_ids, ["target-customer"]);
      await page
        .getByRole("row")
        .filter({ hasText: "Combined" })
        .getByRole("button", { name: "Edit", exact: true })
        .click();
      const edit = page.getByRole("dialog", {
        name: "Edit discount",
        exact: true,
      });
      await edit.getByText("Asha Rao").waitFor();
      assert(await edit.getByLabel("Sarees", { exact: true }).isChecked());
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Loyalty top members show customer IDs, memberships, points and rupee credit values",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      await page.route("**/api/v1/crm/loyalty", (route) =>
        route.fulfill({
          json: {
            settings: {
              points_per_100: 5,
              redemption_points: 100,
              redemption_value_minor: 100,
            },
            members: 2,
            points_earned: 4880,
            points_adjusted: 0,
            recent: [],
            top: [
              {
                id: "member-one",
                customer_code: "CUS-00018",
                name: "Chandan",
                segment: "platinum",
                loyalty_points: 4025,
                credit_balance_minor: 4025,
              },
              {
                id: "member-two",
                customer_code: "CUS-00019",
                name: "Chandan",
                segment: "gold",
                loyalty_points: 855,
                credit_balance_minor: 855,
              },
            ],
          },
        }),
      );
      await page.goto(`${baseURL}/portal/customers`);
      await page.getByRole("tab", { name: "Loyalty", exact: true }).click();
      const table = page.getByRole("table");
      for (const name of [
        "Customer ID",
        "Name",
        "Membership",
        "Loyalty points",
        "Credit balance (₹)",
      ])
        await table.getByRole("columnheader", { name, exact: true }).waitFor();
      const first = table.getByRole("row").filter({ hasText: "CUS-00018" });
      assert((await first.innerText()).includes("Chandan"));
      await first.getByText("Platinum", { exact: true }).waitFor();
      assert((await first.innerText()).includes("4,025"));
      assert((await first.innerText()).includes("₹40.25"));
      const second = table.getByRole("row").filter({ hasText: "CUS-00019" });
      await second.getByText("Gold", { exact: true }).waitFor();
      assert((await second.innerText()).includes("₹8.55"));
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      await first
        .getByRole("button", { name: "CUS-00018", exact: true })
        .click();
      await page.waitForURL("**/portal/customers/member-one");
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Analytics top customers include distinct customer display IDs",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      await page.route("**/api/v1/crm/analytics", (route) =>
        route.fulfill({
          json: {
            customer_growth: [],
            segments: ["regular", "silver", "gold", "platinum", "inactive"].map(
              (key) => ({ key, customers: 0 }),
            ),
            orders_by_channel: [],
            avg_lifetime_value_minor: 150000,
            avg_orders_per_customer: 1,
            top_customers: [
              {
                id: "customer-one",
                customer_code: "CUS-00018",
                name: "Chandan",
                segment: "platinum",
                total_orders: 3,
                total_spent_minor: 1710000,
              },
              {
                id: "customer-two",
                customer_code: "CUS-00019",
                name: "Chandan",
                segment: "gold",
                total_orders: 1,
                total_spent_minor: 855000,
              },
            ],
          },
        }),
      );
      await page.goto(`${baseURL}/portal/customers`);
      await page.getByRole("tab", { name: "Analytics", exact: true }).click();
      const table = page.getByRole("table");
      await table
        .getByRole("columnheader", { name: "Customer ID", exact: true })
        .waitFor();
      for (const code of ["CUS-00018", "CUS-00019"]) {
        const row = table.getByRole("row").filter({ hasText: code });
        assert((await row.innerText()).includes("Chandan"));
        await row.getByRole("link", { name: code, exact: true }).waitFor();
      }
      assert.equal(
        await table
          .getByRole("link", { name: "CUS-00018", exact: true })
          .getAttribute("href"),
        "/portal/customers/customer-one",
      );
      assert((await table.innerText()).includes("₹17,100.00"));
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);

test(
  "Feedback category filter combines with search, branch and rating",
  { timeout: 60000 },
  async () => {
    const { page, context, writes } = await fixture();
    try {
      const queries = [];
      await page.route("**/api/v1/feedback/categories", (route) =>
        route.fulfill({
          json: [
            { id: "cat-sarees", name: "Sarees" },
            { id: "cat-dresses", name: "Dresses" },
          ],
        }),
      );
      await page.route("**/api/v1/feedback?*", (route) => {
        queries.push(new URL(route.request().url()));
        return route.fulfill({
          json: [
            {
              id: "review-one",
              rating: 5,
              comment: "Lovely saree",
              product_name: "Silk saree",
              customer_name: "Asha Rao",
              customer_id: "customer-42",
              customer_code: "CUS-00042",
              order_id: null,
              order_number: null,
              branch_name: "Main branch",
              branch_id: "b1",
              branch_code: "B01",
              channel: "online",
              created_at: "2026-10-27T10:00:00Z",
            },
          ],
        });
      });
      await page.goto(`${baseURL}/portal/feedback`);
      await page
        .getByRole("columnheader", { name: "Customer ID", exact: true })
        .waitFor();
      const customerLink = page.getByRole("link", {
        name: "CUS-00042",
        exact: true,
      });
      assert.equal(
        await customerLink.getAttribute("href"),
        "/portal/customers/customer-42",
      );
      assert(
        !(await page.getByRole("table").innerText()).includes("customer-42"),
      );
      const search = page.getByRole("textbox", {
        name: "Search feedback",
        exact: true,
      });
      const branch = page.getByRole("combobox", {
        name: "Filter feedback by branch",
        exact: true,
      });
      const rating = page.getByRole("combobox", {
        name: "Filter feedback by rating",
        exact: true,
      });
      const category = page.getByRole("combobox", {
        name: "Filter feedback by category",
        exact: true,
      });
      await category.waitFor();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        if (width >= 768) {
          const boxes = await Promise.all(
            [search, branch, rating, category].map((item) =>
              item.boundingBox(),
            ),
          );
          assert(boxes.every((box) => Math.abs(box.y - boxes[0].y) < 2));
        }
      }
      await openAndCheck(page, category);
      await page.getByRole("option", { name: "Sarees", exact: true }).click();
      await branch.click();
      await page
        .getByRole("option", { name: "Second branch (B02)", exact: true })
        .click();
      await rating.click();
      await page.getByRole("option", { name: "2 stars", exact: true }).click();
      await Promise.all([
        page.waitForResponse((response) => {
          const params = new URL(response.url()).searchParams;
          return (
            response.url().includes("/api/v1/feedback?") &&
            params.get("q") === "silk" &&
            params.get("category_id") === "cat-sarees" &&
            params.get("branch_id") === "b2" &&
            params.get("rating") === "2"
          );
        }),
        search.fill("silk"),
      ]);
      await category.click();
      await Promise.all([
        page.waitForResponse((response) => {
          const params = new URL(response.url()).searchParams;
          return (
            response.url().includes("/api/v1/feedback?") &&
            !params.get("category_id") &&
            params.get("q") === "silk" &&
            params.get("rating") === "2"
          );
        }),
        page
          .getByRole("option", { name: "All categories", exact: true })
          .click(),
      ]);
      assert(
        queries.some(
          (url) => url.searchParams.get("category_id") === "cat-sarees",
        ),
      );
      assert.equal(writes.length, 0);
    } finally {
      await context.close();
    }
  },
);
