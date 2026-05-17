import type { SupabaseClient } from "@supabase/supabase-js";

import { createEasyshipReadiness } from "@/lib/easyship";
import type { FulfillmentDemandInput, InventorySupplyInput } from "@/lib/inventory";
import { liveMutationFlags } from "@/lib/safety";
import { createStripeCheckoutReadiness } from "@/lib/stripe-checkout";
import { getSupabaseServiceRoleClient, hasFulfillmentSupabaseServiceRoleConfig } from "@/lib/supabase/server";

type AnyRow = Record<string, any>;

export type OpsQueueRow = {
  count: number;
  detail: string;
  label: string;
  tone: string;
};

export type OpsActionRow = {
  item: string;
  owner: string;
  priority: string;
  queue: string;
  status: string;
};

export type OpsRouteRow = {
  action: string;
  country: string;
  payment: string;
  route: string;
  sourceOrderKey: string;
};

export type OpsOrderRow = {
  address: string;
  products: string;
  route: string;
  sourceOrderKey: string;
  status: string;
};

export type OpsQuoteRow = {
  expires: string;
  mode: string;
  quote: string;
  route: string;
  sourceOrderKey: string;
};

export type OpsPaymentRow = {
  guard: string;
  quote: string;
  sourceOrderKey: string;
  status: string;
};

export type OpsHandoffRow = {
  exportType: string;
  route: string;
  sourceOrderKey: string;
  status: string;
};

export type OpsExceptionRow = {
  age: string;
  code: string;
  owner: string;
  severity: string;
};

export type OpsReportRow = {
  metric: string;
  value: string;
};

export type OpsShipmentRow = {
  destination: string;
  label: string;
  package: string;
  quote: string;
  route: string;
  sourceOrderKey: string;
};

export type OpsShippingRateRow = {
  carrier: string;
  eta: string;
  id: string;
  price: string;
  score: string;
  service: string;
  status: string;
};

export type OpsShippingOverviewRow = {
  detail: string;
  label: string;
  value: string;
};

export type OpsGuardRow = {
  detail: string;
  label: string;
  status: string;
};

export type OpsOrderLineRow = {
  builtin: string;
  quantity: string;
  role: string;
  sku: string;
  sourceOrderKey: string;
  status: string;
  title: string;
};

export type OpsUiData = {
  cockpitQueues: OpsQueueRow[];
  connection: {
    message: string;
    mode: "live" | "empty" | "unavailable";
    orderCount: number;
    source: string;
  };
  exceptionRows: OpsExceptionRow[];
  handoffRows: OpsHandoffRow[];
  inventoryDemandRows: FulfillmentDemandInput[];
  inventorySupplyRows: InventorySupplyInput[];
  nextActionRows: OpsActionRow[];
  orderLineRows: OpsOrderLineRow[];
  orderRows: OpsOrderRow[];
  paymentRows: OpsPaymentRow[];
  quoteRows: OpsQuoteRow[];
  readinessRows: Array<{ customs: string; packaging: string; sku: string; status: string; title: string }>;
  reportRows: OpsReportRow[];
  routeReviewRows: OpsRouteRow[];
  shipmentConsoleRows: OpsShipmentRow[];
  shippingGuardRows: OpsGuardRow[];
  shippingOverviewRows: OpsShippingOverviewRow[];
  shippingRateRows: OpsShippingRateRow[];
};

const EMPTY_DATA: OpsUiData = {
  cockpitQueues: [
    {
      count: 0,
      detail: "PM'de owner onayı verilmiş ve Fulfillment intake'e aktarılmış sipariş bekleniyor.",
      label: "PM siparişi",
      tone: "warning",
    },
  ],
  connection: {
    message: "Fulfillment staging veritabanında PM kaynaklı sipariş bulunamadı.",
    mode: "empty",
    orderCount: 0,
    source: "Fulfillment intake",
  },
  exceptionRows: [],
  handoffRows: [],
  inventoryDemandRows: [],
  inventorySupplyRows: [],
  nextActionRows: [
    {
      item: "PM admininden bir backer için manuel Fulfillment aktarım onayı ver.",
      owner: "Owner",
      priority: "1",
      queue: "PM aktarımı",
      status: "approval needed",
    },
  ],
  orderLineRows: [],
  orderRows: [],
  paymentRows: [],
  quoteRows: [],
  readinessRows: [],
  reportRows: [
    { metric: "PM kaynaklı sipariş", value: "0" },
    { metric: "Fiyat bekleyen", value: "0" },
    { metric: "Ödeme bekleyen", value: "0" },
    { metric: "Kargoya hazır", value: "0" },
  ],
  routeReviewRows: [],
  shipmentConsoleRows: [],
  shippingGuardRows: [],
  shippingOverviewRows: [
    { detail: "PM intake henüz boş", label: "Sipariş", value: "0" },
    { detail: "Canlı etiket kapalı", label: "Etiket bekler", value: "0" },
    { detail: "Canlı takip kapalı", label: "Takipte", value: "0" },
    { detail: "Açık blokaj yok", label: "Kontrol gerekli", value: "0" },
  ],
  shippingRateRows: [],
};

function text(value: unknown, fallback = "") {
  return String(value ?? fallback).trim();
}

function money(cents: unknown, currency: unknown) {
  const amount = Number(cents ?? 0);
  const code = text(currency, "USD");
  return `${code} ${(amount / 100).toFixed(2)}`;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function many<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function sourceSnapshot(row: AnyRow) {
  return row.order_snapshot && typeof row.order_snapshot === "object" ? row.order_snapshot : {};
}

function recipientSnapshot(row: AnyRow) {
  return row.recipient_snapshot && typeof row.recipient_snapshot === "object" ? row.recipient_snapshot : {};
}

function isPledgeManagerOrder(row: AnyRow) {
  return sourceSnapshot(row).source === "pledge_manager";
}

function displayOrder(row: AnyRow) {
  const backer = first<AnyRow>(row.backers);
  const backerNumber = text(backer?.backer_number);
  if (backerNumber) return `Backer #${backerNumber}`;

  const sourceKey = text(row.source_order_key);
  return sourceKey ? sourceKey.replace(/^pm:/, "PM ") : "PM siparişi";
}

function country(row: AnyRow) {
  return text(recipientSnapshot(row).country, "unknown").toUpperCase();
}

function routeFor(row: AnyRow) {
  const decision = first<AnyRow>(row.delivery_decisions);
  const decidedRoute = text(decision?.route_type);
  if (decidedRoute) return decidedRoute;

  const destination = country(row);
  if (destination === "HK" || destination === "CN") return "CHINA_HK_DIRECT_DDP";
  return "REGIONAL_3PL";
}

function modeFor(row: AnyRow) {
  const decision = first<AnyRow>(row.delivery_decisions);
  const decidedMode = text(decision?.shipping_mode);
  if (decidedMode) return decidedMode;

  return routeFor(row) === "CHINA_HK_DIRECT_DDP" ? "DIRECT_DDP_PROVIDER" : "3PL_INTERNAL_LABEL";
}

function linesFor(row: AnyRow) {
  return many<AnyRow>(row.order_lines);
}

function physicalLines(row: AnyRow) {
  return linesFor(row).filter((line) => line.is_physical !== false && line.is_builtin_main_box_item !== true);
}

function productStatus(row: AnyRow) {
  const lines = linesFor(row);
  if (!lines.length) return "blocked";

  const statuses = lines.map((line) => text(first<AnyRow>(line.products)?.readiness_status, line.product_id ? "needs_review" : "blocked"));
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status !== "ready")) return "needs_review";
  return "ready";
}

function readyForQuote(row: AnyRow) {
  return row.order_status !== "cancelled" && row.address_status === "complete" && productStatus(row) === "ready";
}

function latestByDate(rows: AnyRow[], key: string) {
  return [...rows].sort((left, right) => Date.parse(text(right[key])) - Date.parse(text(left[key])))[0] ?? null;
}

function latestQuote(row: AnyRow) {
  return latestByDate(many<AnyRow>(row.shipping_quotes), "created_at") ?? many<AnyRow>(row.shipping_quotes)[0] ?? null;
}

function latestPayment(row: AnyRow) {
  return latestByDate(many<AnyRow>(row.payment_events), "created_at") ?? many<AnyRow>(row.payment_events)[0] ?? null;
}

function latestHandoff(row: AnyRow) {
  return latestByDate(many<AnyRow>(row.fulfillment_handoffs), "created_at") ?? many<AnyRow>(row.fulfillment_handoffs)[0] ?? null;
}

function quoteStatus(row: AnyRow) {
  const quote = latestQuote(row);
  if (quote) return text(quote.status, "quote ready");
  return routeFor(row) === "CHINA_HK_DIRECT_DDP" ? "manual needed" : "none";
}

function paymentStatus(row: AnyRow) {
  const payment = latestPayment(row);
  if (payment) return text(payment.status, "accepted");
  return latestQuote(row) ? "payment_pending" : "pending";
}

function packagingStatus(product: AnyRow | null) {
  if (!product) return "missing dimensions";
  return product.weight_grams && product.length_mm && product.width_mm && product.height_mm ? "ready" : "missing dimensions";
}

function customsStatus(product: AnyRow | null) {
  if (!product?.is_builtin_main_box_item && (!product?.hs_code || !product?.country_of_origin || product?.declared_value_cents === null)) {
    return "missing HS/origin/value";
  }
  return "ready";
}

function ageFrom(value: unknown) {
  const createdAt = Date.parse(text(value));
  if (!Number.isFinite(createdAt)) return "0d";
  const days = Math.max(0, Math.floor((Date.now() - createdAt) / 86_400_000));
  return `${days}d`;
}

function addAction(actions: OpsActionRow[], queue: string, item: string, owner: string, status: string) {
  actions.push({ item, owner, priority: String(actions.length + 1), queue, status });
}

async function safeRows<T = AnyRow>(query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>, table: string) {
  const { data, error } = await query;
  if (error) throw new Error(`${table} read failed: ${error.message ?? "unknown error"}`);
  return data ?? [];
}

async function loadOrders(supabase: SupabaseClient) {
  const rows = await safeRows<AnyRow>(
    supabase
      .from("orders")
      .select(
        `
        id,
        source_order_key,
        order_number,
        order_status,
        address_status,
        recipient_snapshot,
        order_snapshot,
        created_at,
        updated_at,
        locked_at,
        backers(backer_number),
        order_lines(
          id,
          source_line_key,
          sku,
          title,
          quantity,
          line_role,
          is_visible,
          is_physical,
          is_builtin_main_box_item,
          unit_value_cents,
          unit_value_currency,
          products(
            readiness_status,
            is_builtin_main_box_item,
            weight_grams,
            length_mm,
            width_mm,
            height_mm,
            hs_code,
            country_of_origin,
            declared_value_cents,
            declared_value_currency
          )
        ),
        delivery_decisions(route_type,shipping_mode,decision_status,created_at),
        shipping_quotes(provider,status,currency,total_cents,expires_at,created_at),
        payment_events(provider,event_type,status,currency,amount_cents,created_at),
        fulfillment_handoffs(status,export_type,created_at)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(500),
    "orders",
  );

  return rows.filter(isPledgeManagerOrder);
}

async function loadStockFeed(supabase: SupabaseClient): Promise<InventorySupplyInput[]> {
  const rows = await safeRows<AnyRow>(
    supabase
      .from("fulfillment_stock_feed")
      .select("sku,title,produced_quantity,received_quantity,on_hand_quantity,reserved_quantity,damaged_quantity,in_transit_quantity,safety_stock_quantity")
      .limit(500),
    "fulfillment_stock_feed",
  );

  return rows.map((row) => ({
    batchCode: "FULFILLMENT-STOCK-FEED",
    damagedQuantity: Number(row.damaged_quantity ?? 0),
    inTransitQuantity: Number(row.in_transit_quantity ?? 0),
    locationCode: "FULFILLMENT",
    locationName: "Fulfillment stock feed",
    locationType: "internal",
    onHandQuantity: Number(row.on_hand_quantity ?? 0),
    plannedQuantity: Number(row.produced_quantity ?? 0),
    producedQuantity: Number(row.produced_quantity ?? 0),
    receivedQuantity: Number(row.received_quantity ?? 0),
    reservedQuantity: Number(row.reserved_quantity ?? 0),
    safetyStockQuantity: Number(row.safety_stock_quantity ?? 0),
    sku: text(row.sku),
    status: Number(row.on_hand_quantity ?? 0) > 0 ? "received" : "planned",
    title: text(row.title, row.sku),
  }));
}

function buildData(orders: AnyRow[], inventorySupplyRows: InventorySupplyInput[]): OpsUiData {
  if (!orders.length) return { ...EMPTY_DATA, inventorySupplyRows };

  const blockedOrders = orders.filter((order) => order.address_status !== "complete" || productStatus(order) !== "ready");
  const quoteReadyOrders = orders.filter((order) => readyForQuote(order) && !latestQuote(order));
  const paymentWaitingOrders = orders.filter((order) => latestQuote(order) && !latestPayment(order));
  const handoffReadyOrders = orders.filter((order) => latestPayment(order)?.status === "accepted" || latestHandoff(order)?.status === "ready");

  const orderRows: OpsOrderRow[] = orders.map((order) => ({
    address: text(order.address_status, "missing"),
    products: productStatus(order),
    route: routeFor(order),
    sourceOrderKey: displayOrder(order),
    status: text(order.order_status, "selection_submitted"),
  }));

  const quoteRows: OpsQuoteRow[] = orders.filter(readyForQuote).map((order) => {
    const quote = latestQuote(order);
    return {
      expires: quote?.expires_at ? new Date(quote.expires_at).toLocaleDateString("tr-TR") : "-",
      mode: modeFor(order),
      quote: quote ? text(quote.status, "quote ready") : quoteStatus(order),
      route: routeFor(order),
      sourceOrderKey: displayOrder(order),
    };
  });

  const paymentRows: OpsPaymentRow[] = orders.map((order) => {
    const quote = latestQuote(order);
    const payment = latestPayment(order);
    return {
      guard: payment ? text(payment.event_type, "payment event") : "awaiting signed event",
      quote: quote ? money(quote.total_cents, quote.currency) : "none",
      sourceOrderKey: displayOrder(order),
      status: payment ? text(payment.status, "accepted") : paymentStatus(order),
    };
  });

  const handoffRows: OpsHandoffRow[] = orders.map((order) => {
    const handoff = latestHandoff(order);
    return {
      exportType: text(handoff?.export_type, modeFor(order) === "DIRECT_DDP_PROVIDER" ? "json" : "csv"),
      route: routeFor(order),
      sourceOrderKey: displayOrder(order),
      status: handoff ? text(handoff.status, "ready") : "not_ready",
    };
  });

  const routeReviewRows: OpsRouteRow[] = orders.map((order) => ({
    action: blockedOrders.includes(order) ? "owner action needed" : quoteStatus(order) === "none" ? "quote ready" : quoteStatus(order),
    country: country(order),
    payment: paymentStatus(order),
    route: routeFor(order),
    sourceOrderKey: displayOrder(order),
  }));

  const shipmentConsoleRows: OpsShipmentRow[] = orders.map((order) => {
    const quote = latestQuote(order);
    const handoff = latestHandoff(order);
    const itemCount = physicalLines(order).reduce((sum, line) => sum + Number(line.quantity ?? 0), 0);
    return {
      destination: country(order),
      label: handoff ? text(handoff.status, "label_pending") : "label_pending",
      package: `${itemCount} fiziksel ürün / ${linesFor(order).length} satır`,
      quote: quote ? text(quote.status, "quote ready") : quoteStatus(order),
      route: routeFor(order),
      sourceOrderKey: displayOrder(order),
    };
  });

  const shippingRateRows: OpsShippingRateRow[] = orders.flatMap((order) =>
    many<AnyRow>(order.shipping_quotes).map((quote) => ({
      carrier: text(quote.provider, "Fulfillment quote"),
      eta: quote.expires_at ? `Geçerlilik ${new Date(quote.expires_at).toLocaleDateString("tr-TR")}` : "Geçerlilik yok",
      id: `${displayOrder(order)}:${text(quote.provider, "quote")}:${text(quote.created_at, "latest")}`,
      price: money(quote.total_cents, quote.currency),
      score: displayOrder(order),
      service: modeFor(order),
      status: text(quote.status, "ready"),
    })),
  );

  const readinessBySku = new Map<string, { customs: string; packaging: string; sku: string; status: string; title: string }>();
  for (const order of orders) {
    for (const line of linesFor(order)) {
      const product = first<AnyRow>(line.products);
      readinessBySku.set(text(line.sku), {
        customs: customsStatus(product),
        packaging: packagingStatus(product),
        sku: text(line.sku),
        status: text(product?.readiness_status, "blocked"),
        title: text(line.title, line.sku),
      });
    }
  }

  const orderLineRows: OpsOrderLineRow[] = orders.flatMap((order) =>
    linesFor(order).map((line) => ({
      builtin: line.is_builtin_main_box_item ? "ready" : "none",
      quantity: String(line.quantity ?? 0),
      role: text(line.line_role, "reward"),
      sku: text(line.sku),
      sourceOrderKey: displayOrder(order),
      status: text(first<AnyRow>(line.products)?.readiness_status, "blocked"),
      title: text(line.title, line.sku),
    })),
  );

  const inventoryDemandRows: FulfillmentDemandInput[] = orders.flatMap((order) =>
    linesFor(order).map((line) => ({
      currency: text(line.unit_value_currency, "USD"),
      currentUnitAmountCents: Number(line.unit_value_cents ?? 0),
      lineRole: text(line.line_role, "reward") as FulfillmentDemandInput["lineRole"],
      orderStatus: text(order.order_status, "selection_submitted") as FulfillmentDemandInput["orderStatus"],
      originalUnitAmountCents: Number(line.unit_value_cents ?? 0),
      quantity: Number(line.quantity ?? 0),
      reservationRequired: line.is_physical !== false && line.is_builtin_main_box_item !== true,
      routeType: routeFor(order) as FulfillmentDemandInput["routeType"],
      sku: text(line.sku),
      sourceLineKey: text(line.source_line_key, `${displayOrder(order)}:${line.sku}`),
      sourceOrderKey: displayOrder(order),
      title: text(line.title, line.sku),
    })),
  );

  const exceptionRows: OpsExceptionRow[] = [];
  for (const order of orders) {
    if (order.address_status !== "complete") {
      exceptionRows.push({ age: ageFrom(order.created_at), code: "address_incomplete", owner: "Operasyon", severity: "blocker" });
    }
    if (productStatus(order) !== "ready") {
      exceptionRows.push({ age: ageFrom(order.created_at), code: "product_readiness_review", owner: "Veri", severity: "blocker" });
    }
  }

  const actions: OpsActionRow[] = [];
  if (blockedOrders.length) addAction(actions, "Eksik bilgi", `${blockedOrders.length} sipariş için adres veya ürün kontrolü yap.`, "Operasyon", "blocker");
  if (quoteReadyOrders.length) addAction(actions, "Kargo fiyatı", `${quoteReadyOrders.length} sipariş için fiyat hazırla.`, "Operasyon", "ready");
  if (paymentWaitingOrders.length) addAction(actions, "Ödeme", `${paymentWaitingOrders.length} sipariş için ödeme haberini bekle.`, "Finans", "pending");
  if (handoffReadyOrders.length) addAction(actions, "Teslim", `${handoffReadyOrders.length} sipariş için kargoya teslim önizle.`, "Operasyon", "ready");
  if (!actions.length) addAction(actions, "PM intake", "PM'den gelen siparişler okunuyor; sıradaki blokaj yok.", "Operasyon", "ready");

  const reportRows: OpsReportRow[] = [
    { metric: "PM kaynaklı sipariş", value: String(orders.length) },
    { metric: "Fiyat bekleyen", value: String(quoteReadyOrders.length) },
    { metric: "Ödeme bekleyen", value: String(paymentWaitingOrders.length) },
    { metric: "Kargoya hazır", value: String(handoffReadyOrders.length) },
    { metric: "Kontrol gereken", value: String(blockedOrders.length) },
  ];
  const flags = liveMutationFlags();
  const easyshipReadiness = createEasyshipReadiness();
  const stripeReadiness = createStripeCheckoutReadiness();
  const providerSandboxReady = flags.FULFILLMENT_ENABLE_PROVIDER_API_QUOTES && easyshipReadiness.ok && easyshipReadiness.mode === "sandbox";
  const stripeTestReady = flags.FULFILLMENT_ENABLE_STRIPE_CHECKOUT && stripeReadiness.ok;
  const handoffSandboxReady = flags.FULFILLMENT_ENABLE_HANDOFF_EXPORTS;
  const partnerSandboxReady = flags.FULFILLMENT_ENABLE_PARTNER_API_PUSH && easyshipReadiness.mode === "sandbox";

  return {
    cockpitQueues: [
      { count: quoteReadyOrders.length, detail: "Adres ve ürün hazır; fiyat oluşturulabilir.", label: "Fiyat bekleyen", tone: "good" },
      { count: blockedOrders.length, detail: "Adres veya Product Master kontrolü isteyen sipariş.", label: "Önce çözülmeli", tone: blockedOrders.length ? "danger" : "neutral" },
      { count: paymentWaitingOrders.length, detail: "Fiyat var; ödeme haberi bekleniyor.", label: "Ödeme bekleyen", tone: "warning" },
      { count: handoffReadyOrders.length, detail: "Ödeme tamam; kargo teslim önizlemesi yapılabilir.", label: "Kargoya hazır", tone: "neutral" },
    ],
    connection: {
      message: "PM owner onayıyla Fulfillment intake'e aktarılan gerçek kayıtlar okunuyor.",
      mode: "live",
      orderCount: orders.length,
      source: "Fulfillment staging Supabase",
    },
    exceptionRows,
    handoffRows,
    inventoryDemandRows,
    inventorySupplyRows,
    nextActionRows: actions,
    orderLineRows,
    orderRows,
    paymentRows,
    quoteRows,
    readinessRows: Array.from(readinessBySku.values()).sort((left, right) => left.sku.localeCompare(right.sku)),
    reportRows,
    routeReviewRows,
    shipmentConsoleRows,
    shippingGuardRows: [
      { detail: "PM V1 intake ve Fulfillment Supabase persistence açık.", label: "PM intake", status: "ready" },
      {
        detail: providerSandboxReady
          ? "Easyship sandbox fiyat API açık; üretim etiketi veya canlı shipment yok."
          : "Provider fiyat API flag'i kapalı veya sandbox hazır değil; firma çağrısı yapılmaz.",
        label: "Kargo firması",
        status: providerSandboxReady ? "test ready" : "blocked",
      },
      {
        detail: stripeTestReady ? "Stripe test checkout açık; live mode bloke edilir." : "Stripe checkout flag'i kapalı veya test anahtarı eksik; ödeme alınmaz.",
        label: "Ödeme",
        status: stripeTestReady ? "test ready" : "blocked",
      },
      {
        detail:
          handoffSandboxReady || partnerSandboxReady
            ? "Sandbox teslim/export kapısı açık; üretim label ve tracking gerçek onay ister."
            : "Partner push, etiket ve tracking aksiyonları kapalı.",
        label: "Teslim",
        status: handoffSandboxReady || partnerSandboxReady ? "test ready" : "blocked",
      },
    ],
    shippingOverviewRows: [
      { detail: "Adres ve ürün hazır", label: "Fiyat alınabilir", value: String(quoteReadyOrders.length) },
      { detail: "Ödeme kilidi sonrası açılır", label: "Etiket bekler", value: String(handoffReadyOrders.length) },
      { detail: "Canlı takip henüz kapalı", label: "Takipte", value: "0" },
      { detail: "Adres veya ürün kontrolü", label: "Kontrol gerekli", value: String(blockedOrders.length) },
    ],
    shippingRateRows,
  };
}

export async function getOpsUiData(): Promise<OpsUiData> {
  if (!hasFulfillmentSupabaseServiceRoleConfig()) {
    return {
      ...EMPTY_DATA,
      connection: {
        message: "Fulfillment Supabase service-role bağlantısı yok; sembolik veri gösterilmiyor.",
        mode: "unavailable",
        orderCount: 0,
        source: "Bağlantı yok",
      },
    };
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const [orders, stockFeed] = await Promise.all([loadOrders(supabase), loadStockFeed(supabase)]);
    return buildData(orders, stockFeed);
  } catch (error) {
    return {
      ...EMPTY_DATA,
      connection: {
        message: error instanceof Error ? error.message : "Fulfillment canlı veri okuması başarısız.",
        mode: "unavailable",
        orderCount: 0,
        source: "Okuma hatası",
      },
    };
  }
}
