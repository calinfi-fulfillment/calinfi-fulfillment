import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", heading: "Bugün ne yapacağız?", nav: "Kontrol Paneli" },
  { path: "/shipping", heading: "Kargo merkezi", nav: "Kargo Merkezi" },
  { path: "/inventory", heading: "Üretim ve stok", nav: "Üretim & Stok" },
  { path: "/orders", heading: "Sipariş hazırlığı", nav: "Siparişler" },
  { path: "/quotes", heading: "Kargo ücreti çıkar", nav: "Kargo Ücreti" },
  { path: "/payments", heading: "Ödeme kontrolü", nav: "Ödemeler" },
  { path: "/handoffs", heading: "Kargoya teslim hazırlığı", nav: "Kargoya Hazır" },
  { path: "/exceptions", heading: "Sorun çözme masası", nav: "Sorunlar" },
  { path: "/reports", heading: "Genel durum raporu", nav: "Raporlar" },
] as const;

async function collectConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function expectNoViewportOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("ODUN UI synthetic end-to-end", () => {
  test.use({ viewport: { width: 1440, height: 1200 } });

  test("all core pages render with fake data and safe controls", async ({ page }) => {
    const errors = await collectConsole(page);

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: route.nav })).toHaveAttribute("aria-current", "page");
      await expectNoViewportOverflow(page);
    }

    expect(errors).toEqual([]);
  });

  test("orders flow updates selected order, local events, and keeps live PM mutation disabled", async ({ page }) => {
    await page.goto("/orders");

    await page.getByLabel("Kontrol siparişi").selectOption("pm:synthetic-order-002");
    await expect(page.getByTestId("orders-workbench").getByLabel("Kargo yolu")).toHaveValue("MANUAL_SPECIAL");
    await expect(page.getByText("Ürün bilgisi hazır").locator("..").getByText("blokaj")).toBeVisible();

    await page.getByLabel("Bekletme sebebi").fill("Fake UI test hold");
    await page.getByRole("button", { name: "Beklet" }).click();
    await expect(page.getByText("Fake UI test hold")).toBeVisible();
    await expect(page.getByRole("button", { name: "PM verisini değiştir" })).toBeDisabled();
  });

  test("shipping flow compares fake rates without enabling live labels", async ({ page }) => {
    await page.goto("/shipping");

    await page.getByRole("button", { name: /Sandbox Express/ }).click();
    await expect(page.getByText("Sandbox Express").last()).toBeVisible();

    await page.getByRole("button", { name: "Sandbox fiyatı dene" }).click();
    await expect(page.getByText("Sandbox Express önizlendi")).toBeVisible();

    await page.getByLabel("Gönderi siparişi").selectOption("pm:synthetic-ddp-001");
    await expect(page.getByRole("textbox", { name: "Varış" })).toHaveValue("Hong Kong");
    await expect(page.getByRole("textbox", { name: "Kargo yolu" })).toHaveValue("Çin/HK direkt DDP");
    await expect(page.getByRole("button", { name: "Canlı etiket bas" })).toBeDisabled();
  });

  test("inventory flow prepares a local fulfillment stock feed without warehouse mutation", async ({ page }) => {
    await page.goto("/inventory");

    await expect(page.getByText("+USD 3,956.00")).toBeVisible();
    await page.getByLabel("Stok SKU").selectOption("CLF-ACC-DDP");
    await expect(page.getByText("0 / 12 ayrılabilir")).toBeVisible();

    await page.getByRole("button", { name: "SFC stok kontrolü" }).click();
    await expect(page.getByText("CLF-ACC-DDP için getStockBySKU read-only planlandı")).toBeVisible();

    await page.getByRole("button", { name: "Fulfillment feed hazırla" }).click();
    await expect(page.getByText("SKU için rezerve edilebilir stok fulfillment planına")).toBeVisible();
    await expect(page.getByRole("button", { name: "Canlı depo güncelle" })).toBeDisabled();
  });

  test("quote, payment, handoff, exception, and report controls behave locally", async ({ page }) => {
    await page.goto("/quotes");
    await page.getByLabel("Temel tutar").fill("-10");
    await expect(page.locator(".quote-total > span")).toContainText("USD 3.00");
    await page.getByLabel("Temel tutar").fill("100");
    await page.getByLabel("Güvenlik payı %").fill("10");
    await page.getByRole("button", { name: "Fiyatı hazırla" }).click();
    await expect(page.getByText("toplam USD 110.00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Canlıya gönder" })).toBeDisabled();

    await page.goto("/payments");
    await page.getByLabel("Gelen ödeme tutarı").fill("10");
    await page.getByRole("button", { name: "Ödemeyi kontrol et" }).click();
    await expect(page.getByTestId("payment-event-workbench").locator(".decision-summary strong")).toContainText("Ödeme kontrolü gerekli");
    await expect(page.getByRole("button", { name: "Canlı siparişi kilitle" })).toBeDisabled();

    await page.goto("/handoffs");
    await page.getByLabel("Çin/HK direkt DDP").uncheck();
    await expect(page.getByText("1 kilitli sipariş")).toBeVisible();
    await page.getByRole("button", { name: "Önizleme oluştur" }).click();
    await expect(page.getByText("1 sipariş için CSV önizlemesi hazırlandı")).toBeVisible();
    await expect(page.getByRole("button", { name: "Partnere gönder" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Etiket oluştur" })).toBeDisabled();

    await page.goto("/exceptions");
    await page.getByRole("combobox", { name: "Sorun" }).selectOption("payment_amount_mismatch");
    await page.getByRole("combobox", { name: "Sorumlu" }).selectOption("Finans");
    await page.getByRole("button", { name: "Ata" }).click();
    await expect(page.getByText("Finans ekibine atandı")).toBeVisible();
    await expect(page.getByRole("button", { name: "Canlı çöz" })).toBeDisabled();

    await page.goto("/reports");
    await page.getByRole("button", { name: "7 gün" }).click();
    await page.getByLabel("Partner yönetir").check();
    await page.getByRole("button", { name: "Özeti üret" }).click();
    await expect(page.getByText("3 kargo yolu için güvenli özet üretildi")).toBeVisible();
    await page.getByRole("button", { name: "Güvenli dışa aktar" }).click();
    await expect(page.getByText("Kişisel veri içermeyen dışa aktarım önizlendi")).toBeVisible();
  });

  test("mobile viewport keeps the workflow usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
      await expectNoViewportOverflow(page);
    }
  });
});
