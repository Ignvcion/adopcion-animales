// Traduce los valores internos de la base de datos (enums) a texto legible.
const ESPECIE = { perro: 'Perro', gato: 'Gato' };
const TAMANO = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' };
const SEXO = { macho: 'Macho', hembra: 'Hembra' };
const EDAD = { cachorro: 'Cachorro', joven: 'Joven', adulto: 'Adulto', senior: 'Senior' };
const ESTADO = {
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  adoptado: 'Adoptado',
  pausado: 'Pausado',
};

const capitalizar = (t) => (t ? String(t).charAt(0).toUpperCase() + String(t).slice(1).replace(/_/g, ' ') : '');

export const textoEspecie = (v) => ESPECIE[v] || capitalizar(v);
export const textoTamano = (v) => TAMANO[v] || capitalizar(v);
export const textoSexo = (v) => SEXO[v] || capitalizar(v);
export const textoEdad = (v) => EDAD[v] || capitalizar(v);
export const textoEstado = (v) => ESTADO[v] || capitalizar(v);
