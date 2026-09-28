//! 내장 기본 이미지 내보내기(CR-035 DA-05).
//!
//! [목적] 사용자가 고른 폴더에 내장 기본 그림 6장(CR-044)을 원본 바이트 그대로 `{file_key}.png` 로 쓴다.
//! [충돌] 미리 검사한다(U-5 = A). overwrite=false 이고 같은 이름(파일·폴더)이 하나라도 있으면 아무것도 쓰지 않고
//!        conflicts 만 돌려준다. overwrite=true 면 전부 쓴다(conflicts 는 덮어쓴 목록 — 정보용).
//! [쓰기] 파일마다 `.{name}.kuro-tmp` 에 쓰고 rename(Windows std::fs::rename 은 기존 파일을 교체).
//!        한 장 실패는 failed 에 담고 계속한다.
//! [보안] 파일명은 내장 표에서만 만든다(사용자 입력 파일명 없음). 폴더는 절대 경로이면서 이미 있는 폴더만.
//!        에러 message·로그에 경로를 넣지 않는다.
//! [범위] 매니페스트·앱 데이터 폴더·이벤트와 무관.
//! [unsafe] 없음.
//! [테스트] tests/default_assets.rs export_*.

use std::fs;
use std::io;
use std::path::Path;

use serde::Serialize;

use super::defaults::DEFAULT_ASSETS;
use super::AssetError;

/// 내보내기 실패 1건.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportFailure {
    pub file_name: String,
    pub code: &'static str,
}

/// 내보내기 결과 보고. 필드는 모두 파일명(경로 없음).
#[derive(Serialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport {
    /// 쓴 파일명(DEFAULT_ASSETS 순서)
    pub written: Vec<String>,
    /// 쓰기 전에 이미 있던 이름
    pub conflicts: Vec<String>,
    /// 쓰지 못한 파일명 + 코드
    pub failed: Vec<ExportFailure>,
}

/// 내장 기본 그림 6장을 `dest_dir`에 내보낸다.
pub fn export_defaults(dest_dir: &Path, overwrite: bool) -> Result<ExportReport, AssetError> {
    if !dest_dir.is_absolute() || !dest_dir.is_dir() {
        return Err(AssetError::ExportDir);
    }
    let names: Vec<String> = DEFAULT_ASSETS.iter().map(|d| d.file_name()).collect();
    let conflicts: Vec<String> = names
        .iter()
        .filter(|n| dest_dir.join(n).exists())
        .cloned()
        .collect();
    let mut report = ExportReport {
        conflicts,
        ..ExportReport::default()
    };
    if !overwrite && !report.conflicts.is_empty() {
        return Ok(report);
    }
    for (d, name) in DEFAULT_ASSETS.iter().zip(names) {
        match write_via_temp(dest_dir, &name, d.bytes) {
            Ok(()) => report.written.push(name),
            Err(e) => {
                log::warn!("기본 이미지 내보내기 실패: {name} ({:?})", e.kind());
                let code = AssetError::from(e).code(); // "asset.io" — 코드 문자열의 원본은 code() 하나
                report.failed.push(ExportFailure {
                    file_name: name,
                    code,
                });
            }
        }
    }
    Ok(report)
}

/// 임시 파일에 쓰고 rename. 실패하면 임시 파일을 지운다(best-effort — 남아도 다음 내보내기가 덮어쓴다).
fn write_via_temp(dir: &Path, name: &str, bytes: &[u8]) -> io::Result<()> {
    let tmp = dir.join(format!(".{name}.kuro-tmp"));
    let result = fs::write(&tmp, bytes).and_then(|()| fs::rename(&tmp, dir.join(name)));
    if result.is_err() {
        let _ = fs::remove_file(&tmp);
    }
    result
}
