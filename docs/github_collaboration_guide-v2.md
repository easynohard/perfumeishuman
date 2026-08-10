# 🚀 GitHub 협업 가이드 (Collaboration Guidelines)

본 문서는 우리 팀의 원활한 웹 서비스 개발을 위한 GitHub 협업 규칙입니다.
새로운 작업을 시작하기 전에 반드시 아래 규칙들을 숙지해 주세요.

---

## 1. 🌿 브랜치 전략 (Branch Strategy)
기본적으로 GitHub Flow를 따릅니다.

- **`main`** : 실제 서비스가 배포되는 프로덕션 브랜치입니다. (직접 커밋 절대 금지 ❌)
- **`dev`** : 다음 배포를 위해 개발 중인 코드들이 모이는 테스트용 브랜치입니다.
- **개인 작업 브랜치** : 기능 개발이나 버그 수정을 위해 `dev`에서 분기하는 브랜치입니다. 작업 완료 후 `dev`로 PR을 보냅니다.

---

## 2. 🏷️ 브랜치 네이밍 규칙 (Branch Naming Convention)
`타입/이슈번호-작업내용` 또는 `타입/작업내용` 형식으로 작성하여 영어 소문자와 하이픈(`-`)만 사용합니다.

### 📌 자주 사용하는 브랜치 이름 예시
- **기능 개발 (Front-end/Back-end)**
  - `feat/react-login-ui` : React 기반 로그인 뷰 구현
  - `feat/spring-boot-oauth` : Spring Boot 서버 OAuth 연동
  - `feat/fastapi-vector-search` : FastAPI 및 ChromaDB 연동 검색 로직 추가
- **버그 수정**
  - `fix/ec2-cors-error` : AWS EC2 배포 환경의 CORS 에러 수정
  - `fix/chromadb-connection` : 벡터 데이터베이스 연결 끊김 현상 해결
- **문서 및 설정**
  - `docs/api-swagger-update` : Swagger API 문서 업데이트
  - `chore/docker-compose-setup` : 로컬 개발용 Docker Compose 환경 구성
  - `refactor/react-components` : 중복되는 React 컴포넌트 분리

---

## 3. 💬 커밋 메시지 규칙 (Commit Message Convention)
커밋 메시지는 "무엇을", "왜" 변경했는지 명확하게 작성합니다.

### 📌 커밋 타입
| 타입 | 의미 | 예시 |
| :--- | :--- | :--- |
| **feat** | 새로운 기능 추가 | `feat: JWT 기반 로그인 API 구현` |
| **fix** | 버그 수정 | `fix: AWS EC2 환경 헬스체크 실패 문제 수정` |
| **refactor** | 코드 리팩토링 (기능 변화 없음) | `refactor: FastAPI 라우터 구조 모듈화` |
| **style** | 코드 포맷팅, 세미콜론 누락 등 | `style: 프리티어(Prettier) 포맷팅 일괄 적용` |
| **docs** | 문서 수정 | `docs: Docker Compose 실행 방법 가이드 추가` |
| **chore** | 패키지 매니저, 빌드 설정 수정 | `chore: Spring Boot 의존성(dependency) 업데이트` |

### 📝 작성 예시 (상세)
```text
feat: 구글 로그인 연동 기능 추가 (#12)

- React 프론트엔드에 OAuth2.0 구글 로그인 버튼 추가
- Spring Boot 백엔드에 토큰 검증 및 발급 로직 구현
- 로그인 성공 시 사용자 정보를 전역 상태에 저장
```
```text
fix: 로컬 환경 Docker Compose DB 연결 오류 수정 (#15)

- 컨테이너 실행 순서 문제로 인해 ChromaDB 연결이 실패하던 현상 해결
- docker-compose.yml의 depends_on 설정 추가
```

---

## 4. 🔄 작업 흐름 (Workflow) 상세 예시
1. **Issue 생성:** GitHub Issue를 생성하여 할 일을 등록합니다. (예: `#12 소셜 로그인 기능 구현`)
2. **Branch 생성:** `dev` 브랜치 최신 상태에서 작업할 브랜치를 생성합니다.
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/12-social-login
   ```
3. **Commit & Push:** 코드를 작성하고 규칙에 맞게 커밋 후 Push 합니다.
   ```bash
   git add .
   git commit -m "feat: 구글 로그인 연동 기능 추가 (#12)"
   git push origin feat/12-social-login
   ```
4. **Pull Request:** GitHub 페이지에서 `feat/12-social-login` -> `dev` 방향으로 PR을 생성합니다.
5. **Code Review & Merge:** 리뷰어가 코드를 확인하고 승인(Approve)하면 Merge 버튼을 누릅니다. 작업이 끝난 브랜치는 삭제(Delete branch)합니다.

---

## 5. 🤝 Pull Request (PR) 템플릿 예시
PR을 생성할 때 아래 양식을 활용하면 리뷰가 훨씬 수월해집니다.

```markdown
## 💡 어떤 변경 사항이 있나요?
- React 프론트엔드 로그인 페이지 UI 퍼블리싱 완료
- Spring Boot 환경에 Spring Security 적용 및 JWT 토큰 발급 로직 추가

## 🛠️ 해결한 이슈 넘버
- Resolves #12

## 🔍 리뷰어에게 부탁하는 부분
- JWT 토큰 만료 시간이 적절하게 설정되었는지 확인 부탁드립니다.
- React 컴포넌트 분리 구조가 괜찮은지 피드백 부탁해요!
```
