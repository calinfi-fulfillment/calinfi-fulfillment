export const cockpitQueues = [
  { label: "Fiyat bekleyen", count: 18, detail: "Ürün ve adres hazır; kargo fiyatı çıkarılabilir.", tone: "good" },
  { label: "Önce çözülmeli", count: 7, detail: "Adres, SKU veya bekletme sebebi var.", tone: "danger" },
  { label: "Ödeme bekleyen", count: 12, detail: "Fiyat seçildi; ödeme haberi bekleniyor.", tone: "warning" },
  { label: "Kargoya hazır", count: 4, detail: "Ödeme tamam; dışa aktarım önizlenebilir.", tone: "neutral" },
] as const;

export const nextActionRows = [
  {
    priority: "1",
    queue: "Ürün bilgisi",
    item: "Gümrük alanları eksik olan ürünü tamamla",
    owner: "Veri",
    status: "blocker",
  },
  {
    priority: "2",
    queue: "DDP / Partner",
    item: "Hong Kong test rotası için manuel kargo fiyatını onayla",
    owner: "Operasyon",
    status: "review",
  },
  {
    priority: "3",
    queue: "Ödeme",
    item: "Test ödeme olayını kontrol et",
    owner: "Finans",
    status: "ready",
  },
] as const;

export const readinessRows = [
  {
    sku: "CLF-ODN-CORE",
    title: "ODUN Ana Kutu",
    status: "ready",
    packaging: "ready",
    customs: "ready",
  },
  {
    sku: "CLF-ACC-STAND",
    title: "Stand",
    status: "review",
    packaging: "missing dimensions",
    customs: "not needed",
  },
  {
    sku: "CLF-ACC-DDP",
    title: "DDP Test Eklentisi",
    status: "blocker",
    packaging: "ready",
    customs: "missing HS/origin/value",
  },
] as const;

export const routeReviewRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    country: "US",
    route: "REGIONAL_3PL",
    payment: "pending",
    action: "quote ready",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    country: "HK",
    route: "CHINA_HK_DIRECT_DDP",
    payment: "covered approval",
    action: "manual DDP review",
  },
] as const;

export const orderRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    status: "selection_submitted",
    address: "complete",
    products: "ready",
    route: "REGIONAL_3PL",
  },
  {
    sourceOrderKey: "pm:synthetic-order-002",
    status: "manual_hold",
    address: "needs_review",
    products: "blocked",
    route: "MANUAL_SPECIAL",
  },
] as const;

export const quoteRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    route: "REGIONAL_3PL",
    mode: "3PL_INTERNAL_LABEL",
    quote: "none",
    expires: "-",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    route: "CHINA_HK_DIRECT_DDP",
    mode: "DIRECT_DDP_PROVIDER",
    quote: "manual needed",
    expires: "-",
  },
] as const;

export const paymentRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    quote: "fresh",
    status: "payment_pending",
    guard: "awaiting signed event",
  },
] as const;

export const handoffRows = [
  {
    sourceOrderKey: "pm:synthetic-locked-001",
    route: "REGIONAL_3PL",
    status: "ready",
    exportType: "csv",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-locked-001",
    route: "CHINA_HK_DIRECT_DDP",
    status: "ready",
    exportType: "json",
  },
] as const;

export const exceptionRows = [
  {
    code: "missing_product_master_sku",
    severity: "blocker",
    owner: "Veri",
    age: "0d",
  },
  {
    code: "payment_amount_mismatch",
    severity: "review",
    owner: "Finans",
    age: "1d",
  },
] as const;

export const reportRows = [
  { metric: "Fiyata hazır sipariş", value: "18" },
  { metric: "Blokajlı sipariş", value: "7" },
  { metric: "Ödeme bekleyen", value: "12" },
  { metric: "Kargoya hazır", value: "4" },
] as const;

export const shippingOverviewRows = [
  { label: "Fiyat alınabilir", value: "18", detail: "Adres ve paket bilgisi hazır" },
  { label: "Etiket bekler", value: "4", detail: "Ödeme kilidi tamamlandı" },
  { label: "Takipte", value: "0", detail: "Canlı takip henüz kapalı" },
  { label: "Kontrol gerekli", value: "7", detail: "Eksik ürün/adres/gümrük bilgisi" },
] as const;

export const shippingRateRows = [
  {
    id: "easyship-sandbox-standard",
    carrier: "Sandbox Standard",
    service: "Ekonomik",
    eta: "5-8 gün",
    price: "USD 24.80",
    score: "En düşük fiyat",
    status: "ready",
  },
  {
    id: "easyship-sandbox-express",
    carrier: "Sandbox Express",
    service: "Hızlı",
    eta: "2-4 gün",
    price: "USD 38.40",
    score: "Daha hızlı",
    status: "review",
  },
  {
    id: "manual-ddp-preview",
    carrier: "Manuel DDP",
    service: "Çin/HK direkt",
    eta: "Operasyon onayı",
    price: "USD 130.45",
    score: "Gümrük kontrolü ister",
    status: "blocker",
  },
] as const;

export const shipmentConsoleRows = [
  {
    sourceOrderKey: "pm:synthetic-order-001",
    destination: "ABD / Seattle",
    package: "ODUN ana kutu",
    route: "REGIONAL_3PL",
    quote: "quote ready",
    label: "label_pending",
  },
  {
    sourceOrderKey: "pm:synthetic-ddp-001",
    destination: "Hong Kong",
    package: "ODUN + DDP eklenti",
    route: "CHINA_HK_DIRECT_DDP",
    quote: "manual needed",
    label: "blocked",
  },
] as const;

export const shippingGuardRows = [
  { label: "Easyship sandbox fiyat", status: "review", detail: "Token kabul edilince gerçek sandbox fiyat çekilecek" },
  { label: "Canlı etiket", status: "blocked", detail: "Owner onayı olmadan kapalı" },
  { label: "Canlı takip", status: "blocked", detail: "Webhook sözleşmesi bitmeden kapalı" },
  { label: "PM verisi", status: "ready", detail: "PM canlı verisi değişmez" },
] as const;
