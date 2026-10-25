// Interruptores de funciones de la pantalla.

// Escucha de la sesión (botón Escuchar / Seguir escuchando / Pausar, barra "Escucha en vivo" y panel
// "Lo que he escuchado"). Apagada en la primera etapa; para la segunda etapa se activa con
// VITE_ESCUCHA_HABILITADA="true" en frontend/.env. Todo el código de escucha sigue intacto.
export const ESCUCHA_HABILITADA = import.meta.env.VITE_ESCUCHA_HABILITADA === 'true'

// Columna "Proyectos con IA" (derecha). Oculta por ahora; los proyectos siguen en el contexto y RED-i
// los conoce. Se vuelve a mostrar con VITE_PROYECTOS_VISIBLES="true" en frontend/.env.
export const PROYECTOS_VISIBLES = import.meta.env.VITE_PROYECTOS_VISIBLES === 'true'
