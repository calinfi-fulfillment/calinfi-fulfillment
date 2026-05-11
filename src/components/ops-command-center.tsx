"use client";

import { CheckCircle2, FileText, LockKeyhole, PackageCheck, Route, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { formatOpsValue } from "@/lib/ops-ui/labels";

type QueueRow = {
  detail: string;
  label: string;
  count: number;
  tone: string;
};

type ActionRow = {
  item: string;
  owner: string;
  priority: string;
  queue: string;
  status: string;
};

type RouteRow = {
  action: string;
  country: string;
  payment: string;
  route: string;
  sourceOrderKey: string;
};

type OpsCommandCenterProps = {
  actions: readonly ActionRow[];
  queues: readonly QueueRow[];
  routes: readonly RouteRow[];
};

export function OpsCommandCenter({ actions, queues, routes }: OpsCommandCenterProps) {
  const [activeAction, setActiveAction] = useState(actions[0]?.priority ?? "1");
  const [activeRoute, setActiveRoute] = useState(routes[0]?.sourceOrderKey ?? "");
  const [activityFeed, setActivityFeed] = useState<string[]>(["Güvenli yerel önizleme hazır"]);

  const selectedAction = actions.find((action) => action.priority === activeAction) ?? actions[0];
  const selectedRoute = routes.find((routeRow) => routeRow.sourceOrderKey === activeRoute) ?? routes[0];
  const queueTotal = useMemo(() => queues.reduce((total, queue) => total + queue.count, 0), [queues]);

  function addEvent(event: string) {
    setActivityFeed((currentFeed) => [event, ...currentFeed].slice(0, 4));
  }

  return (
    <section className="command-center" data-testid="ops-command-center">
      <div className="control-rail">
        <div>
          <p className="eyebrow">Güvenli kontrol</p>
          <h2>Sıradaki işi seç</h2>
        </div>
        <span>
          <ShieldCheck aria-hidden="true" size={16} />
          Sadece test verisi
        </span>
      </div>

      <div className="command-grid">
        <label>
          Öncelikli iş
          <select onChange={(event) => setActiveAction(event.target.value)} value={activeAction}>
            {actions.map((action) => (
              <option key={action.priority} value={action.priority}>
                {action.priority}. {action.queue}
              </option>
            ))}
          </select>
        </label>

        <label>
          Rota adayı
          <select onChange={(event) => setActiveRoute(event.target.value)} value={activeRoute}>
            {routes.map((routeRow) => (
              <option key={routeRow.sourceOrderKey} value={routeRow.sourceOrderKey}>
                {formatOpsValue("sourceOrderKey", routeRow.sourceOrderKey)}
              </option>
            ))}
          </select>
        </label>

        <div className="decision-summary">
          <span>{queueTotal} iş bekliyor</span>
          <strong>{selectedAction?.item ?? "İş yok"}</strong>
          <small>
            {formatOpsValue("route", selectedRoute?.route ?? "No route")} / {formatOpsValue("payment", selectedRoute?.payment ?? "no payment")}
          </small>
        </div>
      </div>

      <div className="button-row">
        <button onClick={() => addEvent(`Kontrol hazırlandı: ${selectedAction?.queue ?? "kuyruk"}`)} type="button">
          <CheckCircle2 aria-hidden="true" size={16} />
          Kontrolü hazırla
        </button>
        <button
          className="button-secondary"
          onClick={() => addEvent(`${formatOpsValue("sourceOrderKey", selectedRoute?.sourceOrderKey ?? "")} için fiyat önizlendi`)}
          type="button"
        >
          <FileText aria-hidden="true" size={16} />
          Fiyat önizle
        </button>
        <button
          className="button-secondary"
          onClick={() => addEvent(`Rota hazırlandı: ${formatOpsValue("route", selectedRoute?.route ?? "")}`)}
          type="button"
        >
          <Route aria-hidden="true" size={16} />
          Rota seç
        </button>
        <button className="button-secondary" onClick={() => addEvent("Kargoya hazır liste önizlendi")} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Kargo önizle
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Canlı değiştirme
        </button>
      </div>

      <ol className="activity-feed" aria-live="polite">
        {activityFeed.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ol>
    </section>
  );
}
