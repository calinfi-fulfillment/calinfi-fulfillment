import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  FileBarChart,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";

export const OPS_NAV_ITEMS = [
  { href: "/", label: "Kontrol Paneli", icon: ClipboardList },
  { href: "/orders", label: "Siparişler", icon: PackageCheck },
  { href: "/quotes", label: "Kargo Ücreti", icon: ReceiptText },
  { href: "/payments", label: "Ödemeler", icon: CreditCard },
  { href: "/handoffs", label: "Kargoya Hazır", icon: Truck },
  { href: "/exceptions", label: "Sorunlar", icon: AlertTriangle },
  { href: "/reports", label: "Raporlar", icon: FileBarChart },
] as const;

export type OpsNavLabel = (typeof OPS_NAV_ITEMS)[number]["label"];
