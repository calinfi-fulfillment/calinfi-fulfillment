"use client";

import { CheckCircle2, ClipboardCheck, Columns3, Filter, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";

type DataTableProps<T extends Record<string, string>> = {
  columns: Array<keyof T>;
  rows: readonly T[];
};

type IndexedRow<T extends Record<string, string>> = {
  id: string;
  index: number;
  row: T;
};

const filterColumnHints = ["status", "severity", "route", "payment", "guard", "products", "address", "quote", "customs", "owner"];

function humanizeColumn(column: string) {
  return column.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
}

function rowId(row: Record<string, string>, index: number) {
  return row.sourceOrderKey ?? row.sku ?? row.code ?? row.metric ?? `${index + 1}`;
}

function shouldBadge(column: string, value: string) {
  const normalizedColumn = column.toLowerCase();
  const normalizedValue = value.toLowerCase();

  return (
    ["status", "severity", "route", "payment", "guard", "products", "address", "quote", "customs", "action"].some((token) =>
      normalizedColumn.includes(token),
    ) ||
    ["ready", "blocked", "pending", "review", "missing", "manual", "hold", "failed"].some((token) => normalizedValue.includes(token))
  );
}

export function DataTable<T extends Record<string, string>>({ columns, rows }: DataTableProps<T>) {
  const stringColumns = useMemo(() => columns.map(String), [columns]);
  const indexedRows = useMemo<IndexedRow<T>[]>(
    () => rows.map((row, index) => ({ id: rowId(row, index), index, row })),
    [rows],
  );
  const filterableColumns = useMemo(
    () => stringColumns.filter((column) => filterColumnHints.some((hint) => column.toLowerCase().includes(hint))),
    [stringColumns],
  );
  const filterOptions = useMemo(
    () =>
      filterableColumns.flatMap((column) =>
        Array.from(new Set(indexedRows.map(({ row }) => row[column]).filter(Boolean))).map((value) => ({
          column,
          key: `${column}:${value}`,
          label: `${humanizeColumn(column)}: ${value}`,
          value,
        })),
      ),
    [filterableColumns, indexedRows],
  );

  const [activeFilter, setActiveFilter] = useState("all");
  const [localEvent, setLocalEvent] = useState("No staged local action");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(indexedRows[0]?.id ?? null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(stringColumns);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const selectedFilter = filterOptions.find((option) => option.key === activeFilter);

    return indexedRows.filter(({ row }) => {
      const matchesQuery =
        normalizedQuery.length === 0 || Object.values(row).some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesFilter = !selectedFilter || row[selectedFilter.column] === selectedFilter.value;

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, filterOptions, indexedRows, query]);

  const selectedRow = indexedRows.find(({ id }) => id === selectedId) ?? filteredRows[0] ?? indexedRows[0] ?? null;
  const selectedCount = selectedRow ? 1 : 0;

  function toggleColumn(column: string) {
    setVisibleColumns((currentColumns) => {
      if (currentColumns.includes(column)) {
        return currentColumns.length === 1 ? currentColumns : currentColumns.filter((currentColumn) => currentColumn !== column);
      }

      return stringColumns.filter((currentColumn) => currentColumns.includes(currentColumn) || currentColumn === column);
    });
  }

  function stageAction(action: string) {
    const target = selectedRow?.id ?? "filtered queue";
    setLocalEvent(`${action} staged for ${target}`);
  }

  return (
    <section className="data-table-shell" data-testid="interactive-data-table">
      <div className="table-toolbar">
        <label className="search-control">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Search rows"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            type="search"
            value={query}
          />
        </label>
        <label className="select-control">
          <Filter aria-hidden="true" size={16} />
          <select aria-label="Filter rows" onChange={(event) => setActiveFilter(event.target.value)} value={activeFilter}>
            <option value="all">All rows</option>
            {filterOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="table-actions" aria-label="Local row actions">
          <button className="button-secondary" onClick={() => stageAction("Review")} type="button">
            <ClipboardCheck aria-hidden="true" size={16} />
            Review
          </button>
          <button className="button-secondary" onClick={() => stageAction("Safe next step")} type="button">
            <CheckCircle2 aria-hidden="true" size={16} />
            Stage
          </button>
          <button className="button-ghost" onClick={() => setSelectedId(filteredRows[0]?.id ?? null)} type="button">
            <X aria-hidden="true" size={16} />
            Reset
          </button>
        </div>
      </div>

      <details className="column-picker">
        <summary>
          <Columns3 aria-hidden="true" size={16} />
          Columns
        </summary>
        <div>
          {stringColumns.map((column) => (
            <label className="checkbox-control" key={column}>
              <input checked={visibleColumns.includes(column)} onChange={() => toggleColumn(column)} type="checkbox" />
              {humanizeColumn(column)}
            </label>
          ))}
        </div>
      </details>

      <div className="table-status-line">
        <span>{filteredRows.length} rows</span>
        <span>{selectedCount} selected</span>
        <span>{localEvent}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              {visibleColumns.map((column) => (
                <th key={column}>{humanizeColumn(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ id, row }) => (
              <tr data-selected={id === selectedRow?.id ? "true" : "false"} key={id} onClick={() => setSelectedId(id)}>
                <td>
                  <input
                    aria-label={`Select ${id}`}
                    checked={id === selectedRow?.id}
                    onChange={() => setSelectedId(id)}
                    type="radio"
                  />
                </td>
                {visibleColumns.map((column) => (
                  <td key={column}>{shouldBadge(column, row[column]) ? <StatusBadge label={row[column]} /> : row[column]}</td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1}>No rows match the current controls.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedRow ? (
        <aside className="row-inspector" aria-label="Selected row detail">
          <div>
            <p className="eyebrow">Selected</p>
            <h2>{selectedRow.id}</h2>
          </div>
          <dl>
            {stringColumns.map((column) => (
              <div key={column}>
                <dt>{humanizeColumn(column)}</dt>
                <dd>{shouldBadge(column, selectedRow.row[column]) ? <StatusBadge label={selectedRow.row[column]} /> : selectedRow.row[column]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
    </section>
  );
}
