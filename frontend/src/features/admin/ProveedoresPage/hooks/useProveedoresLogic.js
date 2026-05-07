/* === HOOK DE LÓGICA === 
   Este archivo maneja el estado de React, las reglas de negocio, y las validaciones del módulo. 
   Separa la 'inteligencia' de la interfaz visual para mantener el código limpio. 
   Recibe eventos de la UI y se comunica con los Servicios API. */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Swal from 'sweetalert2';
import * as proveedoresService from '../services/proveedoresApi';
import { NitroCache } from '../../../shared/utils/NitroCache';

// 🧠 MEMORIA GLOBAL (Caché Nitro)
const getInitialProv = () => {
    const cached = NitroCache.get('proveedores_admin');
    return Array.isArray(cached?.data) ? cached.data : [];
};

let proveedoresCache = {
  isInitialized: false
};

export const useProveedoresLogic = () => {
  const [proveedores, setProveedores] = useState(getInitialProv());
  const [availableStatuses, setAvailableStatuses] = useState(() => ['Activo', 'Inactivo']);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  // ⚡ Solo mostramos cargando si NO tenemos nada en memoria
  const [loading, setLoading] = useState(getInitialProv().length === 0);
  const [loadingCities, setLoadingCities] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingText, setActionLoadingText] = useState('Procesando...');
  
  const [departamentos, setDepartamentos] = useState(() => {
    const cached = NitroCache.get('proveedores_depts');
    return cached?.data || [];
  });
  const [ciudades, setCiudades] = useState([]);
  
  const [modalState, setModalState] = useState({ 
    isOpen: false, 
    mode: 'view', 
    proveedor: null 
  });

  const [formData, setFormData] = useState({
    supplierType: '', 
    documentType: '',
    documentNumber: '',
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    department: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [deleteModal, setDeleteModal] = useState({ 
    isOpen: false, 
    proveedor: null 
  });

  // ====== FETCH INICIAL ======
  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    if (proveedores.length === 0) setLoading(true);
    try {
      const [provData, depts, statusData] = await Promise.all([
        proveedoresService.getProveedores(),
        proveedoresService.getDepartments(),
        proveedoresService.getStatuses()
      ]);
      const statuses = ['Activo', 'Inactivo'];
      
      // 💾 GUARDAR EN NITRO
      NitroCache.set('proveedores_admin', provData);
      NitroCache.set('proveedores_depts', depts);
      NitroCache.set('proveedores_statuses', statuses);

      setProveedores(provData);
      setDepartamentos(depts);
      setAvailableStatuses(statuses);
      proveedoresCache.isInitialized = true;
    } catch (error) {
      console.error("Error fetchData Proveedores:", error);
    } finally {
      setLoading(false);
    }
  }, []); // 👈 Solo en montaje o manual, remover proveedores.length para evitar re-fetch infinito al borrar

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ====== FETCH CIUDADES ======
  useEffect(() => {
    if (!formData.department || !departamentos.length) {
      setCiudades([]);
      return;
    }

    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const deptObj = departamentos.find(d => d.value === formData.department);
        if (deptObj && deptObj.id) {
          const citiesMap = await proveedoresService.getCitiesByDepartment(deptObj.id);
          setCiudades(citiesMap);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [formData.department, departamentos]);

  // ====== FILTRADO ======
  const filteredProveedores = useMemo(() => {
    let result = proveedores;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.companyName.toLowerCase().includes(search) ||
        p.documentNumber.toLowerCase().includes(search) ||
        p.email.toLowerCase().includes(search) ||
        p.contactName.toLowerCase().includes(search)
      );
    }
    if (filterStatus !== 'Todos') {
      result = result.filter(p => {
        const pStatus = p.isActive ? (availableStatuses[0] || 'Activo') : (availableStatuses[1] || 'Inactivo');
        return pStatus === filterStatus;
      });
    }
    return result;
  }, [proveedores, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredProveedores.length);
  const paginatedProveedores = filteredProveedores.slice(startIndex, endIndex);
  const showingStart = filteredProveedores.length > 0 ? startIndex + 1 : 0;

  // ====== FUNCIONES ======
  const showAlert = (msg, type = 'success') => {
    setAlert({ show: true, message: msg, type });
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFieldChange = (e) => {
    let { name, value } = e.target;
    // Limit and validation for doc number and phone (already in code)
    if (name === 'phone') {
      const onlyNums = value.replace(/[^0-9]/g, '');
      const code = formData.countryCode || '+57';
      const maxLength = code === '+507' ? 8 : (code === '+34' || code === '+56' || code === '+51') ? 9 : 10;
      if (onlyNums.length <= maxLength) value = onlyNums;
      else return;
    }
    if (name === 'documentNumber') {
      const isNIT = formData.documentType === 'NIT';
      if (isNIT) {
        // Solo permitir números y un solo guión
        let clean = value.replace(/[^0-9-]/g, '');
        const hyphenCount = (clean.match(/-/g) || []).length;
        if (hyphenCount > 1) return; 
        
        // El formato es XXXXXXXXX-Y (9 dígitos, guión, 1 dígito)
        if (clean.length > 11) return;
        value = clean;
      } else {
        const onlyNums = value.replace(/[^0-9]/g, '');
        if (onlyNums.length <= 15) value = onlyNums;
        else return;
      }
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'supplierType') {
        updated.documentType = value === 'Persona jurídica' ? 'NIT' : '';
        updated.documentNumber = '';
        if (value === 'Persona natural') updated.companyName = '';
      }
      if (name === 'department') updated.city = '';
      return updated;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'documentNumber' && formData.documentType === 'NIT') {
      if (value && !/^\d{9}-\d{1}$/.test(value)) {
        setErrors(prev => ({
          ...prev,
          documentNumber: 'NIT inválido. Debe tener 9 dígitos, un guion y un dígito (ej: 123456789-0)'
        }));
      }
    }
  };

  const openModal = (mode = 'view', proveedor = null) => {
    setModalState({ isOpen: true, mode, proveedor });
    setErrors({});
    if (proveedor) {
      setFormData({
        ...proveedor
      });
    } else {
      setFormData({
        supplierType: '',
        documentType: '',
        documentNumber: '',
        companyName: '',
        contactName: '',
        email: '',
        countryCode: '+57',
        phone: '',
        address: '',
        city: '',
        department: '',
        isActive: true,
      });
      setCiudades([]);
    }
  };

  const closeModal = () => setModalState({ isOpen: false, mode: 'view', proveedor: null });

  const validate = () => {
    const newErrors = {};
    const isJuridica = formData.supplierType?.toLowerCase() === 'persona jurídica';

    // ⚡ VALIDACIÓN: solo mostrar el error del primer campo vacío encontrado
    const requiredFields = [
      { key: 'supplierType', label: 'Tipo de persona' },
      { key: 'documentType', label: 'Tipo de documento' },
      { key: 'documentNumber', label: 'Número de documento' },
      ...(isJuridica ? [{ key: 'companyName', label: 'Nombre de empresa' }] : []),
      { key: 'contactName', label: isJuridica ? 'Encargado' : 'Nombre completo' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'department', label: 'Departamento' },
      { key: 'city', label: 'Ciudad' },
      { key: 'address', label: 'Dirección' }
    ];

    // Encontrar el primer campo vacío
    for (const field of requiredFields) {
      if (!formData[field.key] || formData[field.key].toString().trim() === '') {
        newErrors[field.key] = `${field.label} es requerido`;
        setErrors(newErrors);
        return false;
      }
    }

    if (formData.contactName) {
      if (formData.contactName.trim().length < 3) {
        newErrors.contactName = 'El nombre debe tener al menos 3 caracteres';
        setErrors(newErrors);
        return false;
      }
    }

    // Teléfono según país
    if (formData.phone) {
      const code = formData.countryCode || '+57';
      const phone = formData.phone.trim();
      const expected = code === '+507' ? 8 : (code === '+34' || code === '+56' || code === '+51') ? 9 : 10;
      if (phone.length !== expected) {
        newErrors.phone = `El teléfono debe tener ${expected} dígitos para este país`;
        setErrors(newErrors);
        return false;
      }
    }

    if (!formData.address || formData.address.trim() === '') {
      newErrors.address = 'La dirección es obligatoria';
      setErrors(newErrors);
      return false;
    }

    // Validaciones de formato específicas
    // NIT: si es jurídica, debe tener guión + dígito verificador (ej: 900123456-7)
    if (isJuridica && formData.documentNumber) {
      const nit = formData.documentNumber;
      if (!/^\d{9}-\d{1}$/.test(nit)) {
        newErrors.documentNumber = 'El NIT debe tener 9 dígitos, un guión y un dígito (ej: 123456789-0)';
        setErrors(newErrors);
        return false;
      }
    } else if (formData.documentNumber) {
      if (formData.documentNumber.length < 6 || formData.documentNumber.length > 15) {
        newErrors.documentNumber = 'Debe tener entre 6 y 15 dígitos';
        setErrors(newErrors);
        return false;
      }
    }
    
    // Email: validación estricta
    if (formData.email) {
      const email = formData.email.trim();
      const atCount = (email.match(/@/g) || []).length;
      
      if (atCount === 0) {
        newErrors.email = 'El email debe tener una arroba (@)';
      } else if (atCount > 1) {
        newErrors.email = 'El email no puede tener más de una arroba (@)';
      } else if (email.includes('..')) {
        newErrors.email = 'No puede haber dos puntos consecutivos (..)';
      } else if (email.toLowerCase().endsWith('.com.com')) {
        newErrors.email = 'El dominio no puede ser .com.com';
      } else {
        const [local, domain] = email.split('@');
        if (!local || local.length === 0) {
          newErrors.email = 'Falta el nombre antes de la arroba';
        } else if (!domain || !domain.includes('.')) {
          newErrors.email = 'Falta el punto después del dominio (ej: .com)';
        } else {
          const parts = domain.split('.');
          const lastPart = parts[parts.length - 1];
          if (lastPart.length < 2) {
            newErrors.email = 'El dominio del correo no es válido';
          }
        }
      }
      
      if (newErrors.email) {
        setErrors(newErrors);
        return false;
      }
    }
    
    // Teléfono ya validado por longitud según país arriba
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      // Encontrar el primer error para mostrar su mensaje específico
      const firstErrorKey = Object.keys(errors)[0];
      const firstErrorMsg = errors[firstErrorKey] || 'Complete el campo obligatorio';
      showAlert(firstErrorMsg, 'error');
      return;
    }

    const isEdit = modalState.mode === 'edit';
    const payload = { ...formData };
    
    // Para Persona natural, el Nombre (companyName) es el mismo Contacto (contactName)
    if (payload.supplierType === 'Persona natural') {
      payload.companyName = payload.contactName;
    }

    // 🚀 ACTUALIZACIÓN OPTIMISTA
    const oldProveedores = [...proveedores];
    
    if (isEdit) {
      setProveedores(prev => prev.map(p => p.id === payload.id ? { ...p, ...payload } : p));
      showAlert('Proveedor actualizado correctamente ✅');
    } else {
      const tempId = Date.now();
      const tempItem = { ...payload, id: tempId, isOptimistic: true };
      setProveedores(prev => [tempItem, ...prev]);
      showAlert('Proveedor creado correctamente ✅');
    }

    closeModal();

    try {
      let finalProveedores = [];
      if (isEdit) {
        await proveedoresService.updateProveedor(payload.id, payload);
        finalProveedores = oldProveedores.map(p => p.id === payload.id ? { ...p, ...payload } : p);
      } else {
        const result = await proveedoresService.createProveedor(payload);
        finalProveedores = [result, ...oldProveedores.filter(p => !p.isOptimistic)];
      }
      
      setProveedores(finalProveedores);
      NitroCache.set('proveedores_admin', finalProveedores);
    } catch (error) {
      setProveedores(oldProveedores);
      const resp = error.response?.data;
      let errorMsg = resp?.message || error.message;
      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        errorMsg = resp.errors[0];
      }
      showAlert('Error al procesar: ' + errorMsg, 'error');
    }
  };



  const openDeleteModal = (proveedor) => {
    if (proveedor.isActive) {
      showAlert(`Debe desactivar al proveedor antes de eliminarlo`, 'error');
      return;
    }
    setDeleteModal({ isOpen: true, proveedor });
  };

  const closeDeleteModal = () => setDeleteModal({ isOpen: false, proveedor: null });

  const handleDelete = async () => {
    const proveedor = deleteModal.proveedor;
    if (!proveedor) return;

    setActionLoadingText('Eliminando...');
    setActionLoading(true);
    try {
      await proveedoresService.deleteProveedor(proveedor.id);
      
      // Sincronizar estado local
      setProveedores(prev => prev.filter(p => p.id !== proveedor.id));
      showAlert('Proveedor eliminado permanentemente 🗑️');
      
      // ✅ Sincronizar Caché Manualmente tras eliminar
      const updatedData = proveedores.filter(p => p.id !== proveedor.id);
      NitroCache.set('proveedores_admin', updatedData);
      
      closeDeleteModal();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al eliminar proveedor';
      showAlert(errorMsg, 'error');
    } finally {
      setActionLoading(false);
      setActionLoadingText('Procesando...');
    }
  };

  const handleToggleStatus = async (proveedor) => {
    const newStatus = !proveedor.isActive;
    const previousProveedores = [...proveedores];
    
    // 🚀 Actualización OPTIMISTA
    setProveedores(prev => prev.map(p => p.id === proveedor.id ? { ...p, isActive: newStatus } : p));
    
    try {
      await proveedoresService.updateProveedor(proveedor.id, { ...proveedor, isActive: newStatus });
      showAlert(`Proveedor ${newStatus ? 'activado' : 'desactivado'} ✅`);
      
      // Sincronizar caché
      const updated = previousProveedores.map(p => p.id === proveedor.id ? { ...p, isActive: newStatus } : p);
      NitroCache.set('proveedores_admin', updated);
    } catch (error) {
      setProveedores(previousProveedores);
      showAlert("No se pudo cambiar el estado", "error");
    }
  };

  return {
    proveedores,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    currentPage, setCurrentPage,
    alert, setAlert,
    loading,
    actionLoading,
    actionLoadingText,
    departamentos,
    ciudades,
    loadingCities,
    modalState,
    formData,
    errors,
    deleteModal,
    filteredProveedores,
    paginatedProveedores,
    totalPages,
    showingStart,
    endIndex,
    handleFieldChange,
    handleBlur,
    openModal,
    closeModal,
    handleSave,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
    availableStatuses,
    handleToggleStatus
  };
};
