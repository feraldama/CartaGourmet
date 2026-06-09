// import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) => {
  // Calcular el rango de páginas a mostrar
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      // Mostrar todas las páginas si son pocas
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pageNumbers = [];
    const maxVisiblePages = 2; // Menos páginas visibles en mobile

    // Siempre mostrar la primera página
    pageNumbers.push(1);

    // Calcular el rango alrededor de la página actual
    let startPage = Math.max(2, currentPage - maxVisiblePages);
    let endPage = Math.min(totalPages - 1, currentPage + maxVisiblePages);

    // Asegurarse de que mostramos suficientes páginas si estamos cerca de los extremos
    if (currentPage <= 3) {
      endPage = 4;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 3;
    }

    // Agregar puntos suspensivos si hay un salto entre la primera página y el rango
    if (startPage > 2) {
      pageNumbers.push("...");
    }

    // Agregar páginas en el rango calculado
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // Agregar puntos suspensivos si hay un salto entre el rango y la última página
    if (endPage < totalPages - 1) {
      pageNumbers.push("...");
    }

    // Siempre mostrar la última página
    pageNumbers.push(totalPages);

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <div className="flex items-center order-2 sm:order-1">
        <label className="mr-2 text-sm text-text-muted">Mostrar:</label>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="cursor-pointer rounded-md border border-border bg-surface px-2 py-1 text-sm text-text transition-colors hover:border-border-strong focus:border-brand-700 focus:ring-2 focus:ring-brand-600/30"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <nav className="inline-flex rounded-md shadow order-1 sm:order-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible">
        <div className="flex">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="cursor-pointer whitespace-nowrap rounded-l-md border border-border bg-surface px-3 py-1 text-sm font-medium text-text transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          {pageNumbers.map((number, index) => (
            <button
              key={number === "..." ? `ellipsis-${index}` : number}
              onClick={() => {
                if (typeof number === "number") onPageChange(number);
              }}
              disabled={number === "..."}
              className={`whitespace-nowrap border-b border-t border-border px-3 py-1 text-sm font-medium transition-colors ${
                currentPage === number
                  ? "bg-brand-50 text-brand-700"
                  : "bg-surface text-text hover:bg-surface-muted"
              } ${
                number === "..." ? "cursor-default" : "cursor-pointer"
              }`}
            >
              {number}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="cursor-pointer whitespace-nowrap rounded-r-md border border-border bg-surface px-3 py-1 text-sm font-medium text-text transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Pagination;
