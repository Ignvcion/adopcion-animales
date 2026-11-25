import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';
import './TarjetaAnimal.css';

export default function TarjetaAnimal({
  animal,
  onVerFicha,
  esFavorito = false,
  onToggleFavorito,
  onPostular,
}) {
  const { token, usuario } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const animalId = animal.animal_id ?? animal.id;
  const edadTexto = animal.edad_aprox ?? animal.edad ?? 'No especificada';
  const fundacionNombre = animal.fundacion_nombre ?? animal.fundacion;
  const imagenPrincipal = animal.foto_url || '/huella.svg';
  const estaDisponible = animal.estado === 'disponible';

  const [favorito, setFavorito] = useState(Boolean(esFavorito));
  const [procesandoFav, setProcesandoFav] = useState(false);
  const [errorFav, setErrorFav] = useState('');

  useEffect(() => {
    setFavorito(Boolean(esFavorito));
  }, [esFavorito]);

  async function alternarFavorito() {
    setErrorFav('');

    if (!usuario || !token) {
      navegar('/login', {
        state: {
          desde: ubicacion.pathname,
          aviso: 'Inicia sesión para guardar animales en tus favoritos.',
        },
      });
      return;
    }

    setProcesandoFav(true);
    try {
      if (favorito) {
        await pedir(`/favoritos/${animalId}`, { metodo: 'DELETE', token });
        setFavorito(false);
        onToggleFavorito?.(animalId, false);
      } else {
        await pedir('/favoritos', {
          metodo: 'POST',
          cuerpo: { animal_id: animalId },
          token,
        });
        setFavorito(true);
        onToggleFavorito?.(animalId, true);
      }
    } catch (error) {
      if (!favorito && error.status === 409) {
        setFavorito(true);
        onToggleFavorito?.(animalId, true);
      } else {
        setErrorFav(error.message);
      }
    } finally {
      setProcesandoFav(false);
    }
  }

  return (
    <article className="tarjeta-animal">
      <div className="tarjeta-animal__imagen-contenedor">
        <img
          src={imagenPrincipal}
          alt={`Foto de ${animal.nombre}`}
          className="tarjeta-animal__imagen"
        />
        <span className={`tarjeta-animal__etiqueta tarjeta-animal__etiqueta--${animal.estado || 'disponible'}`}>
          {animal.estado?.replace('_', ' ') || 'disponible'}
        </span>
      </div>

      <div className="tarjeta-animal__cuerpo">
        <h3 className="tarjeta-animal__titulo">
          {animal.nombre} ({animal.especie})
        </h3>
        <p className="tarjeta-animal__meta">
          Tamaño: {animal.tamano} · Edad: {edadTexto}
        </p>
        <p className="tarjeta-animal__comuna">
          Comuna: {animal.comuna}
          {fundacionNombre ? ` · ${fundacionNombre}` : ''}
        </p>

        {errorFav && (
          <p className="tarjeta-animal__error" role="alert">
            {errorFav}
          </p>
        )}

        <div className="tarjeta-animal__acciones">
          <button
            type="button"
            className={`tarjeta-animal__favorito ${favorito ? 'tarjeta-animal__favorito--activo' : ''}`}
            onClick={alternarFavorito}
            disabled={procesandoFav}
            aria-pressed={favorito}
            aria-label={
              favorito
                ? `Quitar a ${animal.nombre} de favoritos`
                : `Guardar a ${animal.nombre} en favoritos`
            }
          >
            <span aria-hidden="true">{favorito ? '♥' : '♡'}</span>{' '}
            {procesandoFav ? 'Guardando…' : favorito ? 'En favoritos' : 'Favorito'}
          </button>

          {onPostular && (
            <button
              type="button"
              className="tarjeta-animal__boton"
              onClick={() => onPostular(animal)}
              disabled={!estaDisponible}
              title={estaDisponible ? undefined : 'Este animal ya no está disponible para postular'}
            >
              {estaDisponible ? 'Postular' : 'No disponible'}
            </button>
          )}

          {(onVerFicha || !onPostular) && (
            <button
              type="button"
              className="tarjeta-animal__boton"
              onClick={() => onVerFicha?.(animalId)}
            >
              Ver ficha
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
