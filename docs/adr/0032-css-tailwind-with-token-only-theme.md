# 0032. CSS는 Tailwind CSS로 쓰고, 테마에는 08의 디자인 토큰만 등록한다

- Status: **Accepted** (2026-11-17 — 9단계 기술 스택 추가 결정(08 §10에서 넘어온 "CSS 방식"), 사용자 승인)
- 관련 문서: [ADR 0024](./0024-color-system-white-cobalt-black.md)(흰·코발트·검정, 빨간색 없음) · [ADR 0025](./0025-typeface-and-icon-set.md) · [ADR 0026](./0026-nextjs-typescript-single-codebase.md)(Next.js) · [ADR 0031](./0031-font-icon-bundling-official-packages.md) · [08-ui-design.md](../08-ui-design.md) §2·§10 · [`design/style-guide.html`](../design/style-guide.html)

## Context

08은 디자인 토큰(색 9개 변수·서체·간격 등)을 정하고 "구현에서는 CSS 변수로 그대로 옮긴다(이름 고정)"고 했으며, 토큰을 코드에 적는 CSS 방식은 9단계로 넘겼다(08 §10). 이 항목은 9단계 결정 순서 10항목에 없어 2026-11-17 별도로 정한다.

- ADR 0024는 유채색을 코발트 하나로 제한하고 위험·오류·성공에도 별도 색을 두지 않는다. 사람의 주의만으로 이 제약을 지키면 실수가 생기기 쉽다.
- 화면은 Next.js(ADR 0026)로 만들며, 서버에서 화면을 그리는 구조(React Server Components)를 쓴다.
- 운영자는 1인·첫 개발이다. 자료가 많고 설정이 적은 쪽을 우선한다.

## Decision

1. **CSS 방식: Tailwind CSS**(MIT). Next.js 새 프로젝트 생성 시 함께 설치되는 구성을 그대로 쓴다. 버전은 lock 파일로 고정한다.
2. **테마는 08 토큰만 등록한다.**
   - 08 §2의 CSS 변수(`--white`·`--ink`·`--cobalt`·`--cobalt-strong`·`--cobalt-tint`·`--muted`·`--line`·`--line-strong`·`--scrim`)를 이름 그대로 정의하고, Tailwind 테마 색에 연결해 `bg-cobalt`·`text-ink`·`border-line`처럼 쓴다.
   - **Tailwind 기본 색 목록(red·green 등)은 모두 지운다.** 등록하지 않은 색 이름은 동작하지 않으므로 ADR 0024 위반이 코드 단계에서 막힌다.
   - 서체(Pretendard + 08 §2.2 폴백)와 08이 정한 글자 크기·간격·모서리 등도 같은 방식으로 테마에 둔다. 세부 매핑은 10단계 스캐폴딩에서 08 §2를 그대로 옮긴다.
3. 색 값을 코드에 직접 적는 임의 값(예: `bg-[#ff0000]`)은 쓰지 않는다. 자동 검사(lint 규칙) 도입 여부는 ⑦ 테스트·품질 게이트에서 정한다.
4. `style-guide.html`은 계속 **보이는 모습의 기준**으로 쓴다. 그 안의 CSS 코드는 구현에 복사하지 않고 Tailwind로 옮겨 적는다.

## 검토한 대안

| 대안 | 기각 이유 |
|---|---|
| CSS Modules + CSS 변수 | Next.js 기본 지원이고 스타일 가이드 CSS를 거의 그대로 옮길 수 있다. 하지만 아무 색이나 적을 수 있어 ADR 0024 제약을 사람이 지켜야 하고, 화면 파일과 꾸미기 파일을 오가야 한다. **2순위** |
| CSS-in-JS(styled-components 등) | 서버에서 화면을 그리는 Next.js 구조와 잘 맞지 않고 설정이 추가된다 |
| 전역 CSS 한 파일 | 규모가 커지면 이름 충돌·영향 범위 파악이 어렵다 |

## Consequences

- (+) 팔레트 제약(ADR 0024)이 테마 수준에서 강제된다.
- (+) Next.js 기본 구성이라 설정이 거의 없고 자료·예시가 가장 많다.
- (+) 화면과 꾸미기가 한 파일에 있어 수정 위치를 찾기 쉽다. 쓰지 않는 규칙은 빌드 시 자동으로 빠져 CSS 파일이 작다(08 §8 성능).
- (+) 토큰 이름이 08 문서와 코드에서 일치한다(`--cobalt` ↔ `bg-cobalt`).
- (−) `px-4`·`rounded-lg` 같은 클래스 이름을 익혀야 한다.
- (−) 스타일 가이드의 CSS를 Tailwind로 다시 옮겨 적어야 한다.
- (−) 클래스가 길어지는 컴포넌트는 공통 컴포넌트로 묶어 관리한다(10단계 컨벤션).
- 의존성 라이선스(MIT)는 ⑧ 라이선스 2차에서 목록에 포함한다. 08 §10의 "CSS 방식 — 9단계" 항목은 이 ADR로 닫는다.
