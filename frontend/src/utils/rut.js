// Validación del RUT chileno en el navegador (misma regla que el backend).

function digitoVerificador(numero) {
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

/** true si el RUT tiene formato válido y su dígito verificador es correcto. */
export function rutValido(rut) {
  const limpio = String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  return digitoVerificador(limpio.slice(0, -1)) === limpio.slice(-1);
}

/** Da formato mientras se escribe: "651234565" → "65.123.456-5". */
export function formatearRut(rut) {
  const limpio = String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (limpio.length < 2) return limpio;
  const numero = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${numero}-${limpio.slice(-1)}`;
}
