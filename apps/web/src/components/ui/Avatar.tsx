import { initials } from "@/lib/format";

export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-espresso font-extrabold text-cream"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.33) }}
    >
      {initials(name)}
    </div>
  );
}
