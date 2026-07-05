import type { ReactNode } from "react";
import type { Scenario } from "@/core/scenario-schema";

export type SceneKind = Scenario["sceneKind"];

type ScenePreviewProps = {
  sceneKind: SceneKind;
  title?: string;
};

// Diorama cenital estilizado por tipo de escena. SVG puro (sin WebGL) para
// mostrar muchas cards sin costo de GPU. Sistema de coordenadas disciplinado:
// los autos se dibujan pre-orientados (nunca se rotan para moverse) y las
// animaciones son solo `translate` en unidades del viewBox, de modo que cada
// fotograma cae siempre sobre el asfalto.
//
// viewBox: 320 x 180.
//   Ruta horizontal → centro y=90, alto 60 (60..120). Carriles y=75 / y=105.
//   Ruta vertical   → centro x=160, ancho 60 (130..190). Carriles x=145 / x=175.

const ASPHALT = "#334155";
const ASPHALT_DARK = "#1e293b";
const GRASS = "#14532d";
const MARK = "#e2e8f0";
const MARK_WARN = "#facc15";
const EGO = "#22d3ee";
const HAZARD = "#f87171";
const NEUTRAL = "#cbd5e1";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      className="scene-preview"
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect x={0} y={0} width={320} height={180} fill={GRASS} />
      {children}
    </svg>
  );
}

function RoadH({ dashed = true }: { dashed?: boolean }) {
  return (
    <>
      <rect x={0} y={60} width={320} height={60} fill={ASPHALT} />
      {dashed && (
        <line
          x1={0}
          y1={90}
          x2={320}
          y2={90}
          stroke={MARK_WARN}
          strokeWidth={2}
          strokeDasharray="16 14"
        />
      )}
    </>
  );
}

function RoadV() {
  return (
    <>
      <rect x={130} y={0} width={60} height={180} fill={ASPHALT} />
      <line
        x1={160}
        y1={0}
        x2={160}
        y2={180}
        stroke={MARK_WARN}
        strokeWidth={2}
        strokeDasharray="16 14"
      />
    </>
  );
}

type Dir = "up" | "down" | "left" | "right";

type CarProps = {
  x: number;
  y: number;
  dir?: Dir;
  color?: string;
  scale?: number;
  className?: string;
};

function Car({
  x,
  y,
  dir = "up",
  color = NEUTRAL,
  scale = 1,
  className,
}: CarProps) {
  const vertical = dir === "up" || dir === "down";
  const w = (vertical ? 16 : 28) * scale;
  const h = (vertical ? 28 : 16) * scale;

  const glass = (() => {
    const inset = 3;
    const strip = 6;
    if (dir === "up") {
      return {
        x: -w / 2 + inset,
        y: -h / 2 + inset,
        w: w - inset * 2,
        h: strip,
      };
    }
    if (dir === "down") {
      return {
        x: -w / 2 + inset,
        y: h / 2 - inset - strip,
        w: w - inset * 2,
        h: strip,
      };
    }
    if (dir === "left") {
      return {
        x: -w / 2 + inset,
        y: -h / 2 + inset,
        w: strip,
        h: h - inset * 2,
      };
    }
    return {
      x: w / 2 - inset - strip,
      y: -h / 2 + inset,
      w: strip,
      h: h - inset * 2,
    };
  })();

  // Posición en el atributo del <g> padre; el movimiento (CSS) va en el hijo,
  // para que la propiedad CSS `transform` de la animación no pise la posición.
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={4}
          fill={color}
          stroke={ASPHALT_DARK}
          strokeWidth={1.4}
        />
        <rect
          x={glass.x}
          y={glass.y}
          width={glass.w}
          height={glass.h}
          rx={2}
          fill={ASPHALT_DARK}
          opacity={0.55}
        />
      </g>
    </g>
  );
}

function Person({
  x,
  y,
  color = HAZARD,
  className,
}: {
  x: number;
  y: number;
  color?: string;
  className?: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <circle cx={0} cy={-5} r={4.5} fill={color} />
        <rect x={-4} y={-1} width={8} height={12} rx={3} fill={color} />
      </g>
    </g>
  );
}

function IntersectionStop() {
  return (
    <Frame>
      <RoadH />
      <RoadV />
      <g transform="translate(114 134)">
        <polygon
          points="-9,-3.5 -3.5,-9 3.5,-9 9,-3.5 9,3.5 3.5,9 -3.5,9 -9,3.5"
          fill={HAZARD}
          stroke={MARK}
          strokeWidth={1.4}
        />
        <text
          x={0}
          y={2.5}
          textAnchor="middle"
          fill={MARK}
          fontSize={5.5}
          fontWeight={800}
        >
          STOP
        </text>
      </g>
      <Car x={-30} y={105} dir="right" color={HAZARD} className="sp-cross" />
      <Car x={175} y={150} dir="up" color={EGO} className="sp-up" />
    </Frame>
  );
}

function IntersectionLight() {
  return (
    <Frame>
      <RoadH />
      <RoadV />
      <g transform="translate(202 46)">
        <rect
          x={-6}
          y={-16}
          width={12}
          height={32}
          rx={4}
          fill={ASPHALT_DARK}
        />
        <circle cx={0} cy={-9} r={3.4} fill={HAZARD} className="sp-blink" />
        <circle cx={0} cy={2} r={3.4} fill={MARK_WARN} opacity={0.28} />
        <circle cx={0} cy={11} r={3.4} fill="#4ade80" opacity={0.28} />
      </g>
      <Car x={-30} y={105} dir="right" color={HAZARD} className="sp-cross" />
      <Car x={175} y={150} dir="up" color={EGO} className="sp-up" />
    </Frame>
  );
}

function Crosswalk() {
  return (
    <Frame>
      <RoadH dashed={false} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={146 + i * 8}
          y={62}
          width={5}
          height={56}
          fill={MARK}
          opacity={0.9}
        />
      ))}
      <Car x={20} y={105} dir="right" color={EGO} className="sp-approach" />
      <Person x={172} y={122} color={MARK_WARN} className="sp-cross-up" />
    </Frame>
  );
}

function Roundabout() {
  return (
    <Frame>
      <rect x={0} y={60} width={320} height={60} fill={ASPHALT} />
      <rect x={130} y={0} width={60} height={180} fill={ASPHALT} />
      <circle cx={160} cy={90} r={48} fill={GRASS} />
      <circle cx={160} cy={90} r={48} fill={ASPHALT} />
      <circle
        cx={160}
        cy={90}
        r={46}
        fill="none"
        stroke={MARK}
        strokeWidth={1.4}
        strokeDasharray="7 9"
        className="sp-ring"
      />
      <circle
        cx={160}
        cy={90}
        r={22}
        fill={GRASS}
        stroke={MARK}
        strokeWidth={2}
      />
      {/* tráfico circulando (orientado tangente, estático) */}
      <Car x={160} y={57} dir="left" color={HAZARD} scale={0.8} />
      <Car x={193} y={90} dir="up" color={NEUTRAL} scale={0.8} />
      {/* ego entrando desde el sur, cediendo el paso */}
      <Car x={172} y={150} dir="up" color={EGO} scale={0.85} />
    </Frame>
  );
}

function Overtake() {
  return (
    <Frame>
      <RoadH dashed={false} />
      <line
        x1={0}
        y1={87}
        x2={320}
        y2={87}
        stroke={MARK_WARN}
        strokeWidth={2}
      />
      <line
        x1={0}
        y1={93}
        x2={320}
        y2={93}
        stroke={MARK_WARN}
        strokeWidth={2}
      />
      <Car x={205} y={105} dir="right" color={NEUTRAL} />
      <Car x={30} y={105} dir="right" color={EGO} className="sp-overtake" />
      <Car x={360} y={70} dir="left" color={HAZARD} className="sp-oncoming" />
    </Frame>
  );
}

function LaneChange() {
  return (
    <Frame>
      <RoadH />
      <line
        x1={0}
        y1={90}
        x2={320}
        y2={90}
        stroke={MARK}
        strokeWidth={2}
        strokeDasharray="16 14"
      />
      <Car
        x={60}
        y={75}
        dir="right"
        color={HAZARD}
        scale={0.7}
        className="sp-blindspot"
      />
      <Car x={120} y={105} dir="right" color={EGO} className="sp-lane" />
    </Frame>
  );
}

function RainBraking() {
  return (
    <Frame>
      <RoadH />
      <rect
        x={0}
        y={60}
        width={320}
        height={60}
        fill="#0b1220"
        opacity={0.28}
      />
      <Car x={215} y={90} dir="right" color={NEUTRAL} />
      <Car x={95} y={90} dir="right" color={EGO} className="sp-tailgate" />
      <g className="sp-rain">
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={i}
            x1={16 + i * 20}
            y1={-6}
            x2={9 + i * 20}
            y2={14}
            stroke="#bae6fd"
            strokeWidth={1.4}
            opacity={0.6}
          />
        ))}
      </g>
    </Frame>
  );
}

function BusStop() {
  return (
    <Frame>
      <RoadH />
      <g transform="translate(160 102)">
        <rect
          x={-26}
          y={-13}
          width={52}
          height={26}
          rx={4}
          fill={MARK_WARN}
          stroke={ASPHALT_DARK}
          strokeWidth={1.5}
        />
        <rect
          x={20}
          y={-9}
          width={5}
          height={18}
          rx={2}
          fill={ASPHALT_DARK}
          opacity={0.5}
        />
        <rect
          x={-20}
          y={-9}
          width={30}
          height={7}
          rx={2}
          fill={ASPHALT_DARK}
          opacity={0.4}
        />
      </g>
      <Person x={192} y={108} color={HAZARD} className="sp-peek" />
      <Car x={20} y={74} dir="right" color={EGO} className="sp-pass" />
    </Frame>
  );
}

function Distraction() {
  return (
    <Frame>
      <RoadH />
      <Car x={120} y={90} dir="right" color={EGO} className="sp-drift" />
      <g className="sp-phone" transform="translate(210 40)">
        <rect
          x={-9}
          y={-13}
          width={18}
          height={26}
          rx={4}
          fill={ASPHALT_DARK}
          stroke={MARK_WARN}
          strokeWidth={1.5}
        />
        <rect
          x={-6}
          y={-9}
          width={12}
          height={15}
          rx={2}
          fill={MARK_WARN}
          opacity={0.5}
        />
      </g>
    </Frame>
  );
}

function Curve() {
  return (
    <Frame>
      <path
        d="M -20 180 C 80 150 90 60 200 46 L 320 34 L 320 82 L 210 92 C 130 100 130 150 50 180 Z"
        fill={ASPHALT}
      />
      <path
        d="M -10 178 C 90 150 100 62 210 50 L 320 40"
        fill="none"
        stroke={MARK_WARN}
        strokeWidth={2}
        strokeDasharray="14 12"
      />
      <Car x={78} y={132} dir="up" color={EGO} className="sp-up-soft" />
    </Frame>
  );
}

export default function ScenePreview({ sceneKind, title }: ScenePreviewProps) {
  const preview = (() => {
    switch (sceneKind) {
      case "intersection-light":
        return <IntersectionLight />;
      case "crosswalk":
        return <Crosswalk />;
      case "roundabout":
        return <Roundabout />;
      case "straight-overtake":
        return <Overtake />;
      case "lane-change":
        return <LaneChange />;
      case "rain-braking":
        return <RainBraking />;
      case "bus-stop":
        return <BusStop />;
      case "distraction":
        return <Distraction />;
      case "curve":
        return <Curve />;
      default:
        return <IntersectionStop />;
    }
  })();

  return (
    <span
      className="scene-preview-wrap"
      role="img"
      aria-label={
        title ? `Vista previa: ${title}` : "Vista previa del escenario"
      }
    >
      {preview}
    </span>
  );
}
