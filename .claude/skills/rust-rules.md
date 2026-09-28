# Rust 코드 작성 규칙

core 계층(`src-tauri/src`) 공통 규칙. 설계 기준은 [core-design-strategy](core-design-strategy/SKILL.md), unsafe 격리는 그 스킬 §2.

## 포맷·린트
- `cargo fmt` 기본 설정 그대로. 별도 `rustfmt.toml` 옵션 추가 금지.
- `cargo clippy -- -D warnings` 경고 0. `#[allow(...)]`는 사유 주석과 함께 항목 단위로만.
- 파일 800줄, 함수 50줄 한계. 넘으면 분리한다.

## 에러 처리
```rust
// Bad
let cfg = fs::read_to_string(path).unwrap();
// Good
let cfg = fs::read_to_string(path).map_err(Error::Io)?;
```
- `unwrap()`·`expect()`·`panic!`은 `#[cfg(test)]` 안에서만.
- 공개 함수는 `Result<T, Error>`. 모듈별 `Error` enum(`thiserror`).
- 사용자 메시지는 한국어, 원인은 `#[source]`로 보존.

## 소유권·빌림
- 인자는 빌림(`&T`, `&str`, `&[T]`) 우선. 소유권 이동은 저장·스레드 전달 때만.
- `clone()`은 이유가 있을 때만(주석 한 줄). 루프 안 `clone()` 금지.
- `Arc<Mutex<T>>` 최소화. 필요하면 잠금 범위를 한 문장으로 줄이고, 잠근 채 IO·emit·다른 잠금 금지.
- 전역 상태는 `OnceLock`·`static AtomicX`. `static mut` 금지.

## 매직 넘버
```rust
// Bad
if elapsed > 16 { ... }
// Good
const MOUSE_MOVE_MIN_INTERVAL_MS: u64 = 16; // ≈60Hz 스로틀
if elapsed > MOUSE_MOVE_MIN_INTERVAL_MS { ... }
```
- 크기 제한·시간·Win32 상수는 `const`로. 확정사항 값(900×700, 1MB, 256, 300초)은 `settings` 또는 `assets` 모듈 상단 const.

## 문서주석
- 모듈 상단 `//!` 에 [목적][공개 API][스레드][unsafe][에러][설정][테스트] 항목.
- 공개 항목마다 `///` 한 줄 이상. 인자·반환·실패 조건을 적는다.
- `unsafe` 블록 바로 위 `// SAFETY:` 필수.

## serde
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub version: u32,
    #[serde(default = "default_scale")]
    pub scale_percent: u32,
}
```
- 밖으로 나가는 구조체는 `rename_all = "camelCase"`(TS와 일치).
- 누락 필드는 `#[serde(default)]`로 채운다. 알 수 없는 필드는 무시(기본 동작).
- enum은 `#[serde(rename_all = "snake_case")]` 문자열 태그. 숫자 태그 금지.

## 로그
- `log` 매크로(`log::info!`, `log::warn!`, `log::error!`). `println!`·`eprintln!` 금지.
- 훅 콜백 안에서는 로그도 금지(§3 최소 작업). 전달 스레드에서 남긴다.
- 사용자 개인 정보(경로 외 파일 내용, 입력 내용)는 로그에 남기지 않는다. 키 코드는 애초에 수집하지 않는다.

## 모듈·이름
- 모듈 = 폴더 + `mod.rs`, 공개 API는 `pub use`로 재노출.
- `snake_case` 함수·변수, `PascalCase` 타입, `SCREAMING_SNAKE_CASE` 상수.
- 동사로 시작하는 함수명: `start`, `stop`, `load`, `save`, `validate_png`.

## 테스트
- 순수 로직은 같은 파일 `#[cfg(test)] mod tests`. 파일 IO는 `tempfile::tempdir()`.
- 테스트 이름은 `동작_조건_기대` 형태: `validate_png_rejects_rgb_without_alpha`.
- 후킹은 자동 테스트 없음 → 수동 체크리스트 + 로그 캡처.

## 주석
- "무엇"이 아니라 "왜"를 적는다. 복잡한 Win32 호출 순서, 스로틀 근거, 재시도 정책.
- TODO는 `// TODO(요구ID): 내용` 형식. 요구ID 없는 TODO 금지.
