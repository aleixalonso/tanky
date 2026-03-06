use tauri::{AppHandle, Manager, Position, Size};
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelLevel, StyleMask, WebviewWindowExt,
};

macro_rules! get_or_init_panel {
    ($app_handle:expr) => {
        match $app_handle.get_webview_panel("main") {
            Ok(panel) => Some(panel),
            Err(_) => {
                if crate::panel::init($app_handle).is_err() {
                    None
                } else {
                    $app_handle.get_webview_panel("main").ok()
                }
            }
        }
    };
}

tauri_panel! {
  panel!(TankyPanel {
    config: {
      can_become_key_window: true,
      is_floating_panel: true
    }
  })

  panel_event!(TankyPanelEventHandler {
    window_did_resign_key(notification: &objc2_foundation::NSNotification) -> ()
  })
}

pub fn init(app_handle: &AppHandle) -> tauri::Result<()> {
    if app_handle.get_webview_panel("main").is_ok() {
        return Ok(());
    }

    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| tauri::Error::AssetNotFound("main".into()))?;
    let panel = window.to_panel::<TankyPanel>()?;

    // Match native menubar-panel look by removing opaque white backing/shadow.
    panel.set_has_shadow(false);
    panel.set_opaque(false);
    panel.set_level(PanelLevel::MainMenu.value() + 1);
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .move_to_active_space()
            .full_screen_auxiliary()
            .value(),
    );
    panel.set_style_mask(StyleMask::empty().nonactivating_panel().value());

    let event_handler = TankyPanelEventHandler::new();
    let handle = app_handle.clone();
    event_handler.window_did_resign_key(move |_notification| {
        if let Ok(panel) = handle.get_webview_panel("main") {
            panel.hide();
        }
    });
    panel.set_event_handler(Some(event_handler.as_ref()));

    Ok(())
}

pub fn toggle_panel(
    app_handle: &AppHandle,
    icon_position: Position,
    icon_size: Size,
) -> tauri::Result<()> {
    let Some(panel) = get_or_init_panel!(app_handle) else {
        return Ok(());
    };

    if panel.is_visible() {
        panel.hide();
        return Ok(());
    }

    position_panel_at_tray_icon(app_handle, icon_position, icon_size)?;
    panel.show_and_make_key();

    Ok(())
}

pub fn show_panel(app_handle: &AppHandle) -> tauri::Result<()> {
    let Some(panel) = get_or_init_panel!(app_handle) else {
        return Ok(());
    };

    panel.show_and_make_key();
    Ok(())
}

pub fn position_panel_at_tray_icon(
    app_handle: &AppHandle,
    icon_position: Position,
    icon_size: Size,
) -> tauri::Result<()> {
    let window = app_handle
        .get_webview_window("main")
        .ok_or_else(|| tauri::Error::AssetNotFound("main".into()))?;

    let (icon_x, icon_y) = match icon_position {
        Position::Physical(pos) => (pos.x as f64, pos.y as f64),
        Position::Logical(pos) => (pos.x, pos.y),
    };
    let (icon_w, icon_h) = match icon_size {
        Size::Physical(size) => (size.width as f64, size.height as f64),
        Size::Logical(size) => (size.width, size.height),
    };

    let monitor = app_handle
        .monitor_from_point(icon_x, icon_y)?
        .or(app_handle.primary_monitor()?)
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
    let panel_y = icon_logical_y + icon_logical_h - 6.0;

    window.set_position(tauri::LogicalPosition::new(panel_x, panel_y))?;

    Ok(())
}
