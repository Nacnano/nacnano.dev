export type MarkKind = "grid" | "signal";

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
