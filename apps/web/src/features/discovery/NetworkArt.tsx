/* The intro illustration: founders as quiet dots, and the one introduction the system
   makes, in ember — the colour reserved for the system speaking. Decorative only. */

const NODES: [number, number][] = [
  [28, 46], [74, 18], [120, 58], [168, 22], [214, 64], [262, 30], [306, 70],
  [50, 112], [98, 138], [150, 104], [198, 142], [246, 108], [294, 140],
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [0, 7], [7, 8], [8, 9],
  [9, 10], [10, 11], [11, 12], [2, 9], [4, 11], [6, 12], [1, 7],
];

// The introduction: two founders who are not yet connected.
const A = 8;
const B = 4;

export function NetworkArt() {
  const [ax, ay] = NODES[A];
  const [bx, by] = NODES[B];
  return (
    <svg viewBox="0 0 334 160" className="mx-auto h-[104px] w-auto max-w-full" aria-hidden>
      {EDGES.map(([i, j]) => (
        <line
          key={`${i}-${j}`}
          x1={NODES[i][0]}
          y1={NODES[i][1]}
          x2={NODES[j][0]}
          y2={NODES[j][1]}
          className="stroke-rule"
          strokeWidth={1}
        />
      ))}
      <line x1={ax} y1={ay} x2={bx} y2={by} className="intro-link stroke-ember" strokeWidth={2} strokeLinecap="round" />
      {NODES.map(([x, y], i) => {
        const chosen = i === A || i === B;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={chosen ? 7 : 4.5}
            className={chosen ? "fill-ember" : "fill-screen stroke-ink3"}
            strokeWidth={chosen ? 0 : 1.2}
          />
        );
      })}
    </svg>
  );
}
