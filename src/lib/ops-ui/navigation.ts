import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  FileBarChart,
  PackageCheck,
  PlaneTakeoff,
  ReceiptText,
  Truck,
  Warehouse,
} from "lucide-react";

export const OPS_NAV_ITEMS = [
  { href: "/", label: "Kontrol Paneli", icon: ClipboardList },
  { href: "/shipping", label: "Kargo Merkezi", icon: PlaneTakeoff },
  { href: "/inventory", label: "Üretim & Stok", icon: Warehouse },
  { href: "/orders", label: "Siparişler", icon: PackageCheck },
  { href: "/quotes", label: "Kargo Ücreti", icon: ReceiptText },
  { href: "/payments", label: "Ödemeler", icon: CreditCard },
  { href: "/handoffs", label: "Kargoya Hazır", icon: Truck },
  { href: "/exceptions", label: "Sorunlar", icon: AlertTriangle },
  { href: "/reports", label: "Raporlar", icon: FileBarChart },
] as const;

export type OpsNavLabel = (typeof OPS_NAV_ITEMS)[number]["label"];
