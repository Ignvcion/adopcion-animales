import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pedir } from '../api/cliente.js';

// Guarda la sesión (token + usuario) y la comparte con toda la aplicación.
const AuthContext = createContext(null);
const CLAVE = 'adopta-sesion';

function leerSesionGuardada() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE));
    return guardada?.token ? guardada : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion) {
  try {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento disponible: la sesión dura hasta recargar
  }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  const [verificando, setVerificando] = useState(Boolean(sesion));

  // Al abrir la página con una sesión guardada, se confirma con el backend
  // que el token sigue vigente y que la cuenta no fue bloqueada.
  useEffect(() => {
    const guardada = leerSesionGuardada();
    if (!guardada) return;
    pedir('/auth/yo', { token: guardada.token })
      .then(({ usuario }) => {
        const actualizada = { token: guardada.token, usuario };
        guardarSesion(actualizada);
        setSesion(actualizada);
      })
      .catch((error) => {
        // Solo se cierra la sesión si el backend la rechazó (no por falta de red)
        if (error.status === 401) {
          guardarSesion(null);
          setSesion(null);
        }
      })
      .finally(() => setVerificando(false));
  }, []);

  // CU02 — Iniciar sesión
  const iniciarSesion = useCallback(async (email, password) => {
    const { token, usuario } = await pedir('/auth/login', {
      metodo: 'POST',
      cuerpo: { email, password },
    });
    const nueva = { token, usuario };
    guardarSesion(nueva);
    setSesion(nueva);
    return usuario;
  }, []);

  // CU01 — Registrarse: crea la cuenta y deja la sesión iniciada
  const registrarse = useCallback(async (datos) => {
    const { token, usuario } = await pedir('/auth/registro', {
      metodo: 'POST',
      cuerpo: datos,
    });
    const nueva = { token, usuario };
    guardarSesion(nueva);
    setSesion(nueva);
    return usuario;
  }, []);

  const valor = useMemo(() => ({
    usuario: sesion?.usuario ?? null,
    token: sesion?.token ?? null,
    verificando,
    iniciarSesion,
    registrarse,
  }), [sesion, verificando, iniciarSesion, registrarse]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
