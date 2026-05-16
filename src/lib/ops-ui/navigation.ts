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
  { href: "/", label: "Bugün", icon: ClipboardList },
  { href: "/orders", label: "Siparişler", icon: PackageCheck },
  { href: "/inventory", label: "Stok", icon: Warehouse },
  { href: "/shipping", label: "Kargo", icon: PlaneTakeoff },
  { href: "/quotes", label: "Fiyat", icon: ReceiptText },
  { href: "/payments", label: "Ödeme", icon: CreditCard },
  { href: "/handoffs", label: "Teslim", icon: Truck },
  { href: "/exceptions", label: "Sorunlar", icon: AlertTriangle },
  { href: "/reports", label: "Raporlar", icon: FileBarChart },
] as const;

export type OpsNavLabel = (typeof OPS_NAV_ITEMS)[number]["label"];
