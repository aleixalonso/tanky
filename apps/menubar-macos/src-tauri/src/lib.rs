use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::image::Image;
use tauri::{AppHandle, Emitter, Listener, Manager, Wry};

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&refresh_item, &quit_item])?;

      let tray_icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;

      TrayIconBuilder::with_id("main-tray")
          .icon(tray_icon)
          .menu(&menu)
          .on_menu_event(move |app, event| match event.id.as_ref() {
            "refresh" => {
              let _ = show_main_window(app);
              let _ = app.emit("tray-refresh", ());
            }
            "quit" => {
              app.exit(0);
            }
            _ => {}
          })
          .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event
            {
              let _ = toggle_main_window(tray.app_handle());
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

fn toggle_main_window(app: &AppHandle<Wry>) -> tauri::Result<()> {
  let Some(window) = app.get_webview_window("main") else {
    return Ok(());
  };

  if window.is_visible()? {
    window.hide()?;
  } else {
    window.show()?;
    window.set_focus()?;
  }

  Ok(())
}

fn show_main_window(app: &AppHandle<Wry>) -> tauri::Result<()> {
  let Some(window) = app.get_webview_window("main") else {
    return Ok(());
  };

  window.show()?;
  window.set_focus()?;

  Ok(())
}
