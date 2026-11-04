# API 목 서버 실행 안내

`docs/07-api-spec.yaml`(OpenAPI 명세)을 **Swagger UI 화면**에서 열어 보고, 실제 서버 없이 **가짜(목) 응답**으로 API를 호출해 볼 수 있는 도구다. 프론트 개발·명세 검토용이며 DB·로직은 없다.

## 어떻게 동작하나

```
브라우저 ── http://localhost:4020 ──▶ server.js (Node, 이 폴더)
                                       ├─ /            Swagger UI 화면 (npm 패키지 swagger-ui-dist, 서버가 직접 제공)
                                       ├─ /openapi.yaml  ../docs/07-api-spec.yaml 그대로
                                       └─ /api/v1/*    ──▶ Prism (내부 포트 4010) ──▶ yaml 의 example/스키마로 응답 생성
```

- **Swagger UI는 Docker가 필요 없다.** 정적 파일 묶음(`swagger-ui-dist`)이라 `npm install` 때 함께 설치되고 `server.js`가 제공한다.
- **목 응답은 Prism**(Stoplight)이 만든다. yaml에 적힌 `example`과 스키마를 읽어 응답을 돌려준다.
- 한 번에 실행하도록 `server.js`가 Prism을 자식 프로세스로 띄우고 같은 포트(4020)로 프록시한다.

## 방법 A. Node.js로 실행 (Docker 없음)

필요: **Node.js 18.20 이상** (https://nodejs.org, 설치 후 `node -v`로 확인)

```bash
git clone <리포 주소>          # docs/ 폴더가 함께 있어야 한다 (../docs/07-api-spec.yaml 을 읽음)
cd perfumeishuman/mock
npm install                    # 최초 1회
npm start
```

브라우저에서 **http://localhost:4020** 을 연다. 종료는 `Ctrl+C`.

## 방법 B. Docker로 실행 (Node 설치 없이)

필요: Docker Desktop(또는 Docker Engine + compose)

```bash
cd perfumeishuman/mock
docker compose up --build      # 최초 빌드 포함, 백그라운드는 -d
# 종료: docker compose down
```

같은 주소 **http://localhost:4020** 이다. `docs/07-api-spec.yaml`을 고쳤다면 `docker compose up --build`로 다시 빌드한다. (`docker-compose.yml`의 볼륨 주석을 풀면 재빌드 없이 `docker compose restart`만으로 반영된다.)

## 사용법

1. 화면에서 엔드포인트를 펼치고 **Try it out → Execute**. 목 API 주소는 `http://localhost:4020/api/v1/...`이라 `curl`로도 호출된다.
2. **에러 응답 보기**: 호출 주소에 `?__code=409` 를 붙이면 그 상태 코드의 에러 예시가 나온다. 화면을 `http://localhost:4020/?code=409` 로 열면 모든 호출에 자동 적용된다.
3. **로그인 상태**: Swagger UI는 쿠키를 직접 보낼 수 없어서, 서버가 쿠키가 없는 요청에 가짜 세션을 붙인다. 모든 호출이 "로그인한 관리자"처럼 동작한다. 비로그인(401)·권한 없음(403)은 `?__code=401`, `?__code=403` 으로 확인한다.
4. **명세를 고쳤다면** 서버를 다시 시작한다 (`Ctrl+C` 후 `npm start`).

## 알아둘 점

- 응답은 **고정된 예시 값**이다. 검증·중복(409)·권한 로직은 실제로 일어나지 않는다. 요청 본문이 스키마에 어긋나면 Prism이 422로 알려주는 정도다.
- 일부 필드는 예시가 없어 `"string"`으로 나온다.
- 사용 포트는 **4020**(화면·API)과 **4010**(내부 Prism)이다. 이미 쓰고 있으면 `PORT=4030 PRISM_PORT=4011 npm start`처럼 바꾼다 (Windows PowerShell: `$env:PORT=4030; npm start`).
- 문제 해결: `EADDRINUSE` → 포트 충돌, 위 환경변수로 변경 / 화면은 뜨는데 API가 503 `MOCK_STARTING` → Prism 기동 중이니 몇 초 뒤 재시도.
