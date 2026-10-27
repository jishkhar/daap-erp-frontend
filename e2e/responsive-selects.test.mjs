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
          page.getByRole("option", { name: "Online", exact: true }).click(),
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
        await page.getByRole("button", { name: /Website requests/ }).click();
        assert.equal(
          await page
            .getByRole("button", { name: /Website requests/ })
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
