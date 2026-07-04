# Inventario de fuentes

Este inventario sirve para registrar las fuentes antes de indexarlas en la RAG.

| source_id | Documento | Tipo | Paginas | Uso principal |
| --- | --- | --- | ---: | --- |
| `ley-transporte-transito-seguridad-vial` | Ley de Transporte Terrestre, Transito y Seguridad Vial | ley | 94 | Base legal, obligaciones, circulacion, seguridad vial, infracciones. |
| `reglamento-transito-seguridad-vial` | Reglamento General de Transito y Seguridad Vial | reglamento | 69 | Definiciones, licencias, vehiculos, circulacion, sanciones y medidas de seguridad. |
| `reglamento-transporte-terrestre` | Reglamento General de Transporte Terrestre | reglamento | 66 | Transporte publico, pasajeros, rutas, permisos, terminales, carga y operadores. |
| `manual-senales-centroamericano` | Presentacion del Manual Centroamericano de Dispositivos Uniformes para el Control del Transito | manual | 110 | Senales verticales, demarcacion, semaforos, zonas escolares, ciclovias y obras. Archivo local: `assets/Manual_de_Senales.pdf`. |
| `mvp-cultura-vial-sv` | MVP de Cultura Vial para El Salvador - Actualizado | producto | 21 | Enfoque pedagogico, rutas, modulos, RAG, IA, escenarios y posicionamiento. |

## Prioridad de autoridad

1. Ley.
2. Reglamentos.
3. Manuales tecnicos.
4. MVP y documentos pedagogicos.
5. Fuentes actuales externas validadas, solo para tramites, montos, requisitos o datos que puedan cambiar.

## Campos a completar durante ingesta

```yaml
source_id: ""
file_path_original: ""
normalized_title: ""
source_type: ""
country: "El Salvador"
pages: 0
extraction_method: ""
ocr_needed: false
last_reviewed_at: ""
requires_current_validation: false
notes: ""
```

## Temas sensibles

Estos temas deben marcarse para revision humana o validacion actual:

- Montos de multas.
- Requisitos de licencia.
- Tramites SERTRACEN/VMT.
- Cambios recientes de ley o reglamento.
- Estadisticas de siniestros.
- Noticias o casos reales.
