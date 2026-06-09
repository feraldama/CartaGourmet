/**
 * Carga perezosa de `jspdf` + `jspdf-autotable`. Saca ~80 KB (gzip) del
 * bundle inicial y solo los baja cuando el usuario genera un PDF por primera
 * vez. Vite los pone en su propio chunk automáticamente.
 */
export async function loadPdf() {
  const [jspdfMod, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return {
    jsPDF: jspdfMod.jsPDF,
    autoTable: autoTableMod.default,
  };
}
