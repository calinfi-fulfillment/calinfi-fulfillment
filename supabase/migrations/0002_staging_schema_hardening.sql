create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create index if not exists delivery_decisions_selected_quote_id_idx
  on public.delivery_decisions(selected_quote_id);

create index if not exists excluded_builtin_items_order_id_idx
  on public.excluded_builtin_items(order_id);

create index if not exists handoff_status_events_handoff_id_idx
  on public.handoff_status_events(handoff_id);

create index if not exists issues_order_id_idx
  on public.issues(order_id);

create index if not exists issues_product_id_idx
  on public.issues(product_id);

create index if not exists order_lines_product_id_idx
  on public.order_lines(product_id);

create index if not exists payment_events_quote_id_idx
  on public.payment_events(quote_id);

create index if not exists shipping_quotes_delivery_decision_id_idx
  on public.shipping_quotes(delivery_decision_id);

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'products',
    'backers',
    'orders',
    'order_lines',
    'excluded_builtin_items',
    'route_rules',
    'delivery_decisions',
    'shipping_quotes',
    'payment_events',
    'fulfillment_handoffs',
    'handoff_status_events',
    'issues',
    'audit_log'
  ] loop
    policy_name := target_table || '_deny_client_access';
    execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      policy_name,
      target_table
    );
  end loop;
end $$;
