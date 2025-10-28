// src/app/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";

type Tea = {
  tea_id: string;
  name: string;
  production_year?: number;
  purchase_source_id?: string;
  created_at?: string;
};

type Entry = { id: string; title: string };

function toEntriesFromUnknown(data: unknown): Entry[] {
  const entries: Entry[] = [];

  const pushIfValid = (t: Partial<Tea>) => {
    if (t.tea_id && t.name) {
      const yearPart = typeof t.production_year === "number" ? String(t.production_year) : "";
      const title = `${yearPart} ${t.name}`.trim();
      entries.push({ id: t.tea_id, title });
    }
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        pushIfValid(item as Partial<Tea>);
      }
    }
  } else if (data && typeof data === "object") {
    pushIfValid(data as Partial<Tea>);
  }

  return entries;
}

async function getEntries(): Promise<Entry[]> {
  const dataDir = path.join(process.cwd(), "src", "data", "tea");
  const files = (await fs.promises.readdir(dataDir)).filter((f) => f.endsWith(".json"));

  const entries: Entry[] = [];
  for (const file of files) {
    const raw = await fs.promises.readFile(path.join(dataDir, file), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    entries.push(...toEntriesFromUnknown(parsed));
  }

  // 정렬: production_year 내림차순 → title 오름차순
  entries.sort((a, b) => {
    // title 앞부분에 연도를 붙였으니 앞 토큰 비교
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
        {list.map((item) => (
          <li key={item.id} className="border p-3 rounded">
            <Link href={`/teaDB?id=${encodeURIComponent(item.id)}`} className="underline">
              {item.title}
            </Link>
          </li>
        ))}
        {list.length === 0 && (
          <li className="text-gray-500">src/data/tea 폴더에 .json이 없습니다.</li>
        )}
      </ul>
    </main>
  );
}
