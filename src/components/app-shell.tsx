import Link from "next/link";
import type { ReactNode } from "react";

import { PageGuidePopup } from "@/components/page-guide-popup";
import { OPS_NAV_ITEMS, type OpsNavLabel } from "@/lib/ops-ui/navigation";

type AppShellProps = {
  active: OpsNavLabel;
  title: string;
  subtitle: string;
  steps?: readonly string[];
  children: ReactNode;
};

export function AppShell({ active, children, steps, subtitle, title }: AppShellProps) {
  return (
    <main className="ops-layout">
      <aside className="sidebar" aria-label="Operasyon menüsü">
        <div className="brand">
          <span className="brand-mark">OF</span>
          <div>
            <strong>ODUN Kargo Paneli</strong>
            <span>Yerel staging modu</span>
          </div>
        </div>
        <nav className="nav-list">
          {OPS_NAV_ITEMS.map(({ href, icon: Icon, label }) => (
            <Link aria-current={label === active ? "page" : undefined} className="nav-item" href={href} key={href}>
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kargo operasyonu</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <PageGuidePopup steps={steps ?? []} />
        </header>
        {children}
      </section>
    </main>
  );
}
