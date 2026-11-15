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
  zero: `nutrition v1
project "just-html" version "1.0.0"
dependencies 0

group "Dependency composition" of dependencies
  item "Direct" 0
  item "Transitive" 0

note "Zero dependencies. All homemade."
`,
};
export type ExampleName = keyof typeof examples;
