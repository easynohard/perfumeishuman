// 의존성 라이선스 검사 — ADR 0034
// 설치된 모든 패키지(하위 패키지 포함)의 라이선스를 license-policy.json과 대조한다.
// 허용 목록에도 예외 목록에도 없는 패키지가 있으면 실패(종료 코드 1)한다.
// 추가 도구 없이 npm 내장 기능(`npm query`)만 쓴다.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const policy = JSON.parse(
  readFileSync(new URL("../license-policy.json", import.meta.url), "utf8"),
);
const allowed = new Set(policy.allowed);

const packages = JSON.parse(
  execSync('npm query "*"', { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
);
const rootName = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).name;

// "@img/sharp-*" 처럼 끝이 *인 패턴은 접두사로 비교한다.
function matchesException(name) {
  return policy.exceptions.some((e) =>
    e.package.endsWith("*")
      ? name.startsWith(e.package.slice(0, -1))
      : name === e.package,
  );
}

// SPDX 식: "A OR B"는 하나라도 허용이면 통과, "A AND B"는 모두 허용이어야 통과.
function isAllowed(license) {
  if (typeof license !== "string" || license.trim() === "") return false;
  const expr = license.replace(/[()]/g, "").trim();
  return expr
    .split(/\s+OR\s+/)
    .some((alt) =>
      alt.split(/\s+AND\s+/).every((id) => allowed.has(id.trim())),
    );
}

const violations = [];
let checked = 0;
for (const pkg of packages) {
  if (pkg.name === rootName && pkg.location === "") continue; // 우리 프로젝트 자신
  checked += 1;
  const license =
    typeof pkg.license === "string" ? pkg.license : pkg.license?.type;
  if (isAllowed(license) || matchesException(pkg.name)) continue;
  violations.push(
    `${pkg.name}@${pkg.version}  —  ${license ?? "(라이선스 없음)"}`,
  );
}

if (violations.length > 0) {
  console.error(`❌ 허용되지 않은 라이선스 ${violations.length}건 (ADR 0034):`);
  for (const v of [...new Set(violations)].sort()) console.error(`  - ${v}`);
  console.error(
    "허용형이면 license-policy.json 예외에 이유와 함께 등록하고 docs/quality/license-audit.md에 기록한다.",
  );
  process.exit(1);
}
console.log(
  `✅ 라이선스 검사 통과 — 패키지 ${checked}개 (예외 ${policy.exceptions.length}건 적용)`,
);
