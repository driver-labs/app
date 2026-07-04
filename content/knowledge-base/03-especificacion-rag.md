# Especificacion RAG

## Objetivo de la RAG

La RAG debe convertir documentos tecnicos en conocimiento claro, breve y confiable. No debe copiar largos textos legales. Debe recuperar la fuente, explicar en sencillo y conectar con decisiones reales.

## Tipos de documentos fuente

| Tipo | Uso |
| --- | --- |
| Ley | Base legal principal, obligaciones, clasificaciones, infracciones y sanciones. |
| Reglamento de transito | Reglas operativas, definiciones, licencias, circulacion, seguridad vial. |
| Reglamento de transporte | Transporte publico, pasajeros, rutas, terminales, carga y operadores. |
| Manual de senales | Senales verticales, horizontales, semaforos, zonas escolares, ciclovias y obras. |
| MVP | Enfoque pedagogico, rutas, posicionamiento, escenarios y conciencia. |

## Metadatos minimos por chunk

```yaml
source_id: ley-transporte-transito-seguridad-vial
source_title: Ley de Transporte Terrestre, Transito y Seguridad Vial
source_type: ley
page_start: 1
page_end: 2
article_refs: ["Art. 1", "Art. 3"]
topic_tags: ["base-legal", "seguridad-vial"]
risk_tags: ["responsabilidad", "peaton"]
audience_tags: ["primera-licencia", "refuerzo"]
confidence: high
```

## Chunking recomendado

- Leyes y reglamentos: chunk por articulo o grupo pequeno de articulos relacionados.
- Manual de senales: chunk por categoria de senal y subcategoria.
- MVP: chunk por seccion estrategica.
- No mezclar sanciones, conceptos y ejemplos en el mismo chunk si pertenecen a temas distintos.

## Flujo para generar una leccion

1. Recibir `module_id`, `learning_goal`, `audience` y `reading_level`.
2. Recuperar 3 a 8 chunks relevantes.
3. Identificar norma, accion practica, riesgo y fuente.
4. Escribir en lenguaje simple.
5. Generar una pregunta y un escenario.
6. Agregar descripcion visual sugerida.
7. Validar que no haya afirmaciones sin fuente.

## Formato de salida para contenido generado

```yaml
lesson_id: "07-03-distancia-segura"
module_id: "07-conduccion-defensiva"
audience: ["primera-licencia", "refuerzo"]
reading_level: "tercer-grado"
source_refs:
  - source_id: "reglamento-transito-seguridad-vial"
    article_refs: ["pendiente"]
```

## Reglas de seguridad de respuesta

- Si la fuente no contiene una respuesta, decir que falta validar.
- Si hay conflicto entre documentos, priorizar la ley sobre reglamentos y marcar revision humana.
- Si una multa o sancion no esta clara, no inventar monto.
- Si el tema puede cambiar con el tiempo, marcar como `requires_current_validation: true`.
