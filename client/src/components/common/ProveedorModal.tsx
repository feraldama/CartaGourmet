import React, { useState, useRef, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

// Definir la interfaz Proveedor localmente
interface Proveedor {
  ProveedorId: number;
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

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

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex justify-between items-center mb-4 pr-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            Seleccionar Proveedor
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Crear Nuevo Proveedor
          </button>
        </div>

        {!showCreateForm ? (
          <>
            <div className="mb-4">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredProveedores.map((proveedor) => (
                <div
                  key={proveedor.ProveedorId}
                  className="p-3 border border-gray-200 rounded-lg mb-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelect(proveedor)}
                >
                  <div className="font-semibold">
                    {proveedor.ProveedorNombre}
                  </div>
                  <div className="text-sm text-gray-600">
                    RUC: {proveedor.ProveedorRUC || "Sin RUC"}
                  </div>
                  {proveedor.ProveedorTelefono && (
                    <div className="text-sm text-gray-600">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProveedorModal;
