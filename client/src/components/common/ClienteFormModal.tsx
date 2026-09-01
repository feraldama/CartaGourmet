import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import ModalDialog from "./ModalDialog";
import Button from "./Button/Button";

export interface Cliente {
  id?: string | number;
  ClienteId?: string | number;
  ClienteRUC: string;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteDireccion: string;
  ClienteTelefono: string;
  ClienteTipo: string;
  // 'RU' (RUC) o 'CI' (cédula): qué documento contiene ClienteRUC. La RG 90
  // los informa con códigos distintos.
  ClienteDocumentoTipo?: string;
  UsuarioId: string;
  [key: string]: unknown;
}

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCliente?: Cliente | null;
  onSubmit: (formData: Cliente) => void;
  currentUserId?: string;
}

export default function ClienteFormModal({
  isOpen,
  onClose,
  currentCliente,
  onSubmit,
  currentUserId,
}: ClienteFormModalProps) {
  const [formData, setFormData] = useState<Cliente>({
    ClienteRUC: "",
    ClienteNombre: "",
    ClienteApellido: "",
    ClienteDireccion: "",
    ClienteTelefono: "",
    ClienteTipo: "MI",
    ClienteDocumentoTipo: "RU",
    UsuarioId: "",
  });

  const { user } = useAuth();

  useEffect(() => {
    if (currentCliente) {
      setFormData({
        ...currentCliente,
        ClienteDocumentoTipo:
          currentCliente.ClienteDocumentoTipo === "CI" ? "CI" : "RU",
      });
    } else {
      const userId = currentUserId || (user?.id ? String(user.id).trim() : "");
      setFormData({
        ClienteRUC: "",
        ClienteNombre: "",
        ClienteApellido: "",
        ClienteDireccion: "",
        ClienteTelefono: "",
        ClienteTipo: "MI",
        ClienteDocumentoTipo: "RU",
        UsuarioId: userId,
      });
    }
  }, [currentCliente, currentUserId, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ClienteNombre" || name === "ClienteApellido"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <ModalDialog
      open={isOpen}
      onClose={onClose}
      title={
        currentCliente
          ? `Editar cliente: ${currentCliente.ClienteId || ""}`
          : "Crear nuevo cliente"
      }
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="cliente-form">
            {currentCliente ? "Actualizar" : "Crear"}
          </Button>
        </>
      }
    >
      <form id="cliente-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteRUC"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  {formData.ClienteDocumentoTipo === "CI" ? "Cédula" : "RUC"}
                </label>
                <div className="flex gap-2">
                  <select
                    name="ClienteDocumentoTipo"
                    id="ClienteDocumentoTipo"
                    value={formData.ClienteDocumentoTipo || "RU"}
                    onChange={handleInputChange}
                    className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2.5"
                  >
                    <option value="RU">RUC</option>
                    <option value="CI">CI</option>
                  </select>
                  <input
                    type="text"
                    name="ClienteRUC"
                    id="ClienteRUC"
                    value={formData.ClienteRUC}
                    onChange={handleInputChange}
                    className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                  />
                </div>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteNombre"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Nombre
                </label>
                <input
                  type="text"
                  name="ClienteNombre"
                  id="ClienteNombre"
                  value={formData.ClienteNombre}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5 uppercase"
                  required
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteApellido"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Apellido
                </label>
                <input
                  type="text"
                  name="ClienteApellido"
                  id="ClienteApellido"
                  value={formData.ClienteApellido}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5 uppercase"
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteDireccion"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Dirección
                </label>
                <input
                  type="text"
                  name="ClienteDireccion"
                  id="ClienteDireccion"
                  value={formData.ClienteDireccion}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteTelefono"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Teléfono
                </label>
                <input
                  type="text"
                  name="ClienteTelefono"
                  id="ClienteTelefono"
                  value={formData.ClienteTelefono}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="ClienteTipo"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Tipo
                </label>
                <select
                  name="ClienteTipo"
                  id="ClienteTipo"
                  value={formData.ClienteTipo}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                  required
                >
                  <option value="MI">Minorista</option>
                  <option value="MA">Mayorista</option>
                </select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="UsuarioId"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Usuario ID
                </label>
                <input
                  type="text"
                  name="UsuarioId"
                  id="UsuarioId"
                  value={formData.UsuarioId}
                  readOnly
                  disabled
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg block w-full p-2.5"
                />
              </div>
            </div>
        </form>
    </ModalDialog>
  );
}
