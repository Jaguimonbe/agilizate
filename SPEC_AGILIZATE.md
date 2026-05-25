# Especificación Técnica: Agilízate Online (Multijugador en Tiempo Real)

## 1. Visión General

**Objetivo:** Desarrollar una versión web multijugador del juego de agilidad mental "Agilízate" (mecánica *Spot It!* / *Dobble*).
**Modalidad Principal:** "El Foso". Los jugadores deben deshacerse de sus cartas emparejando el único símbolo en común con la carta central (el pozo).
**Plataformas:** PWA (Progressive Web App) optimizada para navegadores móviles (iOS/Android) y escritorio.

---

## 2. Arquitectura del Sistema

* **Frontend:** Angular (optimizado como PWA). Uso intensivo de **RxJS** para la gestión asíncrona de eventos y temporizadores.
* **Backend:** Node.js + Express.js.
* **Comunicación en Tiempo Real:** Socket.io (WebSockets con fallback a *long-polling*).
* **Persistencia (Setup):** MongoDB (Mongoose) para almacenar la configuración inicial de las salas y los assets.
* **Motor de Reglas (Gameplay):** Gestión de estado *In-Memory* (RAM del servidor) mediante diccionarios (`Map` o estructuras nativas) para garantizar la latencia de procesamiento < 5ms.

---

## 3. Especificación Matemática: Motor del Mazo

El sistema debe implementar un algoritmo basado en la **Geometría Proyectiva Finita**.

### 3.1. Propiedades del Algoritmo

Para un orden $n$ (debe ser un número primo):

* Símbolos por carta: $n + 1$
* Total de cartas en el mazo: $N = n^2 + n + 1$
* Total de símbolos únicos requeridos: $n^2 + n + 1$

### 3.2. Reglas de Negocio (Imágenes)

* El administrador puede subir un número variable de imágenes.
* Si el número de imágenes $X$ es menor al total requerido $N$, el sistema **debe autocompletar** la diferencia ($N - X$) inyectando elementos de un banco de imágenes por defecto (ej. SVGs o Emojis).

---

## 4. Contratos de Datos e Interfaces

### 4.1. Persistencia (MongoDB - Solo Setup)

```javascript
// Esquema Sala (Room)
{
  _id: ObjectId,
  codigoSala: String, // Ej: "A4X9"
  adminId: String,
  estado: String, // 'ESPERANDO', 'JUGANDO', 'FINALIZADA'
  maxJugadores: Number,
  recursos: [String], // URLs de las imágenes subidas + autocompletadas
  createdAt: Date
}

```

### 4.2. Estado en Memoria (Node.js RAM)

Durante el estado `JUGANDO`, el servidor mantiene esta estructura:

```javascript
{
  "A4X9": {
    pozoActual: [1, 5, 14, 22, 35, 41], // IDs de las figuras de la carta central
    mazosJugadores: {
      "jugador_1_id": [[...], [...], [...]], // Cartas restantes
      "jugador_2_id": [[...], [...]]
    }
  }
}

```

---

## 5. Eventos de Tiempo Real (Contrato Socket.io)

### 5.1. Emisiones del Cliente (Frontend -> Backend)

| Evento | Payload | Descripción |
| --- | --- | --- |
| `unirse_sala` | `{ codigoSala, jugadorNombre, token (opcional) }` | Registra al jugador en el canal y devuelve estado inicial. |
| `intentar_acierto` | `{ codigoSala, jugadorId, figuraSeleccionada }` | Disparado cuando el jugador selecciona un símbolo coincidente. |
| `abandonar_partida` | `{ codigoSala, jugadorId }` | Notifica salida explícita. |

### 5.2. Emisiones del Servidor (Backend -> Frontend)

| Evento | Payload | Descripción |
| --- | --- | --- |
| `actualizar_pozo` | `{ nuevaCartaPozo, ganadorRondaId, cartasRestantesGanador }` | Broadcast a toda la sala cuando alguien acierta. |
| `error_cooldown` | `{ mensaje: "Figura incorrecta" }` | Emitido solo al jugador que falló, para iniciar la penalización visual. |
| `fin_partida` | `{ ganadorId, ranking: [] }` | Emitido cuando el arreglo de cartas de un jugador llega a `0`. |

---

## 6. Lógica de Concurrencia y Carrera (Race Conditions)

Dado que múltiples jugadores pueden enviar `intentar_acierto` simultáneamente:

1. **Bloqueo de Estado Mutex:** El servidor procesará los eventos de una sala de forma estrictamente síncrona.
2. **Validación Temporal:** Al recibir `intentar_acierto`, el servidor verifica si la `figuraSeleccionada` existe **tanto** en la carta superior del mazo del jugador en RAM, **como** en el `pozoActual` en RAM.
3. **Resolución de Conflictos:** Si el jugador A y el jugador B aciertan, pero el paquete de A llega 1ms antes, A actualiza el `pozoActual`. Cuando el paquete de B es evaluado en el siguiente ciclo, la coincidencia fallará (porque el `pozoActual` ya mutó) y el servidor descartará el intento de B silenciosamente.

---

## 7. Requisitos del Frontend (UI/UX y RxJS)

### 7.1. Distribución Visual

* **Top 50% de la pantalla:** Contenedor del "Pozo Central".
* **Bottom 50% de la pantalla:** Contenedor de "Mi Carta Actual".
* *Indicador adicional:* Contador de cartas restantes propias y de los adversarios.

### 7.2. Operador de Cooldown (RxJS)

Al recibir el evento `error_cooldown` del Socket, el cliente debe:

1. Aplicar una clase CSS de bloqueo (ej. `opacity: 0.5`, overlay rojo).
2. Deshabilitar los eventos de clic en el contenedor inferior durante **exactamente 3000ms**.
3. Usar un flujo RxJS (ej. `timer(3000)`) para reactivar la interfaz automáticamente.

---

## 8. Criterios de Aceptación (BDD)

* **Escenario 1: Generación de mazo exitosa**
* **Dado** que el Admin crea una sala con $n=7$ y sube 30 imágenes.
* **Cuando** presiona "Alistar".
* **Entonces** el sistema autocompleta 27 imágenes por defecto y genera un mazo validado de 57 cartas.


* **Escenario 2: Acierto válido**
* **Dado** que el jugador está en la sala activa.
* **Cuando** toca la figura en común entre su carta y el pozo.
* **Entonces** su carta desaparece, se convierte en el nuevo pozo en pantalla de todos, y su mazo se reduce en 1.


* **Escenario 3: Penalización por fallo**
* **Dado** que el jugador selecciona una figura que NO está en el pozo.
* **Cuando** el servidor devuelve `error_cooldown`.
* **Entonces** la pantalla inferior del jugador ignora cualquier intento de clic durante los siguientes 3 segundos.


* **Escenario 4: Manejo de desconexiones accidentales**
* **Dado** que un jugador pierde señal temporalmente y se reconecta.
* **Cuando** envía su Token de Sesión al Socket.
* **Entonces** el servidor le devuelve el estado actual del pozo y su mazo intacto, sin interrumpir al resto.