import ApiStatus from "@/components/ApiStatus";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-ember text-xl font-extrabold text-white">
        ID
      </div>
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">IDEA DISTRICT</h1>
      <p className="text-sm text-ink3">Understanding before recommendation.</p>
      <p className="inferred max-w-xs text-lg">What the system works out appears like this.</p>
      <ApiStatus />
    </main>
  );
}
