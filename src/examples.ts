export const examples = {
  classic: `nutrition v1
project "tiny-app" version "1.0.0"
serving "1 release"
scope "Runtime dependencies"
dependencies 128

group "Dependency composition" of dependencies
  item "Direct" 12
  item "Transitive" 116
    includes "Optional" 16

group "License declarations" of dependencies
  item "MIT" 96
  item "Apache-2.0" 24
  item "Unspecified" 8

note "Made with care. And probably too much coffee."
`,
  korean: `nutrition v1
project "작은 도구" version "1.0.0"
serving "릴리스 1개"
scope "실행용 의존성"
dependencies 24

group "의존성 구성" of dependencies
  item "직접 의존성" 6
  item "간접 의존성" 18
    includes "선택 의존성" 3

group "라이선스 구성" of dependencies
  item "MIT" 20
  item "미확인" 4

note "정성을 담았습니다. 커피도 조금."
`,
  rust: `nutrition v1
project "Trail CLI" version "0.9.0"
description "Rust command-line tool for local log analysis"
scope "Cargo packages · fictional example"
packages 12

group "Composition" of packages
  item "Command-line interface" 3
    includes "clap" 1
    includes "anstream" 1
  item "Data processing" 5
    includes "serde" 1
    includes "regex" 1
  item "Platform helpers" 4
    includes "libc" 1

group "Declared licenses" of packages
  item "MIT OR Apache-2.0" 10
  item "MIT" 2

note "Fictional inventory. Dual-license expressions are preserved."
`,
  zero: `nutrition v1
project "just-html" version "1.0.0"
dependencies 0

group "Dependency composition" of dependencies
  item "Direct" 0
  item "Transitive" 0

note "Zero dependencies. All homemade."
`,
  api: `nutrition v1
project "Pantry API" version "1.4.0"
serving "1 SBOM"
scope "SBOM package inventory · all scopes"
source "SPDX-2.3 (JSON)"
description "Node.js REST API · PostgreSQL / Redis"
supplier "Organization: Pantry Example"
generator "Nibmark fictional example"
created "2026-11-16T00:00:00Z"
packages 24

group "Composition" of packages
  item "Frameworks" 1
    includes "fastify @ 1.0.0" 1
  item "Libraries" 19
    includes "ioredis @ 1.0.0" 1
    includes "pg @ 1.0.0" 1
    includes "pino @ 1.0.0" 1
  item "Applications" 4
    includes "typescript @ 1.0.0" 1
    includes "vitest @ 1.0.0" 1
    includes "build-helper @ 1.0.0" 1

group "Recorded relationships" of packages
  item "Direct" 6
    includes "Runtime edge" 4
    includes "Development edge" 2
  item "Transitive" 18
    includes "Runtime edge" 16
    includes "Development edge" 2
  item "Unclassified" 0

group "Declared licenses" of packages
  item "MIT" 20
  item "Apache-2.0" 3
  item "NOASSERTION" 1

group "Package ecosystems" of packages
  item "npm" 24

note "Purposes follow SBOM records. Selected names only. Edges may be incomplete or overlap; runtime scope is not inferred."
`,
  web: `nutrition v1
project "Canvas Web" version "2.1.0"
description "Interactive browser app built with React and Vite"
serving "1 project"
scope "Application and build packages · fictional example"
packages 16

group "Composition" of packages
  item "UI libraries" 6
    includes "React" 1
    includes "React DOM" 1
  item "Build tools" 4
    includes "Vite" 1
    includes "TypeScript" 1
  item "Other libraries" 6

group "Declared licenses" of packages
  item "MIT" 14
  item "Apache-2.0" 2

note "Fictional composition for trying Nibmark. Included names are examples within each parent, not an exhaustive list."
`,
  python: `nutrition v1
project "Field Notes" version "0.8.0"
description "Python data pipeline for collecting and analyzing tables"
serving "1 environment"
scope "Data, numerical and command-line packages · fictional example"
packages 18

group "Composition" of packages
  item "Data processing" 6
    includes "pandas" 1
    includes "PyArrow" 1
  item "Numerical computing" 4
    includes "NumPy" 1
    includes "SciPy" 1
  item "CLI and helpers" 8
    includes "Click" 1

group "Declared licenses" of packages
  item "BSD-3-Clause" 12
  item "Apache-2.0" 4
  item "MIT" 2

group "Package ecosystems" of packages
  item "PyPI" 18

note "Fictional data-tool recipe. These illustrative package counts and licenses do not describe a real release."
`,
  container: `nutrition v1
project "Edge Container" version "3.0.0"
description "Small Linux container serving static assets with nginx"
serving "1 container image"
scope "Image inventory · fictional example"
packages 24

group "Composition" of packages
  item "Operating system packages" 22
    includes "BusyBox" 1
    includes "OpenSSL" 1
    includes "curl" 1
  item "Application packages" 2
    includes "nginx" 1
    includes "entrypoint scripts" 1

group "Declared licenses" of packages
  item "GPL-2.0-only" 12
  item "BSD-2-Clause" 4
  item "MIT" 6
  item "NOASSERTION" 2

note "Fictional container inventory. Being included in an image does not establish a runtime dependency relationship."
`,
};
export type ExampleName = keyof typeof examples;

// Keep the Korean recipe as a regression fixture; language is chosen separately in the UI.
export const exampleNames = (Object.keys(examples) as ExampleName[]).filter(
  (name) => name !== 'korean',
);
