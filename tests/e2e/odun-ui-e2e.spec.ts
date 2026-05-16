import { expect, test, type Page } from "@playwright/test";

const routes = [
  { path: "/", heading: "Bugün ne yapacağız?", nav: "Bugün" },
  { path: "/shipping", heading: "Kargo merkezi", nav: "Kargo" },
  { path: "/inventory", heading: "Üretim ve stok", nav: "Stok" },
  { path: "/orders", heading: "Sipariş hazırlığı", nav: "Siparişler" },
  { path: "/quotes", heading: "Kargo fiyat kararları", nav: "Fiyat" },
  { path: "/payments", heading: "Ödeme kontrolü", nav: "Ödeme" },
  { path: "/handoffs", heading: "Kargoya teslim hazırlığı", nav: "Teslim" },
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

async function optionCount(page: Page, label: string) {
  return page.getByLabel(label).locator("option").count();
}

test.describe("ODUN UI PM intake end-to-end", () => {
  test.use({ viewport: { width: 1440, height: 1200 } });

  test("all core pages render from PM intake data without synthetic fixture labels", async ({ page }) => {
    test.setTimeout(60_000);
    const errors = await collectConsole(page);

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
      await expect(page.getByRole("link", { name: route.nav })).toHaveAttribute("aria-current", "page");
      await expect(page.getByText(/Sipariş A|Sipariş B|pm:synthetic/)).toHaveCount(0);
      await expectNoViewportOverflow(page);
    }

    expect(errors).toEqual([]);
  });

  test("orders flow uses PM intake orders and keeps PM mutation disabled", async ({ page }) => {
    await page.goto("/orders");

    if ((await optionCount(page, "Kontrol siparişi")) > 0) {
      await page.getByLabel("Kontrol siparişi").selectOption({ index: 0 });
    }

    await expect(page.getByTestId("orders-workbench")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Backer #|Henüz aktarılmış sipariş yok/ })).toBeVisible();
    await page.getByLabel("Bekletme sebebi").fill("Canlı olmayan UI kontrolü");
    await page.getByRole("button", { name: "Beklet", exact: true }).click();
    await expect(page.getByText("Canlı olmayan UI kontrolü")).toBeVisible();
    await expect(page.getByRole("button", { name: "PM verisini değiştir" })).toBeDisabled();
  });

  test("shipping flow reads PM order lines and keeps live labels disabled", async ({ page }) => {
    await page.goto("/shipping");

    if ((await optionCount(page, "Gönderi siparişi")) > 0) {
      await page.getByLabel("Gönderi siparişi").selectOption({ index: 0 });
    }

    await expect(page.getByTestId("shipping-console")).toBeVisible();
    await page.getByRole("button", { name: "Fiyatı kontrol et" }).click();
    await expect(page.getByText(/henüz kargo fiyat kaydı yok|kontrol edildi/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Canlı etiket bas" })).toBeDisabled();

    await page.getByText("Paketleme ve kargo ağı detayları").click();
    await expect(page.getByTestId("interactive-data-table")).toBeVisible();
    await expect(page.getByText(/CLF-|Bu filtrelerle eşleşen kayıt yok/).first()).toBeVisible();
  });

  test("quote, payment, handoff, and report controls stay local", async ({ page }) => {
    await page.goto("/quotes");
    await expect(page.getByTestId("guided-quote-workflow")).toBeVisible();
    await page.getByText("Gelişmiş fiyat ve sağlayıcı kontrolleri").click();
    await page.getByLabel("Temel tutar").fill("100");
    await page.getByLabel("Güvenlik payı %").fill("10");
    await page.getByTestId("manual-ddp-control").getByRole("button", { name: "Fiyatı hazırla" }).click();
    await expect(page.getByText("toplam USD 110.00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Canlıya gönder" })).toBeDisabled();

    await page.goto("/payments");
    await page.getByLabel("Gelen ödeme tutarı").fill("10");
    await page.getByRole("button", { name: "Ödemeyi kontrol et" }).click();
    await expect(page.getByTestId("payment-event-workbench").locator(".decision-summary strong")).toContainText("Ödeme kontrolü gerekli");
    await expect(page.getByRole("button", { name: "Canlı siparişi kilitle" })).toBeDisabled();

    await page.goto("/handoffs");
    await page.getByRole("button", { name: "Önizleme oluştur" }).click();
    await expect(page.getByText(/sipariş için .* önizlemesi hazırlandı/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Partnere gönder" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Etiket oluştur" })).toBeDisabled();

    await page.goto("/reports");
    await page.getByRole("button", { name: "7 gün" }).click();
    await page.getByLabel("Partner yönetir").check();
    await page.getByRole("button", { name: "Özeti üret" }).click();
    await expect(page.getByText("3 kargo yolu için güvenli özet üretildi")).toBeVisible();
    await page.getByRole("button", { name: "Güvenli dışa aktar" }).click();
    await expect(page.getByText("Kişisel veri içermeyen dışa aktarım önizlendi")).toBeVisible();
  });

  test("mobile viewport keeps the live PM workflow usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1000 });

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { name: route.heading, level: 1 })).toBeVisible();
      await expectNoViewportOverflow(page);
    }
  });
});
