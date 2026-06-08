import { useState } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
// import React from "react";

interface DataTableRow {
  id: string | number;
  [key: string]: unknown;
}

interface DataTableColumn<T extends DataTableRow> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  status?: boolean;
}

interface DataTableProps<T extends DataTableRow> {
  columns: DataTableColumn<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onViewCredit?: (item: T) => void;
  emptyMessage?: string;
  actions?: boolean;
  customActions?: (item: T) => React.ReactNode;
  getStatusColor?: (status: unknown) => string;
  getStatusText?: (status: unknown) => string;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

function DataTable<T extends DataTableRow>({
  columns,
  data,
  onEdit,
  onDelete,
  onViewCredit,
  emptyMessage = "No se encontraron registros",
  actions = true,
  customActions,
  getStatusColor,
  getStatusText,
  sortKey,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  // Si se pasa onSort, no ordenar localmente
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("asc");

  const sortedData =
    !onSort && (localSortKey || localSortOrder)
      ? [...data].sort((a, b) => {
          const aValue = a[localSortKey!];
          const bValue = b[localSortKey!];
          if (aValue == null) return 1;
          if (bValue == null) return -1;
          if (aValue === bValue) return 0;
          if (localSortOrder === "asc") {
            return aValue > bValue ? 1 : -1;
          } else {
            return aValue < bValue ? 1 : -1;
          }
        })
      : data;

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            {columns.map((column) => {
              const activeKey = onSort ? sortKey : localSortKey;
              const activeOrder = onSort ? sortOrder : localSortOrder;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className="px-6 py-3 cursor-pointer select-none"
                  onClick={() => {
                    if (onSort) {
                      if (sortKey === column.key) {
                        onSort(
                          column.key,
                          sortOrder === "asc" ? "desc" : "asc"
                        );
                      } else {
                        onSort(column.key, "asc");
                      }
                    } else {
                      if (localSortKey === column.key) {
                        setLocalSortOrder(
                          localSortOrder === "asc" ? "desc" : "asc"
                        );
                      } else {
                        setLocalSortKey(column.key);
                        setLocalSortOrder("asc");
                      }
                    }
                  }}
                >
                  {column.label}
                  {activeKey === column.key &&
                    (activeOrder === "asc" ? " ▲" : " ▼")}
                </th>
              );
            })}
            {actions && (
              <th scope="col" className="px-6 py-3">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4">
                  {column.render ? (
                    column.render(item)
                  ) : column.status ? (
                    <div className="flex items-center">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          getStatusColor?.(item[column.key]) || "bg-gray-500"
                        } mr-2`}
                      ></div>
                      {getStatusText?.(item[column.key]) ||
                        String(item[column.key])}
                    </div>
                  ) : (
                    String(item[column.key])
                  )}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-4">
                  {customActions ? (
                    customActions(item)
                  ) : (
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="font-medium text-blue-600 hover:underline cursor-pointer"
                          title="Editar"
                        >
                          <PencilSquareIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                      {onViewCredit && item.VentaTipo === "CR" && (
                        <button
                          onClick={() => onViewCredit(item)}
                          className="font-medium text-green-600 hover:underline cursor-pointer"
                          title="Ver Detalles de Crédito"
                        >
                          <CreditCardIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="font-medium text-red-600 hover:underline cursor-pointer"
                          title="Eliminar"
                        >
                          <TrashIcon className="h-5 w-5 inline" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mensaje cuando no hay resultados */}
      {data.length === 0 && (
        <div className="p-4 text-center text-gray-500">{emptyMessage}</div>
      )}
    </div>
  );
}

export default DataTable;
