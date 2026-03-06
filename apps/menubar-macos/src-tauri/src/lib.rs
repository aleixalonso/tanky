use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, PhysicalPosition, WindowEvent, Wry};

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&refresh_item, &quit_item])?;

      let tray_icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;
      if let Some(main_window) = app.get_webview_window("main") {
        let window_for_blur = main_window.clone();
        main_window.on_window_event(move |event| {
          if matches!(event, WindowEvent::Focused(false)) {
            let _ = window_for_blur.hide();
          }
        });
      }

      TrayIconBuilder::with_id("main-tray")
        .icon(tray_icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
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
            position,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let _ = toggle_main_window(tray.app_handle(), position);
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

fn toggle_main_window(
  app: &AppHandle<Wry>,
  click_position: PhysicalPosition<f64>,
) -> tauri::Result<()> {
  let Some(window) = app.get_webview_window("main") else {
    return Ok(());
  };

  if window.is_visible()? {
    window.hide()?;
  } else {
    position_main_window(&window, click_position, app)?;
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

fn position_main_window(
  window: &tauri::WebviewWindow<Wry>,
  click_position: PhysicalPosition<f64>,
  app: &AppHandle<Wry>,
) -> tauri::Result<()> {
  let window_size = window.outer_size()?;
  let width = window_size.width as i32;
  let height = window_size.height as i32;

  let mut x = click_position.x.round() as i32 - (width / 2);
  let mut y = click_position.y.round() as i32 + 8;

  if let Some(monitor) = app.monitor_from_point(click_position.x, click_position.y)? {
    let work_area = monitor.work_area();
    let min_x = work_area.position.x;
    let max_x = work_area.position.x + work_area.size.width as i32 - width;
    x = x.clamp(min_x, max_x);

    let max_y = work_area.position.y + work_area.size.height as i32;
    if y + height > max_y {
      y = click_position.y.round() as i32 - height - 8;
    }
  }

  window.set_position(PhysicalPosition::new(x, y))?;

  Ok(())
}
