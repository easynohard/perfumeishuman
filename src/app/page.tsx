import { Heart } from "lucide-react";

// 10단계 뼈대 확인용 임시 첫 화면 — 서체·색 토큰·아이콘이 연결됐는지 본다. 실제 홈은 기능 개발에서 만든다.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-column flex-1 px-4 py-10">
      <h1 className="text-display">
        향수가 사람이라면<span className="text-cobalt">?</span>
      </h1>
      <p className="mt-3 text-body text-muted">
        개발 환경 준비 중입니다. 이 화면은 서체·색·아이콘 연결 확인용이에요.
      </p>
      <div className="mt-6 rounded-card border border-line p-4">
        <p className="text-body-l">
          이 향수가 사람이라면, 비 온 뒤 창문을 여는 차분한 사서 같아요.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1 rounded-control bg-cobalt px-4 py-2 text-label text-white hover:bg-cobalt-strong"
        >
          <Heart aria-hidden="true" size={16} strokeWidth={1.75} />
          추천
        </button>
      </div>
    </main>
  );
}
