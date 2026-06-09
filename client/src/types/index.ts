/**
 * Tipos de dominio compartidos. Centralizado acá para evitar la deriva que
 * teníamos con ~30 interfaces duplicadas en páginas y componentes.
 *
 * Convenciones:
 * - La clave `id` (lowercase) es la que consumen los componentes genéricos
 *   de lista/modal. El backend devuelve siempre el ID con el prefijo de tabla
 *   (ClienteId, CajaId, etc.); las páginas hacen el mapping al agregar `id`.
 * - Los índices `[key: string]: unknown` permiten que páginas pasen objetos
 *   más ricos a componentes genéricos sin forzar un tipo exhaustivo.
 */

export interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

export interface Almacen {
  id: string | number;
  AlmacenId: string | number;
  AlmacenNombre: string;
  [key: string]: unknown;
}

export interface Local {
  id: string | number;
  LocalId: string | number;
  LocalNombre: string;
  LocalTelefono?: string;
  LocalCelular?: string;
  LocalDireccion?: string;
  [key: string]: unknown;
}

export interface Usuario {
  id: string | number;
  UsuarioId: string;
  UsuarioNombre: string;
  UsuarioApellido: string;
  UsuarioCorreo: string;
  UsuarioIsAdmin: "S" | "N";
  UsuarioEstado: "A" | "I";
  LocalId: number;
  LocalNombre?: string;
  [key: string]: unknown;
}

// Re-exports de tipos ya definidos en services/modals para ofrecer un único
// punto de importación desde las páginas.
export type { Cliente } from "../components/common/ClienteFormModal";
export type { Proveedor } from "../services/proveedores.service";
export type { Compra } from "../services/compras.service";
export type { Venta } from "../services/venta.service";
