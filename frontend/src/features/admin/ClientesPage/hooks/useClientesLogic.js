/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { NitroCache } from '../../../shared/utils/NitroCache';
import { 
  fetchAllClientes,
  createNewCliente,
  updateExistingCliente,
  deleteExistingCliente,
  toggleClienteStatus
} from "../services/clientesApi";


// 🧠 MEMORIA GLOBAL (Caché Nitro)
let clientesCache = {
  clientes: [],
  isInitialized: false
};

// 🧠 CONFIGURACIÓN INICIAL (Caché Nitro Persistente)
const getInitialClientes = () => {
  const cached = NitroCache.get('clientes');
  return Array.isArray(cached?.data) ? cached.data : [];
};
const getInitialDepts = () => {
  const cached = NitroCache.get('departamentos');
  return cached?.data || [];
};

export const useClientesLogic = () => {
  const initialClientes = getInitialClientes();
  const [clientes, setClientes] = useState(initialClientes);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  const [departamentos, setDepartamentos] = useState(getInitialDepts());
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'view',
    cliente: null
  });
  const [ciudades, setCiudades] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [formData, setFormData] = useState({
    documentType: '',
    documentNumber: '',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    department: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, cliente: null, customMessage: '' });
  const firstInputRef = useRef(null);

  const filtered = clientes.filter(c => {
    const search = (
      (c.nombreCompleto || '') +
      (c.email || '') +
      (c.telefono || '') +
      (c.numeroDocumento || '') +
      (c.ciudad || '') +
      (c.departamento || '') +
      (c.tipoDocumento || '')
    ).toLowerCase().includes(searchTerm.toLowerCase());
    const status = filterStatus === 'Todos' || 
      (filterStatus === 'Activos' && c.isActive) || 
      (filterStatus === 'Inactivos' && !c.isActive);

    return search && status;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
  const paginatedClientes = filtered.slice(startIndex, endIndex);
  const showingStart = filtered.length > 0 ? startIndex + 1 : 0;

  const loadClientes = async () => {
    try {
      const data = await fetchAllClientes();
      setClientes(data);
      NitroCache.set('clientes', data);
    } catch (error) {
      console.error("Error loading clientes:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadClientes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDepartamentos = async () => {
      try {
        if (getInitialDepts().length > 0) return;
        
        const res = await fetch('https://api-colombia.com/api/v1/Department');
        const data = await res.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        
        NitroCache.set('departamentos', sorted);
        setDepartamentos(sorted);
      } catch {
        console.error("Error loading departments");
      }
    };
    fetchDepartamentos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (modalState.isOpen && (modalState.mode === 'create' || modalState.mode === 'edit')) {
      const timer = setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [modalState.isOpen, modalState.mode]);

  const showAlert = useCallback((message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  }, []);

  const handleFilterSelect = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const loadCitiesByDepartment = async (deptId) => {
    if (!deptId) {
      setCiudades([]);
      return;
    }
    setLoadingCities(true);
    try {
      const res = await fetch(`https://api-colombia.com/api/v1/City?departmentId=${deptId}`);
      const data = await res.json();
      setCiudades(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      showAlert('Error cargando ciudades', 'error');
    }
    setLoadingCities(false);
  };

  const openModal = (mode = 'create', cliente = null) => {
    setModalState({ isOpen: true, mode, cliente });
    setErrors({});
    
    if (cliente && (mode === 'edit' || mode === 'view')) {
      const dept = departamentos.find(d => d.name === cliente.departamento);
      if (dept) loadCitiesByDepartment(dept.id);

      setFormData({
        documentType: cliente.tipoDocumento,
        documentNumber: cliente.numeroDocumento,
        fullName: cliente.nombreCompleto,
        email: cliente.email,
        phone: cliente.telefono,
        address: cliente.direccion,
        city: cliente.ciudad,
        department: dept?.id || '',
        isActive: cliente.isActive
      });
    } else {
      setFormData({
        documentType: '',
        documentNumber: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        department: '',
        isActive: true
      });
      setCiudades([]);
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'view', cliente: null });
    setFormData({
      documentType: '',
      documentNumber: '',
      fullName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      department: '',
      isActive: true
    });
    setErrors({});
    setCiudades([]);
  };

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      const newErr = { ...errors };
      delete newErr[field];
      setErrors(newErr);
    }
    
    if (field === 'department') {
      loadCitiesByDepartment(value);
      setFormData(prev => ({ ...prev, department: value, city: '' }));
    } else if (field === 'documentNumber') {
      // Permitir letras y símbolos si es NIT o Pasaporte
      const isAlphanumeric = formData.documentType === 'NIT' || formData.documentType === 'Pasaporte';
      // Limitar a 10 caracteres si es NIT, 20 si es Pasaporte, 15 otros
      const limit = formData.documentType === 'NIT' ? 10 : (formData.documentType === 'Pasaporte' ? 20 : 15);
      
      const val = isAlphanumeric ? value.slice(0, limit) : value.replace(/\D/g, '').slice(0, limit);
      setFormData(prev => ({ ...prev, [field]: val }));
    } else if (field === 'phone') {
      const val = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [field]: val }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.documentType) newErrors.documentType = 'Tipo de documento es obligatorio';
    if (!formData.documentNumber?.trim()) {
      newErrors.documentNumber = 'Número de documento es obligatorio';
    } else if (formData.documentType === 'NIT') {
      const nit = formData.documentNumber.trim();
      const hyphenCount = (nit.match(/-/g) || []).length;
      
      if (hyphenCount === 0) {
        newErrors.documentNumber = 'Falta el guion (-) en el NIT';
      } else if (hyphenCount > 1) {
        newErrors.documentNumber = 'El NIT solo debe tener un guion (-)';
      } else if (nit.length !== 10) {
        newErrors.documentNumber = 'El NIT debe tener exactamente 10 caracteres (ej: 12345678-9)';
      } else {
        // Verificar que sean números y un guion
        const regex = /^[0-9]+-[0-9]$/;
        if (!regex.test(nit)) {
          newErrors.documentNumber = 'Formato de NIT inválido. Verifica bien (ej: 12345678-9)';
        }
      }
    } else if (formData.documentNumber.trim().length < 6 || formData.documentNumber.trim().length > 15) {
      newErrors.documentNumber = 'El documento debe tener entre 6 y 15 caracteres';
    }
    
    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Nombre completo es obligatorio';
    } else if (formData.fullName.trim().length < 3) {
      newErrors.fullName = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email es obligatorio';
    } else {
      const email = formData.email.trim();
      const atIndex = email.indexOf('@');
      const dotIndex = email.lastIndexOf('.');
      
      if (atIndex === -1) {
        newErrors.email = 'Falta el símbolo arroba (@)';
      } else if (atIndex === 0 || atIndex === email.length - 1) {
        newErrors.email = 'El arroba (@) está mal posicionado';
      } else if (email.split('@').length > 2) {
        newErrors.email = 'No puede haber más de un arroba (@)';
      } else if (email.includes('..')) {
        newErrors.email = 'No puede haber dos puntos consecutivos (..)';
      } else if (email.toLowerCase().endsWith('.com.com')) {
        newErrors.email = 'El dominio no puede ser .com.com';
      } else if (dotIndex === -1 || dotIndex < atIndex + 2) {
        newErrors.email = 'Falta el punto (.) en el dominio después del arroba';
      } else if (dotIndex === email.length - 1) {
        newErrors.email = 'Falta el dominio (ej: .com)';
      }
    }
    if (!formData.phone?.trim()) newErrors.phone = 'Teléfono es obligatorio';
    if (!formData.department) newErrors.department = 'Departamento es obligatorio';
    if (!formData.city) newErrors.city = 'Ciudad es obligatoria';
    if (!formData.address?.trim()) newErrors.address = 'Dirección es obligatoria';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const deptObj = departamentos.find(d => d.id.toString() === formData.department);
    const cityObj = ciudades.find(c => c.id.toString() === formData.city);

    const apiClienteData = {
      tipoDocumento: formData.documentType,
      numeroDocumento: formData.documentNumber,
      nombreCompleto: formData.fullName,
      email: formData.email,
      telefono: formData.phone,
      direccion: formData.address,
      ciudad: cityObj?.name || formData.city,
      departamento: deptObj?.name || formData.department,
      saldoFavor: '0',
      isActive: formData.isActive
    };

    try {
      if (modalState.mode === 'edit') {
        const updatedId = modalState.cliente.id;
        
        // Optimistic UI
        setClientes(prev => {
            const next = prev.map(c => c.id === updatedId ? { ...c, ...apiClienteData } : c);
            clientesCache.clientes = next;
            return next;
        });
        closeModal();

        await updateExistingCliente(updatedId, apiClienteData);
        showAlert(`Cliente ${apiClienteData.nombreCompleto} actualizado correctamente ✅`);
      } else {
        // Optimistic UI (Temp ID)
        const tempId = `temp-${Date.now()}`;
        setClientes(prev => {
            const next = [{ id: tempId, ...apiClienteData }, ...prev];
            clientesCache.clientes = next;
            return next;
        });
        closeModal();

        await createNewCliente(apiClienteData);
        showAlert(`Cliente ${apiClienteData.nombreCompleto} registrado correctamente ✅`);
      }
      // Quitamos el loadClientes() de aquí para que sea instantáneo. 
      // El fetch inicial ya se encargará de sincronizar si es necesario, 
      // pero el estado local ya está actualizado de forma optimista.
    } catch (err) {
      showAlert('Error al guardar el cliente', 'error');
      loadClientes(); // Re-sync
    }
  };

  const openDeleteModal = (cliente) => {
    if (cliente.isActive) {
      showAlert(`No se puede eliminar el cliente "${cliente.nombreCompleto}" porque está activo. Desactívelo primero.`, 'error');
      return;
    }
    
    const mensaje = `¿Estás seguro que deseas eliminar permanentemente al cliente "${cliente.nombreCompleto}"?`;
    setDeleteModal({ 
      isOpen: true, 
      cliente,
      customMessage: mensaje
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, cliente: null, customMessage: '' });
  };

  const handleDelete = async () => {
    const cliente = deleteModal.cliente;
    if (!cliente) return;
    
    setLoading(true);
    try {
      await deleteExistingCliente(cliente.id);
      
      // Sincronizar estado local
      setClientes(prev => {
        const next = prev.filter(c => c.id !== cliente.id);
        clientesCache.clientes = next;
        return next;
      });
      
      closeDeleteModal();
      
      // Notificar éxito y actualizar caché
      showAlert(cliente.nombreCompleto, 'delete');
      const updatedData = await fetchAllClientes();
      NitroCache.set('clientes', updatedData);

    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al eliminar cliente';
      showAlert(msg, 'error');
    } finally {
      setLoading(false);
    }
  };



  return {
    clientes, setClientes,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    currentPage, setCurrentPage,
    alert, setAlert,
    departamentos, setDepartamentos,
    ciudades, setCiudades,
    loadingCities, setLoadingCities,
    modalState, setModalState,
    formData, setFormData,
    errors, setErrors,
    loading,
    deleteModal, setDeleteModal,
    firstInputRef,
    filtered,
    totalPages,
    paginatedClientes,
    showingStart, endIndex,
    showAlert,
    handleFilterSelect,
    loadCitiesByDepartment,
    openModal,
    closeModal,
    handleInputChange,
    handleSave,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
    handleToggleStatus: async (cliente) => {
      const previous = [...clientes];
      const newState = !cliente.isActive;
      setClientes(prev => prev.map(c =>
        c.id === cliente.id ? { ...c, isActive: newState } : c
      ));
      try {
        await toggleClienteStatus(cliente.id);
        showAlert(newState ? 'Cliente activado ✅' : 'Cliente desactivado');
        const next = clientes.map(c => c.id === cliente.id ? { ...c, isActive: newState } : c);
        NitroCache.set('clientes', next);
      } catch (err) {
        setClientes(previous);
        showAlert('Error al cambiar estado', 'error');
      }
    }
  };
};
