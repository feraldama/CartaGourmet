import React, { useState, useEffect } from "react";
import { createRegistroDiarioCaja } from "../../services/registros.service";
import { getTiposGasto } from "../../services/tipogasto.service";
import { getTiposGastoGrupo } from "../../services/tipogastogrupo.service";
import { updateCajaMonto } from "../../services/cajas.service";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/utils";

interface TipoGasto {
  TipoGastoId: number;
  TipoGastoDescripcion: string;
}
interface TipoGastoGrupo {
  TipoGastoGrupoId: number;
  TipoGastoGrupoDescripcion: string;
  TipoGastoId: number;
}

interface PagoModalProps {
  show: boolean;
  handleClose: () => void;
  cajaAperturada: { CajaId: number | string } | null;
  usuario: { id: number | string } | null;
}

const PagoModal: React.FC<PagoModalProps> = ({
  show,
  handleClose,
  cajaAperturada,
  usuario,
}) => {
  const [fecha, setFecha] = useState("");
  const [tipoGastoId, setTipoGastoId] = useState<number | "">("");
  const [tipoGastoGrupoId, setTipoGastoGrupoId] = useState<number | "">("");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState<number | "">("");
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [tiposGastoGrupo, setTiposGastoGrupo] = useState<TipoGastoGrupo[]>([]);

  useEffect(() => {
    if (show) {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      setFecha(`${yyyy}-${mm}-${dd}`);
      getTiposGasto().then(setTiposGasto);
      getTiposGastoGrupo().then(setTiposGastoGrupo);
    }
  }, [show]);

  const gruposFiltrados = tiposGastoGrupo.filter(
    (g) => g.TipoGastoId === tipoGastoId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaAperturada || !usuario) return;
    try {
      await createRegistroDiarioCaja({
        CajaId: cajaAperturada.CajaId,
        RegistroDiarioCajaFecha: fecha,
        TipoGastoId: tipoGastoId,
        TipoGastoGrupoId: tipoGastoGrupoId,
        RegistroDiarioCajaDetalle: detalle,
        RegistroDiarioCajaMonto: monto,
        UsuarioId: usuario.id,
      });
      // Obtener el monto actualizado de la caja aperturada por el usuario
      const estado = await getEstadoAperturaPorUsuario(usuario.id);
      const cajaAperturadaId = estado.cajaId;
      const cajaActualizada = await getCajaById(cajaAperturadaId);
      const cajaMontoActual = cajaActualizada.CajaMonto;
      if (tipoGastoId === 1) {
        // Restar el monto
        await updateCajaMonto(
          cajaAperturadaId,
          Number(cajaMontoActual) - Number(monto)
        );
      } else if (tipoGastoId === 2) {
        // Sumar el monto
        await updateCajaMonto(
          cajaAperturadaId,
          Number(cajaMontoActual) + Number(monto)
        );
      }
      Swal.fire(
        "Pago registrado",
        "El pago fue registrado correctamente",
        "success"
      );
      handleClose();
      setFecha("");
      setTipoGastoId("");
      setTipoGastoGrupoId("");
      setDetalle("");
      setMonto("");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "No se pudo registrar el pago";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          onClick={handleClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Nuevo Pago
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Tipo de Gasto
              </label>
              <select
                value={tipoGastoId}
                onChange={(e) => setTipoGastoId(Number(e.target.value))}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Seleccione...</option>
                {tiposGasto.map((tg) => (
                  <option key={tg.TipoGastoId} value={tg.TipoGastoId}>
                    {tg.TipoGastoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Grupo de Gasto
              </label>
              <select
                value={tipoGastoGrupoId}
                onChange={(e) => setTipoGastoGrupoId(Number(e.target.value))}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value="">Seleccione...</option>
                {gruposFiltrados.map((gg) => (
                  <option key={gg.TipoGastoGrupoId} value={gg.TipoGastoGrupoId}>
                    {gg.TipoGastoGrupoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Monto
              </label>
              <input
                type="text"
                value={monto !== "" ? formatMiles(monto) : ""}
                onChange={(e) => {
                  // Eliminar puntos y formatear correctamente
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/,/g, ".");
                  const num = Number(raw);
                  setMonto(isNaN(num) ? "" : num);
                }}
                required
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Guardar
            </button>
            <button
              type="button"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
              onClick={handleClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PagoModal;
