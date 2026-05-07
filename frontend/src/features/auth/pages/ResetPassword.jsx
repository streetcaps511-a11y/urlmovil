/* === PÁGINA PRINCIPAL === 
   Este componente es la interfaz visual principal de la ruta. 
   Se encarga de dibujar el HTML/JSX e invoca el Hook para obtener todas las funciones y estados necesarios. */

// src/features/auth/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../../shared/services/api";
import { auth, confirmPasswordReset, verifyPasswordResetCode } from "../../shared/services/firebase";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode"); 
  const backendToken = searchParams.get("token"); 

  // Estados
  const [clave, setClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Redirigir si no hay código de recuperación
  useEffect(() => {
    if (!oobCode && !backendToken) {
      Swal.fire("Error", "El enlace de recuperación es inválido o ha expirado.", "error");
      navigate("/login");
    }
  }, [oobCode, backendToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (clave !== confirmarClave) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (backendToken) {
        const response = await api.post("/api/auth/reset-password", {
          token: backendToken,
          clave: clave
        });

        if (response.data.success) {
          setIsSuccess(true);
          Swal.fire({
            icon: 'success',
            title: '¡Contraseña actualizada!',
            text: 'Tu clave ha sido actualizada con éxito. Ya puedes iniciar sesión.',
            confirmButtonColor: '#FFC107',
            background: "#111418",
            color: "#fff"
          }).then(() => {
            navigate("/login");
          });
        }
      } else if (oobCode) {
        const email = await verifyPasswordResetCode(auth, oobCode);
        await confirmPasswordReset(auth, oobCode, clave);
        await api.post("/api/auth/sync-password", { email, password: clave });

        setIsSuccess(true);
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña actualizada!',
          text: 'Se ha actualizado tu clave. Ya puedes iniciar sesión.',
          confirmButtonColor: '#FFC107',
          background: "#111418",
          color: "#fff"
        }).then(() => {
          navigate("/login");
        });
      }
    } catch (err) {
      console.error("Error en reset:", err);
      setError(err.response?.data?.message || "El enlace ha expirado o es inválido. Solicita uno nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🎨 Estilos unificados con Login.jsx
  const styles = {
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
      flex: 1,
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
      flex: 1,
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
    formTitle: { fontSize: "28px", fontWeight: "800", marginBottom: "5px" },
    formSubtitle: { fontSize: "14px", color: "#888", marginBottom: "25px" },
    label: {
      display: "block",
      fontSize: "12px",
      color: "#aaa",
      marginBottom: "7px",
      letterSpacing: "0.5px",
      textAlign: "left"
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
      marginBottom: "12px",
      boxSizing: "border-box"
    },
    inputWrap: { position: "relative", width: "100%" },
    eyeBtn: {
      position: "absolute",
      right: "14px",
      top: "22px",
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
      textAlign: "center"
    }
  };

  return (
    <div style={styles.container} className="login-container-root">
      <div style={styles.overlay} />
      
      <Link to="/" style={styles.backLink} className="back-link">
        <FaArrowLeft size={15} color="#FFC107" /> Volver a la tienda
      </Link>
 
      <div style={styles.heroSection} className="login-hero-section">
        <img src="/logo.png" alt="GM Caps" style={styles.logoImg} />
        <h1 style={styles.bannerTitle}>Gorras Medellín Caps</h1>
        <p style={styles.bannerSubtitle}>
          Recupera el acceso a tu cuenta para seguir disfrutando de lo mejor en estilo.
        </p>
      </div>
      
      <div style={styles.formWrapper} className="login-form-wrapper">
        <div style={styles.formCard} className="login-form-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
            <button
              onClick={() => navigate("/login")}
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
            <h2 style={{ ...styles.formTitle, marginBottom: 0, fontSize: "24px" }}>Nueva Clave</h2>
          </div>
          
          {!isSuccess ? (
            <>
              <p style={styles.formSubtitle}>Ingresa tu nueva contraseña para actualizar tu acceso</p>
 
              <form onSubmit={handleSubmit}>
                <label style={styles.label}>Contraseña Nueva</label>
                <div style={styles.inputWrap}>
                  <input
                    style={styles.input}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
 
                <label style={styles.label}>Confirmar Contraseña</label>
                <div style={styles.inputWrap}>
                  <input
                    style={styles.input}
                    type={showConfirmPass ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={confirmarClave}
                    onChange={(e) => setConfirmarClave(e.target.value)}
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirmPass(!showConfirmPass)}>
                    {showConfirmPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                  </button>
                </div>
 
                {error && <div style={styles.error}>{error}</div>}
 
                <button type="submit" style={styles.mainBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Cambiando..." : "Actualizar Contraseña"}
                </button>
              </form>
            </>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <FaCheckCircle size={60} color="#FFC107" style={{ marginBottom: "20px" }} />
              <h2 style={{ fontSize: "24px", fontWeight: "800" }}>¡Todo listo!</h2>
              <p style={{ color: "#888", marginTop: "10px" }}>Tu contraseña ha sido actualizada correctamente.</p>
              <button onClick={() => navigate("/login")} style={styles.mainBtn}>
                Ir al Login
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        .login-container-root {
          display: flex;
          min-height: 100vh;
          width: 100%;
        }

        .login-hero-section { flex: 0 0 45%; }
        .login-form-wrapper { flex: 0 0 55%; }

        @media (max-width: 900px) {
          .login-container-root { flex-direction: column !important; overflow-y: auto !important; }
          .login-hero-section { flex: 0 0 auto !important; padding: 60px 20px 30px 20px !important; }
          .login-form-wrapper { flex: 0 0 auto !important; padding-right: 0 !important; padding-bottom: 50px !important; }
          .login-form-card { max-width: 90% !important; padding: 20px 25px !important; }
          .back-link { left: 20px !important; top: 20px !important; }
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
