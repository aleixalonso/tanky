use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, Position, Size, WindowEvent, Wry};

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let refresh_item = MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&refresh_item, &quit_item])?;

      let tray_icon = Image::from_bytes(include_bytes!("../icons/icon.png"))?;
      if let Some(main_window) = app.get_webview_window("main") {
        let _ = move_window_offscreen(&main_window);
        let window_for_blur = main_window.clone();
        main_window.on_window_event(move |event| {
          if matches!(event, WindowEvent::Focused(false)) {
            let _ = window_for_blur.hide();
            let _ = move_window_offscreen(&window_for_blur);
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
            rect,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let _ = toggle_main_window(tray.app_handle(), rect.position, rect.size);
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
  icon_position: Position,
  icon_size: Size,
) -> tauri::Result<()> {
  let Some(window) = app.get_webview_window("main") else {
    return Ok(());
  };

  if window.is_visible()? {
    window.hide()?;
    move_window_offscreen(&window)?;
  } else {
    position_main_window_at_tray_icon(&window, app, icon_position, icon_size)?;
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

fn position_main_window_at_tray_icon(
  window: &tauri::WebviewWindow<Wry>,
  app: &AppHandle<Wry>,
  icon_position: Position,
  icon_size: Size,
) -> tauri::Result<()> {
  let (icon_x, icon_y) = match icon_position {
    Position::Physical(pos) => (pos.x as f64, pos.y as f64),
    Position::Logical(pos) => (pos.x, pos.y),
  };
  let (icon_w, icon_h) = match icon_size {
    Size::Physical(size) => (size.width as f64, size.height as f64),
    Size::Logical(size) => (size.width, size.height),
  };

  let monitor = app
    .monitor_from_point(icon_x, icon_y)?
    .or(app.primary_monitor()?)
    .ok_or_else(|| tauri::Error::FailedToReceiveMessage)?;
  let scale = monitor.scale_factor();

  let icon_logical_x = match icon_position {
    Position::Physical(_) => icon_x / scale,
    Position::Logical(_) => icon_x,
  };
  let icon_logical_y = match icon_position {
    Position::Physical(_) => icon_y / scale,
    Position::Logical(_) => icon_y,
  };
  let icon_logical_w = match icon_size {
    Size::Physical(_) => icon_w / scale,
    Size::Logical(_) => icon_w,
  };
  let icon_logical_h = match icon_size {
    Size::Physical(_) => icon_h / scale,
    Size::Logical(_) => icon_h,
  };

  let panel_width = match (window.outer_size(), window.scale_factor()) {
    (Ok(size), Ok(window_scale)) => size.width as f64 / window_scale,
    _ => 360.0,
  };

  let icon_center_x = icon_logical_x + (icon_logical_w / 2.0);
  let panel_x = icon_center_x - (panel_width / 2.0);
  let nudge_up = 6.0;
  let panel_y = icon_logical_y + icon_logical_h - nudge_up;

  window.set_position(tauri::LogicalPosition::new(panel_x, panel_y))?;

  Ok(())
}

fn move_window_offscreen(window: &tauri::WebviewWindow<Wry>) -> tauri::Result<()> {
  window.set_position(tauri::LogicalPosition::new(-10_000.0, -10_000.0))?;

  Ok(())
}
