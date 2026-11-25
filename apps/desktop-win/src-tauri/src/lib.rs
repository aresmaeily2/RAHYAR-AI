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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalAccountRecord {
    pub id: String,
    pub name: String,
    pub currency: String,
    pub opening_minor: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalTxRecord {
    pub id: String,
    pub account_id: String,
    pub to_account_id: Option<String>,
    pub kind: String,
    pub amount_minor: i64,
    pub currency: String,
    pub category: String,
    pub note: String,
    pub occurred_date: String,
    pub confirmed: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalAuditRecord {
    pub id: i64,
    pub command_text: String,
    pub provider: String,
    pub tier: String,
    pub decision: String,
    pub result_text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DbStatusInfo {
    pub db_path: String,
    pub tasks_count: i64,
    pub accounts_count: i64,
    pub txs_count: i64,
    pub audits_count: i64,
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         CREATE TABLE IF NOT EXISTS local_tasks (
           id TEXT PRIMARY KEY,
           title TEXT NOT NULL,
           status TEXT NOT NULL,
           due_at_utc TEXT
         );
         CREATE TABLE IF NOT EXISTS local_accounts (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           currency TEXT NOT NULL,
           opening_minor INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS local_txs (
           id TEXT PRIMARY KEY,
           account_id TEXT NOT NULL,
           to_account_id TEXT,
           kind TEXT NOT NULL,
           amount_minor INTEGER NOT NULL,
           currency TEXT NOT NULL,
           category TEXT NOT NULL,
           note TEXT NOT NULL,
           occurred_date TEXT NOT NULL,
           confirmed INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS local_audit (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           command_text TEXT NOT NULL,
           provider TEXT NOT NULL,
           tier TEXT NOT NULL,
           decision TEXT NOT NULL,
           result_text TEXT NOT NULL
         );
         CREATE TABLE IF NOT EXISTS local_prefs (
           pref_key TEXT PRIMARY KEY,
           pref_val TEXT NOT NULL
         );",
    )
    .map_err(|e| e.to_string())
}

fn db_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("rahyar-local.db"))
}

fn open_local_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let db_path = db_file_path(app)?;
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

fn upsert_account_in_conn(conn: &Connection, acc: &LocalAccountRecord) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO local_accounts (id, name, currency, opening_minor) VALUES (?1, ?2, ?3, ?4)",
        (&acc.id, &acc.name, &acc.currency, acc.opening_minor),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn list_accounts_in_conn(conn: &Connection) -> Result<Vec<LocalAccountRecord>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, currency, opening_minor FROM local_accounts ORDER BY id ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LocalAccountRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                currency: row.get(2)?,
                opening_minor: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

fn upsert_tx_in_conn(conn: &Connection, tx: &LocalTxRecord) -> Result<(), String> {
    let conf: i64 = if tx.confirmed { 1 } else { 0 };
    conn.execute(
        "INSERT OR REPLACE INTO local_txs (id, account_id, to_account_id, kind, amount_minor, currency, category, note, occurred_date, confirmed) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &tx.id,
            &tx.account_id,
            &tx.to_account_id,
            &tx.kind,
            tx.amount_minor,
            &tx.currency,
            &tx.category,
            &tx.note,
            &tx.occurred_date,
            conf,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

fn list_txs_in_conn(conn: &Connection) -> Result<Vec<LocalTxRecord>, String> {
    let mut stmt = conn
        .prepare("SELECT id, account_id, to_account_id, kind, amount_minor, currency, category, note, occurred_date, confirmed FROM local_txs ORDER BY occurred_date DESC, id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let conf_i: i64 = row.get(9)?;
            Ok(LocalTxRecord {
                id: row.get(0)?,
                account_id: row.get(1)?,
                to_account_id: row.get(2)?,
                kind: row.get(3)?,
                amount_minor: row.get(4)?,
                currency: row.get(5)?,
                category: row.get(6)?,
                note: row.get(7)?,
                occurred_date: row.get(8)?,
                confirmed: conf_i == 1,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

fn compute_balance_minor(acc: &LocalAccountRecord, txs: &[LocalTxRecord]) -> i64 {
    let mut bal = acc.opening_minor;
    for tx in txs {
        if !tx.confirmed {
            continue;
        }
        match tx.kind.as_str() {
            "income" if tx.account_id == acc.id => bal += tx.amount_minor,
            "expense" if tx.account_id == acc.id => bal -= tx.amount_minor,
            "transfer" => {
                if tx.account_id == acc.id {
                    bal -= tx.amount_minor;
                }
                if tx.to_account_id.as_deref() == Some(acc.id.as_str()) {
                    bal += tx.amount_minor;
                }
            }
            _ => {}
        }
    }
    bal
}

#[tauri::command]
fn save_local_task(app: tauri::AppHandle, task: LocalTaskRecord) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    upsert_task_in_conn(&conn, &task)
}

#[tauri::command]
fn delete_local_task(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute("DELETE FROM local_tasks WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_local_tasks(app: tauri::AppHandle) -> Result<Vec<LocalTaskRecord>, String> {
    let conn = open_local_db(&app)?;
    list_tasks_in_conn(&conn)
}

#[tauri::command]
fn save_local_account(app: tauri::AppHandle, account: LocalAccountRecord) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    upsert_account_in_conn(&conn, &account)
}

#[tauri::command]
fn list_local_accounts(app: tauri::AppHandle) -> Result<Vec<LocalAccountRecord>, String> {
    let conn = open_local_db(&app)?;
    list_accounts_in_conn(&conn)
}

#[tauri::command]
fn save_local_tx(app: tauri::AppHandle, tx: LocalTxRecord) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    upsert_tx_in_conn(&conn, &tx)
}

#[tauri::command]
fn confirm_local_tx(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute("UPDATE local_txs SET confirmed = 1 WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_local_tx(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute("DELETE FROM local_txs WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_local_txs(app: tauri::AppHandle) -> Result<Vec<LocalTxRecord>, String> {
    let conn = open_local_db(&app)?;
    list_txs_in_conn(&conn)
}

#[tauri::command]
fn append_local_audit(
    app: tauri::AppHandle,
    command_text: String,
    provider: String,
    tier: String,
    decision: String,
    result_text: String,
) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute(
        "INSERT INTO local_audit (command_text, provider, tier, decision, result_text) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&command_text, &provider, &tier, &decision, &result_text),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_local_audits(app: tauri::AppHandle) -> Result<Vec<LocalAuditRecord>, String> {
    let conn = open_local_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, command_text, provider, tier, decision, result_text FROM local_audit ORDER BY id DESC LIMIT 40")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LocalAuditRecord {
                id: row.get(0)?,
                command_text: row.get(1)?,
                provider: row.get(2)?,
                tier: row.get(3)?,
                decision: row.get(4)?,
                result_text: row.get(5)?,
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
fn set_local_pref(app: tauri::AppHandle, key: String, val: String) -> Result<(), String> {
    let conn = open_local_db(&app)?;
    conn.execute(
        "INSERT OR REPLACE INTO local_prefs (pref_key, pref_val) VALUES (?1, ?2)",
        (&key, &val),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_local_pref(app: tauri::AppHandle, key: String, fallback: String) -> Result<String, String> {
    let conn = open_local_db(&app)?;
    let res: Result<String, _> = conn.query_row(
        "SELECT pref_val FROM local_prefs WHERE pref_key = ?1",
        [&key],
        |row| row.get(0),
    );
    Ok(res.unwrap_or(fallback))
}

#[tauri::command]
fn get_db_status(app: tauri::AppHandle) -> Result<DbStatusInfo, String> {
    let path = db_file_path(&app)?;
    let conn = open_local_db(&app)?;
    let tasks_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_tasks", [], |r| r.get(0)).unwrap_or(0);
    let accounts_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_accounts", [], |r| r.get(0)).unwrap_or(0);
    let txs_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_txs", [], |r| r.get(0)).unwrap_or(0);
    let audits_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_audit", [], |r| r.get(0)).unwrap_or(0);
    Ok(DbStatusInfo {
        db_path: path.to_string_lossy().to_string(),
        tasks_count,
        accounts_count,
        txs_count,
        audits_count,
    })
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
            // Initialize SQLite WAL immediately on launch so user DB is ready
            let _ = open_local_db(app.handle());
            let open_i = MenuItem::with_id(app, "open", "Open RahyAr / باز کردن رهیار", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit / خروج", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &quit_i])?;
            let mut tray = TrayIconBuilder::new()
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
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_local_task,
            delete_local_task,
            list_local_tasks,
            save_local_account,
            list_local_accounts,
            save_local_tx,
            confirm_local_tx,
            delete_local_tx,
            list_local_txs,
            append_local_audit,
            list_local_audits,
            set_local_pref,
            get_local_pref,
            get_db_status,
            send_native_reminder
        ])
        .run(tauri::generate_context!())
        .expect("error while running RahyAr Windows Desktop");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sqlite_local_task_and_finance_roundtrip() {
        let conn = Connection::open_in_memory().expect("in-memory sqlite");
        init_schema(&conn).expect("schema init");
        let rec = LocalTaskRecord {
            id: "tsk_01".to_string(),
            title: "تماس با بانک".to_string(),
            status: "todo".to_string(),
            due_at_utc: Some("2026-11-26T09:00:00Z".to_string()),
        };
        upsert_task_in_conn(&conn, &rec).expect("insert task");
        let rows = list_tasks_in_conn(&conn).expect("list tasks");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0], rec);

        let acc1 = LocalAccountRecord { id: "a1".into(), name: "Checking".into(), currency: "IRT".into(), opening_minor: 5_000_000 };
        let acc2 = LocalAccountRecord { id: "a2".into(), name: "Savings".into(), currency: "IRT".into(), opening_minor: 1_000_000 };
        upsert_account_in_conn(&conn, &acc1).unwrap();
        upsert_account_in_conn(&conn, &acc2).unwrap();

        upsert_tx_in_conn(&conn, &LocalTxRecord {
            id: "tx1".into(), account_id: "a1".into(), to_account_id: Some("a2".into()),
            kind: "transfer".into(), amount_minor: 500_000, currency: "IRT".into(),
            category: "transfer".into(), note: "Save".into(), occurred_date: "2026-11-25".into(), confirmed: true
        }).unwrap();
        // Unconfirmed CSV draft must NOT change balance
        upsert_tx_in_conn(&conn, &LocalTxRecord {
            id: "tx2".into(), account_id: "a1".into(), to_account_id: None,
            kind: "expense".into(), amount_minor: 999_999, currency: "IRT".into(),
            category: "bills".into(), note: "Draft".into(), occurred_date: "2026-11-25".into(), confirmed: false
        }).unwrap();

        let txs = list_txs_in_conn(&conn).unwrap();
        assert_eq!(compute_balance_minor(&acc1, &txs), 4_500_000);
        assert_eq!(compute_balance_minor(&acc2, &txs), 1_500_000);
    }
}
