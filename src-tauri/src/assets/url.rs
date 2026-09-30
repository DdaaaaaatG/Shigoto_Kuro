//! 에셋 asset 프로토콜 URL 생성(SV2-07).
//!
//! [목적] `AssetEntry.url`을 만든다. `import`가 만드는 url 끝에는 파일 수정 시각(ms)을
//!        `?v=`로 붙여, 같은 슬롯을 다른 그림으로 바꾸면 url이 달라지게 한다(WebView가 옛
//!        그림을 캐시로 보여주던 결함 방지).
//! [공개 API] `asset_url(path) -> String`(불변). `versioned_asset_url`은 `assets` 모듈
//!        내부와 `presets`(`pub(crate)`)에서 쓴다.
//! [unsafe] 없음.
//! [테스트] `with_version` 단위(V1·V2), `import`가 만든 url 형태(V3·V4, tempdir),
//!        `encode_uri_component` 왕복(V5).

use std::path::Path;
use std::time::SystemTime;

/// Tauri asset 프로토콜 URL. 프론트 `convertFileSrc(path)` 와 같은 규칙:
/// Windows 는 `http://asset.localhost/` + encodeURIComponent(경로).
pub fn asset_url(path: &Path) -> String {
    let raw = path.to_string_lossy();
    format!("http://asset.localhost/{}", encode_uri_component(&raw))
}

/// `asset_url` 뒤에 `?v={파일 수정 시각 ms}`를 붙인다(SV2-07). `import`가 파일을 쓴 직후
/// 호출해 그 순간의 수정 시각을 반영한다.
pub(crate) fn versioned_asset_url(path: &Path) -> String {
    let modified = std::fs::metadata(path).and_then(|m| m.modified()).ok();
    with_version(asset_url(path), modified)
}

/// `modified`가 `UNIX_EPOCH` 이후면 `?v={ms}`를 붙인다. `None`이거나 그 이전이면 그대로(순수).
fn with_version(base: String, modified: Option<SystemTime>) -> String {
    match modified.and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok()) {
        Some(d) => format!("{base}?v={}", d.as_millis()),
        None => base,
    }
}

/// JS encodeURIComponent 와 동일: A-Z a-z 0-9 - _ . ! ~ * ' ( ) 만 남기고 UTF-8 바이트를 %XX 로.
fn encode_uri_component(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 3);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'!'
            | b'~'
            | b'*'
            | b'\''
            | b'('
            | b')' => out.push(b as char),
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn with_version_appends_millis() {
        let modified = SystemTime::UNIX_EPOCH + Duration::from_millis(1234);
        assert_eq!(with_version("u".into(), Some(modified)), "u?v=1234");
    }

    #[test]
    fn with_version_none_keeps_base() {
        assert_eq!(with_version("u".into(), None), "u");
        let before_epoch = SystemTime::UNIX_EPOCH - Duration::from_secs(1);
        assert_eq!(with_version("u".into(), Some(before_epoch)), "u");
    }

    #[test]
    fn import_url_has_version() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("kb_up.png");
        std::fs::write(&file, b"data").expect("write");

        let url = versioned_asset_url(&file);
        let base = asset_url(&file);
        assert!(url.starts_with(&format!("{base}?v=")));
        let version = url.rsplit("?v=").next().expect("version part");
        assert!(version.chars().all(|c| c.is_ascii_digit()) && !version.is_empty());
    }

    #[test]
    fn reimport_same_slot_changes_url() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("kb_up.png");
        std::fs::write(&file, b"a").expect("write a");
        let url_a = versioned_asset_url(&file);
        std::thread::sleep(Duration::from_millis(20));
        std::fs::write(&file, b"b").expect("write b");
        let url_b = versioned_asset_url(&file);

        assert_ne!(url_a, url_b);
        let base_a = url_a.split('?').next().expect("base");
        let base_b = url_b.split('?').next().expect("base");
        assert_eq!(base_a, base_b);
    }

    #[test]
    fn encode_uri_component_unchanged() {
        assert_eq!(
            encode_uri_component("C:\\a b/한.png"),
            "C%3A%5Ca%20b%2F%ED%95%9C.png"
        );
    }
}
