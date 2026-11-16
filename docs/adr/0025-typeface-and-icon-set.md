# 0025. 서체는 Pretendard, 아이콘은 Lucide로 한다

- Status: **Accepted** (2026-11-16 — 8단계 승인, 2026-11-12 위임 초안 원안대로. 라이선스는 [license-audit.md](../quality/license-audit.md) 1차 감사 참조)
- 관련 문서: [08-ui-design.md](../08-ui-design.md) §2.2·§3, [quality/license-audit.md](../quality/license-audit.md)

## Context

폰트·아이콘은 상업적 이용 시 라이선스 문제가 가장 흔한 에셋이고, 선택 시점에 확인해야 교체 비용이 들지 않는다(CLAUDE.md 단계별 부가 산출물 8). 서비스는 한글 중심이며 FCP 2.5초(N5)·외부 요청 최소화(개인정보 최소 원칙)가 요구된다. 시연 데모는 이미 Pretendard를 첫 순위로 지정했다.

## Decision

1. **서체: Pretendard Variable** — SIL Open Font License 1.1. 상업적 이용·웹 임베딩·재배포 가능, 서체 단독 판매만 금지. **셀프 호스팅**(woff2 동적 서브셋)한다. 공용 CDN을 쓰지 않아 방문자 IP가 제3자에 전달되지 않는다.
2. **아이콘: Lucide** — ISC License(MIT 계열 허용형). 필요한 아이콘만 SVG 스프라이트로 번들한다.
3. 로고는 이미지 에셋 없이 Pretendard 워드마크로 구성한다.
4. 라이선스 고지: OFL 1.1 전문과 ISC 고지를 서비스 내 "오픈소스 고지" 위치(푸터 또는 `/help` 하단)에 게시하고 리포의 `THIRD_PARTY_NOTICES`에 보관한다.

## 검토한 대안

| 대안 | 기각 이유 |
|---|---|
| Noto Sans KR (OFL) | 라이선스는 동일하게 안전하나 가변 굵기·한글 자간 품질에서 Pretendard가 앞서고 파일이 더 크다 |
| 유료/상업 서체(산돌·윤서체 등) | 웹 라이선스 비용·트래픽 한도 발생, 1인 운영에 부담 |
| Google Fonts CDN | 방문자 IP가 외부로 전달됨 → ADR 0010 취지와 어긋남(국내 규제 해석 논란도 있음) |
| Phosphor (MIT) / Material Symbols (Apache-2.0) | 모두 허용 가능하나 Lucide가 선 두께 조절이 쉽고 세트가 작아 번들이 가볍다 |

## Consequences

- (+) 두 에셋 모두 허용형 라이선스라 상업화(W1) 단계에서도 재검토가 필요 없다.
- (+) 외부 호출이 없어 성능·개인정보 면에서 유리하다.
- (−) 셀프 호스팅이라 서브셋 구성·캐시 헤더를 직접 관리해야 한다(9·10단계).
- (−) 새 아이콘이 필요할 때 Lucide 세트에 없으면 자체 제작이 필요하다.
