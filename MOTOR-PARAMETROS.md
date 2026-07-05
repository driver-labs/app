# Parámetros del Motor de Escenarios — Especificación Ideal

> Qué debería **consumir y renderizar** el motor (`engine/ScenarioPlayer` + escenas)
> para ser **data-driven de verdad**. Base: el contrato `core/scenario-schema.ts`.

---

## 0. El principio: "quiz-driven" no es "world-driven"

Hoy el motor lee el `Scenario` **sólo para el quiz** (pregunta, opciones, feedback,
regla) y para elegir la escena a alto nivel. El **mundo 3D está hardcodeado**:
`IntersectionScene` y `OvertakeScene` **no leen** `environment`, `road` ni `actors` —
dibujan siempre ALTO + semáforo + noche lluviosa.

**Consecuencia:** un escenario "lluvia de día en autopista" se ve **idéntico** a uno
"nocturno urbano". Para escenarios fijos no se nota (coinciden con lo hardcodeado);
para **dinámicos es fatal** — la IA genera variedad que el motor no sabe pintar.

**Regla de esta spec:** un parámetro sólo "existe" para el motor si **cambia lo que se
ve o se juega**. Un enum que nadie renderiza es decoración del JSON.

### Leyenda de estado (situación actual, auditada)
| | Significado |
|---|---|
| ✅ | El motor lo lee y lo renderiza correctamente |
| 🔨 | Parcial / hardcodeado para el caso feliz, no data-driven |
| ❌ | El parámetro existe en el contrato pero el motor **lo ignora** |
| 🔮 | Ni en contrato ni en motor — propuesta futura |

---

## 1. Identidad y routing

| Parámetro | Valores | Qué debe hacer el motor | Estado |
|---|---|---|---|
| `format` | `decision` · `diagnosis` | `decision`: flujo approach→decision→consequence (POV conductor, el usuario decide). `diagnosis`: la infracción **ocurre sola**, cámara de observador, el usuario diagnostica después. | ✅ (flujo) 🔨 (misma cámara para ambos) |
| `sceneKind` | `intersection-stop` · `intersection-light` · `straight-overtake` · `crosswalk` · `roundabout` · `curve` | Seleccionar la **geometría base** de la vía. Hoy el router es **binario** (`straight-overtake` → una escena; **todo lo demás** → intersección con ALTO). | 🔨 router binario |
| `difficulty` | `easy·medium·hard` | Sólo etiqueta (UI). No cambia render. | ✅ (no aplica al mundo) |

**Ideal:** `sceneKind` mapea a un **layout de vía** parametrizable, no a una escena
monolítica. La misma "IntersectionLayout" sirve para `-stop` y `-light` cambiando
`road.control` (ver §3). Escenas hoy inexistentes (`crosswalk`, `roundabout`, `curve`)
deben tener **fallback explícito** ("escena no soportada") en vez de caer silenciosas a
la intersección.

---

## 2. Ambientación — `environment` (el más barato y de más impacto)

| Parámetro | Valores | Qué debe renderizar el motor | Estado |
|---|---|---|---|
| `timeOfDay` | `day` · `dusk` · `night` | Color/intensidad de luz ambiente + direccional, color de cielo/fondo, encendido de faros y luces de calle. `day`: cielo claro, sombras duras. `night`: fondo oscuro, faros ON, `StreetLamp` ON. `dusk`: naranja, intermedio. | ❌ hardcodeado a noche |
| `weather` | `clear` · `rain` · `fog` | `rain`: activar `RainyAmbience` (partículas), suelo reflectante/mojado, visibilidad reducida. `fog`: `THREE.Fog` denso, alcance corto. `clear`: sin partículas, suelo seco. | ❌ hardcodeado a lluvia |
| `setting` | `urban` · `rural` · `highway` | Qué props de fondo: `urban` edificios; `rural` árboles/campo; `highway` guardarraíl, sin edificios. | ❌ siempre urbano |

**Por qué primero:** es un swap de luces/fog/props sin tocar geometría de la vía ni
lógica de actores. Máximo cambio visible por menos código. Aquí empieza el data-driven.

---

## 3. La vía — `road`

| Parámetro | Valores | Qué debe renderizar el motor | Estado |
|---|---|---|---|
| `control` | `stop-sign` · `traffic-light` · `yield` · `none` | Qué señal spawnear en la intersección: cartel ALTO, semáforo (con su ciclo), ceda-el-paso, o nada. **Debe derivar de acá**, no del `sceneKind`. | ❌ hardcodea ALTO + semáforo juntos |
| `centerLine` | `dashed` · `solid` · `double-solid` | Textura/geometría de la línea central. `double-solid` es **legalmente relevante** (adelantamiento prohibido) → debe verse. | 🔨 sólo en la escena de overtake |
| `lanes` | 1–4 | Ancho de la calzada y cantidad de carriles dibujados. | ❌ ancho fijo |
| `speedLimit` | km/h (opcional) | Cartel de límite de velocidad al costado, si viene. | ❌ no se dibuja |
| `crosswalk` | `true/false` | Franjas peatonales sobre la calzada. | ❌ no se dibuja |

**Ideal:** una `<RoadLayout>` que recibe `{ lanes, centerLine, control, crosswalk,
speedLimit }` y compone la calle + señalización. La escena deja de ser un decorado fijo.

---

## 4. Actores — `actors[]` (el más complejo)

Cada actor del array debería **spawnearse y animarse** desde sus datos. Hoy los autos de
tráfico están **hardcodeados dentro de la escena**, no vienen de `actors[]`.

| Parámetro | Valores | Qué debe renderizar el motor | Estado |
|---|---|---|---|
| `kind` | `car` · `motorcycle` · `truck` · `bus` · `pedestrian` | Qué modelo GLB cargar. Hoy sólo `car`. | 🔨 sólo car |
| `model` | slug del catálogo (opcional) | Modelo específico; si falta, lo elige el motor por `kind`. | 🔨 |
| `role` | `player` · `traffic` · `offender` · `oncoming` | Rol en la escena: cámara/control (`player`), tráfico ambiental, el que comete la falta (`offender`), el que viene de frente. | 🔨 implícito |
| `maneuver` | `straight` · `turn-left/right` · `cross` · `overtake` · `stop-yield` | El **path** que sigue el actor. El motor debería **derivar la trayectoria** de `maneuver` + `startLane`. | 🔨 straight/overtake/stop-yield |
| `speed` | `slow` · `normal` · `fast` · `speeding` | Velocidad del actor sobre su path (afecta timing del evento). | 🔨 |
| `startLane` | `right` · `left` · `oncoming` · `sidewalk` | Punto y carril de aparición. | ❌ |
| `commitsInfraction` | `InfractionType` (opcional) | Marca qué actor comete la falta → dispara el `event`. | 🔨 |

**Ideal:** el motor **deriva el path** de `maneuver + startLane + speed` (no hace falta
un parámetro `path` explícito todavía — **YAGNI** hasta que el timing determinista lo
exija). El `player`/`offender` con `commitsInfraction` es quien dispara el `outcome`.

---

## 5. El evento — `event`

| Parámetro | Valores | Qué debe renderizar el motor | Estado |
|---|---|---|---|
| `outcome` | `crash` · `near-miss` · `safe-pass` · `hard-brake` | La **consecuencia física** que se reproduce: `crash` → `CrashEffect` (flash/chispas/humo) + impacto; `near-miss` → frenada + esquive al límite; `safe-pass` → paso limpio; `hard-brake` → frenada brusca (chirrido, cabeceo). | 🔨 crash sí; el resto por lógica correct/incorrect, no por `outcome` |
| `infractionType` | catálogo de `traffic-rules` | Join key (quiz + módulos). No cambia el render directo. | ✅ |

**Ideal:** el `outcome` **es la fuente de verdad** de qué animación de consecuencia
corre — no derivarlo de "acertó/erró". Así un escenario `diagnosis` con `outcome: crash`
muestra el choque tal como lo describe el dato, independientemente del quiz.

---

## 6. Quiz y legal — YA data-driven ✅

| Parámetro | Qué hace el motor/panel | Estado |
|---|---|---|
| `format`, `prompt`, `choices[]` (`label`,`correct`,`consequence`) | Renderiza el panel de pregunta y evalúa la respuesta | ✅ |
| `selectionType` `single·multiple` | UI de selección | ✅ single · 🔮 multi (sin UI de checkboxes) |
| `feedback.success/fail` | Texto del resultado | ✅ |
| `rule`, `lawRefs[]` | Panel de regla + artículos (fuente: `traffic-rules`) | ✅ |
| `learningObjective` | Nota pedagógica (opcional) | ✅ |

Esta parte **ya está bien**. Es la prueba de que el patrón data-driven funciona — sólo
falta extenderlo del quiz al **mundo 3D**.

---

## 7. Parámetros nuevos propuestos (mínimos, justificados)

Ponytail: sólo lo que la brecha real exige. Todo lo demás, YAGNI.

| Propuesta | Por qué | Prioridad |
|---|---|---|
| `camera?: { preset: "driver" \| "observer" \| "orbit" }` | `diagnosis` necesita vista de observador; `decision` vista de conductor. Hoy la cámara es fija para ambos → afecta la pedagogía. | Media |
| `unsupportedBehavior` (implícito en el motor) | Cuando llega un `sceneKind`/`kind` no soportado, mostrar un aviso explícito en vez de fallback silencioso engañoso. No es un campo del schema; es **comportamiento** del motor. | Alta |

**Lo que NO agrego (a propósito):** `path` explícito de actores (derivable de
maneuver+startLane), `road.shape` (lo cubre `sceneKind`), timing en ms (sólo si el
determinismo del choque lo pide). El contrato ya alcanza; el trabajo es **consumirlo**.

---

## 8. Contrato del motor (la interfaz ideal)

```tsx
// engine/ScenarioPlayer.tsx — hoy recibe scenario pero sólo lo usa para el quiz.
// Ideal: la escena entera se compone desde el Scenario.
type ScenarioPlayerProps = {
  scenario: Scenario;                 // ← única fuente de verdad del mundo
  relatedModules?: KnowledgeModule[]; // link de vuelta a teoría (hoy no se pasa en /generar)
  onComplete?: (correct: boolean) => void;
};

// Dentro del motor, la escena se deriva:
//   <World environment={scenario.environment} setting={...} />   → §2
//   <RoadLayout {...scenario.road} sceneKind={scenario.sceneKind} /> → §1,§3
//   {scenario.actors.map(a => <Actor {...a} />)}                 → §4
//   <Outcome kind={scenario.event.outcome} on={offenderActor} /> → §5
//   <QuizPanel .../>                                             → §6 (ya está)
```

**Objetivo:** que el motor NUNCA hardcodee mundo. Si un dato no viene, aplica el
`.default()` del schema — no un valor pegado en el componente.

---

## 9. Orden de implementación (por impacto/costo)

| # | Qué volver data-driven | Costo | Impacto |
|---|---|---|---|
| 1 | **`environment`** (§2) — luces, fog, lluvia, día/noche | Bajo | 🔥 Alto |
| 2 | **`sceneKind` → RoadLayout + `road.control`** (§1,§3) — desacoplar señal de escena | Medio | Alto |
| 3 | **`event.outcome`** como fuente del efecto (§5) | Medio | Alto (dinámicos) |
| 4 | **`actors[]`** spawn + path derivado (§4) | Alto | Alto |
| 5 | `road` detalle (lanes, crosswalk, speedLimit, centerLine) (§3) | Medio | Medio |
| 6 | `camera` preset (§7) + `kind` no-car (§4) | Medio | Medio |

**Regla de cierre:** cada paso deja un test/verificación que falle si el motor vuelve a
ignorar el dato (ej. render check: `weather:rain` produce partículas; `timeOfDay:day`
produce fondo claro). Data-driven sin verificación se vuelve hardcode otra vez.
