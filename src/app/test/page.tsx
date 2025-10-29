'use client';
import { useEffect, useState } from 'react';
import { auth, googleProvider, db } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  doc, setDoc, getDoc, addDoc, getDocs, collection, serverTimestamp, query, where
} from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

export default function TestFirebasePage() {
  const [user, setUser] = useState<User | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const push = (s: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${s}`, ...prev]);

  const errorMsg = (e: unknown): string => {
    if (e instanceof FirebaseError) return `${e.code}: ${e.message}`;
    if (e instanceof Error) return e.message;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      push(u ? `로그인됨: ${u.email} (${u.uid})` : '로그아웃됨');
    });
    return () => unsub();
  }, []);

  const doSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const u = res.user;
      await setDoc(
        doc(db, 'users', u.uid),
        {
          gmail: u.email ?? '',
          display_name: u.displayName ?? '',
          status: 'active',
          created_at: serverTimestamp(),
        },
        { merge: true }
      );
      push('Sign-in + users/{uid} upsert 성공');
    } catch (e: unknown) {
      push(`Sign-in 실패: ${errorMsg(e)}`);
    }
  };

  const doSignOut = async () => {
    try {
      await signOut(auth);
      push('Sign-out 완료');
    } catch (e: unknown) {
      push(`Sign-out 실패: ${errorMsg(e)}`);
    }
  };

  // roles/{uid} 문서에 panel=true 부여
  const grantPanel = async () => {
    if (!user) return push('로그인 필요');
    try {
      await setDoc(doc(db, 'roles', user.uid), { panel: true, guest: true }, { merge: true });
      push('roles/{uid}에 panel:true, guest:true 부여');
    } catch (e: unknown) {
      push(`roles 부여 실패: ${errorMsg(e)}`);
    }
  };

  const revokePanel = async () => {
    if (!user) return push('로그인 필요');
    try {
      await setDoc(doc(db, 'roles', user.uid), { panel: false, guest: true }, { merge: true });
      push('panel 권한 제거(guest만 유지) 완료');
    } catch (e: unknown) {
      push(`roles 수정 실패: ${errorMsg(e)}`);
    }
  };

  // teas 생성 (admin, panel 허용)
  const createTea = async () => {
    try {
      const teaId = crypto.randomUUID();
      await setDoc(doc(db, 'teas', teaId), {
        name: 'Test Tea',
        production_year: 2020,
        purchase_source_id: 'PS_ADMIN_ONLY',
        created_at: serverTimestamp(),
      });
      push(`teas/${teaId} 생성 성공`);
    } catch (e: unknown) {
      push(`teas 생성 실패: ${errorMsg(e)}`);
    }
  };

  // assessments 생성 + assessmentMeta에 author_id 저장
  const createAssessment = async () => {
    if (!user) return push('로그인 필요');
    try {
      const aid = crypto.randomUUID();
      await setDoc(doc(db, 'assessments', aid), {
        tea_id: 'DUMMY_TEA_ID',
        assessed_at: serverTimestamp(),
        brewing_context: '삼다수 / 95°C / 5g / 100ml / 15s',
        thickness: 7.5, density: 7.0, smoothness: 6.0, clarity: 8.0, granularity: 7.0,
        aroma_length: 4.0, delicacy: 4.5, continuity: 4.0, aftertaste: 4.5, refinement: 4.0,
        created_at: serverTimestamp(), updated_at: serverTimestamp(),
      });
      await setDoc(doc(db, 'assessmentMeta', aid), {
        author_id: user.uid,
        tea_id: 'DUMMY_TEA_ID',
      });
      push(`assessments/${aid} + assessmentMeta/${aid} 생성 성공`);
    } catch (e: unknown) {
      push(`assessment 생성 실패: ${errorMsg(e)}`);
    }
  };

  // panel은 assessments 읽기 가능, guest는 불가(보안 규칙에 따라)
  const readAssessments = async () => {
    try {
      const snap = await getDocs(collection(db, 'assessments'));
      push(`assessments 읽기 성공: ${snap.size}건`);
    } catch (e: unknown) {
      push(`assessments 읽기 실패: ${errorMsg(e)}`);
    }
  };

  // admin만 읽기 가능해야 함
  const readAssessmentMeta = async () => {
    try {
      const qSnap = await getDocs(collection(db, 'assessmentMeta'));
      push(`assessmentMeta 읽기 성공(주의: admin이어야 정상): ${qSnap.size}건`);
    } catch (e: unknown) {
      push(`assessmentMeta 읽기 실패(정상 기대): ${errorMsg(e)}`);
    }
  };

  // guest 포함 로그인 사용자 누구나 읽기 가능(보안 규칙에 따라)
  const readTeaAggregates = async () => {
    try {
      const qCol = query(collection(db, 'teaAggregates'));
      const snap = await getDocs(qCol);
      push(`teaAggregates 읽기 성공: ${snap.size}건`);
    } catch (e: unknown) {
      push(`teaAggregates 읽기 실패: ${errorMsg(e)}`);
    }
  };

  // 규칙으로 막히는지 확인용: purchaseSources는 admin만 허용
  const readPurchaseSources = async () => {
    try {
      const snap = await getDocs(collection(db, 'purchaseSources'));
      push(`purchaseSources 읽기 성공(주의: admin이어야 정상): ${snap.size}건`);
    } catch (e: unknown) {
      push(`purchaseSources 읽기 실패(정상 기대): ${errorMsg(e)}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Firebase 중간점검</h1>
      <div className="flex flex-wrap gap-2">
        <button onClick={doSignIn} className="px-3 py-2 border rounded">Google Sign-In</button>
        <button onClick={doSignOut} className="px-3 py-2 border rounded">Sign-Out</button>
        <button onClick={grantPanel} className="px-3 py-2 border rounded">Grant panel(+guest)</button>
        <button onClick={revokePanel} className="px-3 py-2 border rounded">Revoke panel(guest만)</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={createTea} className="px-3 py-2 border rounded">Create Tea</button>
        <button onClick={createAssessment} className="px-3 py-2 border rounded">Create Assessment(+Meta)</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={readAssessments} className="px-3 py-2 border rounded">Read assessments</button>
        <button onClick={readAssessmentMeta} className="px-3 py-2 border rounded">Read assessmentMeta (admin only)</button>
        <button onClick={readTeaAggregates} className="px-3 py-2 border rounded">Read teaAggregates</button>
        <button onClick={readPurchaseSources} className="px-3 py-2 border rounded">Read purchaseSources (admin only)</button>
      </div>

      <div className="p-3 bg-black text-white rounded min-h-40">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
