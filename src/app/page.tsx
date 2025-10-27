// app/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";

type TeaItem = { id: string; name: string; year?: number; origin?: string };

async function getEntries(): Promise<Array<{ id: string; title: string }>> {
  const dataDir = path.join(process.cwd(), "src", "data");
  const files = (await fs.promises.readdir(dataDir)).filter(f => f.endsWith(".json"));

  const entries: Array<{ id: string; title: string }> = [];

  for (const file of files) {
    const raw = await fs.promises.readFile(path.join(dataDir, file), "utf-8");
    const arr: unknown = JSON.parse(raw);
    if (Array.isArray(arr) && arr[0] && typeof arr[0] === "object") {
      const first = arr[0] as Partial<TeaItem>;
      if (first.id && first.name) {
        const title = `${first.year ?? ""} ${first.name}`.trim();
        entries.push({ id: first.id, title });
      }
    }
  }

  // 보기 좋게 정렬(연도 내림차순 → 제목)
  entries.sort((a, b) => {
    const ay = Number(a.title.split(" ")[0]);
    const by = Number(b.title.split(" ")[0]);
    if (!Number.isNaN(ay) && !Number.isNaN(by) && ay !== by) return by - ay;
    return a.title.localeCompare(b.title, "ko");
  });

  return entries;
}

export default async function Page() {
  const list = await getEntries();

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">차 품평 샘플</h1>
      <ul className="space-y-2">
        {list.map(item => (
          <li key={item.id} className="border p-3 rounded">
            <Link href={`/teaDB?id=${encodeURIComponent(item.id)}`} className="underline">
              {item.title}
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="text-gray-500">data 폴더에 .json이 없습니다.</li>}
      </ul>
    </main>
  );
}
