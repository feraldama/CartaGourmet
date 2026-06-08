import { useEffect, useState, useCallback } from "react";
import {
  getProductosPaginated,
  getProductoById,
  deleteProducto,
  searchProductos,
  createProducto,
  updateProducto,
} from "../../services/productos.service";
import ProductsList from "../../components/products/ProductsList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

// Stock por almacén (tabla productoalmacen)
export interface ProductoAlmacenItem {
  AlmacenId: number;
  AlmacenNombre?: string;
  ProductoAlmacenStock: number;
  ProductoAlmacenStockUnitario: number;
}

// Tipos auxiliares
interface Producto {
  ProductoId: number;
  ProductoCodigo: string;
  ProductoNombre: string;
  ProductoPrecioVenta: number;
  ProductoPrecioVentaMayorista?: number;
  ProductoPrecioUnitario?: number;
  ProductoPrecioPromedio?: number;
  ProductoStock: number;
  ProductoStockUnitario?: number;
  ProductoCantidadCaja?: number;
  ProductoIVA?: number;
  ProductoStockMinimo?: number;
  ProductoImagen?: string;
  ProductoImagen_GXI?: string;
  LocalId: number;
  LocalNombre: string;
  productoAlmacen?: ProductoAlmacenItem[];
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

type ProductoForm = Partial<Producto>;

export default function ProductsPage() {
  const [productosData, setProductosData] = useState<{
    productos: Producto[];
    pagination: Pagination;
  }>({ productos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Producto | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("PRODUCTOS", "crear");
  const puedeEditar = usePermiso("PRODUCTOS", "editar");
  const puedeEliminar = usePermiso("PRODUCTOS", "eliminar");
  const puedeLeer = usePermiso("PRODUCTOS", "leer");

  const fetchProductos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchProductos(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getProductosPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      setProductosData({
        productos: data.data,
        pagination: data.pagination,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearchTerm, itemsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

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

  const handleDelete = async (id: number) => {
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
          await deleteProducto(id);
          Swal.fire({
            icon: "success",
            title: "Producto eliminado exitosamente",
          });
          setProductosData((prev) => ({
            ...prev,
            productos: prev.productos.filter(
              (producto) => Number(producto.ProductoId) !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el producto";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentProduct(null); // Indica que es un nuevo producto
    setIsModalOpen(true);
  };

  const handleEdit = async (product: Producto) => {
    try {
      const fullProduct = await getProductoById(product.ProductoId);
      setCurrentProduct({
        ...fullProduct,
        ProductoId: Number(fullProduct.ProductoId),
        productoAlmacen: fullProduct.productoAlmacen ?? [],
      });
      setIsModalOpen(true);
    } catch {
      setError("No se pudo cargar el producto para editar");
    }
  };

  const handleSubmit = async (productData: ProductoForm) => {
    let mensaje = "";
    try {
      if (currentProduct) {
        await updateProducto(currentProduct.ProductoId, productData);
        mensaje = "Producto actualizado exitosamente";
      } else {
        const response = await createProducto(productData);
        mensaje = response.message || "Producto creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchProductos();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (!puedeLeer) return <div>No tienes permiso para ver los productos</div>;
  if (loading) return <div>Cargando productos...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Productos</h1>
      <ProductsList
        productos={productosData.productos.map((p) => ({
          ...p,
          ProductoId: Number(p.ProductoId),
          LocalNombre: typeof p.LocalNombre === "string" ? p.LocalNombre : "",
        }))}
        onDelete={
          puedeEliminar ? (p) => handleDelete(Number(p.ProductoId)) : undefined
        }
        onEdit={
          puedeEditar
            ? (p) =>
                handleEdit({
                  ...p,
                  ProductoId: Number(p.ProductoId),
                  LocalNombre:
                    typeof p.LocalNombre === "string" ? p.LocalNombre : "",
                })
            : undefined
        }
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={productosData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentProduct={currentProduct}
        onSubmit={handleSubmit}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key: string, order: "asc" | "desc") => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={productosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
