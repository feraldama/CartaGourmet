import React, { useState, useEffect } from "react";
import { createRegistroDiarioCaja } from "../../services/registros.service";
import { getTiposGasto } from "../../services/tipogasto.service";
import { getTiposGastoGrupo } from "../../services/tipogastogrupo.service";
import { updateCajaMonto } from "../../services/cajas.service";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/utils";
import ModalDialog from "./ModalDialog";
import Button from "./Button/Button";

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

  return (
    <ModalDialog
      open={show}
      onClose={handleClose}
      title="Nuevo Pago"
      size="md"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="pago-form">
            Guardar
          </Button>
        </>
      }
    >
      <form id="pago-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full border border-border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Tipo de Gasto
              </label>
              <select
                value={tipoGastoId}
                onChange={(e) => setTipoGastoId(Number(e.target.value))}
                required
                className="w-full border border-border rounded px-2 py-1 text-sm"
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
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Grupo de Gasto
              </label>
              <select
                value={tipoGastoGrupoId}
                onChange={(e) => setTipoGastoGrupoId(Number(e.target.value))}
                required
                className="w-full border border-border rounded px-2 py-1 text-sm"
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
              <label className="block text-xs font-semibold text-text-muted mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                required
                className="w-full border border-border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted mb-1">
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
                className="w-full border border-border rounded px-2 py-1 text-sm"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </div>
          </div>
        </form>
    </ModalDialog>
  );
};

export default PagoModal;
