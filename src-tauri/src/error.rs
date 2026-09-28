//! bridge 에러 타입.
//!
//! [목적] 모든 command 실패를 `{code, message}` 한 형태로 ui 에 넘긴다(contract.md `BridgeError`).
//! [규칙] code 는 `영역.사유` snake_case (예: `asset.too_large`, `settings.invalid`, `window.not_found`).
//!        message 는 사용자에게 그대로 보여줄 수 있는 한국어 문장.
//! [unsafe] 없음.

use serde::Serialize;

#[derive(Debug, Clone, Serialize, thiserror::Error)]
#[serde(rename_all = "camelCase")]
#[error("{code}: {message}")]
pub struct BridgeError {
    pub code: String,
    pub message: String,
}

impl BridgeError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

impl From<tauri::Error> for BridgeError {
    fn from(e: tauri::Error) -> Self {
        Self::new("tauri.error", e.to_string())
    }
}

impl From<std::io::Error> for BridgeError {
    fn from(e: std::io::Error) -> Self {
        Self::new("io.error", format!("파일 처리 중 오류가 발생했습니다: {e}"))
    }
}

impl From<crate::assets::AssetError> for BridgeError {
    fn from(e: crate::assets::AssetError) -> Self {
        Self::new(e.code(), e.to_string())
    }
}

impl From<crate::settings::SettingsError> for BridgeError {
    fn from(e: crate::settings::SettingsError) -> Self {
        Self::new(e.code(), e.to_string())
    }
}
