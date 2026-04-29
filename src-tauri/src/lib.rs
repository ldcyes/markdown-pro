use std::{
    collections::HashSet,
    ffi::OsStr,
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, RunEvent};

const OPEN_MARKDOWN_FILES_EVENT: &str = "markdown-pro://open-files";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedMarkdownFile {
    path: String,
    file_name: String,
    content: String,
    last_modified: u64,
    size: u64,
}

fn is_markdown_file(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(OsStr::to_str)
            .map(|ext| matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown"))
            .unwrap_or(false)
}

fn resolve_markdown_path(argument: &OsStr, cwd: &Path) -> Option<PathBuf> {
    let raw_argument = argument.to_str()?;

    if raw_argument.starts_with('-') {
        return None;
    }

    let candidate = PathBuf::from(raw_argument);
    let resolved = if candidate.is_absolute() {
        candidate
    } else {
        cwd.join(candidate)
    };

    if !is_markdown_file(&resolved) {
        return None;
    }

    Some(fs::canonicalize(&resolved).unwrap_or(resolved))
}

fn collect_markdown_paths<I, S>(arguments: I, cwd: &Path) -> Vec<PathBuf>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let mut seen = HashSet::new();
    let mut paths = Vec::new();

    for argument in arguments.into_iter().skip(1) {
        let Some(path) = resolve_markdown_path(argument.as_ref(), cwd) else {
            continue;
        };

        let path_key = path.to_string_lossy().to_lowercase();
        if seen.insert(path_key) {
            paths.push(path);
        }
    }

    paths
}

fn read_markdown_file(path: &Path) -> Option<OpenedMarkdownFile> {
    let metadata = fs::metadata(path).ok()?;
    let content = fs::read_to_string(path).ok()?;
    let last_modified = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0);

    Some(OpenedMarkdownFile {
        path: path.to_string_lossy().into_owned(),
        file_name: path.file_name()?.to_string_lossy().into_owned(),
        content,
        last_modified,
        size: metadata.len(),
    })
}

fn read_markdown_files<I>(paths: I) -> Vec<OpenedMarkdownFile>
where
    I: IntoIterator<Item = PathBuf>,
{
    paths
        .into_iter()
        .filter_map(|path| read_markdown_file(&path))
        .collect()
}

fn collect_startup_markdown_files() -> Vec<OpenedMarkdownFile> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let paths = collect_markdown_paths(std::env::args_os(), &cwd);
    read_markdown_files(paths)
}

#[tauri::command]
fn get_startup_markdown_files() -> Vec<OpenedMarkdownFile> {
    collect_startup_markdown_files()
}

fn reveal_main_window<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn emit_opened_markdown_files<R: tauri::Runtime>(app: &AppHandle<R>, files: Vec<OpenedMarkdownFile>) {
    if files.is_empty() {
        return;
    }

    let _ = app.emit(OPEN_MARKDOWN_FILES_EVENT, files);
    reveal_main_window(app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, arguments, cwd| {
            let paths = collect_markdown_paths(arguments, Path::new(&cwd));
            let files = read_markdown_files(paths);
            emit_opened_markdown_files(app, files);
        }))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_startup_markdown_files])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Opened { paths } = event {
                let files = read_markdown_files(paths);
                emit_opened_markdown_files(app, files);
            }
        });
}

#[cfg(test)]
mod tests {
    use super::{collect_markdown_paths, read_markdown_file};
    use std::{
        ffi::OsStr,
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_file_path(file_name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time before unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("markdown-pro-{unique}-{file_name}"))
    }

    #[test]
    fn collect_markdown_paths_keeps_existing_markdown_arguments() {
        let markdown_path = temp_file_path("notes.md");
        let text_path = temp_file_path("notes.txt");
        fs::write(&markdown_path, "# Notes").expect("write markdown fixture");
        fs::write(&text_path, "ignore").expect("write text fixture");

        let cwd = markdown_path
            .parent()
            .expect("temporary file should have a parent");
        let paths = collect_markdown_paths(
            [
                OsStr::new("markdown-pro"),
                OsStr::new("notes.md"),
                OsStr::new("--flag"),
                OsStr::new("notes.txt"),
            ],
            cwd,
        );

        assert_eq!(paths, vec![fs::canonicalize(&markdown_path).expect("canonical markdown path")]);

        let _ = fs::remove_file(markdown_path);
        let _ = fs::remove_file(text_path);
    }

    #[test]
    fn read_markdown_file_returns_serializable_snapshot() {
        let markdown_path = temp_file_path("release-notes.md");
        fs::write(&markdown_path, "## Release").expect("write markdown fixture");

        let snapshot = read_markdown_file(&markdown_path).expect("markdown file snapshot");
        assert_eq!(snapshot.file_name, "release-notes.md");
        assert_eq!(snapshot.content, "## Release");
        assert_eq!(snapshot.size, "## Release".len() as u64);
        assert!(snapshot.last_modified > 0);
        assert_eq!(
            snapshot.path,
            markdown_path.to_string_lossy().into_owned()
        );

        let _ = fs::remove_file(markdown_path);
    }
}
