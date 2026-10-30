# 0019. 계열의 영문 이름을 accord로 통일 — URL·API·스키마

- Status: **Accepted** (2026-10-28 확정) — ERD 다이어그램은 `erd.png`로 갱신 완료(아래 Consequences의 이미지 관련 항목은 해소됨)
- 보완 대상: [0005-seo-slug-urls.md](./0005-seo-slug-urls.md)의 `/notes/:slug`, [0015-accord-final-set.md](./0015-accord-final-set.md)의 `/notes` 표기, 3단계 사이트맵 결정 2의 "URL만 `notes` 사용"
- 관련 문서: [03-sitemap-ia.md](../03-sitemap-ia.md), [06-erd.md](../06-erd.md), [07-api-spec.md](../07-api-spec.md) §2

## Context

계열(향 계열: 시트러스·플로럴·우디 등)의 영문 이름이 계층마다 달랐다.

| 위치 | 이름 |
|---|---|
| 화면 URL (3단계 결정 2) | `/notes`, `/notes/:slug` |
| 엔티티·테이블 (6단계) | `accord` |
| 연결 테이블·컬럼 (6단계) | `note_has_perfume`, `accord.note_name`, `accord.note_slug` |
| API 초안 (07 §2) | `/accords` |

한편 향수에는 **"노트"**(장미, 리치, 머스크 같은 자유 텍스트 한 줄, 05 §2.7)가 따로 있고 ERD에서는 `perfume.notes` 컬럼이다. 계열 쪽에 `note`가 섞여 있어 **계열과 노트가 코드·문서에서 같은 이름으로 뒤섞일 위험**이 있었다. 7단계 API 설계 중 발견했다.

## Decision

계열의 영문 이름은 **`accord`** 하나로 통일한다.

| 대상 | 이전 | 이후 |
|---|---|---|
| 화면 URL | `/notes`, `/notes/:slug` | `/accords`, `/accords/:slug` |
| API | (초안) `/accords` | `/accords` (변경 없음) |
| 연결 테이블 | `note_has_perfume` | `accord_has_perfume` |
| `accord` 컬럼 | `note_name`, `note_slug` | `accord_name`, `accord_slug` |
| 연결 테이블의 FK 컬럼 | `note_note_name` | `accord_accord_name` |

- 사용자에게 보이는 한국어 라벨 "계열"은 그대로다.
- **`perfume.notes`(향수의 노트 텍스트)는 바꾸지 않는다.** 이 구분을 지키는 것이 통일의 목적이다.
- 서비스 공개 전이라 `/notes`에서 `/accords`로의 리다이렉트는 두지 않는다.

## 검토한 대안

- **URL은 `/notes` 유지, 내부만 `accord`**: 입문자에게 "노트"가 익숙한 말이라는 장점이 있었으나, 화면 URL과 도메인 이름이 달라 혼동이 이어지고 향수의 "노트"와도 겹친다. 기각.

## Consequences

- (+) 계열은 URL·API·스키마 모두 `accord`, 노트는 `notes`로 이름이 갈려 혼동이 사라진다.
- (−) 확정 문서 03·04·05·06과 07 §2의 표기를 고쳤다. ADR 0005·0015 본문은 수정하지 않고 Status에 이 ADR을 가리키는 표시만 달았다.
- (−) **`erd6.png`는 이미지라 이 ADR 시점에도 구 이름(`note_*`)이 그려져 있다.** 다이어그램은 별도로 갱신해야 하며, 갱신 전까지는 `06-erd.md` §2의 표기가 우선한다.
- (−) 3단계 시각화 아티팩트(외부 링크)에는 `/notes`가 남아 있다.
