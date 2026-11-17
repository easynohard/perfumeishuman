# 9단계: 기술 스택 최종 확정

> 프로젝트: **perfumeishuman — "향수가 사람이라면?"**
> 작성일: 2026-11-17 · 상태: **✅ 확정 — 9단계 완료** (2026-11-16 착수, 결정 11건 모두 사용자 승인. 이 문서의 목차도 2026-11-17 승인)
> 근거: [ADR 0026](./adr/0026-nextjs-typescript-single-codebase.md) ~ [ADR 0036](./adr/0036-monthly-cost-and-paid-plan-timing.md) · 7단계 [07-api-spec.md](./07-api-spec.md) 부록 A(9단계로 넘긴 항목) · 8단계 [08-ui-design.md](./08-ui-design.md) §10
> 이 문서는 새 결정을 담지 않는다. 각 결정의 배경·대안·결과는 해당 ADR이 원문이며, 둘이 다르면 ADR이 우선한다.

## 0. 이 문서는

9단계는 1~8단계에서 정한 서비스를 **무엇으로 만들고, 어디에 올리고, 얼마가 드는지**를 정한 단계다. 후보를 비교할 때 기준은 세 가지였다.

1. **학습 부담이 가장 작을 것** — 운영자는 1인이고 프로그래밍이 처음이다(01 N8).
2. **개인정보는 서울에 저장할 것** — 국외 이전 부담 최소화(ADR 0017 제약).
3. **비용은 최소로** — serverless 우선, 개발 중 0원(ADR 0017 제약).

## 1. 결정 요약

| # | 항목 | 고른 것 | 이유 한 줄 | ADR |
|---|---|---|---|---|
| ① | 언어·프레임워크 | **Next.js + TypeScript**, 화면과 API를 한 프로젝트에 | 배울 것이 하나로 줄고, 서버 렌더링(SEO, 01 N6)이 기본 | [0026](./adr/0026-nextjs-typescript-single-codebase.md) |
| ② | 호스팅·DB | **Vercel(`icn1` 서울) + Supabase PostgreSQL(`ap-northeast-2` 서울)** | 배포가 가장 단순하고 둘 다 서울 리전 | [0027](./adr/0027-hosting-vercel-db-supabase-seoul.md) |
| ③ | 로그인·세션 | **카카오 1개 + Better Auth + DB 세션(활동 없으면 20분 만료) + Origin 검사** | 이메일 없이 회원번호만 받는 최소 수집(ADR 0010)과 맞음 | [0028](./adr/0028-login-kakao-better-auth-session.md) |
| ④ | 이미지 | **Supabase Storage 공개·비공개 보관함 2개, 서버 경유 업로드(~2MB), 캐시 1시간** | 새 업체 없이 권리 이의 시 24시간 안에 내림(ADR 0009) | [0029](./adr/0029-image-storage-supabase-two-buckets.md) |
| ⑤ | 1인 1향수 1시향기 | **화면 안내 + 서버 확인 + 삭제분 제외 부분 유니크 인덱스** | 동시에 두 번 눌러도 DB가 1건만 허용 | [0030](./adr/0030-one-review-rule-partial-unique-index.md) |
| ⑥ | 서체·아이콘 | **Pretendard 공식 동적 서브셋 + `lucide-react`** | 필요한 글자 조각·아이콘만 받아 빠르고, 외부 호출 없음 | [0031](./adr/0031-font-icon-bundling-official-packages.md) |
| (추가) | CSS 방식 | **Tailwind CSS, 테마에 08 디자인 토큰만 등록** | 정해진 색 말고는 쓸 수 없게 막음(ADR 0024) | [0032](./adr/0032-css-tailwind-with-token-only-theme.md) |
| ⑦ | 테스트·품질 게이트 | **검사 5종을 개발 순서대로 켬, 핵심 규칙 테스트는 처음부터 필수** | 혼자 개발해도 수정마다 자동 검토 | [0033](./adr/0033-test-strategy-and-ci-quality-gates.md) |
| ⑧ | 의존성 라이선스 | **허용형만, MPL·LGPL은 예외 등록, GPL·AGPL·상업 제한·불명 금지** | 코드 공개 의무가 있는 부품을 CI가 자동 차단 | [0034](./adr/0034-dependency-license-policy.md) |
| ⑨ | 처리방침 위탁·국외 이전 | **수탁자 Vercel·Supabase(카카오는 위탁 아님), 국외 이전 공개, 접속 로그 최대 7일** | 미국 회사의 국외 처리 가능성을 미리 공개 | [0035](./adr/0035-privacy-outsourcing-and-overseas-transfer.md) |
| ⑩ | 월 비용 | **개발 중 0원 → 출시 약 3.7만 원(Supabase Pro) → 수익화 약 6.5만 원(Vercel Pro 추가)** | 출시부터 자동 백업 확보 | [0036](./adr/0036-monthly-cost-and-paid-plan-timing.md) |

## 2. 전체 구성

```
 [방문자 휴대폰·PC 브라우저]
        │  HTTPS (세션 쿠키: HttpOnly·Secure·SameSite=Lax)
        ▼
 [Vercel — 서울 icn1]  Next.js 한 프로젝트
   ├─ 화면 (서버 렌더링, Tailwind, Pretendard, lucide-react)
   └─ API  /api/v1/...  (07 명세, Better Auth, Origin 검사)
        │                         │
        │ DB 연결                  │ 로그인 시 이동
        ▼                         ▼
 [Supabase — 서울 ap-northeast-2]   [카카오 로그인]
   ├─ PostgreSQL : 회원·시향기·추천·세션 …     → 회원번호만 받음
   │   (1인 1향수 1시향기 부분 유니크 인덱스)
   └─ Storage    : 공개 보관함(보여도 되는 이미지)
                   비공개 보관함(원본)

 [GitHub] 코드 보관 (dev/minwoo) ─▶ [GitHub Actions] 검사 5종 + 라이선스 검사
```

- 서체 조각 파일·아이콘은 Vercel이 같은 출처에서 함께 내려준다. 외부 서체·아이콘 CDN, 분석 도구 호출은 없다.
- 이미지는 Supabase Storage 공개 보관함 주소로 직접 내려간다(캐시 1시간).

## 3. 시기별 월 비용

| 항목 | ① 개발 중 (지금~출시) | ② 출시 (수익 없음) | ③ 수익화 시작 후 |
|---|---|---|---|
| Vercel (사이트 서버) | 0원 (무료) | 0원 (무료) | $20 ≈ 2.8만 원 (유료 필수) |
| Supabase (DB·이미지) | 0원 (무료) | $25 ≈ 3.5만 원 (유료 추천) | $25 ≈ 3.5만 원 |
| 카카오 로그인 | 0원 | 0원 | 0원 |
| GitHub (코드 보관·CI 로봇) | 0원 | 0원 | 0원 |
| 도메인 (사이트 주소) | 필요 없음 | 연 1.5~3만 원 (월 약 2천 원) | 같음 |
| **합계 (월)** | **0원** | **약 3.7만 원** | **약 6.5만 원** |

> 기준: 2026-11-17 각 사 공개 가격, 1달러 ≈ 1,400원으로 계산한 대략적인 값. 출시 전 공식 가격 페이지로 재확인한다.

**늘어날 수 있는 경우**: ① 통신비밀보호법상 접속 기록 3개월 보관 의무가 적용되면 월 약 3~4만 원 추가 ② 방문자가 아주 많아 Supabase Pro 포함 전송량(월 250GB)을 넘으면 초과 과금 — 초기에는 해당 없음. 상세는 [ADR 0036](./adr/0036-monthly-cost-and-paid-plan-timing.md).

## 4. 사용할 부품 목록

버전은 10단계에서 설치하며 lock 파일로 고정한다. 라이선스는 모두 ADR 0034의 **허용** 목록이다.

| 용도 | 부품 | 라이선스 | 근거 |
|---|---|---|---|
| 프레임워크 | Next.js, React | MIT | ADR 0026 |
| 언어 | TypeScript | Apache-2.0 | ADR 0026 |
| 로그인·세션 | Better Auth | MIT | ADR 0028 |
| DB·저장소 연결 | Supabase 클라이언트(`@supabase/supabase-js` 등) | MIT | ADR 0027·0029 |
| CSS | Tailwind CSS | MIT | ADR 0032 |
| 서체 | Pretendard (`pretendard`) | OFL-1.1 | ADR 0025·0031 |
| 아이콘 | `lucide-react` | ISC | ADR 0025·0031 |
| 문법·포맷 검사 | ESLint, Prettier | MIT | ADR 0033 |
| 기능 테스트 | Vitest | MIT | ADR 0033 |
| 화면 흐름 테스트 | Playwright | Apache-2.0 | ADR 0033 |
| 속도·접근성 검사 | Lighthouse CI, axe-core | Apache-2.0 / MPL-2.0 | ADR 0033 |
| 목 서버(기존) | `@stoplight/prism-cli`, `swagger-ui-dist` | Apache-2.0 | 07 §5 |

- **axe-core는 MPL-2.0**으로 ADR 0034의 **조건부** 칸이다. 수정 없이 개발·검사 도구로만 쓰고 사이트 번들에 들어가지 않으므로 사용 가능하다고 보며, 10단계 설치 시 라이선스 감사 문서에 예외로 등록한다.
- 이 표의 라이선스는 2026-11-17 공개 정보 기준이다. 실제 하위 부품까지 포함한 전수 목록은 10단계 CI가 만든다.

## 5. 9단계 부가 산출물(품질·법무 트랙) 확인

| 요구 (CLAUDE.md 품질·법무 트랙) | 결과 |
|---|---|
| 라이선스 감사 2차 — 의존성 라이선스 정책 ADR(허용/금지 명시) | ✅ [ADR 0034](./adr/0034-dependency-license-policy.md), [license-audit.md](./quality/license-audit.md) §4 갱신 |
| 테스트 전략·품질 게이트 기준 ADR | ✅ [ADR 0033](./adr/0033-test-strategy-and-ci-quality-gates.md) (숫자 기준·`test-strategy.md`·`ci-quality-gates.md`는 10단계) |
| (8단계에서 넘어온) 처리방침의 처리위탁·국외 이전·로그 보관기간 | ✅ [ADR 0035](./adr/0035-privacy-outsourcing-and-overseas-transfer.md), [privacy-policy.md](./legal/privacy-policy.md) 제1조·제6조 |

## 6. 출시 전 확인 목록

9단계 결정에서 생긴 것만 모았다. CLAUDE.md "출시 전 관문"에도 반영돼 있다.

- [ ] **통신비밀보호법의 접속 기록 3개월 보관 의무** 적용 여부 — 적용되면 로그 보관 설정·비용·처리방침 문구 변경(ADR 0035·0036)
- [ ] **카카오를 처리위탁에서 제외하는 해석** 확인(ADR 0035) — 118 상담 또는 전문가 검토
- [ ] Vercel·Supabase **DPA**로 수탁자 연락처·처리 국가 확인 → 처리방침 `[출시 전 기재]` 채움
- [ ] Vercel·Supabase **가격·한도·로그 보관기간** 재확인(ADR 0036 표, 처리방침 "최대 7일")
- [ ] 출시 시 **Supabase Pro 전환**(자동 백업 확인), 수익 기능을 켜기 **전에** Vercel Pro 전환
- [ ] 처리방침·약관의 운영자 정보 빈칸(운영자 명칭·문의 이메일·보호책임자·개시일)

## 7. 10단계로 넘기는 것

| 항목 | 근거 |
|---|---|
| **Better Auth 스파이크** — 이메일 칸 대체 값, 불필요한 토큰 미저장 확인. 실패 시 직접 구현으로 전환하고 ADR 0028 대체 | ADR 0028 |
| Next.js 버전·라우팅 방식(App Router 등)·디렉토리 구조·코딩 컨벤션 | ADR 0026 |
| CI 구성: 검사 5종 + 라이선스 검사 설치, 커버리지·Lighthouse·접근성 **숫자 기준**, N5 "3G" 측정 조건, `test-strategy.md`·`ci-quality-gates.md` 작성 | ADR 0033·0034 |
| 테스트 전용 로그인 경로와 프로덕션 차단 테스트 | ADR 0033 |
| Supabase 프로젝트 생성(서울 리전 확인 — 생성 후 변경 불가), 보관함 2개·캐시 설정, 부분 유니크 인덱스 마이그레이션 | ADR 0027·0029·0030 |
| 이미지 업로드 크기 상한·허용 형식의 정확한 값 | ADR 0029 |
| Tailwind 테마에 08 토큰 매핑, 색 임의 값 금지 lint 규칙 | ADR 0032·0033 |
| `THIRD_PARTY_NOTICES` 자동 생성, axe-core(MPL-2.0) 예외 등록 | ADR 0034 |
| 설치 가이드(README·`.env.example`·로컬 실행·배포 절차) | CLAUDE.md 품질·법무 트랙 |
| **문서 문구 정리**: 07 본문 §3.6·§4.4.3·§4.4.4와 yaml 4곳의 "파일 전달 방식 9단계 미정" → multipart(ADR 0029), 07 §1의 "세션 저장소 9단계" 표시 → ADR 0028. 내용 변화 없는 표시 정리라 별도 승인 후 진행 | ADR 0028·0029 |
| `DELETE` 요청 본문(관리자 삭제 사유)이 Vercel·Next.js에서 그대로 전달되는지 확인 — 안 되면 07의 대체 경로(`POST …/deletion`) 사용 | 07 §4.4.2 |
