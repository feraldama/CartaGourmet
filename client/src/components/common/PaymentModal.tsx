import React, { useState, useEffect } from "react";
import { formatMiles } from "../../utils/utils";

interface PaymentModalProps {
  show: boolean;
  handleClose: () => void;
  totalCost: number;
  totalRest: number;
  setTotalRest: (v: number) => void;
  efectivo: number;
  setEfectivo: (v: number) => void;
  banco: number;
  setBanco: (v: number) => void;
  bancoDebito: number;
  setBancoDebito: (v: number) => void;
  bancoCredito: number;
  setBancoCredito: (v: number) => void;
  cuentaCliente: number;
  setCuentaCliente: (v: number) => void;
  sendRequest: () => Promise<void>;
  setPrintTicket: (v: boolean) => void;
  printTicket: boolean;
  voucher: number;
  setVoucher: (v: number) => void;
  ventaNroPOS: string;
  setVentaNroPOS: (v: string) => void;
  documentoTipo: "FA" | "NC";
  setDocumentoTipo: (v: "FA" | "NC") => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  handleClose,
  totalCost,
  totalRest,
  setTotalRest,
  efectivo,
  setEfectivo,
  banco,
  setBanco,
  bancoDebito,
  setBancoDebito,
  bancoCredito,
  setBancoCredito,
  cuentaCliente,
  setCuentaCliente,
  sendRequest,
  setPrintTicket,
  printTicket,
  voucher,
  setVoucher,
  ventaNroPOS,
  setVentaNroPOS,
  documentoTipo,
  setDocumentoTipo,
}) => {
  const [pagoTipo, setPagoTipoLocal] = useState<
    "E" | "B" | "D" | "CR" | "C" | "V"
  >("E");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pagoConTarjeta = bancoDebito > 0 || bancoCredito > 0;
  const ventaNroPOSValido =
    !pagoConTarjeta ||
    (ventaNroPOS.trim().length >= 4 && /^\d+$/.test(ventaNroPOS.trim()));

  useEffect(() => {
    if (show) {
      setEfectivo(0);
      setBanco(0);
      setBancoDebito(0);
      setBancoCredito(0);
      setCuentaCliente(0);
      setVentaNroPOS("");
      setTotalRest(totalCost);
      setTimeout(() => {
        const efectivoInput = document.getElementById("efectivo-input");
        if (efectivoInput) {
          efectivoInput.focus();
        }
      }, 100);
    }
  }, [
    show,
    setEfectivo,
    setBanco,
    setBancoDebito,
    setBancoCredito,
    setCuentaCliente,
    setVentaNroPOS,
    setTotalRest,
    totalCost,
  ]);

  const onNumberClickModal = (label: string | number) => {
    let efe = efectivo;
    let ban = banco;
    let deb = bancoDebito;
    let cred = bancoCredito;
    let cuentaCli = cuentaCliente;
    let vou = voucher;
    let totalResto = 0;

    const append = (val: number, label: string | number) => {
      if (val === 0) return Number(label);
      return Number(`${val}${label}`);
    };

    if (pagoTipo === "E") {
      efe = append(efectivo, label);
      totalResto =
        totalCost -
        efe -
        banco -
        bancoDebito -
        bancoCredito -
        cuentaCliente -
        vou;
      setEfectivo(efe);
    } else if (pagoTipo === "B") {
      ban = append(banco, label);
      totalResto =
        totalCost -
        efectivo -
        ban -
        bancoDebito -
        bancoCredito -
        cuentaCliente -
        vou;
      setBanco(ban);
    } else if (pagoTipo === "D") {
      deb = append(bancoDebito, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoCredito -
        cuentaCliente -
        deb * 1.03 -
        vou;
      setBancoDebito(deb);
    } else if (pagoTipo === "CR") {
      cred = append(bancoCredito, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoDebito -
        cuentaCliente -
        cred * 1.05 -
        vou;
      setBancoCredito(cred);
    } else if (pagoTipo === "C") {
      cuentaCli = append(cuentaCliente, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoDebito -
        bancoCredito -
        cuentaCli -
        vou;
      setCuentaCliente(cuentaCli);
    } else if (pagoTipo === "V") {
      vou = append(voucher, label);
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoDebito -
        bancoCredito -
        cuentaCliente -
        vou;
      setVoucher(vou);
    }
    setTotalRest(totalResto);
  };

  const cerarCantidadModal = () => {
    let totalResto = 0;
    if (pagoTipo === "E") {
      totalResto =
        totalCost -
        banco -
        bancoDebito -
        bancoCredito -
        cuentaCliente -
        voucher;
      setEfectivo(0);
    } else if (pagoTipo === "B") {
      totalResto =
        totalCost -
        efectivo -
        bancoDebito -
        bancoCredito -
        cuentaCliente -
        voucher;
      setBanco(0);
    } else if (pagoTipo === "D") {
      totalResto =
        totalCost - efectivo - banco - bancoCredito - cuentaCliente - voucher;
      setBancoDebito(0);
    } else if (pagoTipo === "CR") {
      totalResto =
        totalCost - efectivo - banco - bancoDebito - cuentaCliente - voucher;
      setBancoCredito(0);
    } else if (pagoTipo === "C") {
      totalResto =
        totalCost - efectivo - banco - bancoDebito - bancoCredito - voucher;
      setCuentaCliente(0);
    } else if (pagoTipo === "V") {
      totalResto =
        totalCost -
        efectivo -
        banco -
        bancoDebito -
        bancoCredito -
        cuentaCliente;
      setVoucher(0);
    }
    setTotalRest(totalResto);
  };

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    try {
      await sendRequest();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      !isSubmitting &&
      totalRest <= 0 &&
      ventaNroPOSValido
    ) {
      handleSendRequest();
    }
  };

  const buttonsPago = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ["00", 0, "000"],
  ];

  if (!show) return null;

  // Clases compartidas para inputs de montos. El estado "activo" resalta
  // el medio de pago seleccionado (antes era borde indigo + fondo celeste).
  const montoInputCls = (active: boolean) =>
    `w-[120px] rounded-md px-2.5 py-1.5 text-right font-num text-base outline-none transition-colors focus:ring-2 focus:ring-brand-600/30 ${
      active
        ? "border-2 border-brand-400 bg-brand-50"
        : "border border-border bg-surface-muted"
    }`;
  const montoLabelCls = "mr-2 flex-1 text-right text-base text-text-muted";
  const rowCls = "mb-2.5 flex items-center";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onKeyPress={handleKeyPress}
      tabIndex={0}
    >
      <div className="relative w-[800px] max-w-[98vw] rounded-xl bg-surface p-8 shadow-modal">
        <button
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute right-5 top-4 cursor-pointer border-none bg-transparent text-3xl leading-none text-text-subtle transition-colors hover:text-text"
        >
          ×
        </button>
        <h2 className="mb-6 font-display text-[26px] font-bold text-text-strong">
          Seleccione un método de pago
        </h2>
        <div className="flex gap-6">
          {/* Columna izquierda */}
          <div className="flex-1">
            {/* TOTAL */}
            <div className="mb-[18px] flex items-center">
              <div className="mr-2 rounded-md bg-surface-sunken px-[22px] py-2 text-[22px] font-bold text-text">
                Total
              </div>
              <div className="rounded-md bg-surface-muted px-[22px] py-2 font-num text-[28px] font-bold text-success-700">
                Gs. {formatMiles(totalCost)}
              </div>
            </div>
            {/* Efectivo */}
            <div className={rowCls}>
              <label className={montoLabelCls}>Efectivo:</label>
              <input
                id="efectivo-input"
                type="text"
                value={efectivo ? formatMiles(efectivo) : ""}
                onFocus={(e) => {
                  setPagoTipoLocal("E");
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setEfectivo(newValue);
                  const totalResto =
                    totalCost -
                    newValue -
                    banco -
                    bancoDebito -
                    bancoCredito -
                    cuentaCliente -
                    voucher;
                  setTotalRest(totalResto);
                }}
                className={montoInputCls(pagoTipo === "E")}
              />
            </div>
            {/* Transferencia */}
            <div className={rowCls}>
              <label className={montoLabelCls}>Transferencia:</label>
              <input
                type="text"
                value={banco ? formatMiles(banco) : ""}
                onFocus={(e) => {
                  setPagoTipoLocal("B");
                  if (banco === 0) {
                    setBanco(totalRest);
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setBanco(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    newValue -
                    bancoDebito -
                    bancoCredito -
                    cuentaCliente -
                    voucher;
                  setTotalRest(totalResto);
                }}
                className={montoInputCls(pagoTipo === "B")}
              />
            </div>
            {/* Tarjeta Débito */}
            <div className={rowCls}>
              <label className={montoLabelCls}>
                Tarjeta Débito (3% adicional):
              </label>
              <input
                type="text"
                readOnly
                value={formatMiles(bancoDebito)}
                onFocus={(e) => {
                  setPagoTipoLocal("D");
                  if (bancoDebito === 0) {
                    setBancoDebito(Number((totalRest * 1.03).toFixed(0)));
                    setTotalRest(0);
                  }
                  e.target.select();
                  setTimeout(() => {
                    document.getElementById("venta-nro-pos-input")?.focus();
                  }, 100);
                }}
                className={montoInputCls(pagoTipo === "D")}
              />
            </div>
            {/* Tarjeta Crédito */}
            <div className={rowCls}>
              <label className={montoLabelCls}>
                Tarjeta Crédito (5% adicional):
              </label>
              <input
                type="text"
                readOnly
                value={formatMiles(bancoCredito)}
                onFocus={(e) => {
                  setPagoTipoLocal("CR");
                  if (bancoCredito === 0) {
                    setBancoCredito(Number((totalRest * 1.05).toFixed(0)));
                    setTotalRest(0);
                  }
                  e.target.select();
                  setTimeout(() => {
                    document.getElementById("venta-nro-pos-input")?.focus();
                  }, 100);
                }}
                className={montoInputCls(pagoTipo === "CR")}
              />
            </div>
            {/* Nro. POS - solo cuando hay pago con tarjeta débito o crédito */}
            {pagoConTarjeta && (
              <div className={rowCls}>
                <label className={montoLabelCls}>
                  Nro. POS (mín. 4 dígitos):
                </label>
                <input
                  id="venta-nro-pos-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={ventaNroPOS}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVentaNroPOS(val);
                  }}
                  placeholder="Ej: 1234"
                  className={`w-[120px] rounded-md bg-surface-muted px-2.5 py-1.5 text-right font-num text-base outline-none transition-colors focus:ring-2 focus:ring-brand-600/30 ${
                    ventaNroPOS.trim().length > 0 &&
                    ventaNroPOS.trim().length < 4
                      ? "border-2 border-danger-500"
                      : "border border-border"
                  }`}
                />
              </div>
            )}
            {/* Cuenta Cliente */}
            <div className={rowCls}>
              <label className={montoLabelCls}>Cuenta de cliente:</label>
              <input
                type="text"
                value={cuentaCliente ? formatMiles(cuentaCliente) : ""}
                onFocus={(e) => {
                  setPagoTipoLocal("C");
                  if (cuentaCliente === 0) {
                    setCuentaCliente(totalRest);
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setCuentaCliente(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    banco -
                    bancoDebito -
                    bancoCredito -
                    newValue -
                    voucher;
                  setTotalRest(totalResto);
                }}
                className={montoInputCls(pagoTipo === "C")}
              />
            </div>
            {/* Voucher */}
            <div className={rowCls}>
              <label className={montoLabelCls}>Voucher:</label>
              <input
                type="text"
                value={voucher ? formatMiles(voucher) : ""}
                onFocus={(e) => {
                  setPagoTipoLocal("V");
                  if (voucher === 0) {
                    setVoucher(totalRest);
                    setTotalRest(0);
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const newValue = Number(e.target.value.replace(/\D/g, ""));
                  setVoucher(newValue);
                  const totalResto =
                    totalCost -
                    efectivo -
                    banco -
                    bancoDebito -
                    bancoCredito -
                    cuentaCliente -
                    newValue;
                  setTotalRest(totalResto);
                }}
                className={montoInputCls(pagoTipo === "V")}
              />
            </div>
            {/* Vuelto */}
            <div className="mt-6 font-num text-[28px] font-bold text-text-strong">
              Vuelto:{" "}
              <span className={totalRest < 0 ? "text-danger-700" : "text-text-strong"}>
                {totalRest < 0 ? formatMiles(totalRest * -1) : "0"}
              </span>
            </div>
            {/* Tipo de comprobante a emitir e imprimir */}
            <div className="mt-[18px]">
              <div className="text-sm text-text-muted font-semibold mb-1.5">
                Comprobante
              </div>
              <div className="flex gap-2">
                {(
                  [
                    ["FA", "Factura"],
                    ["NC", "Nota de crédito"],
                  ] as ["FA" | "NC", string][]
                ).map(([value, label]) => {
                  const activo = documentoTipo === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDocumentoTipo(value)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[15px] font-semibold cursor-pointer transition-colors ${
                        activo
                          ? "border-2 border-brand-700 bg-brand-50 text-brand-700"
                          : "border border-border bg-surface-muted text-text"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-[18px] flex items-center gap-2">
              <input
                type="checkbox"
                checked={printTicket}
                onChange={(e) => setPrintTicket(e.target.checked)}
                id="imprimir"
                className="h-4 w-4 cursor-pointer accent-brand-700"
              />
              <label
                htmlFor="imprimir"
                className="cursor-pointer text-[17px] font-medium text-text-muted"
              >
                Imprimir ticket
              </label>
            </div>
          </div>
          {/* Columna derecha: Pad numérico */}
          <div className="flex flex-1 flex-col gap-3">
            <div className="mb-2.5 grid grid-cols-3 gap-2.5">
              {buttonsPago.flat().map((label, idx) => (
                <button
                  key={idx}
                  className="h-[54px] cursor-pointer rounded-lg border border-border bg-surface-muted text-[22px] font-semibold transition-colors hover:bg-border"
                  onClick={() => onNumberClickModal(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="h-12 cursor-pointer rounded-lg border border-border bg-surface-muted text-lg font-medium transition-colors hover:bg-border"
              onClick={cerarCantidadModal}
            >
              Cerar
            </button>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button
            className="cursor-pointer rounded-lg bg-surface-muted px-8 py-2.5 text-lg font-semibold text-text transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            className={`px-8 py-2.5 rounded-lg font-bold text-lg text-white transition-colors duration-200 ${
              isSubmitting || totalRest > 0 || !ventaNroPOSValido
                ? "bg-brand-300 cursor-not-allowed"
                : "bg-brand-700 hover:bg-brand-800 cursor-pointer"
            }`}
            onClick={handleSendRequest}
            disabled={isSubmitting || totalRest > 0 || !ventaNroPOSValido}
          >
            {documentoTipo === "NC" ? "Emitir N. Crédito" : "Facturar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
