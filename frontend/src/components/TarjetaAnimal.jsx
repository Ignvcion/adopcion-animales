import "./TarjetaAnimal.css";

export default function TarjetaAnimal({ animal, onVerFicha }) {
  const imagenPrincipal = animal.foto_url || "/huella.svg";

  return (
    <article className="tarjeta-animal">
      <div className="tarjeta-animal__imagen-contenedor">
        <img
          src={imagenPrincipal}
          alt={`Foto de ${animal.nombre}`}
          className="tarjeta-animal__imagen"
        />
        <span className="tarjeta-animal__etiqueta">{animal.estado}</span>
      </div>

      <div className="tarjeta-animal__cuerpo">
        <h3 className="tarjeta-animal__titulo">
          {animal.nombre} ({animal.especie})
        </h3>
        <p className="tarjeta-animal__meta">
          Tamaño: {animal.tamano} · Edad: {animal.edad}
        </p>
        <p className="tarjeta-animal__comuna">Comuna: {animal.comuna}</p>

        <button
          type="button"
          className="tarjeta-animal__boton"
          onClick={() => onVerFicha?.(animal.id)}
        >
          Ver ficha
        </button>
      </div>
    </article>
  );
}