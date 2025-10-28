// src/app/teaDB/page.tsx
import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import type { Radar5Props } from "@/components/Radar5";
const Radar5 = dynamic<Radar5Props>(() => import("@/components/Radar5"));

/** ---------- Types ---------- */
type Primitive = string | number | boolean | null;
type Row = Record<string, Primitive>;

type Tea = {
  tea_id: string;
  name: string;
  production_year?: number;
  purchase_source_id?: string;
  created_at?: string;
};

type Assessment = {
  assessment_id: string;
  tea_id: string;
  author_id: string;
  assessed_at?: string;
  brewing_context?: string;
  // 탕질(0–10, 0.5)
  thickness?: number;
  density?: number;
  smoothness?: number;
  clarity?: number;
  granularity?: number;
  // 향미(0–5, 0.5)
  aroma_length?: number;
  delicacy?: number;
  continuity?: number;
  aftertaste?: number;
  refinement?: number;
  created_at?: string;
  updated_at?: string;
};

const BODY_METRICS: Array<keyof Assessment> = [
  "thickness",
  "density",
  "smoothness",
  "clarity",
  "granularity",
];

const AROMA_METRICS: Array<keyof Assessment> = [
  "aroma_length",
  "delicacy",
  "continuity",
  "aftertaste",
  "refinement",
];

/** ---------- FS helpers ---------- */
async function readJson(filePath: string): Promise<unknown> {
  const raw = await fs.promises.readFile(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

function toArrayOfObject<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data.filter(
      (x): x is T => x !== null && typeof x === "object" && !Array.isArray(x)
    );
  }
  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    return [data as T];
  }
  return [];
}

/** ---------- Tea lookup ---------- */
async function findTeaById(teaId: string): Promise<Tea | null> {
  const teaDir = path.join(process.cwd(), "src", "data", "tea");

  // (A) 파일명이 tea_id.json 인 경우
  const direct = path.join(teaDir, `${teaId}.json`);
  try {
    const parsed = await readJson(direct);
    const arr = toArrayOfObject<Tea>(parsed);
    const found = arr.find((t) => t.tea_id === teaId) ?? arr[0];
    if (found?.tea_id) return found;
  } catch {
    // pass
  }

  // (B) 모든 tea 파일을 훑어서 tea_id가 일치하는 Tea 찾기
  const files = (await fs.promises.readdir(teaDir)).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const full = path.join(teaDir, file);
    try {
      const parsed = await readJson(full);
      const arr = toArrayOfObject<Tea>(parsed);
      const hit = arr.find((t) => t.tea_id === teaId);
      if (hit) return hit;
    } catch {
      // ignore parse error
    }
  }
  return null;
}

/** ---------- Assessment collect & average ---------- */
async function collectAssessmentsByTeaId(teaId: string): Promise<Assessment[]> {
  const asmDir = path.join(process.cwd(), "src", "data", "assessment");
  const files = (await fs.promises.readdir(asmDir)).filter((f) => f.endsWith(".json"));

  const result: Assessment[] = [];
  for (const file of files) {
    const full = path.join(asmDir, file);
    try {
      const parsed = await readJson(full);
      const arr = toArrayOfObject<Assessment>(parsed);
      for (const a of arr) {
        if (a.tea_id === teaId) result.push(a);
      }
    } catch {
      // ignore file
    }
  }
  return result;
}

function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sum = numbers.reduce((acc, v) => acc + v, 0);
  return sum / numbers.length;
}

function toFixedOrDash(value: number | null, digits = 1): string {
  return value === null ? "-" : value.toFixed(digits);
}

/** ---------- Page ---------- */
// searchParams는 최신 Next에서 Promise 형태일 수 있음
export default async function TeaDBPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: teaId } = await searchParams;
  if (!teaId) notFound();

  // 1) tea 정보 로드
  const tea = await findTeaById(teaId);
  if (!tea) notFound();

  // 2) assessment 수집
  const assessments = await collectAssessmentsByTeaId(teaId);
  // assessments가 0개여도 페이지는 보여 주되, 평균은 "-"로 표시
  const count = assessments.length;

  // 3) 평균 계산
  const avgBody: Record<string, string> = {};
  for (const key of BODY_METRICS) {
    const values = assessments
      .map((a) => a[key])
      .filter((v): v is number => typeof v === "number");
    avgBody[key] = toFixedOrDash(average(values));
  }
  const avgAroma: Record<string, string> = {};
  for (const key of AROMA_METRICS) {
    const values = assessments
      .map((a) => a[key])
      .filter((v): v is number => typeof v === "number");
    avgAroma[key] = toFixedOrDash(average(values));
  }

  // 4) 렌더
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-sm underline">
          &larr; 목록으로
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-2">Tea: {tea.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        ID: <code>{tea.tea_id}</code>
        {typeof tea.production_year === "number" && (
          <> · 생산연도: {tea.production_year}</>
        )}
        {tea.purchase_source_id && <> · 구매처: {tea.purchase_source_id}</>}
      </p>
      
      {/* 5각형 평가 그래프: 탕질 / 향미 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Radar5
          title="탕질 평균"
          labels={["thickness", "density", "smoothness", "clarity", "granularity"]}
          // 문자열 평균을 사용 중이면 Number로 변환 (값이 없으면 0)
          values={[
            Number(avgBody["thickness"]) || 0,
            Number(avgBody["density"]) || 0,
            Number(avgBody["smoothness"]) || 0,
            Number(avgBody["clarity"]) || 0,
            Number(avgBody["granularity"]) || 0,
          ]}
          max={10}
        />
        <Radar5
          title="향미 평균"
          labels={["aroma_length", "delicacy", "continuity", "aftertaste", "refinement"]}
          values={[
            Number(avgAroma["aroma_length"]) || 0,
            Number(avgAroma["delicacy"]) || 0,
            Number(avgAroma["continuity"]) || 0,
            Number(avgAroma["aftertaste"]) || 0,
            Number(avgAroma["refinement"]) || 0,
          ]}
          max={5}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b">평가지표</th>
              <th className="text-left p-2 border-b">평균</th>
              <th className="text-left p-2 border-b">스케일</th>
            </tr>
          </thead>
          <tbody>
            {/* 탕질 5요소 */}
            {BODY_METRICS.map((k) => (
              <tr key={k} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b">{k}</td>
                <td className="p-2 border-b">{avgBody[k]}</td>
                <td className="p-2 border-b">0–10 (0.5)</td>
              </tr>
            ))}
            {/* 향미 5요소 */}
            {AROMA_METRICS.map((k) => (
              <tr key={k} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border-b">{k}</td>
                <td className="p-2 border-b">{avgAroma[k]}</td>
                <td className="p-2 border-b">0–5 (0.5)</td>
              </tr>
            ))}
            <tr>
              <td className="p-2 border-b font-medium">샘플 수</td>
              <td className="p-2 border-b">{count}</td>
              <td className="p-2 border-b">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
