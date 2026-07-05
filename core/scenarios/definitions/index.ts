import fundamentosLegalesAlto from "./scenarios/01-fundamentos-legales-alto.json";
import licenciaDocumentosControl from "./scenarios/02-licencia-documentos-control.json";
import vehiculoSeguroLluvia from "./scenarios/03-vehiculo-seguro-lluvia.json";
import reglasCirculacionSemaforo from "./scenarios/04-reglas-circulacion-semaforo.json";
import peatonesCruceUrbano from "./scenarios/05-peatones-cruce-urbano.json";
import senalizacionAltoPrioridad from "./scenarios/06-senalizacion-alto-prioridad.json";
import conduccionDefensivaPuntoCiego from "./scenarios/07-conduccion-defensiva-punto-ciego.json";
import riesgosQueMatanDistraccion from "./scenarios/08-riesgos-que-matan-distraccion.json";
import infraccionesConsecuenciasRojo from "./scenarios/09-infracciones-consecuencias-rojo.json";
import transportePublicoBusDetenido from "./scenarios/10-transporte-publico-bus-detenido.json";
import motociclistasPuntoCiego from "./scenarios/11-motociclistas-punto-ciego.json";
import practicaExamenRedondel from "./scenarios/12-practica-examen-redondel.json";

export const definitionsJson = [
  fundamentosLegalesAlto,
  licenciaDocumentosControl,
  vehiculoSeguroLluvia,
  reglasCirculacionSemaforo,
  peatonesCruceUrbano,
  senalizacionAltoPrioridad,
  conduccionDefensivaPuntoCiego,
  riesgosQueMatanDistraccion,
  infraccionesConsecuenciasRojo,
  transportePublicoBusDetenido,
  motociclistasPuntoCiego,
  practicaExamenRedondel,
] as const;
