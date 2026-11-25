use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_notification::NotificationExt;

#[derive(Serialize, Deserialize)]
pub struct LocalTaskRecord {
    pub id: String,
    pub title: String,
    pub status: String,
    pub due_at_utc: Option<String>,
}

fn open_local_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db_path = dir.join("rahyar-local.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS local_tasks (
           id TEXT PRIMARY KEY,
           title TEXT NOT NULL,
           status TEXT NOT NULL,
           due_at_utc TEXT
         );",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
fn save_local_task(app: tauri::AppHandle, task: LocalTaskRecord) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute(
        "INSERT OR REPLACE INTO local_tasks (id, title, status, due_at_utc) VALUES (?1, ?2, ?3, ?4)",
        (&task.id, &task.title, &task.status, &task.due_at_utc),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_local_tasks(app: tauri::AppHandle) -> Result<Vec<LocalTaskRecord>, String> {
    let conn = open_local_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, title, status, due_at_utc FROM local_tasks")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LocalTaskRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                due_at_utc: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
fn send_native_reminder(app: tauri::AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let open_i = MenuItem::with_id(app, "open", "Open RahyAr / باز کردن رهیار", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit / خروج", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;
            TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_local_task,
            list_local_tasks,
            send_native_reminder
        ])
        .run(tauri::generate_context!())
        .expect("error while running RahyAr Windows Desktop");
}
