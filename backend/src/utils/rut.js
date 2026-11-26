// Utilidades para el RUT chileno.

/**
 * Calcula el dígito verificador con el algoritmo del módulo 11:
 * se multiplican los dígitos de derecha a izquierda por 2, 3, 4, 5, 6, 7, 2, 3...
 * se suman, y el dígito es 11 menos el resto de dividir por 11
 * (11 se escribe 0 y 10 se escribe K).
 */
function calcularDigitoVerificador(numero) {
  let suma = 0;
  let multiplicador = 2;
  for (const digito of String(numero).split('').reverse()) {
    suma += Number(digito) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resultado = 11 - (suma % 11);
  if (resultado === 11) return '0';
  if (resultado === 10) return 'K';
  return String(resultado);
}

/**
 * Valida un RUT en cualquier formato ("65.123.456-5", "65123456-5", "651234565")
 * y lo devuelve normalizado como "65.123.456-5". Si no es válido, devuelve null.
 */
function normalizarRut(rut) {
  if (typeof rut !== 'string') return null;
  const limpio = rut.replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return null;

  const numero = limpio.slice(0, -1);
  const digito = limpio.slice(-1);
  if (calcularDigitoVerificador(numero) !== digito) return null;

  const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conPuntos}-${digito}`;
}

module.exports = { calcularDigitoVerificador, normalizarRut };
