'use client';

import dynamic from 'next/dynamic';
import type { Radar5Props } from '@/components/Radar5';

// Client 컴포넌트 내부에서만 ssr:false 사용 가능
const Radar5 = dynamic<Radar5Props>(() => import('@/components/Radar5'), {
  ssr: false,
});

export default function Radar5Client(props: Radar5Props) {
  return <Radar5 {...props} />;
}
