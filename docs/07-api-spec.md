# 7단계: API 명세 (OpenAPI)

> 프로젝트: **perfumeishuman — "향수가 사람이라면?"**
> 작성일: 2026-10-03 · 상태: **🔶 진행 중 — §1 설계 원칙 확정 / §2 확정(2026-10-30) / §3 확정(2026-10-30) / §4 확정(2026-11-04) / §5 yaml 작성(2026-11-04, Spectral 통과, 검토 대기)**
> 근거 문서: [02-user-stories.md](./02-user-stories.md) · [03-sitemap-ia.md](./03-sitemap-ia.md) · [04-wireframes.md](./04-wireframes.md) · [05-data-model.md](./05-data-model.md) · [06-erd.md](./06-erd.md)
> 관련 ADR: [0005](./adr/0005-seo-slug-urls.md) · [0008](./adr/0008-anonymized-retention-on-withdrawal.md) · [0010](./adr/0010-minimal-personal-data-collection.md) · [0011](./adr/0011-soft-delete-reviews.md) · [0012](./adr/0012-identifier-formats.md) · [0014](./adr/0014-login-before-write-entry.md) · [0016](./adr/0016-aggregate-update-and-soft-delete-scope.md) · [0017](./adr/0017-api-design-principles.md) · [0018](./adr/0018-list-page-size.md) · [0019](./adr/0019-accord-naming-unification.md) · [0020](./adr/0020-reconsent-on-policy-revision.md) · [0021](./adr/0021-admin-report-id-exception.md) · [0022](./adr/0022-defer-reconsent-from-mvp.md) · [0023](./adr/0023-one-review-per-user-per-perfume.md)

## 0. 읽는 법과 진행 순서

이 문서는 단계적으로 채워진다. 각 절이 승인되어야 다음 절로 넘어간다.

| 절 | 내용 | 상태 |
|---|---|---|
| §1 | 설계 원칙 | ✅ 확정 (2026-10-03, ADR 0017) |
| §2 | 화면별 엔드포인트 도출 (화면 16개 기준) | ✅ 확정 (2026-10-30, 커버리지 대조 반영) |
| §3 | 화면에 없는 API 점검 (탈퇴·동의 기록·개인정보 열람·소셜 로그인 콜백·신고·이미지 비공개·운영 배치·SEO `sitemap.xml`) | ✅ 확정 (2026-10-30) |
| §4 | 엔드포인트별 계약 (요청·응답·권한·갱신 집계·삭제분 규칙) | ✅ 확정 (2026-11-04, 제안 결정은 권고안대로 채택) (§4.1·§4.2 2026-10-30 / §4.3 회원·§4.4 관리자·§4.5 에러 코드·§4.6 집계 갱신표 2026-11-04) |
| §5 | OpenAPI 명세 파일 ([`07-api-spec.yaml`](./07-api-spec.yaml), OpenAPI 3.0.3, 엔드포인트 38경로) | 🔶 작성 완료, Spectral(`spectral:oas`) 오류·경고 0건. Swagger UI·Prism 확인과 FL1~FL4 추적은 검토 대기 |

> **이 문서가 이미 확정된 결정을 다시 열지 않는 항목**: 집계 컬럼 갱신 방식(애플리케이션 증감 + 주기 보정)과 소프트 삭제 조회 제외 방식(기본 스코프)은 ADR 0016이 확정했다. 7단계는 엔드포인트별 갱신 대상과 삭제분 규칙을 **명시**하는 일만 한다.

## 1. 설계 원칙 (확정)

### 1.1 확정 사항 요약

| 항목 | 내용 |
|---|---|
| URL | REST 스타일, `/api/v1/` 접두사, 명사 복수형, 본인 자원 `/me`, 관리자 `/admin` |
| 식별자 | ADR 0005·0012의 슬러그·랜덤 코드. 내부 순차 id 비노출 |
| 인증 | 세션 쿠키(`HttpOnly`·`Secure`·`SameSite=Lax`) + 쓰기 요청 CSRF 방어. 세션은 서버 측 저장소 |
| 권한 | 비로그인 / 회원 / 관리자 / 탈퇴 회원. 소프트 삭제분은 관리자 외에 404 |
| 에러 | HTTP 상태 코드 + `{ "error": { "code", "message", "fields" } }` |
| 페이지네이션 | 전부 오프셋, 기본 10개 (ADR 0018이 0017의 20개를 보완) |
| 9단계 제약 | serverless 우선 검토 · 국내 리전 필수 · 비용 최소화 |

### 1.2 URL 규칙

- 자원은 명사 복수형으로 쓰고, 동작은 HTTP 메서드로 구분한다.

| 메서드 | 쓰임 |
|---|---|
| GET | 조회. 상태를 바꾸지 않는다 |
| POST | 생성, 그리고 자원으로 표현하기 어려운 동작(예: 추천) |
| PATCH | 부분 수정 |
| DELETE | 삭제 |

- 모든 API는 `/api/v1/` 아래에 둔다. 화면 URL(`/reviews/:slug` 등)과 겹치지 않게 하기 위함이다.
- 본인 자원은 `/api/v1/me/...`, 관리자 API는 `/api/v1/admin/...`로 분리한다. 경로 분리는 편의일 뿐 **권한은 서버가 매 요청마다 검사**한다.
- 쿼리스트링·URL에 세션 id·토큰·개인정보를 넣지 않는다.
- 공개 식별자는 ADR 0005·0012의 슬러그·랜덤 코드다. 내부 사용자 id 등 순차 값은 요청·응답 어디에도 노출하지 않는다. 유일한 예외는 관리자 전용 신고 API가 신고의 내부 id를 쓰는 것이다([ADR 0021](./adr/0021-admin-report-id-exception.md)).

### 1.3 인증과 세션

- 로그인 성공 시 서버가 세션을 만들고 `HttpOnly`·`Secure`·`SameSite=Lax` 쿠키로 세션 id만 내려준다. 쿠키에는 사용자 정보를 담지 않는다.
- 쓰기 요청(POST·PATCH·DELETE)은 CSRF 방어를 거친다. 방식(헤더 토큰 등)의 세부는 구현 단계에서 정한다.
- 세션은 서버 측 저장소에 둔다. 저장소 제품과 세션 만료 시간은 9단계 이후에 정한다.
- **탈퇴 즉시 해당 사용자의 세션을 모두 삭제한다.** 또한 요청마다 사용자 상태(탈퇴 여부)를 확인한다. (ADR 0017은 "관리자 차단"도 적었으나 **MVP에는 차단 기능이 없다** — 계정 상태는 활성/탈퇴뿐이다. 도입하려면 새 ADR로 데이터 모델·API를 함께 추가한다. 2026-10-30)
- 소셜 로그인은 공급자 구분 + 공급자 회원번호만 받는다(ADR 0010). 이메일·프로필 이미지·공급자 닉네임은 저장하지 않는다.

### 1.4 권한 모델

| 역할 | 정의 | 할 수 있는 일 |
|---|---|---|
| **비로그인** | 세션 없음 | 열람(피드·검색·목록·상세·프로필·정책 페이지)만 |
| **회원** | 유효한 세션 + `admin_flag=0` + 탈퇴하지 않음 | 비로그인의 모든 것 + 시향기 작성·수정·삭제(본인 것), 추천, 내 시향기 조회, 닉네임 변경, 동의 기록, 회원 탈퇴 |
| **관리자** | 유효한 세션 + `admin_flag=1` | 회원의 모든 것 + 모든 시향기·향수·브랜드·이미지 CRUD, 신고 처리, 삭제분 조회 |
| **탈퇴 회원** | 탈퇴 처리된 계정 (ADR 0008) | **API를 사용할 수 없다.** 세션이 삭제되고 소셜 식별자가 파기되어 로그인할 수단이 없다. 작성한 시향기·추천은 익명으로 보존되어 다른 사람에게 보일 뿐이다 |

- 관리자는 `user.admin_flag`로 구분하는 일반 사용자다(별도 admin 테이블 없음, 06 ERD §3). 이 구분의 보장은 애플리케이션이 한다.
- 권한 검사는 **엔드포인트마다 명시**한다(§4). 경로가 `/admin`이라는 사실에 의존하지 않는다.
- 권한이 없을 때: 로그인이 필요한 요청을 비로그인이 보내면 **401**, 로그인했지만 권한이 부족하면 **403**.
- **소프트 삭제된 시향기**(ADR 0011)는 관리자 API 외의 어떤 응답에도 나타나지 않는다. 시향기 상세를 직접 조회하면 **404**로 응답한다. 목록·피드·검색·집계·SEO에서도 제외한다(ADR 0016 기본 스코프).

### 1.5 에러 응답

모든 실패 응답은 HTTP 상태 코드와 아래 형식을 함께 쓴다.

```json
{
  "error": {
    "code": "TEXT_TOO_LONG",
    "message": "100자까지 쓸 수 있어요.",
    "fields": { "content": "최대 100자" }
  }
}
```

| 필드 | 쓰임 |
|---|---|
| `code` | 프론트가 분기하는 기계용 코드. 대문자 스네이크 케이스, 엔드포인트와 무관하게 의미가 같으면 같은 코드 |
| `message` | 화면에 보여줄 한국어 문구 |
| `fields` | 폼 검증 실패 시 필드별 사유. 필드와 무관한 오류면 생략 |

상태 코드 사용 기준:

| 코드 | 쓰임 |
|---|---|
| 400 | 입력 형식·값 오류 (필수 누락, 글자 수 초과, 허용되지 않은 태그 등) |
| 401 | 로그인이 필요한데 세션이 없음·만료 |
| 403 | 로그인했지만 권한 부족 (예: 남의 시향기 수정, 회원의 관리자 API 호출) |
| 404 | 대상이 없음. **소프트 삭제분 포함** |
| 409 | 현재 상태와 충돌 (예: 이미 추천함) |
| 429 | 요청 과다. 한도 수치는 구현 단계에서 정한다 |
| 500 | 서버 오류 |

- 서버 내부 정보(스택 트레이스·DB 오류 메시지)는 응답에 담지 않는다.
- 개별 엔드포인트의 에러 `code` 목록은 §4에서 확정한다.

### 1.6 페이지네이션

모든 목록 API는 오프셋 방식이다.

- 요청: `?page=1&size=10` — `page`는 1부터 시작, `size`의 기본값은 **10**이다(사용자·관리자 목록 공통, [ADR 0018](./adr/0018-list-page-size.md)). 상한은 구현 단계에서 정한다.
- 브랜드 목록(`/brands`)과 계열 목록(`/accords`)은 한 화면에 전부 보여주므로 페이지네이션을 적용하지 않는다.
- 검색(`/search`)도 예외다. 화면이 "향수 / 브랜드" 두 섹션의 상위 결과만 보여주고 더보기가 없으므로, 섹션별 상위 5개를 한 번에 내려준다(§2.3).
- 응답:

```json
{
  "items": [ ],
  "page": 1,
  "size": 10,
  "total_items": 134,
  "total_pages": 14
}
```

- **감수하는 한계**: 추천순 피드를 보는 도중 순위가 바뀌거나 새 글이 올라오면, 다음 페이지에서 같은 글이 다시 나오거나 일부가 빠질 수 있다(ADR 0017). 트래픽이 커져 문제가 되면 새 ADR로 커서 방식을 재검토한다.
- 관리자 목록은 같은 방식으로 "N페이지로 이동"이 가능하다.

### 1.7 공통 규칙 (확정)

> 원칙 논의 중에 정하지 않고 문서 작성 시 기본값으로 제안했고, 2026-10-03 사용자가 승인해 확정했다.

| 항목 | 기본값 | 이유 |
|---|---|---|
| 본문 형식 | JSON, UTF-8 | — |
| 필드 이름 | `snake_case` | 06 ERD의 컬럼 이름과 맞춰 매핑 부담을 줄인다 |
| 날짜·시간 | ISO 8601 문자열, 시간대 오프셋 포함 (예: `2026-10-03T14:30:00+09:00`) | 서버·프론트 간 시간대 혼동 방지 |
| 빈 목록 | 에러가 아니라 `items: []`로 응답 | 검색 결과 없음 등은 정상 응답 |
| 존재 여부 은닉 | 삭제분은 403이 아닌 404 | ADR 0011 — 삭제 사실을 드러내지 않음 |

## 2. 화면별 엔드포인트

> **상태: ✅ 확정 (2026-10-30).** 04·05를 근거로 작성한 초안(2026-10-28)을 화면 16개 커버리지 대조(2026-10-30)로 보완해 승인받았다. 다음은 §3이다.

### 2.1 읽는 법

- 기준은 3단계 사이트맵의 화면 16개다([03-sitemap-ia.md](./03-sitemap-ia.md), [04-wireframes.md](./04-wireframes.md)). "어떤 화면이 어떤 API를 부르는가"의 **목록**이며, 요청·응답 필드는 §4에서 정한다.
- 모든 경로 앞에 `/api/v1`이 붙는다(생략). `{slug}`는 ADR 0005·0012의 슬러그·랜덤 코드, `{code}`는 작성자 프로필 공개 코드다.
- 마지막 열은 **비로그인 / 회원 / 관리자** 순서이고, ○는 허용, ✕는 불가다. 관리자는 회원의 상위 역할이라(§1.4) 회원이 가능한 일은 관리자도 ○다.
- **(페이지)** 표시가 있는 목록은 오프셋 페이지네이션이며 기본 10개다([ADR 0018](./adr/0018-list-page-size.md)). 브랜드·계열 목록은 한 번에 전부 내려준다.
- 여러 화면이 같은 API를 쓰면 처음 나온 행에 적고 이후는 "(재사용)"으로 표시한다.
- API는 화면이 필요로 하는 것 기준으로 도출했으므로 ERD 테이블과 1:1로 대응하지 않는다. 테이블 → API 대응은 §2.4에 정리한다.

### 2.2 엔드포인트 표

**게스트 열람 가능**

| 화면 | 메서드 + 경로 | 하는 일 | 비로그인 / 회원 / 관리자 |
|---|---|---|---|
| **전 화면 공통** | `GET /me` | 세션 상태 조회. 비로그인이면 `null`. 로그인 시 닉네임·관리자 여부 등 (필드는 §4) | ○ / ○ / ○ |
| **홈 — 피드** | `GET /reviews?sort=recommend` (페이지) | 시향기 카드 목록. 추천순 단일 정렬, 동점 시 최신순 | ○ / ○ / ○ |
| **홈 — 브랜드** | `GET /brands` | 브랜드 전체 목록 (정렬용 이름 기준, 향수 수 포함) | ○ / ○ / ○ |
| **홈 — 계열** | `GET /accords` | 계열 전체 목록 (고정 표시 순서, 향수 수 포함) | ○ / ○ / ○ |
| **검색** | `GET /search?q=` | 향수·브랜드 통합 부분일치 검색 (한글·영문·별칭). **페이지네이션 없음** — `{ perfumes: [상위 5], brands: [상위 5] }` | ○ / ○ / ○ |
| | `GET /perfumes?sort=popular` (페이지) | 입력 전·결과 없음 시 인기 향수 | ○ / ○ / ○ |
| **브랜드 상세** | `GET /brands/{slug}` | 브랜드 정보 (로고·이름·향수 수) | ○ / ○ / ○ |
| | `GET /brands/{slug}/perfumes` (페이지) | 소속 향수 목록 (시향기 수 → 총 추천 수 정렬) | ○ / ○ / ○ |
| **계열 상세** | `GET /accords/{slug}` | 계열 정보 | ○ / ○ / ○ |
| | `GET /accords/{slug}/perfumes` (페이지) | 계열 향수 목록 (브랜드명 병기) | ○ / ○ / ○ |
| **향수 상세** | `GET /perfumes/{slug}` | 향수 정보 (이미지 or 폴백 여부·계열 칩·노트·시향기 수). 로그인 시 `my_review_slug`(내가 이미 쓴 시향기, 없으면 `null`) 포함 — "시향기 쓰기"가 "이미 소개했어요" 안내로 분기하는 근거(ADR 0023) | ○ / ○ / ○ |
| | `GET /perfumes/{slug}/reviews?sort=recommend\|latest` (페이지) | 이 향수의 시향기 목록 (정렬 토글) | ○ / ○ / ○ |
| **시향기 상세** | `GET /reviews/{slug}` | 시향기 전문·프로필 표·작성자·향수 요약. 로그인 시 `my_recommended`·`is_mine` 포함 | ○ / ○ / ○ |
| | `GET /perfumes/{perfume_slug}/reviews?exclude={slug}` (페이지) | "이 향수의 다른 페르소나" (재사용) | ○ / ○ / ○ |
| | `POST /reviews/{slug}/recommendation` | 추천. 화면에서는 본인 글이면 버튼이 비활성이고, 서버는 본인 글 요청을 403으로 막는다(최종 방어선) | ✕ / ○ / ○ |
| | `DELETE /reviews/{slug}/recommendation` | 추천 취소 | ✕ / ○ / ○ |
| | `POST /reviews/{slug}/reports` | 신고 (사유 4종). 게스트 가능 | ○ / ○ / ○ |
| **작성자 프로필** | `GET /users/{code}` | 닉네임·시향기 수·받은 추천 수. 탈퇴 회원은 404 | ○ / ○ / ○ |
| | `GET /users/{code}/reviews` (페이지) | 그 사람의 시향기 목록 (최신순) | ○ / ○ / ○ |
| **이용약관·처리방침** | `GET /policies/{type}` | 현재 시행 중 버전 본문 (`type` = `terms`\|`privacy`) | ○ / ○ / ○ |
| | `GET /policies/{type}/versions` | 버전 목록 (시행일 포함) | ○ / ○ / ○ |
| | `GET /policies/{type}/versions/{version}` | 특정 버전 본문 | ○ / ○ / ○ |
| **도움말** | (API 없음) | 비버전 정적 콘텐츠 — 프론트 정적 페이지 | — |
| **로그인 게이트** | `GET /auth/{provider}/login?trigger=&return_to=` | 소셜 로그인 시작 (공급자 리다이렉트). `trigger`(`write`\|`recommend`\|`my`)는 동의 이력의 동의 경로(`confirmhistory.confirm_route`)에 기록하고, `return_to`는 완료 후 복귀할 화면이다. 복귀 대상·하려던 행동은 저장하지 않고 로그인 요청~완료 사이에만 운반한다(OAuth `state` 등, DB 변경 없음). `return_to`는 서비스 내부 경로만 허용한다(오픈 리다이렉트 방지) | ○ / ✕ / ✕ |
| | (API 없음) `/auth/callback` | 소셜 콜백은 **화면 라우트**가 받는다. 서버가 세션 생성·최초 가입(닉네임 자동 생성)·동의 이력 기록을 처리한 뒤 직전 화면으로 이동한다 | — |

**멤버 전용**

| 화면 | 메서드 + 경로 | 하는 일 | 비로그인 / 회원 / 관리자 |
|---|---|---|---|
| **작성 폼** | `GET /perfumes?q=` (페이지) | 향수 선택 검색. 회원에게는 항목마다 `my_review_slug` 포함 — 이미 쓴 향수는 선택 시 "이미 소개했어요" 안내(ADR 0023) | ○ / ○ / ○ |
| | `GET /tag-questions` | 태그 질문 2종 + 선택지 (표시 순서·최소/최대 개수) | ○ / ○ / ○ |
| | `GET /prompt-cards/random` | 질문 카드 랜덤 1개 | ✕ / ○ / ○ |
| | `GET /placeholders` | 회전 예시 문구 목록 | ✕ / ○ / ○ |
| | `POST /reviews` | 시향기 등록. 같은 향수에 이미 쓴 글이 있으면 409 `ALREADY_REVIEWED`(소프트 삭제분은 세지 않음 — ADR 0023) | ✕ / ○ / ○ |
| | `GET /reviews/{slug}` (재사용) | 수정 모드 기존 값 로드 | ○ / ○ / ○ |
| | `PATCH /reviews/{slug}` | 시향기 수정 (본인만) | ✕ / ○ / ○ |
| **MY** | `GET /me` (재사용) | 닉네임·받은 추천 총합·시향기 수. **개인정보 열람도 이 응답을 확장해 제공**한다 (공급자 구분·가입 시각·최종 로그인 시각·동의 이력). 탈퇴 모달의 "소개한 사람들(N)"도 여기서 | ○ / ○ / ○ |
| | `GET /me/reviews` (페이지) | 내 시향기 목록 (최신순) | ✕ / ○ / ○ |
| | `PATCH /me` | 닉네임 변경 | ✕ / ○ / ○ |
| | `DELETE /reviews/{slug}` | 본인 시향기 삭제 (소프트 삭제) | ✕ / ○ / ○ |
| | `POST /auth/logout` | 로그아웃 | ✕ / ○ / ○ |
| | `DELETE /me` | 회원 탈퇴 (익명화·세션 삭제) | ✕ / ○ / ○ |

**관리자**

| 화면 | 메서드 + 경로 | 하는 일 | 비로그인 / 회원 / 관리자 |
|---|---|---|---|
| **시향기 관리** | `GET /admin/reviews` (페이지) | 전체 목록 (삭제분 포함, 작성자·향수 검색, 정렬, 신고 수) | ✕ / ✕ / ○ |
| | `GET /admin/reviews/{slug}` | 삭제분 포함 단건 조회 | ✕ / ✕ / ○ |
| | `PATCH /admin/reviews/{slug}` | 시향기 수정 | ✕ / ✕ / ○ |
| | `DELETE /admin/reviews/{slug}` | 삭제 (사유 메모 필수, 처리 주체 `관리자` 기록) | ✕ / ✕ / ○ |
| **향수·브랜드 관리** | `GET·POST /admin/brands`, `PATCH·DELETE /admin/brands/{slug}` | 브랜드 목록·등록·수정·삭제. 등록·수정 요청이 로고(`brand.logo`)를 함께 받는다 | ✕ / ✕ / ○ |
| | `GET·POST /admin/perfumes`, `PATCH·DELETE /admin/perfumes/{slug}` | 향수 목록·등록·수정·삭제 (삭제 시 경고용 시향기 수 응답) | ✕ / ✕ / ○ |
| | `PUT /admin/perfumes/{slug}/image` | 이미지 등록·교체 (원본 출처 URL 필수, 수집일 자동, 재수집 금지 대조 경고 포함) | ✕ / ✕ / ○ |
| | `PATCH /admin/perfumes/{slug}/image` | 권리 상태 변경 (정상/이의접수/비공개/영구제거) | ✕ / ✕ / ○ |
| | `POST /admin/brands/{slug}/image-hide` (+ 해제) | 브랜드 단위 이미지 일괄 비공개 | ✕ / ✕ / ○ |
| | `GET /admin/perfumes/{slug}/history` | 최근 등록·수정 이력 (관리자 조치 로그에서 대상=이 향수) | ✕ / ✕ / ○ |
| **신고 관리** | `GET /admin/reports` (페이지) | 신고 목록 (상태 필터, 누적 수). **신고자(회원이면 닉네임·공개 코드, 게스트면 `null`)는 이 응답에만 포함**되며 일반 API에는 나타나지 않는다 | ✕ / ✕ / ○ |
| | `PATCH /admin/reports/{id}` | 처리 (`delete` / `ignore`). `delete`는 시향기 삭제 흐름과 동일. `{id}`는 신고의 내부 id(ADR 0021) | ✕ / ✕ / ○ |

### 2.3 이 절에서 확정된 결정 (2026-10-28)

| 항목 | 결정 |
|---|---|
| 페이지 크기 | 사용자·관리자 목록 모두 기본 10개, 브랜드·계열 목록은 전체 노출 — [ADR 0018](./adr/0018-list-page-size.md) |
| 계열 이름 | 화면 URL·API·DB 모두 `accord`로 통일 (`/accords`, `accord_has_perfume` 등) — [ADR 0019](./adr/0019-accord-naming-unification.md) |
| 추천 취소 | 가능. `DELETE /reviews/{slug}/recommendation` |
| 본인 글 추천 | 화면에서 버튼 비활성(04 §2.8), 서버는 403으로 최종 방어 |
| 신고자 정보 | 관리자 API에서만 노출 |
| 신고 식별자 | 관리자 전용 API라 신고의 내부 id(`{id}`)를 쓰는 예외 — [ADR 0021](./adr/0021-admin-report-id-exception.md) |
| 로그인 콜백 | API가 아니라 화면 라우트 `/auth/callback`이 처리 |
| 운영 문구(질문 카드·placeholder·태그 문구·닉네임 어휘 풀) | MVP는 DB 시드·직접 편집. 관리자 화면·API 없음 (화면 16개 유지) |
| 약관 개정 시 재동의 | **MVP에서는 하지 않는다.** `POST /me/consents`·`pending_consent`·`CONSENT_REQUIRED`는 MVP에 없고, 향후 도입 설계안은 ADR 0020·0022에 보존 — [ADR 0022](./adr/0022-defer-reconsent-from-mvp.md) |
| 개인정보 열람 | `GET /me` 확장으로 제공 (별도 경로 없음) |
| 신고 중복 방지 | 게스트는 브라우저 로컬 + 대상별 총량 한도(ADR 0010), 서버는 총량 초과 시 429. 회원은 (신고자, 대상) 중복을 서버가 409로 막는다 |
| 탈퇴 후 재로그인 | 소셜 식별자가 파기되므로 신규 가입으로 처리. 이전 글은 되찾을 수 없다(04 §4.2 모달이 이미 고지) |
| 소프트 삭제 복구 | **MVP에는 없다.** 관리자·본인 모두 복구 API 없음. 도입하려면 새 ADR (증가 방향 집계 갱신 필요 — ADR 0016) |
| 1인 1향수 1시향기 | 한 사람은 한 향수에 시향기 1개. 중복은 409 `ALREADY_REVIEWED`, 이미 쓴 향수에서 "시향기 쓰기"는 "이미 소개했어요" 안내(수정 화면으로 보내지 않음). 소프트 삭제분은 세지 않아 삭제 후 재작성 가능(가정) — [ADR 0023](./adr/0023-one-review-per-user-per-perfume.md) |
| 검색 응답 | 페이지네이션 없이 섹션별(향수·브랜드) 상위 5개. §1.6의 예외 |
| 로그인 복귀 | `GET /auth/{provider}/login`이 `trigger`·`return_to`를 받는다. 복귀 정보는 저장하지 않으므로 ERD 변경 없음 |
| `GET /policies/current` | **삭제.** 로그인 바텀시트(04 §3)는 약관·처리방침 링크만 보여주고 버전은 표시하지 않는다. 동의 이력의 버전 기록은 서버 내부 처리 |
| 브랜드 로고 | 별도 엔드포인트 없음. `brand.logo`를 `POST·PATCH /admin/brands`가 받는다 |
| 재수집 금지 대조 | 금지 대상(브랜드·제품)을 등록하는 상황은 **발생하지 않는다고 가정**. 대조 경고는 이미지 등록(`PUT .../image`)에만 둔다 |
| `sitemap.xml` | SEO(N6)에 필요하지만 화면 API가 아니다. §3 운영 항목에서 다룬다(삭제분 제외 — ADR 0016) |

### 2.4 ERD 테이블 ↔ API 대응

| 테이블 | API에서의 모습 |
|---|---|
| `brand` · `perfume` · `accord` | 자원으로 노출: `/brands`, `/perfumes`, `/accords` (+ `/admin/*`) |
| `post` | `/reviews` (화면 용어 사용) |
| `user` | `/me`, `/users/{code}`. 내부 id는 숨기고 공개 코드만 사용 |
| `policyversion` | `/policies/{type}/versions` |
| `tagquestion` · `tagselection` | `/tag-questions`. 선택지는 질문 응답에 포함 |
| `taganswer` | `post` 요청·응답의 `tags` 필드에 포함. 선택 순서는 배열 순서 |
| `prompt_card` · `placeholder` | `/prompt-cards/random`, `/placeholders` (조회 전용) |
| `recommendation` | 하위 자원 `/reviews/{slug}/recommendation` (POST·DELETE, 목록 조회 없음) |
| `report` | `/reviews/{slug}/reports`(접수), `/admin/reports`(관리) |
| `perfumeimage` | `perfume` 응답에 포함. 관리자만 `/admin/perfumes/{slug}/image`로 다룸 |
| `accord_has_perfume` | 노출 안 함. 향수 등록·수정 요청의 `accords` 배열로 대체 |
| `adminlog` | 별도 쓰기 API 없음 — 모든 관리자 쓰기의 부수 효과. 읽기는 `/admin/perfumes/{slug}/history` 하나 |
| `confirmhistory` | 별도 경로 없음. 로그인(가입) 처리가 기록하고, `GET /me` 열람에 포함 |
| `forbiddenrestore` | 별도 경로 없음. 이미지 등록 시 서버가 대조해 경고만 응답에 포함 |

테이블과 대응하지 않는 API도 있다: 검색·인기 목록(파생), `my_recommended`·`is_mine`·이미지 폴백 여부(응답 시점 계산값), 세션·인증(`/me`·`/auth/*` — 세션 저장소는 9단계), 탈퇴(`DELETE /me` — 익명화·세션 삭제·파기를 한 번에 일으키는 복합 동작).

### 2.5 열려 있는 것

§2 작성 중 열려 있던 3건(계열 화면 URL, 재동의, 신고 `{id}`)은 모두 확정됐다(§2.3, ADR 0019·0021·0022 — 재동의는 MVP 제외). 남은 일은 §3·§4다.

## 3. 화면에 없는 API 점검

> **상태: ✅ 확정 (2026-10-30).** §2는 화면이 부르는 API의 목록이다. 이 절은 화면에 직접 나타나지 않지만 정책·법무·운영 때문에 필요한 동작을 점검한다.

### 3.1 소셜 로그인 콜백

- 공급자가 돌려보내는 주소는 **화면 라우트 `/auth/callback`**이다(§2.3). 이 화면이 받은 `code`·`state`를 아래 API에 넘긴다.

| 메서드 + 경로 | 하는 일 | 권한 |
|---|---|---|
| `POST /auth/{provider}/callback` | 인가 코드 교환 → 공급자 구분 + 회원번호로 가입 또는 로그인 → 세션 쿠키 발급 → `return_to` 반환 | 비로그인만 |

- 서버는 순서대로 ① `state` 검증 ② 공급자와 코드 교환 ③ 공급자 구분 + 회원번호로 사용자 조회 ④ **없으면 신규 가입**(닉네임 자동 생성, 동의 이력 기록 — §3.2) ⑤ 최종 로그인 시각 갱신 ⑥ 세션 생성·쿠키 발급을 처리한다.
- 공급자가 이메일·프로필 이미지·닉네임을 넘겨도 저장하지 않는다(ADR 0010).
- 실패: `state` 불일치 → 400, 사용자가 공급자 화면에서 취소 → 400 `LOGIN_CANCELLED`. 이미 로그인한 요청은 409.
- **탈퇴 후 재로그인**은 소셜 식별자가 파기되어 있어 항상 신규 가입이 된다(§2.3).
- 관리자 계정은 일반 로그인과 같은 경로로 들어오며, 최초 관리자 지정(`admin_flag`)은 API가 아니라 운영 절차다(관리자 운영 매뉴얼, 10단계 이후).

### 3.2 동의 기록

- **별도 API 없음.** `POST /me/consents`는 MVP에 없다(ADR 0022).
- 신규 가입 때만 `confirmhistory`에 1행을 기록한다 — 현재 시행 중인 약관 버전·처리방침 버전, 동의 시각, 동의 경로(`GET /auth/{provider}/login`의 `trigger` 값: `write`\|`recommend`\|`my`).
- 재로그인에서는 기록하지 않는다. 동의 이력은 탈퇴 시 즉시 파기한다(05 §5.1).

### 3.3 개인정보 열람

- **화면 없이 API로만 제공한다**(2026-10-30 확정). 열람권을 화면 없이 API만으로 충족해도 되는지는 8단계 개인정보처리방침 작성 때 법적으로 확인한다.

| 메서드 + 경로 | 하는 일 |
|---|---|
| `GET /me?include=personal` | 기본 `GET /me` 응답에 공급자 구분·가입 시각·최종 로그인 시각·동의 이력(약관 버전·처리방침 버전·시각·경로)을 추가 |

- `include`가 없는 `GET /me`(모든 화면이 호출)는 가볍게 유지한다 — 동의 이력은 싣지 않는다.
- 정정은 `PATCH /me`(닉네임), 삭제는 회원 탈퇴(§3.4)로 충족한다. 데이터 내려받기 기능은 MVP에 없다.

### 3.4 회원 탈퇴

| 메서드 + 경로 | 하는 일 | 권한 |
|---|---|---|
| `DELETE /me?confirm=true` | 회원 탈퇴 (ADR 0008) | 회원·관리자 |

한 트랜잭션에서 아래를 처리한다.

1. 계정 상태를 `탈퇴`로 바꾸고 탈퇴 시각을 기록한다.
2. 익명 표시명 `user_NNNNNN`을 발급한다. 원본 id에서 유도하지 않는 난수이며, 중복이면 다시 뽑는다.
3. 공급자 구분·공급자 회원번호·닉네임·동의 이력·최종 로그인 시각을 **즉시 파기**한다(복구 불가).
4. 해당 사용자의 세션을 모두 삭제한다.

- 응답은 204이고 세션 쿠키를 만료시킨다. 이후 같은 쿠키의 요청은 401이다.
- 시향기·추천은 **그대로 보존**한다. 작성자 표시만 익명 표시명으로 바뀌며, 집계(`perfume.post_count`·`total_recommend_count` 등)는 변하지 않는다. 탈퇴자 프로필(`/users/{code}`)은 404다.
- `confirm=true`가 없으면 400 `CONFIRMATION_REQUIRED`다. 화면의 체크박스(04 §4.2)를 서버가 한 번 더 확인하는 안전장치이며, 쿼리에 민감 정보는 없다(§1.2).
- 관리자 계정도 같은 절차다. 관리자 조치 로그의 관리자 참조는 익명화된 계정을 계속 가리킨다.
- 이미 소프트 삭제 보관 중인 본인 글은 탈퇴와 무관하게 기존 보관기간 뒤 완전 삭제된다(ADR 0008·0011은 독립 메커니즘).

### 3.5 신고 접수

§2의 `POST /reviews/{slug}/reports`에 아래 규칙을 정한다.

| 규칙 | 내용 |
|---|---|
| 사유 | 4종 — 허위 정보 / 비방·혐오 / 스팸·광고 / 기타 (04 §2.8) |
| 게스트 | 가능. 신고자 IP를 저장하지 않으므로(ADR 0010) 브라우저 로컬 + 대상별 총량 한도로 막고, 총량을 넘으면 429 |
| 회원 중복 | (신고자, 대상) 중복은 409 `ALREADY_REPORTED` |
| **본인 글** | 로그인한 작성자가 자기 글을 신고하면 **403 `CANNOT_REPORT_OWN_REVIEW`** (2026-10-30 확정) |
| 자동 처리 | 없음. 신고가 쌓여도 자동 숨김하지 않고 관리자가 수동으로 처리한다(ADR 0010) |
| 갱신 대상 | `post.report_count` 증가(ADR 0016). 소프트 삭제분은 404 |

- **권리 침해 신고(이미지·상표)는 API가 없다.** 이메일로 접수하고(`docs/legal/image-rights-and-takedown.md`), 처리는 관리자가 §3.6의 이미지 상태 변경으로 한다.

### 3.6 이미지 비공개와 이의 접수 이력

| 메서드 + 경로 | 하는 일 |
|---|---|
| `PATCH /admin/perfumes/{slug}/image` | 권리 상태 변경 — 정상 / 이의접수 / 비공개 / 영구제거 |
| `POST /admin/brands/{slug}/image-hide` | 브랜드 단위 이미지 일괄 비공개 |
| `DELETE /admin/brands/{slug}/image-hide` | 일괄 비공개 해제 |

- 상태 변경 요청은 **사유 메모(`reason_memo`)를 필수**로 받는다. 변경자·변경 시각은 서버가 자동 기록하고, 관리자 조치 로그(E15)에 남긴다.
- **이의 접수 이력은 MVP에서 `reason_memo`에 적는다**(2026-10-30 확정). 접수일·접수 경로·대상 범위·조치 내용을 메모에 쓰는 규칙은 관리자 운영 매뉴얼에 둔다. 24시간 회신·72시간 조치 목표(ADR 0009 §4)를 집계할 필요가 생기면 별도 이력 테이블을 추가한다(ERD 변경 + 새 ADR).
- 효과: 비공개·영구제거·브랜드 일괄 비공개가 되면 향수가 나오는 **모든 응답의 `image`가 `null`**이 되어 화면이 텍스트 카드 폴백으로 전환된다(05 §6.3). 영구제거는 되돌릴 수 없다.
- **즉시 제거가 목적이므로 이미지 CDN·브라우저 캐시 무효화**가 필요하다. 구체 방식은 9단계 요구사항이다.

### 3.7 운영 배치

HTTP API로 노출하지 않는 내부 작업이다. 이 절은 목록·주기·대상만 정하고, 실행 방식(스케줄러)과 구현은 9~10단계다.

| 작업 | 주기 | 대상 | 근거 |
|---|---|---|---|
| 본인 삭제 시향기 완전 삭제 | 일 1회 | 소프트 삭제 후 30일 경과 | ADR 0011 §3 |
| 관리자 삭제 시향기 완전 삭제 | 일 1회 | 소프트 삭제 후 1년 경과 | ADR 0011 §3 |
| 신고 기록 삭제 | 일 1회 | 처리 완료 후 1년 경과 | 05 §5.3 |
| 관리자 조치 로그 삭제 | 일 1회 | 3년 경과 | 05 §5.3 |
| 집계 컬럼 보정 | 일 1회 | 6종 집계 컬럼과 실제 `COUNT` 비교·교정 | ADR 0016 |
| 만료 세션 정리 | 주기 미정 | 세션 저장소 | 9단계 |
| 인프라 접속 로그 삭제 | 9·10단계 | 보관기간 경과분 | 05 §5.1 |

- 완전 삭제는 소프트 삭제 시점에 이미 집계가 줄었으므로 집계에 영향이 없다. 시향기를 지울 때 그 글에 달린 추천·신고도 함께 지운다.
- 배치가 HTTP 호출을 요구하는 환경이면(9단계 결과에 따라) 서비스 인증을 쓰는 내부 경로를 따로 정한다. 공개 API 명세에는 넣지 않는다.

### 3.8 SEO (`sitemap.xml`·`robots.txt`)

- 새 API가 없다. 웹 계층이 기존 목록 API를 순회해 `sitemap.xml`을 만든다. MVP 규모(향수 100~300개)에서 충분하고, 규모가 커져 비효율이 되면 새 ADR로 다룬다.
- 포함: 홈·브랜드·계열·향수·시향기·정책 페이지. 제외: 소프트 삭제분, 탈퇴자 프로필, 관리자 화면.
- `robots.txt`는 `/api`와 `/admin`을 차단한다. 정책 페이지의 `noindex` 여부는 8~9단계에서 정한다(04 §2.10).

### 3.9 이 절에서 확정된 결정 (2026-10-30)

| 항목 | 결정 |
|---|---|
| 개인정보 열람 | 화면 없이 `GET /me?include=personal` API로만 제공. 처리방침 작성 시 법적 확인 |
| 본인 글 신고 | 막는다. 403 `CANNOT_REPORT_OWN_REVIEW` |
| 이의 접수 이력 | MVP에서는 `reason_memo`에 기록. 별도 테이블은 필요해질 때 |
| 관리자 차단 | **MVP에 없다.** §1.3의 세션 삭제 대상은 탈퇴뿐이다 |
| 탈퇴 확인 | `DELETE /me?confirm=true`, 없으면 400 `CONFIRMATION_REQUIRED` |
| 로그인 콜백 | `/auth/callback` 화면 → `POST /auth/{provider}/callback` |

## 4. 엔드포인트별 계약

> **상태: ✅ 확정 (2026-11-04)** — §4.1 공통 스키마·§4.2 열람 API(2026-10-30), §4.3 회원 API·§4.4 관리자 API·§4.5 에러 코드 총정리·§4.6 집계 갱신표(2026-11-04, 시연 페이지 `ppt/index.html`과 02 유저스토리 대조). 이 절에서 새로 정한 결정은 §4.3.8·§4.4.7에 모았다. 사용자가 "권고안대로 완성"을 지시해(2026-11-04) 전부 권고안으로 확정했다.

### 4.0 읽는 법

- 경로 앞의 `/api/v1`은 생략한다. 권한은 §2의 **비로그인 / 회원 / 관리자** 순서이며, 이 절의 열람 API는 모두 ○ / ○ / ○ 이다.
- 목록의 `page`·`size`는 §1.6을 따른다. `page`가 `total_pages`를 넘으면 에러가 아니라 `items: []`로 응답한다(§1.7 빈 목록 규칙).
- **소프트 삭제분**(ADR 0011)은 모든 열람 응답과 집계에서 제외한다. 직접 조회하면 404다(§1.4).
- 열람 API는 집계 컬럼을 갱신하지 않는다. 갱신 대상은 쓰기 API에서 명시한다(§4.6).
- 오류는 §1.5 형식이다. 이 절의 에러 코드는 §4.5에서 한 표로 모은다.

### 4.1 공통 스키마

필드 이름은 `snake_case`, 시각은 ISO 8601(+09:00)이다(§1.7). 식별자는 ADR 0005·0012의 슬러그·랜덤 코드이고 내부 순차 id는 쓰지 않는다.

| 이름 | 모양 | 규칙 |
|---|---|---|
| `Image` | `{ "url": string, "alt": string }` 또는 `null` | `null`이면 화면이 텍스트 카드로 폴백한다. **이미지가 없거나, 권리 상태가 `정상`이 아니거나, 소속 브랜드가 일괄 비공개면 서버가 `null`로 내려준다**(05 §6.3). 향수가 나오는 모든 응답에 같은 규칙을 적용한다 |
| `BrandRef` | `{ "slug": string, "name": string }` | |
| `AccordRef` | `{ "slug": string, "name": string }` | |
| `PerfumeRef` | `{ "slug", "name", "brand": BrandRef, "image": Image }` | 카드·시향기 상세 요약용 최소형 |
| `PerfumeSummary` | `PerfumeRef` + `post_count`, `total_recommend_count`, `my_review_slug` | `my_review_slug`: 회원이 이 향수에 이미 쓴 시향기의 슬러그. 게스트이거나 안 썼으면 `null`(ADR 0023). 소프트 삭제분은 세지 않는다 |
| `Author` | `{ "code": string \| null, "nickname": string }` | 탈퇴 회원은 `code: null`, `nickname: "user_NNNNNN"`. `code`가 `null`이면 화면이 링크를 걸지 않는다(03 §3) |
| `Tag` | `{ "question_code", "code", "label" }` | 질문·선택지 코드는 `tagquestion.code`·`tagselection.code`의 값이며, 의미를 해석하지 않는 불투명한 식별자로 쓴다 |
| `ReviewCard` | `{ "slug", "content", "perfume": PerfumeRef, "tags": Tag[], "author": Author, "recommend_count": int, "created_at" }` | `tags`는 **대표 태그**다 — 나이대 1개 + 성격 1개, 각각 사용자가 먼저 고른 것(`taganswer.selection_sequence`, ADR 0013). 카드는 변형 A·B 구분 없이 항상 `perfume`을 포함하고, 화면이 변형 B에서 숨긴다 |
| `ReviewDetail` | `ReviewCard` + `{ "profile": ProfileRow[], "updated_at", "my_recommended": bool, "is_mine": bool }` | `ProfileRow` = `{ "question": { "code", "label" }, "answers": [ { "code", "label" } ] }` — "이 사람의 프로필" 표. `answers`는 고른 순서. 게스트의 `my_recommended`·`is_mine`은 `false` |
| `Page<T>` | `{ "items": T[], "page", "size", "total_items", "total_pages" }` | §1.6 |
| `List<T>` | `{ "items": T[] }` | 페이지네이션 없는 목록(브랜드·계열) |

### 4.2 열람 API

**피드·탐색**

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /reviews` | `sort`(`recommend`, 기본·유일), `page`, `size` | `Page<ReviewCard>` — 추천 수 내림차순, 동점은 최신순 | 400 `INVALID_PARAMETER`(허용 안 되는 `sort` 등) |
| `GET /brands` | — | `List<BrandSummary>` — 정렬용 이름(`name_align`) 순 | — |
| `GET /accords` | — | `List<AccordSummary>` — 고정 표시 순서(`display_sequence`) | — |
| `GET /search` | `q`(필수) | `{ "perfumes": PerfumeSummary[≤5], "brands": BrandSummary[≤5] }` — 페이지네이션 없음(§1.6) | 400 `INVALID_PARAMETER`(`q`가 비었거나 50자 초과) |
| `GET /perfumes` | `q`(선택), `sort`(`popular`, 기본·유일), `page`, `size` | `Page<PerfumeSummary>` | 400 `INVALID_PARAMETER` |

- `BrandSummary` = `{ "slug", "name", "logo": Image, "group": string, "perfume_count": int }`. `logo`는 같은 `Image` 모양이며 `alt`는 "{브랜드명} 로고"로 자동 생성한다. `group`은 화면 섹션 헤더로, 한글 브랜드는 초성("ㄱ"·"ㄷ"…), 영문은 대문자 한 글자("A")다. 서버가 계산해 내려주므로 화면이 초성을 직접 계산하지 않는다.
- `AccordSummary` = `{ "slug", "name", "perfume_count": int }`.
- **검색 규칙**: `q`는 앞뒤 공백을 제거한 뒤 1~50자다. 한글명·원어명·검색용 별칭에 대해 대소문자 무시 부분일치로 찾는다. 결과 순서는 **이름이 `q`로 시작하는 것을 먼저, 그다음 인기순**이다. 검색어가 비어 있으면 400이며, 화면은 그때 `GET /perfumes?sort=popular`로 인기 향수를 보여준다. 결과가 없으면 두 배열 모두 `[]`이다(에러가 아님).
- **`GET /perfumes`의 `q`**: 작성 폼의 향수 선택용이다. 같은 부분일치 규칙을 쓰고 `q`가 없으면 전체 목록이다. 회원에게는 항목마다 `my_review_slug`가 채워진다.
- **인기(`popular`) 순서**: 시향기 수(`post_count`) 내림차순 → 총 추천 수(`total_recommend_count`) 내림차순 → 이름 오름차순. 브랜드·계열 상세의 향수 목록도 같은 순서다.

**브랜드·계열 상세**

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /brands/{slug}` | — | `BrandSummary`에서 `group`을 뺀 형태 `{ "slug", "name", "logo", "perfume_count" }` | 404 `BRAND_NOT_FOUND` |
| `GET /brands/{slug}/perfumes` | `page`, `size` | `Page<PerfumeSummary>` — 인기 순서 | 404 `BRAND_NOT_FOUND` |
| `GET /accords/{slug}` | — | `AccordSummary` | 404 `ACCORD_NOT_FOUND` |
| `GET /accords/{slug}/perfumes` | `page`, `size` | `Page<PerfumeSummary>` — 인기 순서. 계열 문맥이라 화면이 브랜드명을 병기한다(`brand`는 항상 포함) | 404 `ACCORD_NOT_FOUND` |

**향수 상세**

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /perfumes/{slug}` | — | `PerfumeDetail` | 404 `PERFUME_NOT_FOUND` |
| `GET /perfumes/{slug}/reviews` | `sort`(`recommend`\|`latest`, 기본 `recommend`), `exclude`(시향기 슬러그, 선택), `page`, `size` | `Page<ReviewCard>` | 404 `PERFUME_NOT_FOUND`, 400 `INVALID_PARAMETER` |

- `PerfumeDetail` = `PerfumeSummary` + `{ "name_original": string \| null, "notes": string \| null, "accords": AccordRef[] }`. `notes`는 ERD가 한 칸의 문자열이라 `"장미, 리치, 머스크"` 그대로 내려주며 배열로 나누지 않는다. 외부 구매 링크는 MVP에서 응답에 넣지 않는다(N12). 시향기가 0개면 화면이 빈 상태 문구를 보여준다 — `post_count: 0`.
- 시향기 목록의 `recommend` 순서는 추천 수 내림차순, 동점은 최신순이고 `latest`는 작성 시각 내림차순이다. 두 정렬 모두 목록 전체에 적용된다(04 §2.7).
- `exclude`는 시향기 상세 화면의 "이 향수의 다른 페르소나"용이다. 지정한 시향기를 목록과 `total_items`에서 뺀다. 존재하지 않는 슬러그면 무시하고, 에러로 응답하지 않는다.

**시향기·작성자**

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /reviews/{slug}` | — | `ReviewDetail`. 로그인하면 `my_recommended`·`is_mine`이 채워진다 | 404 `REVIEW_NOT_FOUND`(없는 글·소프트 삭제분 모두) |
| `GET /users/{code}` | — | `{ "code", "nickname", "post_count", "received_recommend_count" }` | 404 `USER_NOT_FOUND`(없는 코드·**탈퇴 회원**) |
| `GET /users/{code}/reviews` | `page`, `size` | `Page<ReviewCard>` — 최신순 | 404 `USER_NOT_FOUND` |

- 작성자가 탈퇴한 시향기도 목록과 상세에 그대로 나타난다. `author`만 `{ code: null, nickname: "user_NNNNNN" }`로 바뀐다(ADR 0008).
- 수정 모드 진입(작성 폼)은 `GET /reviews/{slug}`를 재사용한다. 응답의 `profile`·`tags`로 기존 값을 채우고, 본인 글 여부는 `is_mine`으로 판단한다.

**정책·태그 질문**

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /policies/{type}` | `type` = `terms`\|`privacy` | `PolicyDocument` — 현재 시행 중인 버전 | 404 `POLICY_NOT_FOUND`(`type`이 틀렸거나 시행 중인 버전이 없음) |
| `GET /policies/{type}/versions` | — | `List<PolicyVersionSummary>` — 시행일 내림차순 | 404 `POLICY_NOT_FOUND` |
| `GET /policies/{type}/versions/{version}` | — | `PolicyDocument` | 404 `POLICY_NOT_FOUND` |
| `GET /tag-questions` | — | `List<TagQuestion>` — 표시 순서 | — |

- `PolicyVersionSummary` = `{ "version", "start_date", "post_date", "status": "scheduled"\|"current"\|"past" }`. 시행일 전에 게시된 버전은 `scheduled`다(F2 AC 약관 개정 사전 공지).
- `PolicyDocument` = `PolicyVersionSummary` + `{ "type", "content": string }`.
- `TagQuestion` = `{ "code", "label", "min": int, "max": int, "choices": [ { "code", "label" } ] }`. 활성(`active`)인 선택지만, 표시 순서대로 내려준다. `min`·`max`는 ERD의 `select_min_max` 한 칸을 둘로 나눈 값이다.

### 4.3 회원 API (로그인·내 정보·시향기 쓰기·추천·신고)

> **상태: ✅ 확정 (2026-11-04).** 근거: 02 유저스토리 C1·C2·D1~D3·E3·F1·F3, `ppt/index.html` 시연 흐름(§4.3.7에 대조표). 새로 정한 결정은 §4.3.8에 모았다.

- 권한 표기는 **비로그인 / 회원 / 관리자** 순서다(§2). 관리자는 회원의 상위 역할이므로 회원 API를 그대로 쓸 수 있지만, **남의 글을 고치거나 지우는 일은 `/admin/*`에서만** 한다.
- 로그인이 필요한 요청을 비로그인이 보내면 401 `LOGIN_REQUIRED`다(§1.4). 쓰기 요청의 CSRF 검증에 실패하면 403 `CSRF_INVALID`다.
- 소프트 삭제된 시향기를 대상으로 하는 모든 요청은 404 `REVIEW_NOT_FOUND`다(§1.4).

#### 4.3.1 공통 스키마 (회원)

| 이름 | 모양 | 규칙 |
|---|---|---|
| `Me` | `{ "code", "nickname", "is_admin": bool, "post_count": int, "received_recommend_count": int }` | `code`는 내 공개 프로필 코드(`/users/{code}` 링크용). 탈퇴 모달의 "소개한 사람들(N)"은 `post_count`다 |
| `MePersonal` | `Me` + `{ "personal": { "provider", "joined_at", "last_login_at", "consents": [ { "terms_version", "privacy_version", "agreed_at", "route" } ] } }` | `GET /me?include=personal`에서만. `provider` = `kakao`\|`naver`\|`google` 중 가입한 곳, `route` = `write`\|`recommend`\|`my`. 이메일·프로필 이미지는 애초에 저장하지 않는다(ADR 0010) |
| `TagAnswer` | `{ "question_code": string, "choice_codes": string[] }` | 쓰기 요청용. `choice_codes`의 **배열 순서가 선택 순서**(`taganswer.selection_sequence`)다. 대표 태그 판정(ADR 0013)이 이 순서를 쓴다 |
| `MyReviewCard` | `ReviewCard` + `{ "updated_at" }` | `GET /me/reviews`의 항목. 수정·삭제 버튼은 화면이 항상 노출하므로 `is_mine`은 싣지 않는다 |
| `RecommendState` | `{ "recommend_count": int, "my_recommended": bool }` | 추천·추천 취소의 응답. 화면이 카운트를 즉시 반영하는 근거 |

#### 4.3.2 로그인·로그아웃

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /auth/{provider}/login` | `provider`(`kakao`\|`naver`\|`google`), `trigger`(`write`\|`recommend`\|`my`, 선택), `return_to`(서비스 내부 경로, 선택) | **302** 공급자 인증 화면. `trigger`·`return_to`는 OAuth `state`에 실어 운반하고 저장하지 않는다 | 400 `INVALID_PARAMETER`(없는 공급자·`trigger`·외부 주소 `return_to`), 409 `ALREADY_LOGGED_IN` |
| `POST /auth/{provider}/callback` | `{ "code": string, "state": string }` — 사용자가 취소했으면 `code` 대신 `{ "error": string, "state": string }` | 200 `{ "me": Me, "is_new_user": bool, "trigger": string \| null, "return_to": string \| null }` + 세션 쿠키 | 400 `INVALID_STATE`, 400 `LOGIN_CANCELLED`, 409 `ALREADY_LOGGED_IN`, 502 `PROVIDER_ERROR` |
| `POST /auth/logout` | — | 204, 세션 삭제·쿠키 만료 | 401 `LOGIN_REQUIRED` |

- 처리 순서와 가입·동의 이력 기록은 §3.1·§3.2가 정한 대로다. `is_new_user`는 화면이 "닉네임이 자동으로 정해졌어요, 바꿀 수 있어요" 안내(C1)를 보여줄지 판단하는 값이다.
- `provider`는 시연에서 3종을 보였다. **C1은 공급자 1개(카카오 우선)로 시작한다고 정했으므로**, 9단계에서 공급자가 정해지면 이 열거를 줄인다.
- **로그인 후 하려던 행동은 서버가 대신 실행하지 않는다.** 복귀 정보를 저장하지 않는 원칙(§2.3) 때문이다. 화면이 콜백 응답의 `trigger`·`return_to`로 복귀한 뒤 이어서 호출한다.
  - 추천을 누르려던 경우: `return_to`는 그 시향기 상세이고, 화면이 `POST /reviews/{slug}/recommendation`을 이어서 호출한다. 이미 추천한 상태였다면 409 `ALREADY_RECOMMENDED`가 오는데, 화면은 **성공으로 취급**한다.
  - 시향기 쓰기를 누르려던 경우: `return_to`는 향수가 지정된 작성 화면(예: `/write?perfume={slug}`)이다. 서버 호출은 없고, 화면이 §4.2의 `GET /perfumes/{slug}`로 `my_review_slug`를 확인한다.
- 로그아웃 시 화면이 작성 중이던 임시저장 내용을 지운다(시연과 동일). 임시저장은 §4.3.5 참조.

#### 4.3.3 내 정보

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /me` | `include=personal`(선택) | 비로그인이면 200 `null`. 로그인이면 `Me`, `include=personal`이면 `MePersonal` | 400 `INVALID_PARAMETER`(알 수 없는 `include` 값) |
| `PATCH /me` | `{ "nickname": string }` | 200 `Me` | 401 `LOGIN_REQUIRED`, 400 `NICKNAME_INVALID`, 400 `NICKNAME_RESERVED`, 409 `NICKNAME_TAKEN` |
| `GET /me/reviews` | `page`, `size` | 200 `Page<MyReviewCard>` — 최신순 | 401 `LOGIN_REQUIRED` |
| `DELETE /me` | `confirm=true` | 204, 세션 쿠키 만료 (§3.4) | 401 `LOGIN_REQUIRED`, 400 `CONFIRMATION_REQUIRED` |

- **닉네임 규칙**(확정 사항): 앞뒤 공백을 제거한 뒤 2~12자, 한글·영문·숫자·공백만 허용한다. `user_` 접두사는 익명 표시명 전용이라 대소문자 구분 없이 금지한다(ADR 0008·0012).
  - 형식 위반 → 400 `NICKNAME_INVALID`(`fields.nickname`에 사유), `user_` 접두사 → 400 `NICKNAME_RESERVED`, 다른 사람이 쓰는 닉네임 → 409 `NICKNAME_TAKEN`. 내 현재 닉네임과 같은 값은 200으로 그대로 응답한다.
  - 금칙어(욕설) 필터는 MVP에 두지 않는다. 도입하려면 AI가 아닌 고정 목록 방식으로, 새 결정을 거친다.
- `GET /me`는 모든 화면이 호출하므로 가볍게 유지한다(§3.3). 탈퇴 직후에는 세션이 없으므로 `null`이다.
- `DELETE /me`의 처리는 §3.4가 정한 대로이며, 갱신하는 집계는 없다(§4.6).

#### 4.3.4 시향기 쓰기·수정·삭제

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `POST /reviews` | `{ "perfume_slug": string, "content": string, "tags": TagAnswer[] }` | **201** `ReviewDetail` + `Location: /api/v1/reviews/{slug}` | 401 `LOGIN_REQUIRED`, 400 `TEXT_REQUIRED`·`TEXT_TOO_LONG`·`TAG_REQUIRED`·`TAG_TOO_MANY`·`TAG_INVALID`, 404 `PERFUME_NOT_FOUND`, 409 `ALREADY_REVIEWED`, 429 `RATE_LIMITED` |
| `PATCH /reviews/{slug}` | `{ "content"?: string, "tags"?: TagAnswer[] }` — 하나 이상 필수 | 200 `ReviewDetail` | 401 `LOGIN_REQUIRED`, 403 `NOT_REVIEW_OWNER`, 404 `REVIEW_NOT_FOUND`, 400 (위 입력 검증 코드, `perfume_slug` 등 허용되지 않는 필드는 `INVALID_PARAMETER`), 429 `RATE_LIMITED` |
| `DELETE /reviews/{slug}` | — | 204 | 401 `LOGIN_REQUIRED`, 403 `NOT_REVIEW_OWNER`, 404 `REVIEW_NOT_FOUND` |
| `GET /tag-questions` | (§4.2 재사용) | 작성 폼이 질문·선택지·`min`·`max`를 이 응답으로 그린다 | — |

**입력 검증**

| 항목 | 규칙 | 실패 시 |
|---|---|---|
| `content` | 앞뒤 공백 제거 후 **1~100자**(유니코드 문자 기준). 줄바꿈은 허용하지 않고 공백 하나로 바꾼다 | 비었으면 400 `TEXT_REQUIRED`, 넘으면 400 `TEXT_TOO_LONG`(`fields.content`) |
| `tags` | `GET /tag-questions`의 **질문 2종을 한 번씩 모두** 포함. 질문마다 선택 개수가 `min`~`max`(현재 1~3개)이고, 중복 없이 그 질문의 활성 선택지여야 한다 | 질문 누락·`min` 미달은 400 `TAG_REQUIRED`, `max` 초과는 400 `TAG_TOO_MANY`, 없는 코드·다른 질문의 선택지·비활성·중복은 400 `TAG_INVALID` (`fields.tags`에 질문 코드별 사유) |
| `perfume_slug` | 존재하는 향수 | 404 `PERFUME_NOT_FOUND` |

- 화면의 "부족한 항목: 나이대 · 성격" 안내(시연의 `missing()`)는 클라이언트 검증이 먼저 막고, 서버는 최종 방어선이다. 서버의 `fields`가 같은 항목명을 가리키면 화면이 같은 위치로 스크롤할 수 있다.
- **중복 작성**(ADR 0023): 같은 사용자가 같은 향수에 소프트 삭제되지 않은 시향기를 이미 가졌으면 409 `ALREADY_REVIEWED`. 화면은 이 호출에 앞서 `my_review_slug`로 이미 안내했을 것이므로 동시 요청·우회에 대한 최종 방어선이다. 동시에 두 요청이 들어와도 한 건만 만들어지도록 서버가 보장해야 한다(소프트 삭제 제외 조건 때문에 단순 유니크 제약이 불가능 — ADR 0023, 구현은 9~10단계).
- **작성자는 세션에서 정한다.** 요청 본문의 작성자 정보는 받지 않는다.
- **수정 시 향수는 바꿀 수 없다**(04 §3.2). 수정 화면은 향수 "변경" 버튼을 숨긴다. `tags`를 보내면 **전체를 교체**하며(부분 병합 아님) 같은 검증을 거친다. `updated_at`만 갱신하고 슬러그·추천 수·작성 시각은 그대로다.
- **삭제**는 소프트 삭제 + 처리 주체 `본인`이다(ADR 0011). 본인 삭제에는 사유 메모를 받지 않는다. 삭제 즉시 모든 목록·상세에서 사라지며(보관 30일), 삭제 후 같은 향수에 새로 쓸 수 있다(ADR 0023, 가정). 같은 글을 다시 삭제하면 404다.
- 탈퇴한 사용자의 글은 어떤 회원도 수정·삭제할 수 없다 — 작성자와 세션 사용자가 일치할 수 없어 403 `NOT_REVIEW_OWNER`다. 관리자만 처리한다(F3).

#### 4.3.5 작성 보조 (질문 카드·placeholder·임시저장)

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /prompt-cards/random` | `exclude`(직전에 받은 카드의 `code`, 선택) | 200 `{ "code": string, "text": string }` | 401 `LOGIN_REQUIRED` |
| `GET /placeholders` | — | 200 `{ "items": [ { "text": string } ] }` — 표시 순서대로 | 401 `LOGIN_REQUIRED` |

- 질문 카드는 **사람이 쓴 고정 문구 풀**에서만 뽑는다(무-AI 정책). `exclude`는 같은 카드가 연속으로 나오지 않게 하는 용도이며, 풀에 카드가 하나뿐이면 그 카드를 그대로 돌려준다. `code`는 의미를 해석하지 않는 불투명한 식별자다.
- placeholder 목록은 작성 폼이 열릴 때 한 번 받아 화면이 일정 간격으로 돌려 보여준다(시연은 3.5초). 입력창이 비어 있을 때만 노출한다.
- **임시저장 API는 없다.** 작성 중 내용(향수·서술·태그)의 임시저장(D1 AC)은 브라우저 안에서만 처리한다. 서버에 초안을 두면 저장 항목·보관기간·파기 대상이 늘어나고(ADR 0010), 한 페이지 폼의 입력량이 작아 이득이 적다. 로그아웃·탈퇴 때 화면이 지운다.

#### 4.3.6 추천·신고

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `POST /reviews/{slug}/recommendation` | — | 200 `RecommendState` (`my_recommended: true`) | 401 `LOGIN_REQUIRED`, 403 `CANNOT_RECOMMEND_OWN_REVIEW`, 404 `REVIEW_NOT_FOUND`, 409 `ALREADY_RECOMMENDED` |
| `DELETE /reviews/{slug}/recommendation` | — | 200 `RecommendState` (`my_recommended: false`) | 401 `LOGIN_REQUIRED`, 404 `REVIEW_NOT_FOUND`, 409 `NOT_RECOMMENDED` |
| `POST /reviews/{slug}/reports` | `{ "reason": "misinformation" \| "hate" \| "spam" \| "other" }` | 204 | 400 `INVALID_PARAMETER`, 403 `CANNOT_REPORT_OWN_REVIEW`, 404 `REVIEW_NOT_FOUND`, 409 `ALREADY_REPORTED`, 429 `REPORT_LIMIT_EXCEEDED` |

- **추천은 토글이 아니다.** 시연 화면은 버튼 하나로 켜고 끄지만, API는 `POST`와 `DELETE`가 분리돼 있다. 화면은 상세 응답의 `my_recommended`를 보고 둘 중 하나를 호출한다. 동시에 두 번 눌러도 (사용자, 시향기) 쌍은 하나만 생기도록 서버가 막는다(409).
- 응답의 `recommend_count`로 화면이 숫자를 즉시 갱신한다(C2 AC).
- 신고 사유 4종은 허위 정보(`misinformation`) / 비방·혐오(`hate`) / 스팸·광고(`spam`) / 기타(`other`)다. 자유 서술은 받지 않는다(05 §2.8). 신고자가 로그인했으면 신고에 신고자 참조가 붙고 아니면 없다. **신고자 IP는 저장하지 않는다**(ADR 0010). 응답에 신고 수·처리 상태는 싣지 않는다.
- 게스트 중복·총량 제한은 §3.5를 따른다. 총량 초과는 429 `REPORT_LIMIT_EXCEEDED`이며 한도 수치는 구현 단계에서 정한다. 시연의 "이미 신고했어요(브라우저 로컬)"는 이 서버 검사에 앞선 화면 쪽 1차 방어다.
- 게스트도 호출하므로 세션이 없다. 남용은 요청 한도(429)와 관리자 수동 처리로 막는다.

#### 4.3.7 시연 페이지(`ppt/index.html`)와의 대조

시연이 보여준 화면 동작이 위 API로 모두 충족되는지 확인했다.

| 시연 동작 | 대응 API |
|---|---|
| 로그인 바텀시트(공급자 버튼 3종, 동의 고지) → 복귀 | `GET /auth/{provider}/login` → `POST /auth/{provider}/callback`(§4.3.2) |
| 로그인 후 추천이 자동 반영 / 빈 작성 화면 진입 | 화면이 `return_to`로 복귀 후 `POST …/recommendation` 호출 / 서버 호출 없음 |
| "시향기 쓰기" → 이미 쓴 향수면 "이미 소개했어요" 모달 → "내 글 보기" | `GET /perfumes/{slug}`·`GET /perfumes?q=`의 `my_review_slug`(§4.2) |
| 작성 폼의 향수 검색(최대 8개 표시), "변경" 버튼 | `GET /perfumes?q=` — `size=8`로 호출해도 된다 |
| 서술 100자 카운터, placeholder 회전, 질문 카드 말풍선 | 클라이언트 + `GET /placeholders`·`GET /prompt-cards/random` |
| 나이대(5) · 성격(12) 칩, 각 1~3개 | `GET /tag-questions`가 선택지·`min`·`max`를 내려준다. 화면은 문구를 하드코딩하지 않는다 |
| 등록 → 시향기 상세로 이동, 피드·향수 상세에 즉시 노출 | `POST /reviews` 201의 `Location` → `GET /reviews/{slug}` |
| 수정 모드(향수 고정, "수정 완료") | `GET /reviews/{slug}` → `PATCH /reviews/{slug}` |
| 시향기 삭제 확인 모달 → 목록에서 사라짐 | `DELETE /reviews/{slug}` |
| 추천 / 추천 취소(버튼 하나) | `POST` / `DELETE …/recommendation` |
| 신고 사유 선택 → "신고가 접수됐어요" | `POST /reviews/{slug}/reports` |
| 탈퇴 회원 글: 표시명 `user_NNNNNN`, 링크 없음, 프로필 404 | `Author.code: null`(§4.1), `GET /users/{code}` 404 |
| MY: 닉네임 변경(최대 12자), 받은 추천, 내 목록, 로그아웃, 탈퇴 | `PATCH /me`, `GET /me`, `GET /me/reviews`, `POST /auth/logout`, `DELETE /me` |
| 프로필: "소개한 사람"·"받은 추천" | `GET /users/{code}`의 `post_count`·`received_recommend_count` |
| 정책 3종 화면 | `GET /policies/{type}`(약관·처리방침), 도움말은 정적 |

시연과 명세가 **어긋나는 곳**은 다음 세 가지이며, 모두 명세 쪽이 맞다(시연은 단순화).

1. 시연의 추천은 버튼 하나의 토글이지만 API는 `POST`·`DELETE` 분리다(§4.3.6).
2. 시연은 공급자 3종을 보이지만 C1은 1개로 시작한다(§4.3.2).
3. 시연은 임시저장을 상태 객체에만 두는데, 실제 구현에서도 서버 API 없이 브라우저 저장소를 쓴다(§4.3.5) — 브라우저 저장소는 지워질 수 있으므로 "복원 보장"이 아니라 "가능한 한 복원"이다.

#### 4.3.8 이 절에서 새로 정한 결정 (확정)

| 항목 | 제안 | 이유 |
|---|---|---|
| 로그인 후 행동 재개 | 서버는 실행하지 않고 화면이 `return_to` 복귀 뒤 이어서 호출. 이미 추천한 409는 화면이 성공으로 취급 | 복귀 정보를 저장하지 않는 원칙(§2.3) 유지 |
| `GET /me` 비로그인 응답 | 200 `null` (§2.2 그대로) | OpenAPI에서 nullable 응답으로 표현 |
| 추천·추천 취소 응답 | 200 + `RecommendState` | 카운트 즉시 반영 |
| 신고 응답 | 204, 신고 id 비노출 | 신고 id는 관리자 전용(ADR 0021) |
| 임시저장 | 서버 API 없음, 브라우저에서만 | 개인정보 항목 최소화(ADR 0010) |
| 태그 요청 형식 | `[{question_code, choice_codes[]}]`, 배열 순서 = 선택 순서, 질문 2종 모두 필수 | ADR 0013·02 D1 |
| 시향기 수정 | 향수 변경 불가, `tags`는 전체 교체 | 04 §3.2 |
| 서술 줄바꿈 | 허용하지 않음(공백으로 치환) | 100자 숏폼 카드 레이아웃 보호 — 이견 있으면 허용으로 바꿀 수 있음 |
| 닉네임 금칙어 | MVP 없음 | 무-AI 정책, 관리자 수동 처리 |
| 질문 카드 `exclude` | 직전 카드 코드를 받아 연속 중복 방지 | 시연의 연속 클릭 동작 |

### 4.4 관리자 API

> **상태: ✅ 확정 (2026-11-04).** 근거: 02 E1·E2·E3, 04 §5, 05 §3.4~3.6·§6, ADR 0009·0011·0021.

- 모든 `/admin/*`는 **비로그인 401 `LOGIN_REQUIRED` / 회원 403 `FORBIDDEN` / 관리자 ○**다. 경로가 `/admin`이라는 사실이 아니라 서버가 `admin_flag`를 매 요청 검사한다(§1.4).
- 관리자의 모든 쓰기는 관리자 조치 로그(E15)에 자동 기록한다(대상 종류·대상·관리자·시각·사유 메모). 별도 쓰기 API는 없다(§2.4).
- 폼에서 브랜드·계열을 고를 때는 공개 `GET /brands`·`GET /accords`(전체 목록, 페이지네이션 없음)를 재사용한다. 관리자 전용 선택 목록 API는 두지 않는다.
- 슬러그는 서버가 이름에서 만들고(ADR 0005) **생성 후 바꿀 수 없다** — 이미 공유된 URL을 지키기 위함이다. 이름을 고쳐도 슬러그는 그대로다.
- `reason_memo`는 1~200자 문자열이다. 비었거나 넘으면 400 `REASON_MEMO_REQUIRED` / `INVALID_PARAMETER`.

#### 4.4.1 관리자 공통 스키마

| 이름 | 모양 | 규칙 |
|---|---|---|
| `AdminReviewRow` | `{ "slug", "content", "perfume": PerfumeRef, "author": Author, "created_at", "recommend_count", "report_count", "status": "active" \| "deleted", "deleted": { "by": "user" \| "admin", "at", "memo": string \| null } \| null }` | `deleted`는 `status`가 `deleted`일 때만. `by`는 처리 주체(본인/관리자) |
| `AdminReviewDetail` | `AdminReviewRow` + `{ "tags": Tag[], "profile": ProfileRow[], "updated_at" }` | `tags`는 대표 태그가 아니라 **고른 태그 전체**(수정 폼 채우기용) |
| `AdminBrand` | `{ "slug", "name", "name_original": string \| null, "name_align": string, "search_aliases": string \| null, "logo": Image, "image_hidden": bool, "perfume_count": int }` | `logo`는 공개 응답과 같은 `Image`. `search_aliases`는 ERD의 한 칸(`name_search`)이라 쉼표로 구분한 문자열 그대로 둔다 |
| `AdminImage` | `{ "url": string \| null, "alt": string, "source_url": string, "collected_at", "processed_at": string \| null, "rights_status": "normal" \| "disputed" \| "hidden" \| "removed", "visible": bool, "registered_by": { "nickname" } \| null }` | **공개 응답의 `Image`와 달리 권리 상태와 무관하게 내려준다**(`removed`이면 `url: null`). `visible` = 이미지 있음 AND `normal` AND 브랜드 일괄 비공개 아님(05 §6.3) |
| `AdminPerfume` | `{ "slug", "name", "name_original", "name_align", "search_aliases", "notes": string \| null, "brand": BrandRef, "accords": AccordRef[], "image": AdminImage \| null, "post_count", "total_recommend_count" }` | |
| `AdminLogEntry` | `{ "at", "admin": { "nickname" }, "action": "create" \| "update" \| "image_put" \| "image_status" \| "delete", "memo": string \| null }` | |
| `AdminReport` | `{ "id": int, "reason", "reported_at", "status": "pending" \| "deleted" \| "ignored", "handled_at": string \| null, "handled_by": { "nickname" } \| null, "reporter": { "code": string \| null, "nickname" } \| null, "review": { "slug", "content", "perfume": PerfumeRef, "status": "active" \| "deleted" }, "review_report_count": int }` | `id`는 신고의 내부 id(ADR 0021 예외). `reporter`가 `null`이면 게스트 신고. 신고자 정보는 **이 응답에만** 나타난다(§2.3) |

#### 4.4.2 시향기 관리

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /admin/reviews` | `q`(작성자 닉네임·향수명 부분일치), `status`(`all` 기본\|`active`\|`deleted`), `sort`(`latest` 기본\|`recommend`\|`report`), `page`, `size` | 200 `Page<AdminReviewRow>` | 400 `INVALID_PARAMETER` |
| `GET /admin/reviews/{slug}` | — | 200 `AdminReviewDetail` — **삭제분 포함** | 404 `REVIEW_NOT_FOUND`(없거나 보관기간 경과로 완전 삭제됨) |
| `PATCH /admin/reviews/{slug}` | `{ "content"?, "tags"?, "reason_memo"? }` — `content`·`tags` 중 하나 이상 | 200 `AdminReviewDetail` | 400 (§4.3.4 입력 검증 코드), 404 `REVIEW_NOT_FOUND`, 409 `REVIEW_ALREADY_DELETED` |
| `DELETE /admin/reviews/{slug}` | JSON 본문 `{ "reason_memo": string }` — **필수** | 204 | 400 `REASON_MEMO_REQUIRED`, 404 `REVIEW_NOT_FOUND`, 409 `REVIEW_ALREADY_DELETED` |

- 작성 폼과 같은 검증을 쓰되 **작성자·향수는 바꿀 수 없다.** 삭제분은 수정할 수 없다(복구가 MVP에 없으므로 — §2.3).
- 삭제는 소프트 삭제이며 처리 주체는 `관리자`, 사유 메모가 기록된다(ADR 0011, 보관 1년). 삭제가 일으키는 집계 감소는 본인 삭제와 같다(§4.6). 삭제 대상 글에 걸린 **미처리 신고는 `deleted`로 함께 종결**한다.
- `DELETE`에 본문을 두는 것은 사유 메모를 URL(쿼리)에 넣을 수 없기 때문이다(§1.2). 9단계에서 선택한 게이트웨이가 `DELETE` 본문을 버린다면 `POST /admin/reviews/{slug}/deletion`으로 바꾼다. 같은 이유로 `…/image-hide`의 `DELETE`도 영향을 받는다.
- 탈퇴한 사용자의 글도 관리자가 수정·삭제할 수 있다(F3 AC). `author`는 `{ code: null, nickname: "user_NNNNNN" }`이다.

#### 4.4.3 브랜드·향수 관리

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /admin/brands` | `q`, `page`, `size` | 200 `Page<AdminBrand>` | — |
| `POST /admin/brands` | `{ "name", "name_original"?, "name_align"?, "search_aliases"?, "logo"? }` | 201 `AdminBrand` | 400 `INVALID_PARAMETER`, 409 `BRAND_ALREADY_EXISTS` |
| `PATCH /admin/brands/{slug}` | 위 필드 중 바꿀 것. 로고를 지우려면 `"logo": null` | 200 `AdminBrand` | 400, 404 `BRAND_NOT_FOUND`, 409 `BRAND_ALREADY_EXISTS` |
| `DELETE /admin/brands/{slug}` | — | 204 | 404 `BRAND_NOT_FOUND`, 409 `BRAND_HAS_PERFUMES` |
| `GET /admin/perfumes` | `q`, `brand`(브랜드 슬러그), `page`, `size` | 200 `Page<AdminPerfume>` — 이름순 | 404 `BRAND_NOT_FOUND`(`brand`가 없는 슬러그) |
| `POST /admin/perfumes` | `{ "brand_slug", "name", "name_original"?, "name_align"?, "search_aliases"?, "notes"?, "accord_slugs": string[] }` | 201 `AdminPerfume` (`image: null`) | 400 `INVALID_PARAMETER`, 404 `BRAND_NOT_FOUND`·`ACCORD_NOT_FOUND`, 409 `PERFUME_ALREADY_EXISTS` |
| `PATCH /admin/perfumes/{slug}` | 위 필드 중 바꿀 것(`accord_slugs`는 전체 교체) | 200 `AdminPerfume` | 400, 404 `PERFUME_NOT_FOUND`·`BRAND_NOT_FOUND`·`ACCORD_NOT_FOUND`, 409 `PERFUME_ALREADY_EXISTS` |
| `DELETE /admin/perfumes/{slug}` | — | 204 | 404 `PERFUME_NOT_FOUND`, 409 `PERFUME_HAS_REVIEWS` |
| `GET /admin/perfumes/{slug}/history` | `page`, `size` | 200 `Page<AdminLogEntry>` — 최신순 | 404 `PERFUME_NOT_FOUND` |

- 이름은 `name_align`(정렬용 이름)이 없으면 서버가 `name`으로 채운다. 같은 브랜드 안에서 같은 이름은 중복이다.
- **로고·이미지 파일의 전달 방식(서버 직접 수신 vs 임시 주소 발급)은 9단계에서 정한다.** 이 문서는 필드 이름(`logo`)과 의미만 정하고, OpenAPI(§5)에서는 해당 필드를 전달 방식 미정으로 표시한다.
- **향수 삭제**: 시향기가 **하나라도**(소프트 삭제분 포함) 걸려 있으면 409 `PERFUME_HAS_REVIEWS`로 막고 `fields.post_count`에 시향기 수를 담는다. 화면은 이를 E2 AC의 "경고 모달"로 보여준다. 시향기의 향수 참조가 완전 삭제 전까지 남기 때문이다 — **E2 AC의 "경고"를 "차단"으로 강화한 결정이다**(§4.4.7). 02 E2 문구는 확정 문서이므로 별도 개정 대상이다(부록 A).
- 브랜드 삭제는 소속 향수가 없을 때만 된다(`BRAND_HAS_PERFUMES`).
- 향수 등록·수정·삭제의 집계 영향은 §4.6에 있다. 재수집 금지 목록 대조는 이미지 등록에만 둔다(§2.3).

#### 4.4.4 향수 이미지·권리 상태

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `PUT /admin/perfumes/{slug}/image` | 파일(전달 방식 9단계) + `{ "source_url": string, "alt": string }` | 200 `{ "image": AdminImage, "warnings": [ { "code": "FORBIDDEN_RESTORE_MATCH", "message" } ] }` | 400 `SOURCE_URL_REQUIRED`·`INVALID_IMAGE`, 404 `PERFUME_NOT_FOUND` |
| `PATCH /admin/perfumes/{slug}/image` | `{ "rights_status": "normal" \| "disputed" \| "hidden" \| "removed", "reason_memo": string }` | 200 `AdminImage` | 400 `REASON_MEMO_REQUIRED`·`INVALID_PARAMETER`, 404 `PERFUME_NOT_FOUND`·`IMAGE_NOT_FOUND`, 409 `IMAGE_REMOVED` |
| `POST /admin/brands/{slug}/image-hide` | JSON 본문 `{ "reason_memo": string }` | 204 | 400 `REASON_MEMO_REQUIRED`, 404 `BRAND_NOT_FOUND`, 409 `BRAND_IMAGE_ALREADY_HIDDEN` |
| `DELETE /admin/brands/{slug}/image-hide` | JSON 본문 `{ "reason_memo": string }` | 204 | 400 `REASON_MEMO_REQUIRED`, 404 `BRAND_NOT_FOUND`, 409 `BRAND_IMAGE_NOT_HIDDEN` |

- **출처 URL이 없으면 등록할 수 없다.** `source_url`은 `https`로 시작하는 URL이어야 한다(ADR 0009 §3). 수집일은 서버가 자동 기록하고, 요청으로 받지 않는다. 등록·교체 직후 권리 상태는 `normal`이다.
- 수집 기준(단순 팩샷만)은 서버가 판별할 수 없으므로 화면 안내와 관리자 판단에 맡긴다.
- **재수집 금지 대조**: 향수 또는 소속 브랜드가 재수집 금지 목록에 있으면 **등록을 막지 않고** `warnings`에 경고를 싣는다(§2.2 "경고"). 화면은 확인을 받는다.
- 권리 상태 변경은 **사유 메모 필수**이고 변경자·변경 시각은 서버가 기록한다(§3.6). `removed`는 되돌릴 수 없으며, 파일을 삭제하고 `url`을 `null`로 만든다. 그 뒤의 어떤 변경도 409 `IMAGE_REMOVED`다.
- 비공개·영구제거·브랜드 일괄 비공개의 효과(모든 응답의 `image: null`)와 캐시 무효화 요건은 §3.6 그대로다.
- 이의 접수 이력은 `reason_memo`에 적는다(§3.6). 메모 작성 규칙은 관리자 운영 매뉴얼에 둔다.

#### 4.4.5 신고 관리

| 메서드 + 경로 | 요청 | 응답 | 오류 |
|---|---|---|---|
| `GET /admin/reports` | `status`(`pending` 기본\|`deleted`\|`ignored`\|`all`), `page`, `size` | 200 `Page<AdminReport>` — 신고 접수 순(오래된 것 먼저) | 400 `INVALID_PARAMETER` |
| `PATCH /admin/reports/{id}` | `{ "action": "delete" \| "ignore", "reason_memo"? }` | 200 `AdminReport` (처리된 신고) | 400 `REASON_MEMO_REQUIRED`(`delete`인데 메모 없음), 404 `REPORT_NOT_FOUND`, 409 `REPORT_ALREADY_HANDLED` |

- 목록의 한 줄은 **신고 한 건**이고, 같은 글에 대한 누적 건수는 `review_report_count`다(04 §5.3 "누적").
- `delete`는 대상 시향기를 `DELETE /admin/reviews/{slug}`와 같은 방식으로 지운다(§4.4.2). 이미 삭제된 글이면 삭제는 건너뛰고 신고만 종결한다.
- `delete`와 `ignore` 모두 **같은 글에 걸린 미처리 신고를 함께 종결**한다(글 단위 판단). 같은 글에 대한 중복 신고를 하나씩 눌러야 하는 부담을 없애기 위함이다(§4.4.7). `ignore` 뒤에 새로 들어온 신고는 다시 `pending`이다.
- 처리 이후에도 `post.report_count`(누적)는 줄이지 않는다.
- 화면의 "대상 시향기 열람"은 `GET /admin/reviews/{slug}`를 쓴다(삭제분 포함).

#### 4.4.6 보관기간 경과분의 응답

완전 삭제된 시향기(§3.7)는 관리자 API에서도 404다. 신고 기록은 처리 후 1년, 조치 로그는 3년 보관하므로, 신고 목록의 `review`가 이미 완전 삭제된 글을 가리키는 경우는 **시향기 완전 삭제 시 그 글의 신고도 함께 지우는 규칙**(§3.7) 때문에 생기지 않는다.

#### 4.4.7 이 절에서 새로 정한 결정 (확정)

| 항목 | 제안 | 이유·영향 |
|---|---|---|
| 관리자 삭제의 사유 메모 | `DELETE` JSON 본문, 필수 | 쿼리에 못 넣음(§1.2). 게이트웨이 제약이 있으면 `POST …/deletion`으로 대체 |
| 신고 종결 단위 | 한 번의 처리가 같은 글의 미처리 신고 전체를 종결 | 중복 신고 반복 처리 방지 |
| 향수 삭제 | 시향기(삭제분 포함)가 있으면 **차단**, 시향기 수 안내 | E2 AC의 "경고"를 강화. 대안: 경고 후 시향기 일괄 삭제를 허용하려면 향수 소프트 삭제 상태가 ERD에 필요 |
| 브랜드 삭제 | 소속 향수가 없을 때만 | 같은 이유 |
| 슬러그 | 생성 후 변경 불가 | ADR 0005 URL 안정성 |
| 관리자 시향기 수정 | 내용·태그만, 삭제분은 수정 불가 | 복구가 없는 MVP 정책(§2.3) |
| 경고 응답 | 재수집 금지 대조는 200 + `warnings` | §2.2 "경고" |
| 관리자 응답의 이미지 | 권리 상태와 무관하게 원본 정보 노출 | 비공개 이미지를 관리자가 확인·복원할 수 있어야 함 |

### 4.5 에러 코드 총정리

엔드포인트와 무관하게 의미가 같으면 같은 코드를 쓴다(§1.5). 메시지 문구는 구현 단계에서 확정한다.

| HTTP | `code` | 의미 | 발생하는 곳 |
|---|---|---|---|
| 400 | `INVALID_PARAMETER` | 쿼리·본문 형식 또는 값 오류 (일반) | 거의 모든 엔드포인트 |
| 400 | `TEXT_REQUIRED` / `TEXT_TOO_LONG` | 서술이 비었음 / 100자 초과 | 시향기 작성·수정 |
| 400 | `TAG_REQUIRED` / `TAG_TOO_MANY` / `TAG_INVALID` | 질문 누락·`min` 미달 / `max` 초과 / 허용되지 않은 선택지·중복 | 시향기 작성·수정 |
| 400 | `NICKNAME_INVALID` / `NICKNAME_RESERVED` | 닉네임 형식 위반 / `user_` 접두사 | `PATCH /me` |
| 400 | `CONFIRMATION_REQUIRED` | `confirm=true` 없음 | `DELETE /me` |
| 400 | `INVALID_STATE` / `LOGIN_CANCELLED` | OAuth `state` 불일치 / 사용자가 로그인 취소 | 로그인 콜백 |
| 400 | `REASON_MEMO_REQUIRED` | 관리자 처리의 사유 메모 누락·길이 초과 | 관리자 삭제·권리 상태 변경·일괄 비공개·신고 `delete` |
| 400 | `SOURCE_URL_REQUIRED` / `INVALID_IMAGE` | 이미지 출처 URL 없음·형식 오류 / 지원하지 않는 이미지 | 이미지 등록 |
| 401 | `LOGIN_REQUIRED` | 세션 없음·만료 | 회원·관리자 API 전체 |
| 403 | `FORBIDDEN` | 관리자 권한 없음 | `/admin/*` |
| 403 | `NOT_REVIEW_OWNER` | 남의 시향기 수정·삭제 | 시향기 수정·삭제 |
| 403 | `CANNOT_RECOMMEND_OWN_REVIEW` / `CANNOT_REPORT_OWN_REVIEW` | 본인 글 추천 / 신고 | 추천·신고 |
| 403 | `CSRF_INVALID` | CSRF 검증 실패 | 쓰기 요청 전체 |
| 404 | `BRAND_NOT_FOUND` / `ACCORD_NOT_FOUND` / `PERFUME_NOT_FOUND` | 없는 브랜드·계열·향수 | 열람·작성·관리자 |
| 404 | `REVIEW_NOT_FOUND` | 없는 시향기 **또는 소프트 삭제분** | 시향기를 대상으로 하는 모든 API |
| 404 | `USER_NOT_FOUND` | 없는 사용자 **또는 탈퇴 회원** | 프로필 |
| 404 | `POLICY_NOT_FOUND` / `REPORT_NOT_FOUND` / `IMAGE_NOT_FOUND` | 없는 정책 문서·신고·이미지 | 정책·신고 관리·이미지 |
| 409 | `ALREADY_REVIEWED` | 같은 향수에 이미 쓴 시향기가 있음(ADR 0023) | `POST /reviews` |
| 409 | `ALREADY_RECOMMENDED` / `NOT_RECOMMENDED` | 이미 추천함 / 추천한 적 없음 | 추천·추천 취소 |
| 409 | `ALREADY_REPORTED` | 같은 회원의 중복 신고 | 신고 |
| 409 | `NICKNAME_TAKEN` | 이미 쓰는 닉네임 | `PATCH /me` |
| 409 | `ALREADY_LOGGED_IN` | 로그인 상태에서 로그인 요청 | 로그인·콜백 |
| 409 | `REVIEW_ALREADY_DELETED` | 이미 삭제된 글을 관리자가 수정·삭제 | 관리자 시향기 |
| 409 | `BRAND_ALREADY_EXISTS` / `PERFUME_ALREADY_EXISTS` | 이름 중복 | 관리자 등록·수정 |
| 409 | `BRAND_HAS_PERFUMES` / `PERFUME_HAS_REVIEWS` | 하위 항목이 있어 삭제 불가 | 관리자 삭제 |
| 409 | `IMAGE_REMOVED` | 영구제거된 이미지는 변경 불가 | 이미지 권리 상태 |
| 409 | `BRAND_IMAGE_ALREADY_HIDDEN` / `BRAND_IMAGE_NOT_HIDDEN` | 일괄 비공개 상태 충돌 | 브랜드 일괄 비공개·해제 |
| 409 | `REPORT_ALREADY_HANDLED` | 이미 처리된 신고 | 신고 처리 |
| 429 | `RATE_LIMITED` | 요청 과다(한도 수치는 구현 단계) | 쓰기 요청 |
| 429 | `REPORT_LIMIT_EXCEEDED` | 대상별 신고 총량 초과(게스트 포함) | 신고 |
| 500 | `INTERNAL_ERROR` | 서버 오류. 내부 정보는 담지 않는다 | 전체 |
| 502 | `PROVIDER_ERROR` | 소셜 공급자 통신 실패 | 로그인 콜백 |

- 401/403 구분: 세션이 없으면 401, 세션은 있는데 권한이 부족하면 403이다. 관리자 경로에 회원이 접근하면 경로 존재를 숨기지 않고 403이다.
- 404 우선 규칙: 대상이 없거나 소프트 삭제분이면 권한 검사보다 **404를 먼저** 낸다(삭제 사실 은닉 — §1.7). 단 관리자 API의 삭제분은 존재하는 것으로 취급한다.
- 폼 검증 오류(400)는 가능한 한 `fields`에 필드별 사유를 담는다. 키는 요청 필드 이름(`content`, `tags`, `nickname`, `reason_memo`, `source_url`)이다.

### 4.6 엔드포인트별 집계 갱신표 (ADR 0016)

쓰기 연산은 **같은 트랜잭션 안에서** 집계 컬럼을 증감한다. 표에 없는 쓰기 API는 집계를 건드리지 않는다. 일 1회 보정 배치(§3.7)가 어긋난 값을 되돌린다.

| 엔드포인트 | 갱신 대상 | 증감 |
|---|---|---|
| `POST /reviews` | `perfume.post_count`, `user.post_count` | 각 +1 |
| `DELETE /reviews/{slug}` (본인)<br>`DELETE /admin/reviews/{slug}`<br>`PATCH /admin/reports/{id}` (`delete`) | `perfume.post_count`, `user.post_count` | 각 −1 |
| (위와 같은 삭제) | `perfume.total_recommend_count`, `user.received_recommend_count` | 삭제된 글의 `recommend_count`만큼 −. 글의 `post.recommend_count`는 그대로 둔다 |
| `POST /reviews/{slug}/recommendation` | `post.recommend_count`, `perfume.total_recommend_count`, `user.received_recommend_count`(글 작성자) | 각 +1 |
| `DELETE /reviews/{slug}/recommendation` | 위와 같음 | 각 −1 |
| `POST /reviews/{slug}/reports` | `post.report_count` | +1 |
| `POST /admin/perfumes` | `brand.perfume_count`, 지정한 각 계열의 `accord.perfume_count` | 각 +1 |
| `PATCH /admin/perfumes/{slug}` | 브랜드가 바뀌면 이전 −1·새 `brand.perfume_count` +1. 계열 집합이 바뀌면 빠진 계열 −1·추가된 계열 +1 | |
| `DELETE /admin/perfumes/{slug}` | `brand.perfume_count`, 소속 계열의 `accord.perfume_count` | 각 −1 (시향기가 없는 경우에만 가능하므로 시향기 집계는 영향 없음) |
| `DELETE /me` | **없음** | 시향기·추천이 보존되고 탈퇴자가 누른 추천의 카운트도 유지된다(ADR 0008·0016) |
| 그 밖 (`PATCH /reviews`, `PATCH /me`, 브랜드·이미지 관리, 신고 `ignore`, 로그인·로그아웃) | 없음 | |

- 소프트 삭제분은 목록·피드·검색·집계에서 제외된다(ADR 0011). 위 표의 삭제 행이 그 집계 제외를 구현한다.
- 삭제된 글에 대한 추천·신고는 404이므로 삭제분의 카운트는 더 변하지 않는다.
- 소프트 삭제 복구는 MVP에 없다(§2.3). 도입하면 증가 방향의 갱신을 같은 표에 더한다.
- 보정 배치의 대상은 6종 집계 컬럼 전부와 `post.recommend_count`·`post.report_count`다.

## 부록 A. 열어 둔 미결 사항

원칙 단계에서 일부러 열어 둔 항목이다. §2~§5를 작성하면서 확정한다.

| 항목 | 결정 시점 |
|---|---|
| 세션 저장소 제품·세션 만료 시간·CSRF 방어의 구체 방식 | 9단계 기술 스택 |
| 429 요청 한도 수치, `size` 상한 | 구현 단계 |
| ✅ 추천 취소 가능 여부 — **가능으로 확정** (2026-10-28, 01 N4·02 C2·04 §2.8·ADR 0001에 이미 확정돼 있던 내용을 확인). ADR 0016의 증감 대상(`post.recommend_count`·`perfume.total_recommend_count`·`user.received_recommend_count`)에 이미 포함. §4에서 `DELETE /reviews/{slug}/recommendation`의 갱신 대상으로 명시 | §4 |
| ✅ 탈퇴 회원 프로필(`/users/:id`) 조회 시 API 응답 — **404 `USER_NOT_FOUND`** (§4.2) | — |
| ✅ 탈퇴 후 같은 소셜 계정으로 재로그인 — **신규 가입으로 처리, 이전 글은 되찾을 수 없음** (2026-10-28 확정) | — |
| ✅ 시향기 소프트 삭제 복구 — **MVP에는 없음** (2026-10-28 확정). 도입하려면 새 ADR | — |
| ✅ 게스트 신고 중복 방지 — 브라우저 로컬 + 대상별 총량 한도(ADR 0010), 서버는 총량 초과 시 429. 회원은 (신고자, 대상) 중복을 서버가 409로 막음 (2026-10-28 확정). 한도 수치는 구현 단계 | §4 |
| ✅ 약관 개정 시 재동의 — **MVP 제외** (2026-10-28, ADR 0022). 향후 도입 설계안은 ADR 0020·0022에 보존 | — |
| 이미지·로고 파일 업로드 방식 — 서버가 파일을 직접 받을지(multipart), 저장소로 직접 올리는 임시 주소를 발급할지. serverless 제약과 엮임 | 9단계 기술 스택 (§4에 미결로 명시) |
| 검색 섹션별 상위 개수 — 5개로 시작 | 구현 단계 조정 가능 |
| ✅ 관리자 삭제분 열람 — `GET /admin/reviews/{slug}` 사용 (§4.4.2) | §4 |
| ✅ 관리자 시향기 삭제의 사유 메모 — `DELETE` JSON 본문(게이트웨이가 막으면 `POST …/deletion`) · 닉네임 에러 코드 `NICKNAME_INVALID`·`NICKNAME_RESERVED`·`NICKNAME_TAKEN` · 시향기가 달린 향수 삭제 — **차단**(`PERFUME_HAS_REVIEWS`) (§4.3.3·§4.4.2·§4.4.3) | §4 |
| ✅ 응답 필드 요구 — 시향기 카드·`image` null 규칙 (§4.1에 반영) | — |
| 이미지·로고 파일 전달 방식이 `PUT /admin/perfumes/{slug}/image`·`POST·PATCH /admin/brands`의 요청 형식을 정한다 (필드 이름만 확정, §4.4.3·§4.4.4) | 9단계 |
| 소셜 로그인 공급자 열거(`kakao`\|`naver`\|`google`)를 C1의 "1개로 시작"에 맞게 줄이기 (§4.3.2) | 9단계 |
| 02 E2 AC의 "시향기가 달린 향수 삭제 시 경고"를 "차단(시향기 수 안내)"으로 개정 — §4.4.3 결정을 확정 문서에 반영 | 사용자 승인 후 |
| ADR 0023이 요구하는 확정 문서 반영(02·04·05·06 — `post`의 (`user_id`, `perfume_id`) 중복 방지, 삭제분 제외 조건) | 사용자 승인 후 |

## 다음 작업

1. §4 전체(§4.1~§4.6)는 확정됐다(2026-11-04).
2. §5 — `docs/07-api-spec.yaml`을 만들었다(2026-11-04). §4.1 공통 스키마가 `components/schemas`, §4.5 에러 코드가 에러 응답 예시가 된다. 이후 Spectral(린트) → Swagger UI(열람) → Prism(목 서버)으로 확인하고 FL1~FL4를 호출 순서로 추적한다.
3. 반영할 확정 문서(사용자 승인 후): ADR 0023을 02·04·05·06에 반영(부록 A), 이 문서의 상태를 CLAUDE.md "현재 작업 상태"에 반영.
