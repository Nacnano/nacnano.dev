export type MarkKind =
  | "grid"
  | "denoise"
  | "board"
  | "forecast"
  | "court"
  | "ticket"
  | "seasons"
  | "lessons"
  | "segment"
  | "match"
  | "pose"
  | "signal"
  | "rank";

/**
 * Some projects are coursework or research with nothing deployed to screenshot.
 * Rather than a stock icon tile or a gradient, each gets a small diagram drawn
 * in the site's own grammar: hairlines on a neutral plate, one accent element,
 * the same 16:9 slot the real screenshots occupy.
 */
const line = "stroke-zinc-300 dark:stroke-zinc-700";
const accent = "stroke-accent-600 dark:stroke-accent-300";
const fillAccent = "fill-accent-600 dark:fill-accent-300";
const fillLine = "fill-zinc-300 dark:fill-zinc-700";

function Shape({ kind }: { kind: MarkKind }) {
  switch (kind) {
    // A grid of glyph cells with one cell answered — a benchmark of questions.
    case "grid":
      return (
        <>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={34 + c * 19}
                y={24 + r * 14}
                width={13}
                height={9}
                className={r === 1 && c === 3 ? fillAccent : fillLine}
              />
            ))
          )}
        </>
      );
    // Noise resolving left-to-right into clean tokens.
    case "denoise":
      return (
        <>
          {Array.from({ length: 14 }).map((_, i) => {
            const settled = i / 13;
            const jitter = (1 - settled) * 16;
            return (
              <line
                key={i}
                x1={26 + i * 9}
                y1={50 - jitter * (i % 2 ? 1 : 0.6)}
                x2={26 + i * 9}
                y2={50 + jitter * (i % 2 ? 0.7 : 1)}
                strokeWidth={2}
                strokeLinecap="round"
                className={i > 10 ? accent : line}
              />
            );
          })}
        </>
      );
    // A fragment of a board, one square marked.
    case "board":
      return (
        <>
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={54 + c * 14}
                y={16 + r * 14}
                width={14}
                height={14}
                className={(r + c) % 2 === 0 ? fillLine : "fill-transparent"}
                opacity={(r + c) % 2 === 0 ? 0.55 : 1}
              />
            ))
          )}
          <rect
            x={54 + 2 * 14}
            y={16 + 3 * 14}
            width={14}
            height={14}
            className={fillAccent}
          />
        </>
      );
    // A price series with a forecast continuing past the last observation.
    case "forecast":
      return (
        <>
          <polyline
            points="22,66 38,58 52,62 66,44 80,50 94,34"
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={line}
          />
          <polyline
            points="94,34 110,40 124,26 140,30 154,18"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={accent}
          />
          <line x1={94} y1={14} x2={94} y2={78} strokeWidth={1} className={line} />
        </>
      );
    // A court with a net — the tennis ranking model.
    case "court":
      return (
        <>
          <rect
            x={40}
            y={20}
            width={96}
            height={58}
            fill="none"
            strokeWidth={1}
            className={line}
          />
          <line x1={88} y1={20} x2={88} y2={78} strokeWidth={1.5} className={accent} />
          <line x1={40} y1={49} x2={136} y2={49} strokeWidth={1} className={line} />
          <rect
            x={58}
            y={34}
            width={60}
            height={30}
            fill="none"
            strokeWidth={1}
            className={line}
          />
        </>
      );
    // A registration slip with a torn stub.
    case "ticket":
      return (
        <>
          <rect
            x={34}
            y={26}
            width={108}
            height={46}
            fill="none"
            strokeWidth={1}
            className={line}
          />
          <line
            x1={106}
            y1={26}
            x2={106}
            y2={72}
            strokeWidth={1}
            strokeDasharray="3 3"
            className={line}
          />
          {[0, 1, 2].map((i) => (
            <line
              key={i}
              x1={46}
              y1={39 + i * 10}
              x2={94}
              y2={39 + i * 10}
              strokeWidth={2}
              strokeLinecap="round"
              className={i === 0 ? accent : line}
            />
          ))}
          <circle cx={124} cy={49} r={7} fill="none" strokeWidth={1} className={line} />
        </>
      );
    // Four arcs — an exhibition organised around seasons.
    case "seasons":
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M ${46 + i * 22} 72 A 18 18 0 0 1 ${82 + i * 22} 72`}
              fill="none"
              strokeWidth={1.5}
              strokeLinecap="round"
              className={i === 2 ? accent : line}
            />
          ))}
          <line x1={34} y1={72} x2={142} y2={72} strokeWidth={1} className={line} />
        </>
      );
    // Overlapping instance masks with one picked out — segmentation.
    case "segment":
      return (
        <>
          <rect
            x={34}
            y={22}
            width={108}
            height={56}
            fill="none"
            strokeWidth={1}
            className={line}
          />
          <rect
            x={46}
            y={34}
            width={38}
            height={30}
            rx={3}
            fill="none"
            strokeWidth={1}
            strokeDasharray="4 3"
            className={line}
          />
          <rect
            x={72}
            y={44}
            width={44}
            height={26}
            rx={3}
            fill="none"
            strokeWidth={1.5}
            className={accent}
          />
          <rect
            x={104}
            y={30}
            width={28}
            height={22}
            rx={3}
            fill="none"
            strokeWidth={1}
            strokeDasharray="4 3"
            className={line}
          />
        </>
      );
    // Stacked lesson rows with the current one playing.
    case "lessons":
      return (
        <>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={38}
              y={26 + i * 16}
              width={100}
              height={10}
              fill="none"
              strokeWidth={1}
              className={i === 1 ? accent : line}
            />
          ))}
          <polygon points="46,29 46,37 53,33" className={fillAccent} />
          {[0, 2].map((i) => (
            <circle key={i} cx={49.5} cy={31 + i * 16} r={2} className={fillLine} />
          ))}
        </>
      );
    // Two columns of options with one pair joined — matching people to roles.
    case "match":
      return (
        <>
          <circle cx={52} cy={34} r={5} fill="none" strokeWidth={1} className={line} />
          <circle cx={52} cy={64} r={5} fill="none" strokeWidth={1} className={line} />
          <circle cx={124} cy={34} r={5} fill="none" strokeWidth={1} className={line} />
          <circle cx={124} cy={64} r={5} fill="none" strokeWidth={1} className={line} />
          <line x1={57} y1={34} x2={119} y2={34} strokeWidth={1.5} className={accent} />
          <line
            x1={57}
            y1={64}
            x2={119}
            y2={64}
            strokeWidth={1}
            strokeDasharray="3 3"
            className={line}
          />
        </>
      );
    // A figure read by the camera, one limb picked out — pose detection.
    case "pose":
      return (
        <>
          <circle cx={88} cy={26} r={6} fill="none" strokeWidth={1} className={line} />
          <line
            x1={88}
            y1={32}
            x2={88}
            y2={58}
            strokeWidth={1.5}
            strokeLinecap="round"
            className={line}
          />
          <line
            x1={88}
            y1={40}
            x2={66}
            y2={50}
            strokeWidth={1.5}
            strokeLinecap="round"
            className={line}
          />
          <line
            x1={88}
            y1={40}
            x2={110}
            y2={52}
            strokeWidth={1.5}
            strokeLinecap="round"
            className={accent}
          />
          <line
            x1={88}
            y1={58}
            x2={72}
            y2={78}
            strokeWidth={1.5}
            strokeLinecap="round"
            className={line}
          />
          <line
            x1={88}
            y1={58}
            x2={104}
            y2={78}
            strokeWidth={1.5}
            strokeLinecap="round"
            className={line}
          />
          <circle cx={110} cy={52} r={2.5} className={fillAccent} />
        </>
      );
    // A sensor reading trending toward the dashed threshold it is about to cross.
    case "signal":
      return (
        <>
          <line
            x1={22}
            y1={30}
            x2={154}
            y2={30}
            strokeWidth={1}
            strokeDasharray="3 4"
            className={line}
          />
          <polyline
            points="22,70 36,66 48,72 62,58 74,64 86,50"
            fill="none"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={line}
          />
          <polyline
            points="86,50 100,44 114,36 128,28"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 4"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={accent}
          />
          <circle cx={128} cy={28} r={2.5} className={fillAccent} />
        </>
      );
    // A descending ranking, the top entry filled — where you land.
    case "rank":
      return (
        <>
          <rect x={40} y={30} width={96} height={10} rx={2} className={fillAccent} />
          <rect
            x={40}
            y={46}
            width={68}
            height={10}
            rx={2}
            fill="none"
            strokeWidth={1}
            className={line}
          />
          <rect
            x={40}
            y={62}
            width={42}
            height={10}
            rx={2}
            fill="none"
            strokeWidth={1}
            className={line}
          />
        </>
      );
  }
}

export default function ProjectMark({ kind }: { kind: MarkKind }) {
  return (
    <svg
      viewBox="0 0 176 99"
      role="img"
      aria-hidden="true"
      focusable="false"
      className="h-40 w-full bg-zinc-50 sm:h-24 dark:bg-zinc-900"
      preserveAspectRatio="xMidYMid meet"
    >
      <Shape kind={kind} />
    </svg>
  );
}
