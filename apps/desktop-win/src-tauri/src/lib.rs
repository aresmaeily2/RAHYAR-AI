use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalTaskRecord {
    pub id: String,
    pub title: String,
    pub status: String,
    pub due_at_utc: Option<String>,
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS local_tasks (
           id TEXT PRIMARY KEY,
           title TEXT NOT NULL,
           status TEXT NOT NULL,
           due_at_utc TEXT
         );",
    )
    .map_err(|e| e.to_string())
}

fn open_local_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db_path = dir.join("rahyar-local.db");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    init_schema(&conn)?;
    Ok(conn)
}

fn upsert_task_in_conn(conn: &Connection, task: &LocalTaskRecord) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO local_tasks (id, title, status, due_at_utc) VALUES (?1, ?2, ?3, ?4)",
        (&task.id, &task.title, &task.status, &task.due_at_utc),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn list_tasks_in_conn(conn: &Connection) -> Result<Vec<LocalTaskRecord>, String> {
    let mut stmt = conn
        .prepare("SELECT id, title, status, due_at_utc FROM local_tasks ORDER BY id ASC")
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
fn save_local_task(app: tauri::AppHandle, task: LocalTaskRecord) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    upsert_task_in_conn(&conn, &task)
}

#[tauri::command]
fn list_local_tasks(app: tauri::AppHandle) -> Result<Vec<LocalTaskRecord>, String> {
    let conn = open_local_db(&app)?;
    list_tasks_in_conn(&conn)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlite_local_task_roundtrip() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        init_schema(&conn).expect("schema init");
        let rec = LocalTaskRecord {
            id: "tsk_01".to_string(),
            title: "تماس با بانک".to_string(),
            status: "todo".to_string(),
            due_at_utc: Some("2026-11-26T09:00:00Z".to_string()),
        };
        upsert_task_in_conn(&conn, &rec).expect("insert");
        let rows = list_tasks_in_conn(&conn).expect("list");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0], rec);
    }
}
