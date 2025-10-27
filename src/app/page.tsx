import teas from '@/data/teas.sample.json'; // next.config 없이도 import 가능

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Sample Teas</h1>
      <ul className="mt-4 space-y-2">
        {teas.map((t, i) => (
          <li key={i} className="border p-3 rounded">
            {t.name} — {t.origin}
          </li>
        ))}
      </ul>
    </main>
  );
}
