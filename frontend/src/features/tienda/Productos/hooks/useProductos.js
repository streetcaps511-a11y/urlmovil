/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useMemo } from "react";
import { getProductos } from "../services/productosApi";
import { useSearch, useCart } from "../../../shared/contexts";
import { NitroCache } from "../../../shared/utils/NitroCache";

const getInitialProducts = () => {
  const cached = NitroCache.get('tienda_productos');
  return cached?.data || [];
};

/* =========================
   CONSTANTES Y HELPERS
   ========================= */
const BULK_MIN_QTY = 6;

const clampRating = (r) => {
  const n = Number(r);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(5, n));
};

const getRatingFromProduct = (p) =>
  clampRating(p?.rating) ??
  clampRating(p?.calificacion) ??
  clampRating(p?.stars) ??
  clampRating(p?.score) ??
  null;

const normalizeSizes = (product) => {
  const t = product?.tallas;
  if (!t) return [];
  if (Array.isArray(t))
    return t.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string")
    return t.split(",").map((s) => s.trim()).filter(Boolean);
  if (typeof t === "object") return Object.keys(t);
  return [];
};

const safeImg = (product) => {
  const first =
    product?.imagenes?.[0]?.trim?.() ||
    product?.imagen?.trim?.() ||
    "https://via.placeholder.com/800x800?text=Sin+Imagen";
  return first;
};

/* =========================
   CUSTOM HOOK
   ========================= */
export const useProductos = () => {
  const { addToCart } = useCart();
  const { searchTerm, setSearchTerm: setGlobalSearch } = useSearch();
  const [initialProducts, setInitialProducts] = useState(getInitialProducts());
  const [carouselIndices, setCarouselIndices] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeError, setShowSizeError] = useState(false);
  const [loading, setLoading] = useState(getInitialProducts().length === 0);
  
  // FILTROS
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  // FETCH PRODUCTOS CON AUTO-SINCRONIZACIÓN (Sincroniza Precios y Stock sin refrescar)
  useEffect(() => {
    let isMounted = true;

    const fetchProductosData = async (isPolling = false) => {
      if (!isPolling) setLoading(true);
      try {
        // Cache-buster para asegurar que no nos devuelvan datos viejos del navegador
        const timestamp = new Date().getTime();
        // 🚀 Solicitamos un límite alto (999) para asegurar que se carguen todos los productos en Categorías
        const res = await getProductos(`?limit=999&t=${timestamp}`);
        
        if (!isMounted) return;

        const rawProducts = res?.data?.data?.products || [];
        const mapped = rawProducts.map((p) => {
          // Asegurar que tallasStock sea siempre un objeto/array procesable para comparar
          let ts = p.tallasStock || [];
          if (typeof ts === 'string') {
            try { ts = JSON.parse(ts); } catch(e) { ts = []; }
          }

          return {
            id: p.id_producto,
            nombre: p.nombre,
            categoria: p.categoria_nombre || p.categoria || p.categoriaData?.nombre || 'Gorra',
            precio: Number(p.precio_normal || 0),
            precioOferta: p.precio_descuento ? Number(p.precio_descuento) : null,
            precioMayorista6: Number(p.precio_mayorista6 || 0),
            precioMayorista80: Number(p.precio_mayorista80 || 0),
            hasDiscount: p.has_discount || false,
            oferta: p.is_oferta || false,
            enOfertaVenta: p.is_oferta || p.has_discount || false,
            descripcion: p.descripcion || "",
            tallas: Array.isArray(p.tallas) ? p.tallas : [],
            colores: p.colores || ["Negro"],
            imagenes: p.imagenes || [],
            isFeatured: p.is_featured || false,
            destacado: p.is_featured || false,
            sales: p.sales_count || 0,
            isActive: p.is_active !== undefined ? p.is_active : true,
            stock: Number(p.stock || 0),
            tallasStock: ts
          };
        });

        setInitialProducts(prev => {
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(mapped);
          
          if (prevStr !== nextStr) {
            console.log("🔄 Sincronizando catálogo con cambios de precio/stock...");
            NitroCache.set('tienda_productos', mapped);
            return mapped;
          }
          return prev;
        });

      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Error sincronizando catálogo:", error);
        }
      } finally {
        if (!isPolling && isMounted) setLoading(false);
      }
    };

    fetchProductosData();
    window.scrollTo(0, 0);

    // Sincronizar Stock cada 5 segundos (antes 10) para mayor precisión
    const interval = setInterval(() => fetchProductosData(true), 5000);

    // 📡 ESCUCHAR ACTUALIZACIONES DESDE OTRAS PESTAÑAS (Sync Instantáneo)
    const channel = new BroadcastChannel('app_sync');
    channel.onmessage = (event) => {
      if (event.data === 'productos_updated' || event.data === 'sync_all') {
        NitroCache.clear('tienda_productos');
        fetchProductosData();
      }
    };
    
    return () => {
      isMounted = false;
      clearInterval(interval);
      channel.close();
    };
  }, []);

  // 🔗 AUTO-ABRIR MODAL DESDE URL (?producto=ID)
  useEffect(() => {
    if (!loading && initialProducts.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const prodId = params.get('producto');
      if (prodId) {
        const found = initialProducts.find(p => String(p.id) === String(prodId));
        if (found) {
          setSelectedProduct(found);
        }
      }
    }
  }, [loading, initialProducts]);

  // 🔥 PRODUCTO SELECCIONADO DINÁMICO (Para que los cambios de stock en Admin se vean con el modal abierto)
  const modalProduct = useMemo(() => {
    if (!selectedProduct) return null;
    return initialProducts.find(p => p.id === selectedProduct.id) || selectedProduct;
  }, [selectedProduct, initialProducts]);

  // PRODUCTOS AGRUPADOS POR CATEGORIA
  const productsByCategory = useMemo(() => {
    const activeProducts = (initialProducts || []).filter((p) => p.isActive && p.stock > 0);
    const grouped = {};
    activeProducts.forEach((product) => {
      const cat = product.categoria || "Otros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(product);
    });
    return grouped;
  }, [initialProducts]);

  // INICIALIZAR INDICES
  useEffect(() => {
    const indices = {};
    Object.keys(productsByCategory).forEach((cat) => {
      indices[cat] = 0;
    });
    setCarouselIndices(indices);
  }, [productsByCategory]);

  // BÚSQUEDA Y FILTROS COMBINADOS
  const filteredProducts = useMemo(() => {
    // Si no hay nada seleccionado ni se está buscando, mostramos todos (null para la UI)
    const hasSearch = searchTerm.trim().length > 0;
    const hasFilters = selectedColors.length > 0 || selectedSizes.length > 0 || selectedCategories.length > 0;
    
    if (!hasSearch && !hasFilters) return null;

    const normalize = (str) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const query = normalize(searchTerm.trim());
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);

    return (initialProducts || []).filter((p) => {
      if (!p.isActive || p.stock <= 0) return false;

      // 1. Filtro de Búsqueda (Texto) - Flexibilidad de palabras y múltiples campos
      const matchesSearch = queryWords.length === 0 || queryWords.every(word => {
        const pTallas = normalizeSizes(p).join(' ');
        const pColores = (Array.isArray(p.colores) ? p.colores : [p.colores || '']).join(' ');
        
        return (
          normalize(p.nombre).includes(word) ||
          normalize(p.categoria).includes(word) ||
          normalize(p.descripcion).includes(word) ||
          normalize(pColores).includes(word) ||
          normalize(pTallas).includes(word)
        );
      });

      // 2. Filtro de Colores (Multi-select)
      const pColores = Array.isArray(p.colores) ? p.colores : [p.colores || 'Negro'];
      const matchesColor = selectedColors.length === 0 || 
        selectedColors.some(c => pColores.some(pc => String(pc).toLowerCase() === c.toLowerCase()));

      // 3. Filtro de Tallas (Multi-select)
      const pTallas = normalizeSizes(p);
      const matchesSize = selectedSizes.length === 0 || 
        selectedSizes.some(s => pTallas.some(pt => String(pt).toLowerCase() === s.toLowerCase()));

      // 4. Filtro de Categorías (Multi-select)
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.some(cat => String(p.categoria).toLowerCase() === cat.toLowerCase());

      return matchesSearch && matchesColor && matchesSize && matchesCategory;
    });
  }, [searchTerm, initialProducts, selectedColors, selectedSizes, selectedCategories]);

  // VALORES ÚNICOS PARA LOS FILTROS
  const allAvailableFilters = useMemo(() => {
    const categories = new Set();
    const colors = new Set();
    const sizes = new Set();

    (initialProducts || []).forEach(p => {
      if (!p.isActive || p.stock <= 0) return;
      if (p.categoria) categories.add(p.categoria);
      
      const pColores = Array.isArray(p.colores) ? p.colores : [p.colores || 'Negro'];
      pColores.forEach(c => colors.add(c));

      const pTallas = normalizeSizes(p);
      pTallas.forEach(s => sizes.add(s));
    });

    return {
      categories: Array.from(categories).sort(),
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort()
    };
  }, [initialProducts]);

  const toggleFilter = (type, value) => {
    const setters = {
      color: [selectedColors, setSelectedColors],
      size: [selectedSizes, setSelectedSizes],
      category: [selectedCategories, setSelectedCategories]
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
    setSelectedCategories([]);
    setGlobalSearch("");
  };

  // CARRUSEL
  const handleCarouselScroll = (category, direction) => {
    setCarouselIndices((prev) => {
      const current = prev[category] || 0;
      const items = productsByCategory[category] || [];
      const maxIndex = Math.max(0, Math.ceil(items.length / 4) - 1);
      let newIndex = current;
      if (direction === "left") newIndex = Math.max(0, current - 1);
      if (direction === "right") newIndex = Math.min(maxIndex, current + 1);
      return { ...prev, [category]: newIndex };
    });
  };

  // MODAL LOGIC
  const openModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize(null);
    setQuantity(1);
    setShowSizeError(false);
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setSelectedSize(null);
    setQuantity(1);
    setShowSizeError(false);
  };

  const handleSizeSelect = (talla) => {
    setSelectedSize(talla);
    setShowSizeError(false);
    setQuantity(1);
  };

  const handleModalAddToCart = () => {
    if (!modalProduct) return;
    const sizes = normalizeSizes(modalProduct);
    if (sizes.length > 0 && !selectedSize) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 2000);
      return;
    }
    const size = selectedSize ? selectedSize : (sizes[0] || "Única");
    
    // Calcular el precio final según la cantidad
    const q = parseInt(quantity) || 0;
    let finalPrice = modalProduct.precioOferta && (modalProduct.hasDiscount || modalProduct.oferta) 
                    ? Math.round(modalProduct.precioOferta) 
                    : Math.round(modalProduct.precio || 0);

    if (q >= 80 && parseFloat(modalProduct.precioMayorista80) > 0) {
      finalPrice = Math.round(modalProduct.precioMayorista80);
    } else if (q >= 6 && parseFloat(modalProduct.precioMayorista6) > 0) {
      finalPrice = Math.round(modalProduct.precioMayorista6);
    }

    const cartItem = {
      // Identificadores
      id: modalProduct.id,
      id_producto: modalProduct.id,
      
      // Info Básica
      nombre: modalProduct.nombre,
      name: modalProduct.nombre,
      imagen: safeImg(modalProduct),
      image: safeImg(modalProduct),
      categoria: modalProduct.categoria,
      categoria_nombre: modalProduct.categoria,
      
      // Precios (Asegurar que existan todos los nombres posibles)
      precio: finalPrice,
      precio_normal: Math.round(modalProduct.precio || 0),
      precioNormal: Math.round(modalProduct.precio || 0),
      precioOferta: modalProduct.precioOferta ? Math.round(modalProduct.precioOferta) : null,
      precio_descuento: modalProduct.precioOferta ? Math.round(modalProduct.precioOferta) : null,
      precioMayorista6: modalProduct.precioMayorista6,
      precio_mayorista6: modalProduct.precioMayorista6,
      precioMayorista80: modalProduct.precioMayorista80,
      precio_mayorista80: modalProduct.precioMayorista80,
      
      // Flags de Oferta
      enOfertaVenta: !!(modalProduct.enOfertaVenta || modalProduct.has_discount || modalProduct.is_oferta),
      oferta: !!(modalProduct.enOfertaVenta || modalProduct.has_discount || modalProduct.is_oferta),
      has_discount: !!(modalProduct.enOfertaVenta || modalProduct.has_discount || modalProduct.is_oferta),
      
      // Selección actual
      quantity: q, 
      talla: size,
      
      // Stock para validación
      tallasStock: modalProduct.tallasStock || [],
      stock: parseInt(modalProduct.stock) || 0
    };
    
    addToCart(cartItem);
    closeModal();
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

  const handleQuantityInput = (val) => {
    if (val === '' || val === null) {
      setQuantity('');
      return;
    }
    
    // Limpiar ceros a la izquierda
    let clean = val.toString().replace(/^0+/, '');
    if (clean === '') clean = '0';

    const raw = parseInt(clean, 10);
    if (Number.isNaN(raw)) {
      setQuantity(0);
      return;
    }
    
    let nextVal = Math.max(0, raw);
    
    // Validar contra stock si hay talla seleccionada
    if (selectedSize && modalProduct) {
      const stock = getStockFor(modalProduct, selectedSize);
      if (nextVal > stock) nextVal = stock;
    } else {
      // Si no hay talla seleccionada, cap a 99
      if (nextVal > 99) nextVal = 99;
    }
    
    setQuantity(nextVal);
  };

  const incrementQuantity = () => {
    const sizes = normalizeSizes(selectedProduct);
    if (sizes.length > 0 && !selectedSize) {
      setShowSizeError(true);
      setTimeout(() => setShowSizeError(false), 2000);
      return;
    }
    
    const current = (parseInt(quantity) || 0);
    const stock = selectedSize && selectedProduct ? getStockFor(selectedProduct, selectedSize) : 99;
    
    if (current < stock) {
      setQuantity(current + 1);
    }
  };

  const decrementQuantity = () => {
    const current = (parseInt(quantity) || 0);
    if (current > 0) {
      setQuantity(current - 1);
    }
  };

  return {
    loading,
    initialProducts,
    productsByCategory,
    carouselIndices,
    handleCarouselScroll,
    filteredProducts,
    searchTerm,
    setGlobalSearch,
    selectedProduct: modalProduct, // 🔥 IMPORTANTE: Devolvemos el producto dinámico
    openModal,
    closeModal,
    selectedSize,
    handleSizeSelect,
    quantity,
    incrementQuantity,
    decrementQuantity,
    handleQuantityInput, 
    handleModalAddToCart,
    showSizeError,
    normalizeSizes,
    safeImg,
    getRatingFromProduct,
    BULK_MIN_QTY,
    
    // Filtros
    selectedColors,
    selectedSizes,
    selectedCategories,
    allAvailableFilters,
    toggleFilter,
    clearFilters
  };
};
