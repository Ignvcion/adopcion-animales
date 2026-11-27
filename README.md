# Adopción de Animales

Página web para que fundaciones publiquen animales en adopción y las personas puedan encontrarlos, guardarlos como favoritos y enviar solicitudes de adopción.

## Equipo

| Integrante | Módulo | Casos de uso |
| --- | --- | --- |
| Ignacio Mora | Base del proyecto, cuentas y administración | CU01 – CU10 |
| Benjamín Montoya | Animales y fundaciones | CU11 – CU20 |
| Josué Contreras | Adopción, favoritos y seguimiento | CU21 – CU30 |

## Tecnologías

- **Frontend:** React + Vite + React Router
- **Backend:** Node.js + Express
- **Base de datos:** MySQL
- **Autenticación:** JWT y contraseñas cifradas con bcrypt

## Estructura

```
adopcion-animales/
├── backend/     API REST (Express)
├── database/    Esquema SQL de la base de datos
└── frontend/    Aplicación web (React)
```

## Cómo correr el proyecto

### 1. Base de datos

Crear la base y sus tablas en MySQL:

```bash
mysql -u root -p < database/schema.sql
```

Opcional: cargar datos de prueba (fundaciones, animales, solicitudes y visitas) para revisar la página con contenido:

```bash
mysql -u root -p < database/seed_pruebas.sql   # solo con la base recién creada
```

### 2. Backend

```bash
cd backend
cp .env.example .env      # completar los datos de MySQL y JWT_SECRET
npm install
npm run crear-admin       # crea el administrador inicial (datos en .env)
npm run dev               # API en http://localhost:3000
```

### 3. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev               # página en http://localhost:5173
```

El frontend redirige las llamadas a `/api` hacia el backend, así que deben estar corriendo los dos.

## Funcionalidades

- **Visitantes:** catálogo con filtros (especie, tamaño, edad, sexo, comuna), ficha de cada animal, perfil de fundaciones e historias de adopción.
- **Adoptantes:** registro, favoritos, solicitudes de adopción con seguimiento, agenda de visitas, notificaciones y reportes de publicaciones.
- **Fundaciones:** registro con RUT, publicación y edición de animales, gestión de fotos, revisión de solicitudes y visitas.
- **Administración:** validación de fundaciones, gestión de usuarios y panel de estadísticas.

## Forma de trabajo

- Nadie trabaja directo en `main`: cada caso de uso va en su propia rama (`feat/cu11-publicar-animal`) y entra por pull request.
- Mensajes de commit con tipo y en español: `feat(animales): ...`, `fix(auth): ...`, `docs(cu25): ...`.
