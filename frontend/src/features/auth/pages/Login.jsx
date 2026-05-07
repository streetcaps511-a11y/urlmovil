/* === PÁGINA PRINCIPAL === 
   Este componente es la interfaz visual principal de la ruta. 
   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */

// src/features/auth/pages/Login.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from "sweetalert2";
import { useAuth } from "../../shared/contexts";
import SessionConflictModal from "../../shared/components/SessionConflictModal";
import api, { API_BASE_URL } from "../../shared/services/api";
import { auth, sendPasswordResetEmail, createUserWithEmailAndPassword, confirmPasswordReset, verifyPasswordResetCode } from "../../shared/services/firebase";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ─── Estados ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState("login");
  const [view, setView] = useState("auth"); // auth, recover, reset
  const [oobCode, setOobCode] = useState(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({}); // 🎯 Errores específicos por campo
  const [infoMsg, setInfoMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false); // 🔐 Estado para el modal

  // ─── Datos de Login ──────────────────────────────
  const [loginData, setLoginData] = useState({
    correo: "",
    clave: ""
  });

  // ─── Datos de Registro ───────────────────────────
  const [registerData, setRegisterData] = useState({
    documentType: "Cédula de Ciudadanía",
    documentNumber: "",
    fullName: "",
    correo: "",
    clave: "",
    confirmarClave: ""
  });

  // ─── Visibilidad de contraseñas ──────────────────
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);

  // ─── Recuperación de cuenta ──────────────────────
  const [recoverEmail, setRecoverEmail] = useState("");

  // ─── Helpers ─────────────────────────────────────
  // 🕵️‍♂️ Detectar si venimos desde un correo de recuperación
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("oobCode");
    if (code) {
      setOobCode(code);
      setView("reset");
    }
  }, []);

  // 🕵️‍♂️ Detectar si venimos desde un correo de recuperación
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("oobCode");
    if (code) {
      setOobCode(code);
      setView("reset");
    }
  }, []);

  const resetMessages = () => {
    setError("");
    setFieldErrors({});
    setInfoMsg("");
  };

  // ─── Estilos ─────────────────────────────────────
  const styles = useMemo(() => ({
    container: {
      display: "flex",
      height: "100vh",
      width: "100%",
      backgroundImage: `url('https://res.cloudinary.com/dxc5qqsjd/image/upload/v1774320932/WhatsApp_Image_2026-03-23_at_9.54.36_PM_pxd6fe.jpg')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      fontFamily: "'Inter', sans-serif",
      color: "#fff",
      overflow: "hidden",
      position: "relative"
    },
    overlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.2))",
      zIndex: 1
    },
    heroSection: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      zIndex: 2,
      padding: "40px",
      animation: "fadeIn 1s ease"
    },
    logoImg: {
      width: "240px",
      height: "auto",
      marginBottom: "15px",
      filter: "drop-shadow(0 4px 15px rgba(0,0,0,0.6))"
    },
    bannerTitle: {
      fontSize: "26px",
      fontWeight: "800",
      color: "#FFC107",
      letterSpacing: "1px",
      margin: "0",
      textShadow: "0 2px 10px rgba(0,0,0,0.8)"
    },
    bannerSubtitle: {
      fontSize: "17px",
      color: "#fff",
      maxWidth: "360px",
      marginTop: "15px",
      lineHeight: "1.4",
      textShadow: "0 2px 8px rgba(0,0,0,0.8)"
    },
    formWrapper: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
      paddingRight: "40px",
      position: "relative"
    },
    backLink: {
      position: "absolute",
      top: "30px",
      left: "40px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#FFC107",
      textDecoration: "none",
      fontSize: "15px",
      opacity: 0.9,
      transition: "0.2s",
      zIndex: 10
    },
    formCard: {
      width: "100%",
      maxWidth: "400px",
      backgroundColor: "rgba(15,17,21,0.96)",
      padding: "25px 35px",
      borderRadius: "14px",
      border: "1px solid rgba(255,193,7,0.15)",
      boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
      animation: "slideInRight 0.8s ease"
    },
    tabWrapper: {
      display: "flex",
      backgroundColor: "#1e222a",
      padding: "4px",
      borderRadius: "14px",
      marginBottom: "20px",
      gap: "4px"
    },
    tabBtn: (active) => ({
      flex: 1,
      padding: "8px",
      borderRadius: "10px",
      border: "none",
      fontSize: "13px",
      fontWeight: "700",
      cursor: "pointer",
      transition: "0.3s",
      backgroundColor: active ? "#FFC107" : "transparent",
      color: active ? "#000" : "#fff"
    }),
    formTitle: { fontSize: "28px", fontWeight: "800", marginBottom: "5px" },
    formSubtitle: { fontSize: "14px", color: "#888", marginBottom: "25px" },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#aaa",
      marginBottom: "7px",
      letterSpacing: "0.5px"
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: "8px",
      backgroundColor: "#171a21",
      border: "1px solid rgba(255,193,7,0.15)",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      marginBottom: "4px", // Reducido para dejar espacio al error debajo
      boxSizing: "border-box",
      transition: "border-color 0.2s"
    },
    fieldError: {
      position: "absolute",
      backgroundColor: "#ffffff",
      color: "#d32f2f",
      fontSize: "11px",
      fontWeight: "700",
      padding: "4px 10px",
      borderRadius: "6px",
      bottom: "-22px",
      left: "0",
      zIndex: 50,
      boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
      border: "1px solid #ff4d4d",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      animation: "slideInTop 0.3s ease"
    },
    inputWrap: { position: "relative", width: "100%", marginBottom: "15px" },
    eyeBtn: {
      position: "absolute",
      right: "14px",
      top: "44%",
      transform: "translateY(-50%)",
      border: "none",
      background: "none",
      cursor: "pointer",
      color: "#666"
    },
    mainBtn: {
      width: "100%",
      padding: "12px",
      borderRadius: "8px",
      backgroundColor: "#FFC107",
      color: "#000",
      border: "none",
      fontSize: "14px",
      fontWeight: "800",
      cursor: "pointer",
      marginTop: "10px",
      transition: "0.3s"
    },
    error: {
      color: "#ff6b6b",
      fontSize: "12px",
      marginBottom: "15px",
      marginTop: "5px",
      textAlign: "center"
    },
    info: {
      color: "#FFC107",
      fontSize: "12px",
      marginBottom: "15px",
      marginTop: "5px",
      textAlign: "center"
    }
  }), []);

  const loginEmailRef = useRef(null);
  const loginPassRef = useRef(null);

  // 🧹 LIMPIEZA TOTAL AL ENTRAR (Evitar que el navegador rellene solo)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loginEmailRef.current) loginEmailRef.current.value = "";
      if (loginPassRef.current) loginPassRef.current.value = "";
      setLoginData({ correo: "", clave: "" });
      setRegisterData({
        documentType: "Cédula de Ciudadanía",
        documentNumber: "",
        fullName: "",
        correo: "",
        clave: "",
        confirmarClave: ""
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ═══════════════════════════════════════════════
  // 🔐 HANDLER: LOGIN
  // ═══════════════════════════════════════════════
  const handleLogin = async (e, isForced = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting && !isForced) return;
    resetMessages();
    setIsSubmitting(true);

    // 🛡️ REFUERZO: Sincronizar con el valor real del DOM (Autofill fix)
    const currentCorreo = loginEmailRef.current?.value || loginData.correo || "";
    const currentClave = loginPassRef.current?.value || loginData.clave || "";

    const useForce = isForced || loginData.force || false;

    console.log(`🔵 Intentando Login ${useForce ? '[FORZADO]' : ''}:`, currentCorreo);

    if (!currentCorreo.trim() || !currentClave.trim()) {
      const fe = {};
      if (!currentCorreo.trim()) fe.correo = "Ingresa tu correo";
      if (!currentClave.trim()) fe.clave = "Ingresa tu contraseña";
      setFieldErrors(fe);
      setIsSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await api.post("/api/auth/login", {
        correo: currentCorreo.trim().toLowerCase(),
        clave: currentClave.trim(),
        force: useForce
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      const result = response.data;
      if (result.success === true && result.data?.usuario) {
        const token = result.data.token || result.data.Token;
        const { usuario } = result.data;

        const userData = {
          id: usuario.id,
          IdUsuario: usuario.id,
          IdCliente: usuario.IdCliente,
          nombre: usuario.nombre,
          Correo: usuario.email,
          IdRol: usuario.idRol,
          Rol: usuario.rol || usuario.rolData?.nombre || 'Cliente',
          rol: usuario.rol || usuario.rolData?.nombre || 'Cliente',
          Estado: usuario.estado,
          avatarUrl: usuario.avatarUrl,
          sessionId: usuario.sessionId,
          permisos: usuario.permisos || [],
          mustChangePassword: usuario.mustChangePassword === true || usuario.MustChangePassword === true,
          token: token,
          userType: (
            usuario.rolData?.nombre === "Administrador" ||
            usuario.idRol === 1 ||
            (usuario.rolData?.nombre?.toLowerCase() !== "cliente" && usuario.rolData?.nombre !== undefined)
          ) ? "admin" : "cliente"
        };

        login(userData);

        const from = location.state?.from?.pathname;
        if (from) {
          navigate(from, { replace: true });
        } else if (userData.userType === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      // 🔐 MANEJO DE CONFLICTO DE SESIÓN (409)
      if (err.response?.status === 409 && err.response.data?.needsForce) {
        setIsSubmitting(false); 
        setShowConflictModal(true); // 🔐 Mostrar el modal personalizado en lugar de SweetAlert
        return;
      }

      // Solo loguear errores que no sean 401 (validación normal)
      if (err.response?.status !== 401) {
        console.error("🔴 Error de conexión: ", err);
      }

      if (err.name === 'AbortError') {
        setError("La petición tardó demasiado. Verifica tu conexión.");
      } else if (err.response) {
      const msg = err.response?.data?.message || "";
      if (msg.toLowerCase().includes("correo") || msg.toLowerCase().includes("email") || msg.toLowerCase().includes("credenciales")) {
        setFieldErrors({ correo: msg || "Credenciales incorrectas" });
      } else if (msg.toLowerCase().includes("clave") || msg.toLowerCase().includes("contrase")) {
        setFieldErrors({ clave: msg });
      } else {
        setError(msg || "Error al iniciar sesión. Intenta de nuevo.");
      }
    }
  } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════
  // 📝 HANDLER: REGISTRO
  // ═══════════════════════════════════════════════
  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    resetMessages();
    setIsSubmitting(true);
    
    // 1. Validar Tipo y Número de Documento
    if (!registerData.documentNumber.trim()) {
      setFieldErrors({ documentNumber: "El número de documento es obligatorio" });
      setIsSubmitting(false);
      return;
    }

    // 2. Validar Nombre
    if (!registerData.fullName.trim()) {
       setFieldErrors({ fullName: "El nombre es obligatorio" });
       setIsSubmitting(false);
       return;
    }

    // 3. Validar Correo
    if (!registerData.correo.trim()) {
      setFieldErrors({ correo: "El correo electrónico es obligatorio" });
      setIsSubmitting(false);
      return;
    }

    // 4. Validar Contraseña
    if (!registerData.clave.trim()) {
      setFieldErrors({ clave: "La contraseña es obligatoria" });
      setIsSubmitting(false);
      return;
    }

    if (registerData.clave.length < 6) {
      setFieldErrors({ clave: "La contraseña debe tener al menos 6 caracteres" });
      setIsSubmitting(false);
      return;
    }

    // 5. Validar Confirmación
    if (registerData.clave !== registerData.confirmarClave) {
      setFieldErrors({ confirmarClave: "Las contraseñas no coinciden" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: registerData.fullName.trim(),
          correo: registerData.correo.trim().toLowerCase(),
          clave: registerData.clave.trim(),
          esCliente: true,
          datosCliente: {
            document_type: registerData.documentType,
            document_number: registerData.documentNumber
          }
        })
      });

      const result = await response.json();

      if (result.success === true) {
        // 🚀 REGISTRO AUTOMÁTICO EN FIREBASE
        try {
          await createUserWithEmailAndPassword(auth, registerData.correo.trim().toLowerCase(), registerData.clave.trim());
          console.log("✅ Usuario sincronizado con Firebase");
        } catch (firebaseErr) {
          // Si falla Firebase (ej. correo ya existe allá), solo lo logueamos para no detener el proceso
          console.warn("⚠️ No se pudo crear en Firebase (posiblemente ya existe):", firebaseErr.message);
        }

        setInfoMsg("¡Cuenta creada! Ya puedes iniciar sesión.");
        setActiveTab("login");
      } else {
        const msg = result.message || "";
        if (msg.toLowerCase().includes("correo") || msg.toLowerCase().includes("email") || msg.toLowerCase().includes("existe")) {
          setFieldErrors({ correo: "Este correo ya está registrado" });
        } else if (msg.toLowerCase().includes("documento")) {
          setFieldErrors({ documentNumber: "Este documento ya está en uso" });
        } else if (msg.toLowerCase().includes("nombre")) {
          setFieldErrors({ fullName: "Revisa el nombre ingresado" });
        } else {
          setError(msg || "No se pudo crear la cuenta");
        }
      }

    } catch {
      setError("Error de conexión al registrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════
  // 🔁 HANDLER: RECUPERAR CONTRASEÑA
  // ═══════════════════════════════════════════════
  const handleRecover = async () => {
    resetMessages();
    if (!recoverEmail?.trim()) {
      setFieldErrors({ recoverEmail: "Debes llenar este campo" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoverEmail)) {
      setFieldErrors({ recoverEmail: "Correo no válido" });
      return;
    }

    const result = await Swal.fire({
      title: '<div style="font-size:15px; margin-top: -10px; margin-bottom: 5px; color: #fff;">¿Confirmar correo?</div>',
      html: `<div style="font-size:13px; margin-bottom: 10px; color: #aaa;">¿Enviar a: <b>${recoverEmail}</b>?</div>`,
      position: 'top-end',
      width: '320px',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'No',
      confirmButtonColor: '#FFC107',
      cancelButtonColor: '#444',
      background: "#111418",
      color: "#fff",
      padding: '0 10px 5px',
      customClass: {
        popup: 'gm-swal-popup',
        confirmButton: 'gm-swal-btn confirm',
        cancelButton: 'gm-swal-btn cancel'
      }
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);

    try {
      // 🚀 LLAMADA AL BACKEND (Usará Brevo para el diseño bonito)
      const response = await api.post("/api/auth/forgot-password", {
        email: recoverEmail.trim().toLowerCase()
      });

      if (response.data.success) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          width: '350px',
          title: '<span style="color: #FFC107; font-weight: 800;">¡Enviado!</span>',
          html: `<span style="color: #fff;">Revisa tu correo: <br/><b>${recoverEmail}</b></span>`,
          icon: 'success',
          iconColor: '#FFC107',
          background: "#111418", 
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          showClass: {
            popup: 'animate__animated animate__fadeInRight animate__faster'
          },
          customClass: {
            popup: 'gm-swal-popup'
          }
        });
        setRecoverEmail("");
        setView("auth");
      }
    } catch (err) {
      console.error("🔴 Error en recuperación:", err.message);
      setError(err.response?.data?.message || "No se pudo enviar el correo. Intenta más tarde.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    resetMessages();
    if (!registerData.clave.trim()) {
      setFieldErrors({ clave: "La contraseña es obligatoria" });
      return;
    }
    if (registerData.clave.length < 6) {
      setFieldErrors({ clave: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    if (registerData.clave !== registerData.confirmarClave) {
      setFieldErrors({ confirmarClave: "Las contraseñas no coinciden" });
      return;
    }

    setIsSubmitting(true);
    try {
      const email = await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, registerData.clave);
      
      await api.post("/api/auth/sync-password", {
        email,
        password: registerData.clave
      });

      Swal.fire({
        icon: 'success',
        title: '¡Contraseña actualizada!',
        text: 'Ya puedes iniciar sesión con tu nueva clave.',
        background: "#111418",
        color: "#fff",
        confirmButtonColor: '#FFC107'
      });
      
      window.history.replaceState({}, document.title, "/login");
      setView("auth");
      setActiveTab("login");
    } catch (err) {
      console.error("Error en reset:", err);
      setError("El enlace ha expirado o es inválido. Pide uno nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════
  return (
    <div style={styles.container} className="login-container-root">
      <div style={styles.overlay} />
      <Link
        to="/"
        style={styles.backLink}
        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.9"}
      >
        <FaArrowLeft size={15} color="#FFC107" /> Volver a la tienda
      </Link>

      <div style={styles.heroSection} className="login-hero-section">
        <img src="/logo.png" alt="GM Caps" style={styles.logoImg} />
        <h1 style={styles.bannerTitle}>Gorras Medellín Caps</h1>
        <p style={styles.bannerSubtitle}>
          Exclusividad y estilo en cada prenda. Únete a la comunidad de gorras más grande de la ciudad.
        </p>
      </div>

      <div style={styles.formWrapper} className="login-form-wrapper">
        <div style={styles.formCard} className="login-form-card">

          {view === "auth" && (
            <>
              <h2 style={styles.formTitle}>
                {activeTab === "login" ? "¡Hola de nuevo!" : "Crear cuenta"}
              </h2>
              <p style={styles.formSubtitle}>
                {activeTab === "login"
                  ? "Ingresa para continuar comprando"
                  : "Empieza tu colección de nivel ahora"}
              </p>

              <div style={styles.tabWrapper}>
                <button
                  style={styles.tabBtn(activeTab === "login")}
                  onClick={() => { setActiveTab("login"); resetMessages(); }}
                >
                  Login
                </button>
                <button
                  style={styles.tabBtn(activeTab === "register")}
                  onClick={() => { setActiveTab("register"); resetMessages(); }}
                >
                  Registro
                </button>
              </div>

              {activeTab === "login" ? (
                <form onSubmit={handleLogin} onChange={resetMessages} autoComplete="off">
                  <label style={styles.label}>Correo electrónico</label>
                  <div style={styles.inputWrap}>
                    <input
                      ref={loginEmailRef}
                      style={{ ...styles.input, borderColor: fieldErrors.correo ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                      type="email"
                      name="correo_login_unique"
                      autoComplete="off"
                      placeholder="Ingresa tu correo..."
                      value={loginData.correo}
                      onChange={(e) => setLoginData({ ...loginData, correo: e.target.value })}
                    />
                    {fieldErrors.correo && <span style={styles.fieldError}>⚠️ {fieldErrors.correo}</span>}
                  </div>

                  <label style={styles.label}>Contraseña</label>
                  <div style={styles.inputWrap}>
                      <input
                        ref={loginPassRef}
                        style={{ ...styles.input, paddingRight: '40px', borderColor: fieldErrors.clave ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                        type={showLoginPass ? "text" : "password"}
                        name="clave_login_unique"
                        autoComplete="new-password"
                        placeholder="Escribe tu contraseña..."
                        value={loginData.clave}
                        onChange={(e) => setLoginData({ ...loginData, clave: e.target.value })}
                      />
                      <button
                        type="button"
                        style={styles.eyeBtn}
                        onClick={() => setShowLoginPass(!showLoginPass)}
                        aria-label={showLoginPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showLoginPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                      </button>
                      {fieldErrors.clave && <span style={styles.fieldError}>⚠️ {fieldErrors.clave}</span>}
                    </div>

                  {error && <div style={styles.error}>{error}</div>}
                  {infoMsg && <div style={styles.info}>{infoMsg}</div>}

                  <button type="submit" style={styles.mainBtn} disabled={isSubmitting}>
                    {isSubmitting ? "Cargando..." : "Iniciar Sesión"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: "15px" }}>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#FFC107",
                        fontSize: "14px",
                        cursor: "pointer",
                        fontWeight: "600",
                        textDecoration: "underline"
                      }}
                      onClick={() => { setView("recover"); resetMessages(); }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} onChange={resetMessages}>
                  
                  <div className="login-input-row">
                    <div style={{ flex: 1.15 }}>
                      <label style={styles.label}>Tipo de documento</label>
                      <div style={styles.inputWrap}>
                        <select
                          style={styles.input}
                          value={registerData.documentType}
                          onChange={(e) => setRegisterData({ ...registerData, documentType: e.target.value })}
                        >
                          <option>Cédula de Ciudadanía</option>
                          <option>Cédula de Extranjería</option>
                          <option>Permiso Especial (PEP)</option>
                          <option>Permiso Temporal (PPT)</option>
                          <option>Pasaporte</option>
                          <option>NIT</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ flex: 0.85 }}>
                      <label style={styles.label}>Número</label>
                      <div style={styles.inputWrap}>
                        <input
                          style={{ ...styles.input, borderColor: fieldErrors.documentNumber ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                          type="text"
                          autoComplete="off"
                          placeholder="Número de doc..."
                          value={registerData.documentNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]+$/.test(val)) {
                              setRegisterData({ ...registerData, documentNumber: val });
                            }
                          }}
                        />
                        {fieldErrors.documentNumber && <span style={styles.fieldError}>⚠️ {fieldErrors.documentNumber}</span>}
                      </div>
                    </div>
                  </div>

                  <label style={styles.label}>Nombre completo</label>
                  <div style={styles.inputWrap}>
                    <input
                      style={{ ...styles.input, borderColor: fieldErrors.fullName ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                      type="text"
                      autoComplete="off"
                      placeholder="Ej: Juan Pérez..."
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                    />
                    {fieldErrors.fullName && <span style={styles.fieldError}>⚠️ {fieldErrors.fullName}</span>}
                  </div>

                  <label style={styles.label}>Correo electrónico</label>
                  <div style={styles.inputWrap}>
                    <input
                      style={{ ...styles.input, borderColor: fieldErrors.correo ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                      type="text"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="nombre@correo.com"
                      value={registerData.correo}
                      onChange={(e) => setRegisterData({ ...registerData, correo: e.target.value })}
                    />
                    {fieldErrors.correo && <span style={styles.fieldError}>⚠️ {fieldErrors.correo}</span>}
                  </div>

                  <div className="login-input-row">
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Contraseña</label>
                      <div style={styles.inputWrap}>
                        <input
                          style={{ ...styles.input, paddingRight: '40px', borderColor: fieldErrors.clave ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                          type={showRegPass ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Crea una clave..."
                          value={registerData.clave}
                          onChange={(e) => setRegisterData({ ...registerData, clave: e.target.value })}
                        />
                        <button type="button" style={styles.eyeBtn} onClick={() => setShowRegPass(!showRegPass)}>
                          {showRegPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                        {fieldErrors.clave && <span style={styles.fieldError}>⚠️ {fieldErrors.clave}</span>}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>Confirmar contraseña</label>
                      <div style={styles.inputWrap}>
                        <input
                          style={{ ...styles.input, paddingRight: '40px', borderColor: fieldErrors.confirmarClave ? '#ff4d4d' : styles.input.border.split(' ')[2], marginBottom: 0 }}
                          type={showRegConfirmPass ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Repite tu clave..."
                          value={registerData.confirmarClave}
                          onChange={(e) => setRegisterData({ ...registerData, confirmarClave: e.target.value })}
                        />
                        <button type="button" style={styles.eyeBtn} onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}>
                          {showRegConfirmPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                        </button>
                        {fieldErrors.confirmarClave && <span style={styles.fieldError}>⚠️ {fieldErrors.confirmarClave}</span>}
                      </div>
                    </div>
                  </div>

                  {error && <div style={styles.error}>{error}</div>}
                  {infoMsg && <div style={styles.info}>{infoMsg}</div>}

                  <button type="submit" style={styles.mainBtn} disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear Cuenta"}
                  </button>
                </form>
              )}
            </>
          )}

          {view === "recover" && (
            <form onSubmit={(e) => { e.preventDefault(); handleRecover(); }} style={{ animation: "fadeIn 0.5s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
                <button
                  type="button"
                  onClick={() => { setView("auth"); resetMessages(); }}
                  style={{
                    background: "rgba(255,193,7,0.1)",
                    border: "1px solid rgba(255,193,7,0.25)",
                    color: "#FFC107",
                    cursor: "pointer",
                    display: "flex",
                    padding: "8px",
                    borderRadius: "50%"
                  }}
                  aria-label="Volver"
                >
                  <FaArrowLeft size={16} />
                </button>
                <h2 style={{ ...styles.formTitle, marginBottom: 0 }}>Recuperar Cuenta</h2>
              </div>
              <p style={styles.formSubtitle}>Te enviaremos un correo de recuperación</p>

              <label style={styles.label}>Tu correo</label>
              <div style={styles.inputWrap}>
                <input
                  style={{...styles.input, borderColor: fieldErrors.recoverEmail ? '#ff4d4d' : 'rgba(255,193,7,0.15)', marginBottom: 0}}
                  type="text"
                  inputMode="email"
                  name="email"
                  autoComplete="email"
                  placeholder="usuario@correo.com"
                  value={recoverEmail}
                  onChange={(e) => { setRecoverEmail(e.target.value); resetMessages(); }}
                />
                {fieldErrors.recoverEmail && <div style={styles.fieldError}>⚠️ {fieldErrors.recoverEmail}</div>}
              </div>

              {error && <div style={styles.error}>{error}</div>}
              {infoMsg && <div style={styles.info}>{infoMsg}</div>}

              <button type="submit" style={styles.mainBtn} disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar Correo"}
              </button>
            </form>
          )}

          {view === "reset" && (
            <div style={{ animation: "fadeIn 0.5s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
                <button
                  onClick={() => { setView("auth"); resetMessages(); }}
                  style={{
                    background: "rgba(255,193,7,0.1)",
                    border: "1px solid rgba(255,193,7,0.25)",
                    color: "#FFC107",
                    cursor: "pointer",
                    display: "flex",
                    padding: "8px",
                    borderRadius: "50%"
                  }}
                >
                  <FaArrowLeft size={16} />
                </button>
                <h2 style={{ ...styles.formTitle, marginBottom: 0 }}>Nueva Contraseña</h2>
              </div>
              <p style={{ ...styles.formSubtitle, marginBottom: "20px" }}>Crea tu nueva clave de acceso</p>

              <label style={styles.label}>Contraseña Nueva</label>
              <div style={styles.inputWrap}>
                <input
                  style={{...styles.input, borderColor: fieldErrors.clave ? '#ff4d4d' : 'rgba(255,255,255,0.1)', marginBottom: 0}}
                  type="password"
                  placeholder="••••••••"
                  value={registerData.clave}
                  onChange={(e) => setRegisterData({...registerData, clave: e.target.value})}
                />
                {fieldErrors.clave && <span style={styles.fieldError}>⚠️ {fieldErrors.clave}</span>}
              </div>

              <label style={styles.label}>Repetir Contraseña</label>
              <div style={styles.inputWrap}>
                <input
                  style={{...styles.input, borderColor: fieldErrors.confirmarClave ? '#ff4d4d' : 'rgba(255,255,255,0.1)', marginBottom: 0}}
                  type="password"
                  placeholder="••••••••"
                  value={registerData.confirmarClave}
                  onChange={(e) => setRegisterData({...registerData, confirmarClave: e.target.value})}
                />
                {fieldErrors.confirmarClave && <span style={styles.fieldError}>⚠️ {fieldErrors.confirmarClave}</span>}
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button style={styles.mainBtn} onClick={handleResetPassword} disabled={isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Guardar Nueva Clave"}
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInTop { from { transform: translateY(-5px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .login-container-root {
          display: flex;
          min-height: 100vh;
          width: 100%;
          background-size: cover;
          background-position: center;
          font-family: 'Inter', sans-serif;
          color: #fff;
          position: relative;
          overflow-x: hidden;
        }

        .gm-swal-popup {
          border: 1px solid rgba(255, 193, 7, 0.4) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
          padding: 8px !important;
        }

        .gm-swal-btn {
          padding: 4px 12px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          border-radius: 6px !important;
          margin: 5px !important;
          height: 28px !important;
          min-width: 70px !important;
        }
        
        .gm-swal-btn.confirm { color: #000 !important; }

        .login-hero-section { flex: 0 0 45%; }
        .login-form-wrapper { flex: 0 0 55%; }
        .login-form-card { width: 100%; max-width: 400px; }
        .login-input-row { display: flex; gap: 12px; width: 100%; }

        @media (max-width: 900px) {
          .login-input-row { flex-direction: column; gap: 0; }
          .login-container-root { flex-direction: column !important; overflow-y: auto !important; }
          .login-hero-section { flex: 0 0 auto !important; padding: 60px 20px 30px 20px !important; }
          .login-form-wrapper { flex: 0 0 auto !important; padding-right: 0 !important; padding-bottom: 50px !important; }
          .login-form-card { max-width: 90% !important; padding: 20px 25px !important; }
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #171a21 inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      {showConflictModal && (
        <SessionConflictModal 
          title="SESIÓN YA ACTIVA"
          description="Tu cuenta ya tiene una sesión abierta en otro lugar. ¿Deseas cerrarla e ingresar aquí?"
          infoText="Al continuar, se cerrarán todas las sesiones previas en otros dispositivos."
          showUseHere={true}
          onUseHere={() => {
            setShowConflictModal(false);
            handleLogin(null, true);
          }}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
};

export default Login;