import React, { useState, useMemo } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ClienteFormModal from "./ClienteFormModal";
import type { Cliente } from "./ClienteFormModal";
import { Button, TextInput, Badge } from "./ui";
import { formatMiles } from "../../utils/utils";

interface ClienteModalProps {
  show: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onSelect: (cliente: Cliente) => void;
  onCreateCliente?: (cliente: Cliente) => void;
  currentUserId?: string;
}

const ClienteModal: React.FC<ClienteModalProps> = ({
  show,
  onClose,
  clientes,
  onSelect,
  onCreateCliente,
  currentUserId,
}) => {
  const [filtros, setFiltros] = useState({
    ruc: "",
    nombre: "",
    apellido: "",
    telefono: "",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(
      (c) =>
        c.ClienteRUC?.toLowerCase().includes(filtros.ruc.toLowerCase()) &&
        c.ClienteNombre?.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
        (c.ClienteApellido || "")
          ?.toLowerCase()
          .includes(filtros.apellido.toLowerCase()) &&
        (c.ClienteTelefono || "")
          ?.toLowerCase()
          .includes(filtros.telefono.toLowerCase()),
    );
  }, [clientes, filtros]);

  const totalPages = Math.ceil(clientesFiltrados.length / rowsPerPage);
  const paginatedClientes = clientesFiltrados.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  const handleCreateSubmit = (cliente: Cliente) => {
    if (onCreateCliente) {
      onCreateCliente(cliente);
      setShowCreateModal(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] p-6 relative flex flex-col">
        <button
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-text-subtle hover:text-text transition-colors duration-150 cursor-pointer"
          onClick={onClose}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div className="flex justify-between items-center mb-4 pr-8">
          <h2 className="text-xl font-semibold text-text">Buscar Cliente</h2>
          {onCreateCliente && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={PlusIcon}
              onClick={() => setShowCreateModal(true)}
            >
              Nuevo Cliente
            </Button>
          )}
        </div>
        <div className="bg-surface-sunken rounded-md p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextInput
              label="RUC"
              size="sm"
              placeholder="Buscar"
              value={filtros.ruc}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, ruc: e.target.value }))
              }
            />
            <TextInput
              label="Nombre"
              size="sm"
              placeholder="Buscar"
              value={filtros.nombre}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, nombre: e.target.value }))
              }
            />
            <TextInput
              label="Apellido"
              size="sm"
              placeholder="Buscar"
              value={filtros.apellido}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, apellido: e.target.value }))
              }
            />
            <TextInput
              label="Teléfono"
              size="sm"
              placeholder="Buscar"
              value={filtros.telefono}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, telefono: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="overflow-auto rounded-md border border-border flex-1 min-h-0">
          <table className="min-w-full bg-surface text-sm">
            <thead className="sticky top-0 bg-surface-sunken z-10">
              <tr className="text-text-muted">
                <th className="py-2 px-4 text-left font-medium">RUC</th>
                <th className="py-2 px-4 text-left font-medium">Nombre</th>
                <th className="py-2 px-4 text-left font-medium">Apellido</th>
                <th className="py-2 px-4 text-left font-medium">Teléfono</th>
                <th className="py-2 px-4 text-left font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-text-subtle">
                    No hay clientes
                  </td>
                </tr>
              )}
              {paginatedClientes.map((c, idx) => (
                <tr
                  key={c.ClienteId}
                  className={`${
                    idx % 2 === 1 ? "bg-surface-sunken/50" : ""
                  } hover:bg-brand-50 cursor-pointer transition-colors duration-150`}
                  onClick={() => onSelect(c)}
                >
                  <td className="py-2 px-4 font-num">{c.ClienteRUC || ""}</td>
                  <td className="py-2 px-4">{c.ClienteNombre}</td>
                  <td className="py-2 px-4">{c.ClienteApellido || ""}</td>
                  <td className="py-2 px-4 font-num">
                    {c.ClienteTelefono || ""}
                  </td>
                  <td className="py-2 px-4">
                    {c.ClienteTipo === "MI" ? (
                      <Badge tone="neutral">Minorista</Badge>
                    ) : c.ClienteTipo === "MA" ? (
                      <Badge tone="info">Mayorista</Badge>
                    ) : (
                      c.ClienteTipo
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-muted font-num">
            {clientesFiltrados.length === 0
              ? "0"
              : `${formatMiles((page - 1) * rowsPerPage + 1)} a ${formatMiles(
                  Math.min(page * rowsPerPage, clientesFiltrados.length),
                )} de ${formatMiles(clientesFiltrados.length)}`}
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="cliente-modal-rows"
              className="text-sm text-text-muted"
            >
              Filas por página:
            </label>
            <select
              id="cliente-modal-rows"
              className="bg-surface border border-border rounded-md px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>

        {/* Modal para crear cliente */}
        <ClienteFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
};

export default ClienteModal;
