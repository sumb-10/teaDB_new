// 기존 import 유지
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

/** 점수 필드 정의 — 탕질(0~10) + 향미(0~5) */
const BODY_KEYS = ["thickness", "density", "smoothness", "clarity", "granularity"] as const;
const AROMA_KEYS = ["aroma_length", "delicacy", "continuity", "aftertaste", "refinement"] as const;
const SCORE_KEYS = [...BODY_KEYS, ...AROMA_KEYS] as const;

type ScoreKey = typeof SCORE_KEYS[number];

/** Firestore에 저장된 assessment 문서 타입 */
type AssessmentDoc = Partial<Record<ScoreKey, number>> & {
  tea_id?: string;
  assessed_at?: Timestamp | null;
};

/** 소수점 2자리 반올림 */
const round2 = (n: number) => Math.round(n * 100) / 100;

/** 하나의 tea에 대한 모든 assessment를 읽어 평균 계산 */
async function recomputeTeaAggregates(teaId: string) {
  const snap = await db.collection("assessments").where("tea_id", "==", teaId).get();

  if (snap.empty) {
    await db.collection("teaAggregates").doc(teaId).set({
      avg_thickness: null,
      avg_density: null,
      avg_smoothness: null,
      avg_clarity: null,
      avg_granularity: null,
      avg_aroma_length: null,
      avg_delicacy: null,
      avg_continuity: null,
      avg_aftertaste: null,
      avg_refinement: null,
      assessment_count: 0,
      last_assessed_at: null,
      updated_at: FieldValue.serverTimestamp(),
    });
    return;
  }

  const sums: Record<ScoreKey, number> = Object.fromEntries(
    SCORE_KEYS.map((k) => [k, 0])
  ) as Record<ScoreKey, number>;

  let count = 0;
  let lastAssessed: Timestamp | null = null;

  snap.forEach((doc) => {
    const d = doc.data() as AssessmentDoc;

    SCORE_KEYS.forEach((k) => {
      const v = d[k];
      if (typeof v === "number" && !Number.isNaN(v)) {
        sums[k] += v;
      }
    });

    count += 1;

    const ts = d.assessed_at ?? null;
    if (ts) {
      if (lastAssessed === null || ts.toMillis() > lastAssessed.toMillis()) {
        lastAssessed = ts;
      }
    }
  });

  const avgs = Object.fromEntries(
    SCORE_KEYS.map((k) => [`avg_${k}`, round2(sums[k] / count)])
  );

  await db.collection("teaAggregates").doc(teaId).set(
    {
      ...avgs,
      assessment_count: count,
      last_assessed_at: lastAssessed ?? null,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** onWrite: 생성/수정/삭제 공통 처리 */
export const onAssessmentWrite = onDocumentWritten("assessments/{aid}", async (event) => {
  const beforeData = event.data?.before?.exists ? (event.data.before.data() as AssessmentDoc) : null;
  const afterData  = event.data?.after?.exists  ? (event.data.after.data()  as AssessmentDoc)  : null;

  const beforeTeaId = beforeData?.tea_id;
  const afterTeaId  = afterData?.tea_id;

  if (!afterData && beforeTeaId) {
    await recomputeTeaAggregates(beforeTeaId);
    return;
  }
  if (!beforeData && afterTeaId) {
    await recomputeTeaAggregates(afterTeaId);
    return;
  }

  const teaIdsToRecompute = new Set<string>();
  if (beforeTeaId) teaIdsToRecompute.add(beforeTeaId);
  if (afterTeaId)  teaIdsToRecompute.add(afterTeaId);

  for (const tid of teaIdsToRecompute) {
    await recomputeTeaAggregates(tid);
  }
});
