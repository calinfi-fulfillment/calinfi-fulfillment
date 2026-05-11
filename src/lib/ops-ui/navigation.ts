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
  { href: "/", label: "Cockpit", icon: ClipboardList },
  { href: "/orders", label: "Orders", icon: PackageCheck },
  { href: "/quotes", label: "Quotes", icon: ReceiptText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/handoffs", label: "Handoffs", icon: Truck },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle },
  { href: "/reports", label: "Reports", icon: FileBarChart },
] as const;

export type OpsNavLabel = (typeof OPS_NAV_ITEMS)[number]["label"];
