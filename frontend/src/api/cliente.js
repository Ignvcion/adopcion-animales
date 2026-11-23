// Cliente HTTP común para hablar con la API.
// En desarrollo, Vite redirige /api al backend; en producción se puede
// apuntar a otra dirección con la variable VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Hace una petición a la API y devuelve el JSON de la respuesta.
 * Si la API responde con error, lanza un Error con el mensaje del servidor
 * y con el código HTTP en error.status.
 */
export async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const encabezados = {};
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
  if (token) encabezados.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    const error = new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
    error.status = 0;
    throw error;
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Ocurrió un error inesperado');
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}
