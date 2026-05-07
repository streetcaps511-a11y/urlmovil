/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSearch, useAuth, useCart } from "../contexts";
import api from '../services/api';
import { NitroCache } from "../utils/NitroCache";

/**
 * Custom hook to manage all Header component logic
 */
export const useHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: onLogout } = useAuth();
  const { 
    cartItems, 
    cartItemCount, 
    cartTotal, 
    removeFromCart, 
    updateQuantity, 
    clearCart 
  } = useCart();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState(() => {
    const cached = NitroCache.get('tienda_productos');
    return cached?.data || [];
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Contexto global de búsqueda
  const { setSearchTerm: setGlobalSearch } = useSearch();

  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  const cartRef = useRef(null);
  const cartScrollRef = useRef(null);

  // Cargar productos para búsqueda en tiempo real con CACHÉ
  useEffect(() => {
    // Si tenemos cache fresco, lo usamos y evitamos la red
    if (NitroCache.isFresh('tienda_productos', 5 * 60 * 1000)) {
      const cached = NitroCache.get('tienda_productos');
      if (cached?.data) {
        setAllProducts(cached.data);
        return;
      }
    }

    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/productos');
        const projects = response.data?.data?.products || [];
        const mapped = Array.isArray(projects) ? projects : [];
        setAllProducts(mapped);
        
        // Guardar en cache para otras vistas
        NitroCache.set('tienda_productos', mapped);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Error cargando productos:', error);
        }
        setAllProducts([]);
      }
    };
    fetchProducts();
  }, []);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const closeMenu = (e) => {
      if (
        isUserMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target) &&
        !userButtonRef.current.contains(e.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [isUserMenuOpen]);

  // Cerrar carrito al hacer clic fuera
  useEffect(() => {
    const closeCart = (e) => {
      if (isCartOpen && cartRef.current && !cartRef.current.contains(e.target)) {
        setIsCartOpen(false);
        setShowClearCartConfirm(false);
      }
    };
    if (isCartOpen) document.addEventListener("mousedown", closeCart);
    return () => document.removeEventListener("mousedown", closeCart);
  }, [isCartOpen]);

  // Cerrar menú móvil al hacer clic en un link
  useEffect(() => {
    if (isMenuOpen) {
      const closeMobileMenu = () => setIsMenuOpen(false);
      const links = document.querySelectorAll('.mobile-menu-link');
      links.forEach(link => link.addEventListener('click', closeMobileMenu));
      return () => {
        links.forEach(link => link.removeEventListener('click', closeMobileMenu));
      };
    }
  }, [isMenuOpen]);

  // Manejar overflow del body cuando hay modales/menús abiertos
  useEffect(() => {
    if (isMenuOpen || isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen, isCartOpen]);

  const increaseQuantity = (id, talla) => {
    const item = cartItems.find(i => i.id === id && i.talla === talla);
    if (item) updateQuantity(id, talla, (item.quantity || 1) + 1);
  };

  const decreaseQuantity = (id, talla) => {
    const item = cartItems.find(i => i.id === id && i.talla === talla);
    if (item) {
      const newQty = (item.quantity || 1) - 1;
      if (newQty <= 0) {
        removeFromCart(id, talla);
      } else {
        updateQuantity(id, talla, newQty);
      }
    }
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearCartConfirm(false);
  };

  const handleClearCartClick = () => {
    if (cartItems.length === 0) return;
    setShowClearCartConfirm(true);
  };

  const cancelClearCart = () => {
    setShowClearCartConfirm(false);
  };

  const getItemPrice = (item) => {
    const qty = Number(item.quantity) || 1;

    // Precio normal y precio de oferta
    const base  = Number(item.precioNormal || item.precio_normal || item.precio || 0);
    const offer = Number(item.precioOferta ?? item.precio_descuento ?? 0);

    // Detectar oferta: flag explícito O precio menor al normal
    const isOffer = !!(item.enOfertaVenta || item.oferta || item.has_discount || item.is_oferta)
                 || (offer > 0 && offer < base);

    // Precio unitario correcto
    let current = isOffer && offer > 0 ? offer : base;

    // Mayorista (sync con CartContext)
    const p6  = Number(item.precio_mayorista6  || item.precioMayorista6  || 0);
    const p80 = Number(item.precio_mayorista80 || item.precioMayorista80 || 0);
    if (qty >= 80 && p80 > 0) return p80;
    if (qty >= 6  && p6  > 0) return p6;

    return current;   // ← ya tiene el precio de oferta si aplica
  };

  const getItemImage = (item) => {
    if (item.imagen && item.imagen.trim() !== '') return item.imagen;
    if (item.imagenes && item.imagenes.length > 0) return item.imagenes[0];
    if (item.image && item.image.trim() !== '') return item.image;
    return 'https://via.placeholder.com/50x50/1E293B/FFC107?text=GM';
  };

  const getItemName = (item) => {
    return item.nombre?.trim() || item.name?.trim() || 'Producto sin nombre';
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setGlobalSearch(value);

    if (value.trim().length >= 1) {
      // Normalizar: quitar tildes y pasar a minúsculas para búsqueda insensible a acentos/mayúsculas
      const normalize = (str) =>
        (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const query = normalize(value);
      const filtered = allProducts.filter(product => {
        const name = normalize(product.nombre || product.name || '');
        const cat  = normalize(product.categoria_nombre || product.categoria || '');
        return name.includes(query) || cat.includes(query);
      });
      const path = location.pathname;
      const isCatalogView = path === '/' || 
                            path.startsWith('/productos') || 
                            path.startsWith('/ofertas') || 
                            path.startsWith('/categorias');

      setSearchResults(filtered.slice(0, 6));
      setShowSearchDropdown(!isCatalogView);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query.length > 0) {
      setShowSearchDropdown(false);
      setIsMenuOpen(false);
      setSearchResults([]);

      // 1. Verificar si el término coincide exactamente con una categoría existente
      // (Búsqueda insensible a mayúsculas/acentos)
      const normalize = (str) =>
        (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedQuery = normalize(query);

      // Obtener categorías únicas de los productos cargados
      const categories = [...new Set(allProducts.map(p => p.categoria_nombre || p.categoria))];
      const matchedCategory = categories.find(cat => normalize(cat) === normalizedQuery);

      if (matchedCategory) {
        // Si coincide con una categoría, navegamos directamente a ella
        navigate(`/categorias/${encodeURIComponent(matchedCategory)}`);
        setSearchTerm(""); // Limpiar búsqueda al navegar a categoría
        setGlobalSearch("");
        return;
      }

      // 2. Si no es categoría, ver donde estamos para decidir si navegar
      const path = location.pathname;
      const isCatalogView = path === '/' || 
                            path.startsWith('/productos') || 
                            path.startsWith('/ofertas') || 
                            path.startsWith('/categorias');

      if (!isCatalogView) {
        // Solo si no estamos en una vista que soporte filtrado dinámico, mandamos a búsqueda
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setGlobalSearch('');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/50x50/1E293B/FFC107?text=GM';
  };

  return {
    user,
    onLogout,
    cartItems,
    cartItemCount,
    cartTotal,
    removeFromCart,
    isMenuOpen,
    setIsMenuOpen,
    isCartOpen,
    setIsCartOpen,
    searchTerm,
    showClearCartConfirm,
    setShowClearCartConfirm,
    isUserMenuOpen,
    setIsUserMenuOpen,
    searchResults,
    showSearchDropdown,
    setShowSearchDropdown,
    userMenuRef,
    userButtonRef,
    cartRef,
    cartScrollRef,
    increaseQuantity,
    decreaseQuantity,
    handleClearCart,
    handleClearCartClick,
    cancelClearCart,
    getItemPrice,
    getItemImage,
    getItemName,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
    handleImageError,
    handleLogoutClick,
    showLogoutConfirm,
    confirmLogout,
    cancelLogout,
    navigate
  };
};

export default useHeader;
