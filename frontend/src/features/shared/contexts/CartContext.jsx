import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    sessionStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const getStockForSize = (item) => {
    try {
      const rawStock = item.tallasStock || item.tallas_stock;
      const globalStock = parseInt(item.stock || item.enInventario || 0);

      if (!rawStock) return globalStock;
      
      const stockArray = Array.isArray(rawStock) 
        ? rawStock 
        : (typeof rawStock === 'string' ? JSON.parse(rawStock) : []);
      
      if (!Array.isArray(stockArray) || stockArray.length === 0) {
        return globalStock;
      }

      const found = stockArray.find(s => 
        String(s.talla || '').trim().toLowerCase() === String(item.talla || '').trim().toLowerCase()
      );
      
      if (found) return parseInt(found.cantidad) || 0;
      
      // Si existe el array pero no la talla, devolvemos 0 porque la talla no existiría en inventario
      return 0;
    } catch {
      return parseInt(item.stock) || 0;
    }
  };

  const addToCart = (newItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) => String(i.id) === String(newItem.id) && String(i.talla) === String(newItem.talla)
      );
      
      const incomingQty = (newItem.quantity !== undefined && newItem.quantity !== null) ? newItem.quantity : 1;

      if (existingIdx > -1) {
        const next = [...prev];
        const existingItem = next[existingIdx];
        const combinedQty = (existingItem.quantity || 0) + incomingQty;
        const stock = getStockForSize({ ...existingItem, ...newItem });
        
        next[existingIdx] = {
          ...existingItem,
          ...newItem, 
          quantity: combinedQty > stock ? stock : combinedQty,
        };
        return next;
      }

      // New item
      const stock = getStockForSize(newItem);
      const initialQty = incomingQty;
      return [...prev, { ...newItem, quantity: initialQty > stock ? stock : initialQty }];
    });
  };

  const updateQuantity = (productId, talla, quantity) => {
    setCartItems((prev) =>
      prev.map((i) => {
        if (String(i.id) === String(productId) && String(i.talla) === String(talla)) {
          const stock = getStockForSize(i);
          const finalQty = quantity > stock ? stock : (quantity < 0 ? 0 : quantity);
          return { ...i, quantity: finalQty };
        }
        return i;
      })
    );
  };

  const removeFromCart = (productId, talla) => {
    setCartItems((prev) =>
      prev.filter((i) => !(String(i.id) === String(productId) && String(i.talla) === String(talla)))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartItemCount = useMemo(
    () => cartItems.reduce((t, i) => t + (i.quantity || 1), 0),
    [cartItems]
  );

  const getItemPrice = (item) => {
    const qty = parseInt(item.quantity) || 1;
    
    const isOfferActive = !!(item.enOfertaVenta || item.oferta || item.has_discount || item.is_oferta);
    const offerPrice = (item.precioOferta != null) ? parseFloat(item.precioOferta) : (item.precio_descuento ? parseFloat(item.precio_descuento) : null);
    const basePrice = parseFloat(item.precioNormal || item.precio_normal || item.precio || 0);
    
    // Si hay oferta y tenemos el precio de oferta, ese es nuestro retail
    const retailPrice = isOfferActive && offerPrice ? offerPrice : (item.precio ? parseFloat(item.precio) : basePrice);

    const p6 = parseFloat(item.precio_mayorista6 || item.precioMayorista6 || 0);
    const p80 = parseFloat(item.precio_mayorista80 || item.precioMayorista80 || 0);

    if (qty >= 80 && p80 > 0) return p80;
    if (qty >= 6 && p6 > 0) return p6;
    return retailPrice;
  };

  const cartTotal = useMemo(
    () => cartItems.reduce((t, i) => t + (getItemPrice(i) * (i.quantity || 1)), 0),
    [cartItems]
  );

  return (
    <CartContext.Provider value={{ 
      cartItems, 
      addToCart, 
      updateQuantity, 
      removeFromCart, 
      clearCart, 
      cartItemCount,
      cartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
};
