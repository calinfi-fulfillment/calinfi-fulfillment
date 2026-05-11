"use client";

import { CheckCircle2, FileText, LockKeyhole, PackageCheck, Route, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [activityFeed, setActivityFeed] = useState<string[]>(["Local preview session ready"]);

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
          <p className="eyebrow">Control Surface</p>
          <h2>Ops command center</h2>
        </div>
        <span>
          <ShieldCheck aria-hidden="true" size={16} />
          Local synthetic only
        </span>
      </div>

      <div className="command-grid">
        <label>
          Priority queue
          <select onChange={(event) => setActiveAction(event.target.value)} value={activeAction}>
            {actions.map((action) => (
              <option key={action.priority} value={action.priority}>
                {action.priority}. {action.queue}
              </option>
            ))}
          </select>
        </label>

        <label>
          Route candidate
          <select onChange={(event) => setActiveRoute(event.target.value)} value={activeRoute}>
            {routes.map((routeRow) => (
              <option key={routeRow.sourceOrderKey} value={routeRow.sourceOrderKey}>
                {routeRow.sourceOrderKey}
              </option>
            ))}
          </select>
        </label>

        <div className="decision-summary">
          <span>{queueTotal} queue items</span>
          <strong>{selectedAction?.item ?? "No action"}</strong>
          <small>{selectedRoute?.route ?? "No route"} / {selectedRoute?.payment ?? "no payment"}</small>
        </div>
      </div>

      <div className="button-row">
        <button onClick={() => addEvent(`Review staged: ${selectedAction?.queue ?? "queue"}`)} type="button">
          <CheckCircle2 aria-hidden="true" size={16} />
          Stage review
        </button>
        <button className="button-secondary" onClick={() => addEvent(`Quote preview generated for ${selectedRoute?.sourceOrderKey}`)} type="button">
          <FileText aria-hidden="true" size={16} />
          Quote preview
        </button>
        <button className="button-secondary" onClick={() => addEvent(`Route decision staged: ${selectedRoute?.route}`)} type="button">
          <Route aria-hidden="true" size={16} />
          Route decision
        </button>
        <button className="button-secondary" onClick={() => addEvent(`Handoff preview staged for paid locked queue`)} type="button">
          <PackageCheck aria-hidden="true" size={16} />
          Handoff preview
        </button>
        <button className="button-danger" disabled type="button">
          <LockKeyhole aria-hidden="true" size={16} />
          Live mutation
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
