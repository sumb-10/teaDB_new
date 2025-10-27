// src/app/teaDB/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";

type Primitive = string | number | boolean | null;
type Row = Record<string, Primitive>;

async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

function toRows(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  const rows: Row[] = [];
  for (const item of data) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      const row: Row = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
          row[k] = v;
        } else {
          row[k] = JSON.stringify(v);
        }
      }
      rows.push(row);
    }
  }
  return rows;
}

async function findFileById(id: string): Promise<string | null> {
  const dataDir = path.join(process.cwd(), "src", "data");

  // (A) 파일명이 id.json인 경우
  const direct = path.join(dataDir, `${id}.json`);
  try {
    await fs.promises.access(direct, fs.constants.F_OK);
    return direct;
  } catch {}

  // (B) 모든 파일을 훑어서 첫 요소의 id가 일치하는 파일 찾기
  const files = (await fs.promises.readdir(dataDir)).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const full = path.join(dataDir, file);
    try {
      const parsed = await readJson(full);
      if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === "object") {
        const firstId = (parsed[0] as Record<string, unknown>)["id"];
        if (typeof firstId === "string" && firstId === id) {
          return full;
        }
      }
    } catch {}
  }
  return null;
}

// ✅ 여기 수정 포인트: searchParams를 Promise로 받고 await 사용
export default async function TeaDBPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams; // <-- 반드시 await로 언랩
  if (!id) notFound();

  const filePath = await findFileById(id);
  if (!filePath) notFound();

  const parsed = await readJson(filePath);
  const rows = toRows(parsed);
  if (rows.length === 0) notFound();

  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm underline">
          &larr; 목록으로
        </Link>
      </div>
      <h1 className="text-xl font-semibold mb-4">ID: {id}</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c} className="text-left p-2 border-b">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                {columns.map((c) => (
                  <td key={c} className="p-2 border-b">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
