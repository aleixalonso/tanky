mod location;
mod panel;

use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Listener};

const SPAIN_FUEL_DATASET_URL: &str =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

#[tauri::command]
fn get_current_location(
    app: tauri::AppHandle,
) -> Result<location::CurrentLocation, String> {
    location::get_current_location(&app)
}

#[tauri::command]
fn fetch_spain_fuel_dataset() -> Result<serde_json::Value, String> {
    let output = std::process::Command::new("/usr/bin/curl")
        .args([
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--header",
            "Accept: application/json",
            SPAIN_FUEL_DATASET_URL,
        ])
        .output()
        .map_err(|error| format!("Failed to run curl: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if stderr.is_empty() {
            format!("curl exited with status {}", output.status)
        } else {
            stderr
        };
        return Err(format!("Failed to load fuel dataset: {message}"));
    }

    serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Failed to parse fuel dataset: {error}"))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_nspanel::init())
        .invoke_handler(tauri::generate_handler![
            get_current_location,
            fetch_spain_fuel_dataset
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            panel::init(app.handle())?;

            let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&refresh_item, &quit_item])?;

            let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-template.png"))?;

            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon)
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "refresh" => {
                        let _ = panel::show_panel(app);
                        let _ = app.emit("tray-refresh", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        rect,
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = panel::toggle_panel(tray.app_handle(), rect.position, rect.size);
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            app.listen("quit-requested", move |_| {
                app_handle.exit(0);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
