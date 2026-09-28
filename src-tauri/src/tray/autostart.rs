//! 시작 시 자동 실행 — 작업 스케줄러(SV2-05, 🔒 D-4·D-5, CR-047 SEC-001 일반 권한 전환).
//!
//! [목적] 로그온 때 앱을 **일반 권한**으로 띄우는 작업 스케줄러 작업 `kuro_keyviewer`를
//!        등록·해제·조회한다. 관리자 권한으로 실행된 게임 안에서도 전역 입력을 받게 하려는
//!        목적(UIPI)은 그대로지만, 작업 자체는 `RunLevel=LeastPrivilege`라 등록·해제에 UAC
//!        승격이 필요 없다(CR-047, tray.md §3.5 — 실측 게이트 G1·G2 통과). 옛 버전이 관리자
//!        권한(`HighestAvailable`)으로 등록한 작업은 시작 시 `reconcile`이 일반 권한으로
//!        다시 등록한다.
//! [공개 API] `TASK_NAME`, `AutostartError`, `build_task_xml`, `set_enabled`, `reconcile`,
//!        `persist_autostart`.
//! [스레드] `set_enabled`·`reconcile`은 자식 프로세스가 끝날 때까지 블로킹한다. 메인
//!        스레드에서 부르지 않는다(호출자 bridge 는 `spawn_blocking`, `lib.rs`는 전용 스레드).
//!        `persist_autostart`는 `settings::update`(CR-047)로 저장한다.
//! [unsafe] 없음. 승격 실행 경로(`hook::run_elevated`)는 CR-047로 삭제됐다([hook.md](../../../../doc/200_설계/core/hook.md) §3.8).
//! [에러] `AutostartError::{Failed, Io, Settings}` — 잠금 오염은 `Settings(SettingsError::StatePoisoned)`
//!        (`code() == "state.poisoned"`, 기존 code 재사용).
//! [설정] 씀: `autostart`(기본 false) — 쓰기 주체는 `persist_autostart` 호출자(`set_autostart`
//!        성공 뒤, 시작 시 조회 보정)뿐이다.
//! [테스트] 단위: 작업 XML 생성·이스케이프·인자 목록·종료 코드 해석·임시 파일 수명·RunLevel
//!        해석(X1~X12, LP1~LP5). tempdir: `persist_autostart`(P1~P3). `set_enabled`·`reconcile`은
//!        작업 스케줄러가 필요해 자동 테스트하지 않는다 — 수동 체크리스트는 설계 문서
//!        `tray.md` §3.5.2·§8.3.

use std::env;
use std::ffi::OsString;
use std::fs::OpenOptions;
use std::io::Write;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use windows::Win32::System::Threading::CREATE_NO_WINDOW;

use crate::settings::{Settings, SettingsError};

pub const TASK_NAME: &str = "kuro_keyviewer";

#[derive(Debug, thiserror::Error)]
pub enum AutostartError {
    #[error("자동 실행 설정을 바꾸지 못했습니다. ({0})")]
    Failed(String),
    #[error("자동 실행 설정 파일을 만들지 못했습니다.")]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Settings(#[from] SettingsError),
}

impl AutostartError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::Failed(_) => "autostart.error",
            Self::Io(_) => "io.error",
            Self::Settings(e) => e.code(),
        }
    }
}

/// `%SystemRoot%\System32\schtasks.exe`(환경변수 없으면 `C:\Windows`). 절대 경로로 PATH
/// 가로채기를 막는다.
fn schtasks_path() -> PathBuf {
    let root = env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    Path::new(&root).join("System32").join("schtasks.exe")
}

/// 둘 다 있으면 `도메인\사용자`, 사용자만 있으면 `사용자`, 사용자가 없거나 빈 문자열이면 `None`(순수).
fn format_user_id(domain: Option<&str>, user: Option<&str>) -> Option<String> {
    let user = user.filter(|u| !u.is_empty())?;
    match domain.filter(|d| !d.is_empty()) {
        Some(d) => Some(format!("{d}\\{user}")),
        None => Some(user.to_string()),
    }
}

/// 비승격 앱 프로세스에서 로그인 사용자 이름을 읽는다.
fn current_user_id() -> Option<String> {
    format_user_id(
        env::var("USERDOMAIN").ok().as_deref(),
        env::var("USERNAME").ok().as_deref(),
    )
}

/// `&`→`&amp;` `<`→`&lt;` `>`→`&gt;` `"`→`&quot;` `'`→`&apos;` (`&`를 먼저 치환해 이중 치환을 막는다).
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// `[0xFF, 0xFE]` + UTF-16LE 바이트(BOM 포함).
fn utf16le_with_bom(s: &str) -> Vec<u8> {
    let mut out = vec![0xFFu8, 0xFE];
    for unit in s.encode_utf16() {
        out.extend_from_slice(&unit.to_le_bytes());
    }
    out
}

/// `["/Create", "/TN", "kuro_keyviewer", "/XML", <경로>, "/F"]`(`Command::args`용 — 경로는
/// 인용 불필요, `Command`가 인자 배열을 그대로 자식에 넘긴다).
fn create_args(xml_path: &Path) -> Vec<OsString> {
    vec![
        "/Create".into(),
        "/TN".into(),
        TASK_NAME.into(),
        "/XML".into(),
        xml_path.as_os_str().to_os_string(),
        "/F".into(),
    ]
}

fn delete_args() -> Vec<OsString> {
    vec![
        "/Delete".into(),
        "/TN".into(),
        TASK_NAME.into(),
        "/F".into(),
    ]
}

/// `Some(0)` → 있음, `Some(1)` → 없음, 그 밖(`None` 포함) → 판정 불가(§11 T1 실측 조건부).
fn interpret_query_exit(code: Option<i32>) -> Option<bool> {
    match code {
        Some(0) => Some(true),
        Some(1) => Some(false),
        _ => None,
    }
}

/// 등록 작업 상태(비공개). `/Query /XML` 결과 해석용.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskState {
    Missing,
    Standard,
    LegacyElevated,
}

/// 임시 XML 파일 수명 — 성공·실패와 무관하게 Drop 에서 지운다(실패는 무시).
struct TempXml(PathBuf);

impl Drop for TempXml {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

fn write_temp_xml(xml: &str) -> Result<TempXml, std::io::Error> {
    let path = env::temp_dir().join(format!("kuro_keyviewer_task_{}.xml", std::process::id()));
    if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)?;
    file.write_all(&utf16le_with_bom(xml))?;
    Ok(TempXml(path))
}

/// 작업 스케줄러 작업 XML(스키마 1.2). `exe_path`·`user_id`는 xml_escape 한다(순수, 단위
/// 테스트 대상). `exe_path`의 부모 폴더가 없거나 빈 경로면 `WorkingDirectory` 요소를 넣지 않는다.
/// `RunLevel`은 `LeastPrivilege`(CR-047) — 등록·해제에 UAC 승격이 필요 없다.
pub fn build_task_xml(exe_path: &Path, user_id: &str) -> String {
    let user = xml_escape(user_id);
    let exe = xml_escape(&exe_path.to_string_lossy());
    let dir = exe_path
        .parent()
        .filter(|d| !d.as_os_str().is_empty())
        .map(|d| {
            format!(
                "\n      <WorkingDirectory>{}</WorkingDirectory>",
                xml_escape(&d.to_string_lossy())
            )
        })
        .unwrap_or_default();
    format!(
        r#"<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>kuro_keyviewer autostart at logon</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>{user}</UserId>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{user}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>5</Priority>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{exe}</Command>{dir}
    </Exec>
  </Actions>
</Task>
"#
    )
}

/// `schtasks`를 비승격·창 없이(CREATE_NO_WINDOW) 실행하고 종료 코드를 돌려준다(stdout·stderr 버림).
fn run_schtasks(args: &[OsString]) -> Result<i32, AutostartError> {
    let status = Command::new(schtasks_path())
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW.0)
        .status()?;
    Ok(status.code().unwrap_or(-1))
}

/// `/Query /TN kuro_keyviewer /XML` → 종료 1 = Missing, 0 = `parse_run_level(stdout)`, 그 밖 = None.
/// 종료 0인데 해석 불가면 경고 로그 후 `Some(Standard)`(등록은 확실, 보정 안 함).
fn query_state() -> Option<TaskState> {
    let output = Command::new(schtasks_path())
        .args(["/Query", "/TN", TASK_NAME, "/XML"])
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW.0)
        .output()
        .ok()?;
    match output.status.code() {
        Some(1) => Some(TaskState::Missing),
        Some(0) => Some(parse_run_level(&output.stdout).unwrap_or_else(|| {
            log::warn!("자동 실행 작업 XML을 해석하지 못해 일반 등록으로 간주합니다");
            TaskState::Standard
        })),
        _ => None,
    }
}

/// stdout 바이트를 UTF-16LE(BOM 유무 무관) 또는 UTF-8 로 해석해 문자열로 돌려준다(순수).
fn decode_task_xml(bytes: &[u8]) -> String {
    let looks_utf16le = bytes.len() >= 2 && (bytes[0] == 0xFF && bytes[1] == 0xFE || bytes[1] == 0);
    if looks_utf16le {
        let start = if bytes.starts_with(&[0xFF, 0xFE]) {
            2
        } else {
            0
        };
        let units: Vec<u16> = bytes[start..]
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        String::from_utf16_lossy(&units)
    } else {
        String::from_utf8_lossy(bytes).into_owned()
    }
}

/// 순수: stdout 바이트 → RunLevel 판정. `HighestAvailable` 포함 → `LegacyElevated`,
/// `<Task` 포함 → `Standard`(RunLevel 없음 = 스키마 기본 LeastPrivilege), 그 밖 → `None`.
fn parse_run_level(stdout: &[u8]) -> Option<TaskState> {
    let text = decode_task_xml(stdout);
    if text.contains("HighestAvailable") {
        Some(TaskState::LegacyElevated)
    } else if text.contains("<Task") {
        Some(TaskState::Standard)
    } else {
        None
    }
}

fn enable() -> Result<bool, AutostartError> {
    let exe = env::current_exe()?;
    let user = current_user_id()
        .ok_or_else(|| AutostartError::Failed("현재 사용자 이름을 읽지 못했습니다".to_string()))?;
    let xml = build_task_xml(&exe, &user);
    let tmp = write_temp_xml(&xml)?;
    let code = run_schtasks(&create_args(&tmp.0))?;
    drop(tmp);
    if code == 0 {
        Ok(query().unwrap_or(true))
    } else {
        Err(AutostartError::Failed(format!("schtasks 종료 코드 {code}")))
    }
}

fn disable() -> Result<bool, AutostartError> {
    if query() == Some(false) {
        return Ok(false);
    }
    let code = run_schtasks(&delete_args())?;
    if code == 0 {
        Ok(query().unwrap_or(false))
    } else if query() == Some(false) {
        Ok(false)
    } else {
        Err(AutostartError::Failed(format!("schtasks 종료 코드 {code}")))
    }
}

/// 자동 실행을 켜거나 끈다. 자식 프로세스 종료까지 블로킹한다 — 메인 스레드에서 부르지 않는다.
/// 승격이 필요 없어졌지만(CR-047) 자식 프로세스 대기 자체는 여전히 블로킹이다.
pub fn set_enabled(enabled: bool) -> Result<bool, AutostartError> {
    let result = if enabled { enable() } else { disable() };
    log::info!(
        "자동 실행 설정 요청(enabled={enabled}): {}",
        match &result {
            Ok(v) => format!("성공(실제={v})"),
            Err(e) => format!("실패({})", e.code()),
        }
    );
    result
}

/// 작업 등록 여부를 비승격으로 조회한다. 있으면 `Some(true)`, 없으면 `Some(false)`,
/// 판정 불가하면 `None`.
fn query() -> Option<bool> {
    let status = Command::new(schtasks_path())
        .args(["/Query", "/TN", TASK_NAME])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .creation_flags(CREATE_NO_WINDOW.0)
        .status()
        .ok()?;
    interpret_query_exit(status.code())
}

/// 시작 시 자동 실행 상태를 보정한다(CR-047). 옛 관리자 권한(`HighestAvailable`) 작업이
/// 남아 있으면 일반 권한으로 다시 등록한다. 판정 불가하면 `None`.
pub fn reconcile() -> Option<bool> {
    match query_state()? {
        TaskState::Missing => Some(false),
        TaskState::Standard => Some(true),
        TaskState::LegacyElevated => {
            log::info!("옛 관리자 권한 자동 실행 작업을 일반 권한으로 다시 등록합니다");
            match enable() {
                Ok(v) => Some(v),
                Err(e) => {
                    log::warn!(
                        "옛 관리자 권한 자동 실행 작업을 바꾸지 못했습니다({})",
                        e.code()
                    );
                    Some(true)
                }
            }
        }
    }
}

/// 실제 등록 상태를 설정에 반영한다. 저장은 `settings::update`(CR-047) 하나로 한다.
pub fn persist_autostart(
    settings: &Mutex<Settings>,
    path: &Path,
    enabled: bool,
) -> Result<Option<Settings>, AutostartError> {
    let out = crate::settings::update(settings, path, |s| {
        s.autostart = enabled;
    })?;
    Ok(out.changed.then_some(out.settings))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn x1_task_xml_user_id_appears_twice() {
        let xml = build_task_xml(Path::new(r"C:\Apps\kuro\kuro_keyviewer.exe"), r"PC\kuro");
        assert_eq!(xml.matches(r"<UserId>PC\kuro</UserId>").count(), 2);
    }

    #[test]
    fn x2_task_xml_required_settings() {
        let xml = build_task_xml(Path::new(r"C:\Apps\kuro\kuro_keyviewer.exe"), r"PC\kuro");
        for needle in [
            "<RunLevel>LeastPrivilege</RunLevel>",
            "<LogonType>InteractiveToken</LogonType>",
            "<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>",
            "<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>",
            "<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>",
            "<Priority>5</Priority>",
            "<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>",
        ] {
            assert!(xml.contains(needle), "누락: {needle}");
        }
        assert!(!xml.contains("HighestAvailable"));
        assert!(!xml.contains("<Delay>"));
    }

    #[test]
    fn x3_task_xml_escapes_path() {
        let xml = build_task_xml(Path::new(r"C:\A&B's <x>\kuro.exe"), r#"D"x"#);
        assert!(xml.contains(r"C:\A&amp;B&apos;s &lt;x&gt;\kuro.exe"));
        assert!(xml.contains(r"<WorkingDirectory>C:\A&amp;B&apos;s &lt;x&gt;</WorkingDirectory>"));
        assert!(xml.contains("D&quot;x"));
        assert!(!xml.contains(r"C:\A&B's"));
        assert!(!xml.contains("<x>"));
    }

    #[test]
    fn x4_task_xml_without_parent_has_no_working_directory() {
        let xml = build_task_xml(Path::new("kuro.exe"), "user");
        assert!(!xml.contains("<WorkingDirectory>"));
    }

    #[test]
    fn x5_xml_escape_ampersand_first() {
        assert_eq!(xml_escape("&lt;"), "&amp;lt;");
    }

    #[test]
    fn x6_utf16le_bom_prefix() {
        let bytes = utf16le_with_bom("<a/>");
        assert_eq!(&bytes[0..2], &[0xFF, 0xFE]);
        assert_eq!(bytes.len(), 2 + 4 * 2);
        assert_eq!(bytes[2], b'<');
        assert_eq!(bytes[3], 0);
    }

    #[test]
    fn x7_create_args_list() {
        let path = Path::new(r"C:\Users\A B\Temp\kuro_keyviewer_task_7.xml");
        let args = create_args(path);
        let expected: Vec<OsString> = vec![
            "/Create".into(),
            "/TN".into(),
            TASK_NAME.into(),
            "/XML".into(),
            path.as_os_str().to_os_string(),
            "/F".into(),
        ];
        assert_eq!(args, expected);
    }

    #[test]
    fn x8_delete_args_list() {
        let expected: Vec<OsString> = vec![
            "/Delete".into(),
            "/TN".into(),
            TASK_NAME.into(),
            "/F".into(),
        ];
        assert_eq!(delete_args(), expected);
    }

    #[test]
    fn x9_interpret_query_exit_table() {
        assert_eq!(interpret_query_exit(Some(0)), Some(true));
        assert_eq!(interpret_query_exit(Some(1)), Some(false));
        assert_eq!(interpret_query_exit(Some(2)), None);
        assert_eq!(interpret_query_exit(None), None);
    }

    #[test]
    fn x10_format_user_id_cases() {
        assert_eq!(
            format_user_id(Some("PC"), Some("kuro")),
            Some(r"PC\kuro".to_string())
        );
        assert_eq!(format_user_id(None, Some("kuro")), Some("kuro".to_string()));
        assert_eq!(format_user_id(Some("PC"), None), None);
        assert_eq!(format_user_id(Some("PC"), Some("")), None);
    }

    #[test]
    fn x11_temp_xml_is_removed_on_drop() {
        let tmp = write_temp_xml("<a/>").expect("write");
        assert!(tmp.0.exists());
        let bytes = std::fs::read(&tmp.0).expect("read");
        assert_eq!(&bytes[0..2], &[0xFF, 0xFE]);
        let path = tmp.0.clone();
        drop(tmp);
        assert!(!path.exists());
    }

    #[test]
    fn x12_autostart_error_codes() {
        assert_eq!(AutostartError::Failed("x".into()).code(), "autostart.error");
        assert_eq!(
            AutostartError::Io(std::io::Error::other("x")).code(),
            "io.error"
        );
        assert_eq!(
            AutostartError::Settings(SettingsError::StatePoisoned).code(),
            "state.poisoned"
        );
        assert_eq!(
            AutostartError::Settings(SettingsError::Invalid("x".into())).code(),
            "settings.invalid"
        );
    }

    #[test]
    fn lp1_utf8_highest_available_is_legacy_elevated() {
        let xml = b"<Task><RunLevel>HighestAvailable</RunLevel></Task>";
        assert_eq!(parse_run_level(xml), Some(TaskState::LegacyElevated));
    }

    #[test]
    fn lp2_utf16le_highest_available_is_legacy_elevated() {
        let text = "<Task><RunLevel>HighestAvailable</RunLevel></Task>";
        let bytes = utf16le_with_bom(text);
        assert_eq!(parse_run_level(&bytes), Some(TaskState::LegacyElevated));
    }

    #[test]
    fn lp3_least_privilege_is_standard() {
        let xml = b"<Task><RunLevel>LeastPrivilege</RunLevel></Task>";
        assert_eq!(parse_run_level(xml), Some(TaskState::Standard));
    }

    #[test]
    fn lp4_task_without_run_level_is_standard() {
        let xml = b"<Task version=\"1.2\"></Task>";
        assert_eq!(parse_run_level(xml), Some(TaskState::Standard));
    }

    #[test]
    fn lp5_unrecognizable_output_is_none() {
        assert_eq!(parse_run_level(b""), None);
        assert_eq!(parse_run_level(b"ERROR: task not found"), None);
    }

    #[test]
    fn p1_persist_no_change_returns_none() {
        let m = Mutex::new(Settings::default());
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let result = persist_autostart(&m, &path, false).expect("ok");
        assert_eq!(result, None);
        assert!(!path.exists());
    }

    #[test]
    fn p2_persist_change_saves_and_updates_memory() {
        let m = Mutex::new(Settings::default());
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let result = persist_autostart(&m, &path, true)
            .expect("ok")
            .expect("changed");
        assert!(result.autostart);
        let loaded = crate::settings::load(&path).expect("load").expect("some");
        assert!(loaded.autostart);
        assert!(m.lock().expect("lock").autostart);
        assert_eq!(result.scale, Settings::default().scale);
    }

    #[test]
    fn p3_persist_poisoned_lock_returns_error() {
        let m = std::sync::Arc::new(Mutex::new(Settings::default()));
        let m_clone = m.clone();
        let handle = std::thread::spawn(move || {
            let _g = m_clone.lock().expect("lock");
            panic!("poison it");
        });
        let _ = handle.join();
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("settings.json");
        let result = persist_autostart(&m, &path, true);
        assert!(matches!(
            result,
            Err(AutostartError::Settings(SettingsError::StatePoisoned))
        ));
    }
}
