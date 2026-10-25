# RED-i — contexto del proyecto

Agente de voz **RED-i** (se pronuncia "Redi") de Red Ambiental para la **Planeación Estratégica TI 2027**
(evento: 26-oct-2026, Microsoft México, Torre VAO 1, piso 12, Monterrey). El proyecto nació como piloto de
entrevistas por voz con análisis post-conversación y se reutilizó para este evento. El README tiene el detalle
técnico, la instalación y el empaquetado.

## Qué hace hoy (etapa 1)
- Un solo botón, **"Interactúa conmigo"**: RED-i dice el guion fijo `backend/contexto/guion_redi.md`
  (introducción + 3 pilares + cierre + invitación a preguntar) y la llamada de Vapi queda abierta para preguntas.
- Los proyectos (Ruta Maestra Inteligente, Sistema Inteligente CIPRES, Gestión 360, Aplicación Domiciliaria,
  Plataformas Operativas Futuras) **no se dicen en el guion**: están en `planeacion_2027.md` para responder preguntas.
- Pantalla: 3 pilares a la izquierda; columna de proyectos oculta (`VITE_PROYECTOS_VISIBLES`).
- Etapa 2 (escuchar la sesión con Groq Whisper y resumir) está completa pero oculta (`VITE_ESCUCHA_HABILITADA`).

## Reglas de contenido (acordadas con Raúl)
- Nunca nombres de personas ni responsables; las áreas (Domiciliaria, RPBI, CIPRES…) sí.
- El guion es el "único tema a exponer": no agregar contenido, solo tono humano y formal.
- Años y cifras **con palabras** en todo lo que se dice ("dos mil veintisiete"); con dígitos la voz los lee en inglés.
- El documento original dice "RED-i"/"REDi"; antes se llamó RALF-i: el nombre vigente es **RED-i**.
- No inventar datos de logística que no estén en el contexto (estacionamiento, cómo llegar).

## Arquitectura
- `backend/main.py` (FastAPI): Groq con dos llaves y respaldo automático (`call_groq`), guion/conclusión,
  `/api/agenda` desde `pantalla.json`, sirve `frontend/dist` en producción.
- `frontend/src/hooks/useMeeting.js`: flujo completo (escucha, Vapi con overrides, preguntas por texto, respaldo de voz del navegador).
- `distribucion/empaquetar.ps1` genera `entrega/RED-i.zip` (la laptop destino solo necesita Python).

## Cómo trabajar con Raúl
- Escribe en español. Antes de modificar, **aterrizar la idea en un párrafo y esperar su visto bueno**.
- Equipo corporativo con monitoreo de ciberseguridad: servidores solo en localhost, sin túneles ni
  herramientas de red (ver skill `lo-que-no-se-debe-hacer`).
- El backend de desarrollo suele estar corriendo con `--reload` en :8000 y Vite en :5173.
- En los heredocs de Bash, `\\n` se convierte en salto de línea real: para código con escapes usar Write/Edit.
