# ADR (Architecture Decision Records)

되돌리기 어렵거나 구조·데이터 모델·외부 의존성에 영향을 주는 결정을, 결정 시점에 기록한다.

- 파일명: `NNNN-제목.md` (번호는 순차 증가, 재사용 없음)
- 형식: Status / Context / Decision / 검토한 대안 / Consequences
- 결정이 바뀌면 기존 ADR을 수정하지 않고 새 ADR을 작성한 뒤, 기존 문서의 Status를 `Superseded by NNNN`으로 바꾼다

## 목록

| # | 제목 | Status |
|---|---|---|
| [0001](./0001-no-star-rating.md) | 별점 없이 추천 버튼만 사용 | Accepted |
| [0002](./0002-open-reading-login-for-actions.md) | 열람은 비로그인 개방, 작성·추천은 소셜 로그인 필수 | Accepted |
| [0003](./0003-controlled-vocabulary-tags.md) | 태그·계열은 관리자 지정 통제 어휘 사용 | Accepted |
| [0004](./0004-single-page-writing-form.md) | 시향기 작성 폼은 한 페이지 스크롤 + 100자 숏폼 | Accepted |
| [0005](./0005-seo-slug-urls.md) | 콘텐츠 URL에 SEO 슬러그 사용 | Accepted (계열 URL은 0019가 변경) |
| [0006](./0006-tag-vocabulary-and-answer-structure.md) | 시향기 태그 선택지 세트와 응답 구조 확정 | Superseded by 0007 |
| [0007](./0007-reduce-tag-questions-to-two.md) | 태그 질문 4종 → 2종 축소 (나이대·성격) | Accepted |
| [0008](./0008-anonymized-retention-on-withdrawal.md) | 회원 탈퇴 시 시향기는 익명 처리 후 보존 | Accepted |
| [0009](./0009-perfume-image-sourcing-and-takedown.md) | 향수 이미지는 단순 팩샷 누끼로 조달, 이의 시 즉시 제거 | Accepted |
| [0010](./0010-minimal-personal-data-collection.md) | 개인정보 최소 수집 — 이메일 미수집, 신고자 IP 미저장 | Accepted |
| [0011](./0011-soft-delete-reviews.md) | 시향기 삭제는 소프트 삭제 + 처리 이력 | Accepted |
| [0012](./0012-identifier-formats.md) | 식별자 형식 확정 — 시향기 슬러그·닉네임 자동 생성·프로필 공개 식별자 | Accepted |
| [0013](./0013-age-tag-multi-select.md) | 나이대 태그를 단일 선택 → 1~3개 다중 선택으로 변경 | Accepted |
| [0014](./0014-login-before-write-entry.md) | 시향기 쓰기 전 로그인 | Accepted |
| [0015](./0015-accord-final-set.md) | 계열(accord) 최종 세트 11개 확정 | Accepted |
| [0016](./0016-aggregate-update-and-soft-delete-scope.md) | 집계 컬럼은 애플리케이션 증감 + 주기 보정, 소프트 삭제 제외는 기본 스코프 | Accepted |
| [0017](./0017-api-design-principles.md) | API 설계 원칙 — REST·세션 쿠키·오프셋 페이지네이션 | Accepted (§5 기본 크기는 0018이 보완) |
| [0018](./0018-list-page-size.md) | 목록 페이지 크기 — 사용자·관리자 모두 기본 10개 | Accepted |
| [0019](./0019-accord-naming-unification.md) | 계열의 영문 이름을 accord로 통일 — URL·API·스키마 | Accepted |
| [0020](./0020-reconsent-on-policy-revision.md) | 약관·처리방침 개정 시 재동의 — 거부하면 탈퇴 안내 | Superseded by 0022 |
| [0021](./0021-admin-report-id-exception.md) | 관리자 전용 신고 API는 내부 id를 식별자로 쓴다 (0017의 예외) | Accepted |
| [0022](./0022-defer-reconsent-from-mvp.md) | 약관 개정 시 재동의는 MVP에서 제외, 향후 도입 설계안 보존 | Accepted |
| [0023](./0023-one-review-per-user-per-perfume.md) | 한 사람은 한 향수에 시향기를 1개만 쓸 수 있다 | Accepted |
| [0024](./0024-color-system-white-cobalt-black.md) | 색상 체계는 흰색·코발트 블루·검정으로 제한 | Accepted |
| [0025](./0025-typeface-and-icon-set.md) | 서체는 Pretendard, 아이콘은 Lucide | Accepted (아이콘 "스프라이트" 번들 방식은 0031이 대체) |
| [0026](./0026-nextjs-typescript-single-codebase.md) | 화면과 API를 Next.js + TypeScript 한 코드베이스로 만든다 | Accepted |
| [0027](./0027-hosting-vercel-db-supabase-seoul.md) | 호스팅은 Vercel, DB는 Supabase(PostgreSQL) — 둘 다 서울 리전 | Accepted |
| [0028](./0028-login-kakao-better-auth-session.md) | 로그인은 카카오 1개·Better Auth·DB 세션(활동 없으면 20분 만료)·Origin 검사 | Accepted |
| [0029](./0029-image-storage-supabase-two-buckets.md) | 이미지·로고는 Supabase Storage(공개·비공개 보관함 2개), 서버 경유 업로드, 캐시 1시간으로 즉시 내림 | Accepted |
| [0030](./0030-one-review-rule-partial-unique-index.md) | 1인 1향수 1시향기는 화면 안내 + 서버 확인 + 부분 유니크 인덱스로 지킨다 | Accepted |
| [0031](./0031-font-icon-bundling-official-packages.md) | 서체는 Pretendard 공식 동적 서브셋 패키지(같은 출처), 아이콘은 lucide-react로 쓰는 것만 — 0025의 "스프라이트" 대체 | Accepted |
| [0032](./0032-css-tailwind-with-token-only-theme.md) | CSS는 Tailwind CSS, 테마에는 08 디자인 토큰만 등록(기본 색 목록 제거) | Accepted |
| [0033](./0033-test-strategy-and-ci-quality-gates.md) | 테스트·품질 게이트 — 검사 5종을 개발 순서에 맞춰 단계적으로 켜고, 핵심 규칙 테스트는 처음부터 필수 | Accepted |
| [0034](./0034-dependency-license-policy.md) | 의존성 라이선스 정책 — 허용형만, 조건부는 예외 등록, GPL·AGPL·상업 제한·불명은 금지 | Accepted |
| [0035](./0035-privacy-outsourcing-and-overseas-transfer.md) | 처리위탁은 Vercel·Supabase(카카오는 위탁 아님), 국외 이전 보수적 공개, 접속 로그 최대 7일 | Accepted |
| [0036](./0036-monthly-cost-and-paid-plan-timing.md) | 출시 시 Supabase Pro 전환, Vercel은 수익화 전까지 Hobby — 월 비용 0원 → 약 3.7만 원 → 약 6.5만 원 | Accepted |
