import logo from "../assets/img/logo.jpg";

/**
 * URL del endpoint binario de imagen de producto.
 * El backend la sirve como `image/jpeg` con Cache-Control agresivo.
 */
export function getProductoImagenUrl(productoId: number | string): string {
  const base = import.meta.env.VITE_API_URL as string;
  return `${base}/productos/${productoId}/imagen`;
}

/**
 * Devuelve la URL de imagen del producto si tiene, o el logo por defecto.
 * Acepta tanto el flag `HasImagen` (0/1 que viene del backend) como un
 * string base64 legacy (para casos de edit donde el form aún lo usa).
 */
export function resolveProductoImagen(
  productoId: number | string,
  hasImagen: number | boolean | null | undefined
): string {
  if (hasImagen) return getProductoImagenUrl(productoId);
  return logo;
}
