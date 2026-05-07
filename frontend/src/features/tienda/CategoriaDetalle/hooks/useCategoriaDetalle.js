/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getAllProducts, getCategorias, getProductsByCategoryName } from "../services/categoriaApi";
import { useCart } from "../../../shared/contexts";
import { NitroCache } from "../../../shared/utils/NitroCache";

const getPersistentData = (catName) => {
  const cached = NitroCache.get(`cat_v2_${catName}`);
  return cached?.data || null;
};

const setPersistentData = (catName, data) => {
  NitroCache.set(`cat_v2_${catName}`, data);
};

const getCachedProducts = () => {
  // Revisar múltiples claves: catálogo compartido > categorías > home
  const keys = ['gm_catalog', 'tienda_productos', 'home_products'];
  for (const key of keys) {
    const cached = NitroCache.get(key);
    const data = cached?.data;
    if (Array.isArray(data) && data.length > 0) return data;
  }
  return [];
};

export const BULK_MIN_QTY = 6;
export const BULK_DISCOUNT = 0.1;

/* =========================
   HELPERS
   ========================= */
export const clampRating = (r) => {
  const n = Number(r);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(5, n));
};

export const getRatingFromProduct = (p) =>
  clampRating(p?.rating) ??
  clampRating(p?.calificacion) ??
  clampRating(p?.stars) ??
  clampRating(p?.score) ??
  null;

export const normalizeSizes = (product) => {
  const t = product?.tallas;
  if (!t) return [];
  if (Array.isArray(t))
    return t.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string")
    return t.split(",").map((s) => s.trim()).filter(Boolean);
  if (typeof t === "object") return Object.keys(t);
  return [];
};

export const safeImg = (product) => {
  const first =
    product?.imagenes?.[0]?.trim?.() ||
    product?.imagen?.trim?.() ||
    "https://via.placeholder.com/800x800?text=Sin+Imagen";
  return first;
};

export const useCategoriaDetalle = () => {
  const { nombreCategoria } = useParams();
  const { addToCart } = useCart();
  const [productos, setProductos] = useState(() => {
    const cat = decodeURIComponent(nombreCategoria || '').toLowerCase();
    const persistent = getPersistentData(cat);
    // Si existe la key en la caché, la usamos y evitamos parpadeos
    if (persistent !== null) return persistent;

    const cached = getCachedProducts();
    const filtered = cached.filter(p => p.categoria?.toLowerCase() === cat || p.categoria_nombre?.toLowerCase() === cat);
    return filtered;
  });
  const [descripcionCategoria, setDescripcionCategoria] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeError, setShowSizeError] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // FILTROS
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [loading, setLoading] = useState(() => {
    const cat = decodeURIComponent(nombreCategoria || '').toLowerCase();
    const persistent = getPersistentData(cat);
    // Si la key existe en la caché, no mostramos loader
    if (persistent !== null) return false;
    
    const cached = getCachedProducts();
    // En catálogo global comprobamos si hay al menos uno. Si no hay, ni modo, debe cargar.
    const hasCat = cached.some(p => p.categoria?.toLowerCase() === cat || p.categoria_nombre?.toLowerCase() === cat);
    if (hasCat) return false;
    
    return true; // Solo si no hay DE NADA en memoria ni en local, mostramos loader
  });

  useEffect(() => {
    const categoria = decodeURIComponent(nombreCategoria).toLowerCase();

    // Si ya tenemos persistencia, seteamos (incluso si es [] para evitar flickers de "sin productos")
    const persistent = getPersistentData(categoria);
    if (persistent !== null) {
      setProductos(persistent);
      setLoading(false);
    } else {
      const cached = getCachedProducts();
      if (cached.length > 0) {
        const filtradosCache = cached.filter(
          p => p.categoria?.toLowerCase() === categoria || p.categoria_nombre?.toLowerCase() === categoria
        );
        if (filtradosCache.length > 0) {
          setProductos(filtradosCache);
          setLoading(false);
        }
      }
    }

    // ⚡ PASO 2: Refrescar en background (sin bloquear UI)
    // ⚡ PASO 2: Refrescar en background si es necesario
    // Solo omitimos el fetch si el cache tiene productos de ESTA categoría Y es reciente
    const isFresh = NitroCache.isFresh('gm_catalog', 10 * 60 * 1000); // 10 min
    const hasCategoryProducts = productos.length > 0;

    if (isFresh && hasCategoryProducts) {
      window.scrollTo(0, 0);
      return;
    }

    const fetchAndFilter = async () => {
      try {
        // ⚡ Pedir SOLO los productos de esta categoría al backend (mucho más rápido)
        const res = await getProductsByCategoryName(categoria);
        const allProducts = res.data?.data?.products || res.data?.data?.rows || [];

        // Descripción en background, sin bloquear
        getCategorias().then(catRes => {
          const allCats = catRes.data?.data || catRes.data || [];
          const found = allCats.find(c => c.nombre?.toLowerCase() === categoria);
          if (found) setDescripcionCategoria(found.descripcion || "");
        }).catch(() => {});

        const mapProduct = p => ({
          id: p.id_producto,
          nombre: p.nombre,
          categoria: p.categoria_nombre || p.categoria || p.categoriaData?.nombre || 'Gorra',
          categoria_nombre: p.categoria_nombre,
          precio: p.precio_normal,
          precioOferta: p.precio_descuento,
          hasDiscount: p.has_discount || (p.precio_descuento > 0 && p.precio_descuento < p.precio_normal),
          oferta: p.is_oferta || (p.precio_descuento > 0 && p.precio_descuento < p.precio_normal),
          descripcion: p.descripcion || "",
          tallas: p.tallas || [],
          colores: p.colores || ["Negro"],
          imagenes: p.imagenes || [],
          isFeatured: p.is_featured || false,
          sales: p.sales_count || 0,
          isActive: p.is_active !== undefined ? p.is_active : true,
          stock: p.stock,
          tallasStock: p.tallasStock || [],
          precioMayorista6: p.precio_mayorista6 || 0,
          precioMayorista80: p.precio_mayor_80 || p.precio_mayorista80 || 0,
        });

        const filtrados = allProducts.map(mapProduct);

        setProductos(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(filtrados)) return filtrados;
          return prev;
        });

        // Guardar en caché persistente de sesión
        setPersistentData(categoria, filtrados);

        // Guardar en cache compartido
        NitroCache.set('tienda_productos', allProducts.map(mapProduct));
        NitroCache.set('gm_catalog', allProducts.map(mapProduct));

      } catch (err) {
        console.error("Error fetching products for category:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndFilter();
    window.scrollTo(0, 0);
  }, [nombreCategoria]);

  const sizesForModal = selectedProduct ? normalizeSizes(selectedProduct) : [];

  const handleOpenModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize(null);
    setQuantity(0);
    setShowSizeError(false);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSelectedSize(null);
    setQuantity(0);
    setShowSizeError(false);
  };

  const handleSizeSelect = (talla) => {
    if (selectedSize === talla) {
      setSelectedSize(null);
      setQuantity(0);
    } else {
      setSelectedSize(talla);
      setShowSizeError(false);
      setQuantity(0);
    }
  };

  const getStockFor = (product, size) => {
    if (!product || !product.tallasStock || !size) return 0;
    try {
      const dbStock = typeof product.tallasStock === 'string' 
        ? JSON.parse(product.tallasStock) 
        : product.tallasStock;

      if (!dbStock || typeof dbStock !== 'object') return 0;

      if (Array.isArray(dbStock)) {
        const found = dbStock.find(item => String(item.talla || '').toLowerCase() === String(size).toLowerCase());
        return found ? Number(found.cantidad || 0) : 0;
      }

      return Number(dbStock[size] ?? 0);
    } catch {
      return 0;
    }
  };

  const incrementQuantity = () => {
    if (sizesForModal.length > 0 && !selectedSize) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 2000);
      return;
    }
    const max = getStockFor(selectedProduct, selectedSize);
    if (quantity < max) setQuantity((parseInt(quantity) || 0) + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 0) setQuantity((parseInt(quantity) || 0) - 1);
  };

  const handleQuantityInput = (val) => {
    if (val === '' || val === null) {
      setQuantity('');
      return;
    }
    
    // Si empieza con 0 y hay más dígitos, quitamos el 0 a la izquierda
    let cleanVal = val.toString().replace(/^0+/, '');
    if (cleanVal === "") cleanVal = "0";

    const num = parseInt(cleanVal, 10);
    if (isNaN(num)) {
      setQuantity(0);
      return;
    }

    const available = selectedSize 
      ? getStockFor(selectedProduct, selectedSize)
      : 99;
    
    if (num < 0) setQuantity(0);
    else if (num > available) setQuantity(available);
    else setQuantity(num);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    if (sizesForModal.length > 0 && !selectedSize) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 2000);
      return;
    }

    const size = selectedSize || (sizesForModal.length > 0 ? sizesForModal[0] : "Única");
    const q = parseInt(quantity) || 0;
    if (q <= 0) return;

    // Doble chequeo de stock
    const available = selectedSize ? getStockFor(selectedProduct, selectedSize) : 99;
    const finalQty = q > available ? available : q;
    
    if (finalQty <= 0) return;

    // Calcular el precio final según la cantidad
    let finalPrice = selectedProduct.precioOferta && (selectedProduct.hasDiscount || selectedProduct.oferta) 
                    ? Math.round(selectedProduct.precioOferta) 
                    : Math.round(selectedProduct.precio || 0);

    if (finalQty >= 80 && parseFloat(selectedProduct.precioMayorista80) > 0) {
      finalPrice = Math.round(selectedProduct.precioMayorista80);
    } else if (finalQty >= 6 && parseFloat(selectedProduct.precioMayorista6) > 0) {
      finalPrice = Math.round(selectedProduct.precioMayorista6);
    }

    const cartItem = {
      // Identificadores
      id: selectedProduct.id,
      id_producto: selectedProduct.id,
      
      // Info Básica
      nombre: selectedProduct.nombre,
      name: selectedProduct.nombre,
      imagen: safeImg(selectedProduct),
      image: safeImg(selectedProduct),
      categoria: selectedProduct.categoria,
      categoria_nombre: selectedProduct.categoria,
      
      // Precios (Asegurar que existan todos los nombres posibles)
      precio: finalPrice, 
      precio_normal: Math.round(selectedProduct.precio || 0),
      precioNormal: Math.round(selectedProduct.precio || 0),
      precioOferta: selectedProduct.precioOferta ? Math.round(selectedProduct.precioOferta) : null,
      precio_descuento: selectedProduct.precioOferta ? Math.round(selectedProduct.precioOferta) : null,
      precioMayorista6: selectedProduct.precioMayorista6,
      precio_mayorista6: selectedProduct.precioMayorista6,
      precioMayorista80: selectedProduct.precioMayorista80,
      precio_mayorista80: selectedProduct.precioMayorista80,
      
      // Flags de Oferta
      enOfertaVenta: !!(selectedProduct.enOfertaVenta || selectedProduct.has_discount || selectedProduct.is_oferta),
      oferta: !!(selectedProduct.enOfertaVenta || selectedProduct.has_discount || selectedProduct.is_oferta),
      has_discount: !!(selectedProduct.enOfertaVenta || selectedProduct.has_discount || selectedProduct.is_oferta),
      
      // Selección actual
      quantity: finalQty,
      talla: size,
      
      // Stock para validación
      tallasStock: selectedProduct.tallasStock || [],
      stock: parseInt(selectedProduct.stock) || 0
    };

    addToCart(cartItem);

    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    closeModal();
  };

  const filteredProductos = useMemo(() => {
    const hasFilters = selectedColors.length > 0 || selectedSizes.length > 0;
    if (!hasFilters) return productos;

    return productos.filter(p => {
      const pColores = Array.isArray(p.colores) ? p.colores : [p.colores || 'Negro'];
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.some(c => pColores.some(pc => String(pc).toLowerCase() === c.toLowerCase()));

      const pTallas = normalizeSizes(p);
      const matchesSize = selectedSizes.length === 0 || 
        selectedSizes.some(s => pTallas.some(pt => String(pt).toLowerCase() === s.toLowerCase()));

      return matchesColor && matchesSize;
    });
  }, [productos, selectedColors, selectedSizes]);

  const allAvailableFilters = useMemo(() => {
    const colors = new Set();
    const sizes = new Set();

    // 🔥 Usamos todos los productos cacheados para que siempre haya filtros visibles
    const allProducts = getCachedProducts();
    const source = allProducts.length > 0 ? allProducts : productos;

    source.forEach(p => {
      const pColores = Array.isArray(p.colores) ? p.colores : [p.colores || 'Negro'];
      pColores.forEach(c => colors.add(c));
      const pTallas = normalizeSizes(p);
      pTallas.forEach(s => sizes.add(s));
    });

    return {
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort()
    };
  }, [productos]);

  const toggleFilter = (type, value) => {
    const setters = {
      color: [selectedColors, setSelectedColors],
      size: [selectedSizes, setSelectedSizes]
    };
    if (!setters[type]) return;
    const [current, set] = setters[type];
    if (current.includes(value)) {
      set(current.filter(v => v !== value));
    } else {
      set([...current, value]);
    }
  };

  const clearFilters = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
  };

  return {
    nombreCategoria: decodeURIComponent(nombreCategoria),
    descripcionCategoria,
    productos: filteredProductos,
    initialProductos: productos,
    selectedProduct,
    selectedSize,
    quantity,
    showSizeError,
    showSuccessToast,
    loading,
    sizesForModal,
    handleOpenModal,
    closeModal,
    handleSizeSelect,
    incrementQuantity,
    decrementQuantity,
    handleQuantityInput,
    handleAddToCart,
    getRatingFromProduct,
    safeImg,
    BULK_MIN_QTY,
    // Filtros
    selectedColors,
    selectedSizes,
    allAvailableFilters,
    toggleFilter,
    clearFilters,
    normalizeSizes
  };
};
