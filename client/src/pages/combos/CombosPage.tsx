import { useEffect, useState, useCallback } from "react";
import {
  getCombosPaginated,
  deleteCombo,
  createCombo,
  updateCombo,
  searchCombos,
} from "../../services/combos.service";
import CombosList from "../../components/combos/CombosList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { getProductosAll } from "../../services/productos.service";
import { usePermiso } from "../../hooks/usePermiso";

interface Combo {
  id: string | number;
  ComboId: string | number;
  ComboDescripcion: string;
  ProductoId: string | number;
  ComboCantidad: number;
  ComboPrecio: number;
  [key: string]: unknown;
}

interface Producto {
  ProductoId: string | number;
  ProductoNombre: string;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CombosPage() {
  const [combosData, setCombosData] = useState<{
    combos: Combo[];
    pagination: Pagination;
  }>({ combos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCombo, setCurrentCombo] = useState<Combo | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

  const puedeCrear = usePermiso("COMBOS", "crear");
  const puedeEditar = usePermiso("COMBOS", "editar");
  const puedeEliminar = usePermiso("COMBOS", "eliminar");
  const puedeLeer = usePermiso("COMBOS", "leer");

  const fetchCombos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchCombos(appliedSearchTerm, currentPage, itemsPerPage);
      } else {
        data = await getCombosPaginated(currentPage, itemsPerPage);
      }
      setCombosData({
        combos: data.data,
        pagination: data.pagination,
      });
    } catch {
      setError("Error al obtener combos");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, appliedSearchTerm]);

  useEffect(() => {
    fetchCombos();
    getProductosAll().then((res) => setProductos(res.data));
  }, [fetchCombos]);

  const handleDelete = async (id: string) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteCombo(id);
          Swal.fire({
            icon: "success",
            title: "Combo eliminado exitosamente",
          });
          fetchCombos();
        } catch {
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: "No se pudo eliminar el combo",
          });
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentCombo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (combo: Combo) => {
    setCurrentCombo(combo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (comboData: Combo) => {
    let mensaje = "";
    try {
      if (currentCombo) {
        await updateCombo(currentCombo.ComboId, comboData);
        mensaje = "Combo actualizado exitosamente";
      } else {
        const response = await createCombo(comboData);
        mensaje = response.message || "Combo creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchCombos();
    } catch {
      setError("Error al guardar combo");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  if (loading) return <div>Cargando combos...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver los combos</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Combos</h1>
      <CombosList
        combos={combosData.combos.map((c) => ({ ...c, id: c.ComboId }))}
        productos={productos}
        onDelete={
          puedeEliminar
            ? (combo) => handleDelete(combo.ComboId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCombo={
          currentCombo ? { ...currentCombo, id: currentCombo.ComboId } : null
        }
        onSubmit={handleSubmit}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={combosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
