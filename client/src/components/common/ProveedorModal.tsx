import React, { useState, useRef, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

import type { Proveedor } from "../../types";
import ModalDialog from "./ModalDialog";
import Button from "./Button/Button";

interface CreateProveedorData {
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

interface ProveedorModalProps {
  show: boolean;
  onClose: () => void;
  proveedores: Proveedor[];
  onSelect: (proveedor: Proveedor) => void;
  onCreateProveedor: (proveedorData: CreateProveedorData) => Promise<void>;
}

const ProveedorModal: React.FC<ProveedorModalProps> = ({
  show,
  onClose,
  proveedores,
  onSelect,
  onCreateProveedor,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProveedor, setNewProveedor] = useState<CreateProveedorData>({
    ProveedorRUC: "",
    ProveedorNombre: "",
    ProveedorDireccion: "",
    ProveedorTelefono: "",
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProveedores = proveedores.filter(
    (p) =>
      p.ProveedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ProveedorRUC.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProveedor.ProveedorNombre.trim()) {
      return;
    }

    try {
      await onCreateProveedor(newProveedor);
      setNewProveedor({
        ProveedorRUC: "",
        ProveedorNombre: "",
        ProveedorDireccion: "",
        ProveedorTelefono: "",
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error al crear proveedor:", error);
    }
  };

  // Enfocar el input de búsqueda cuando se abre el modal y no está en modo crear
  useEffect(() => {
    if (show && !showCreateForm && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [show, showCreateForm]);

  return (
    <ModalDialog
      open={show}
      onClose={onClose}
      title="Seleccionar Proveedor"
      size="4xl"
      headerActions={
        !showCreateForm ? (
          <Button
            variant="primary"
            size="sm"
            leftIcon={PlusIcon}
            onClick={() => setShowCreateForm(true)}
          >
            Crear Nuevo Proveedor
          </Button>
        ) : undefined
      }
    >
        {!showCreateForm ? (
          <>
            <div className="mb-4">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              {filteredProveedores.map((proveedor) => (
                <div
                  key={proveedor.ProveedorId}
                  className="p-3 border border-border rounded-lg mb-2 hover:bg-surface-muted cursor-pointer"
                  onClick={() => onSelect(proveedor)}
                >
                  <div className="font-semibold">
                    {proveedor.ProveedorNombre}
                  </div>
                  <div className="text-sm text-text-muted">
                    RUC: {proveedor.ProveedorRUC || "Sin RUC"}
                  </div>
                  {proveedor.ProveedorTelefono && (
                    <div className="text-sm text-text-muted">
                      Tel: {proveedor.ProveedorTelefono}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreateProveedor} className="space-y-4">
            <h3 className="text-lg font-semibold">Crear Nuevo Proveedor</h3>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={newProveedor.ProveedorNombre}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorNombre: e.target.value,
                  })
                }
                className="w-full p-2 border border-border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                RUC
              </label>
              <input
                type="text"
                value={newProveedor.ProveedorRUC}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorRUC: e.target.value,
                  })
                }
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={newProveedor.ProveedorDireccion}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorDireccion: e.target.value,
                  })
                }
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={newProveedor.ProveedorTelefono}
                onChange={(e) =>
                  setNewProveedor({
                    ...newProveedor,
                    ProveedorTelefono: e.target.value,
                  })
                }
                className="w-full p-2 border border-border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="success" type="submit">
                Crear
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
    </ModalDialog>
  );
};

export default ProveedorModal;
