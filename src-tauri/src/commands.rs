use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use tauri_plugin_opener::OpenerExt;
use tracing::{info, warn};

use crate::config::{lock_or_recover, AppConfig, AppState, GeneralConfig, SaveResult, Shortcuts};
use crate::error::{AppError, AppResult};
use crate::shortcuts::{parse_shortcut, register_shortcuts};

fn duplicate_shortcut_errors(shortcuts: &Shortcuts) -> Vec<String> {
    let s = crate::i18n::strings();
    let actions = [
        (s.toggle_drawing, shortcuts.toggle_drawing.as_str()),
        (s.clear_drawing, shortcuts.clear_drawing.as_str()),
        (s.toggle_penetration, shortcuts.toggle_penetration.as_str()),
        ("Screenshot", shortcuts.screenshot.as_str()),
    ];
    let mut failed = Vec::new();
    for i in 0..actions.len() {
        for j in (i + 1)..actions.len() {
            if actions[i].1 == actions[j].1 {
                failed.push(format!(
                    "Duplicate shortcut: {} and {}",
                    actions[i].0, actions[j].0
                ));
            }
        }
    }
    failed
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, AppState>) -> AppConfig {
    lock_or_recover(&state.config).clone()
}

#[tauri::command]
pub fn get_overlay_pointer_position(
    app: AppHandle,
) -> Option<crate::monitor::OverlayPointerPosition> {
    crate::monitor::get_overlay_client_pointer(&app)
}

#[tauri::command]
pub fn get_overlay_monitor_logical_bounds(
    app: AppHandle,
) -> Option<crate::monitor::MonitorLogicalBounds> {
    crate::monitor::get_overlay_monitor_logical_bounds(&app)
}

#[tauri::command]
pub fn is_pointer_over_toolbar_panel(app: AppHandle) -> bool {
    crate::overlay::is_pointer_over_toolbar_panel(&app)
}

#[tauri::command]
pub fn set_overlay_ignore_cursor_events(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    ignore: bool,
) {
    crate::overlay::set_overlay_ignore_cursor_events(&app, &state, ignore);
}

#[tauri::command]
pub fn save_shortcuts(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    shortcuts: Shortcuts,
) -> SaveResult {
    let old_config = lock_or_recover(&state.config).clone();
    let mut failed = Vec::new();

    app.global_shortcut().unregister_all().ok();

    let s = crate::i18n::strings();
    let actions: Vec<(&str, &str)> = vec![
        (s.toggle_drawing, &shortcuts.toggle_drawing),
        (s.clear_drawing, &shortcuts.clear_drawing),
        (s.toggle_penetration, &shortcuts.toggle_penetration),
        ("Screenshot", &shortcuts.screenshot),
    ];

    for (label, accel) in &actions {
        if parse_shortcut(accel).is_none() {
            failed.push(format!("{}: {}", label, accel));
        }
    }

    failed.extend(duplicate_shortcut_errors(&shortcuts));

    if !failed.is_empty() {
        *lock_or_recover(&state.config) = old_config;
        register_shortcuts(&app);
        return SaveResult {
            ok: false,
            failed: Some(failed),
        };
    }

    for (label, accel) in &actions {
        if let Some(shortcut) = parse_shortcut(accel) {
            if app.global_shortcut().register(shortcut).is_err() {
                failed.push(format!("{}: {}", label, accel));
            }
        }
    }

    if !failed.is_empty() {
        *lock_or_recover(&state.config) = old_config;
        register_shortcuts(&app);
        return SaveResult {
            ok: false,
            failed: Some(failed),
        };
    }

    {
        let mut cfg = lock_or_recover(&state.config);
        cfg.shortcuts = shortcuts;
        crate::config::save_config(&app, &cfg);
    }
    register_shortcuts(&app);

    info!("Shortcuts saved successfully");
    SaveResult {
        ok: true,
        failed: None,
    }
}

#[tauri::command]
pub fn save_general(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    general: GeneralConfig,
) -> AppResult<()> {
    let snapshot = {
        let mut cfg = lock_or_recover(&state.config);
        cfg.general = general.normalized();
        crate::config::save_config(&app, &cfg);
        cfg.clone()
    };
    let auto_start = snapshot.general.auto_start;
    if let Err(e) = app.emit("config-changed", snapshot) {
        warn!("Failed to emit config-changed: {}", e);
    }
    crate::config::sync_autostart(&app, auto_start);
    if crate::overlay::current_mode(&state) != crate::overlay::OverlayMode::Hidden {
        crate::overlay::ensure_toolbar_window(&app, &state);
    }
    info!("General config saved");
    Ok(())
}

#[tauri::command]
pub fn save_locale(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    locale: String,
) -> AppResult<()> {
    {
        let mut cfg = lock_or_recover(&state.config);
        cfg.general.locale = Some(locale.clone());
        crate::config::save_config(&app, &cfg);
    }

    crate::i18n::set_locale(&locale);
    crate::rebuild_tray_menu(&app).map_err(|e| AppError::Other(e.to_string()))?;

    if let Some(win) = app.get_webview_window("settings") {
        if let Err(e) = win.set_title(crate::i18n::strings().window_title) {
            warn!("Failed to set settings window title: {}", e);
        }
    }

    info!("Locale changed to {}", locale);
    Ok(())
}

#[tauri::command]
pub fn exit_drawing(app: AppHandle, state: tauri::State<'_, AppState>) {
    crate::deactivate_drawing(&app, &state);
}

#[tauri::command]
pub fn enter_penetration_mode(app: AppHandle, state: tauri::State<'_, AppState>) {
    crate::enter_penetration_mode(&app, &state);
}

#[tauri::command]
pub fn exit_penetration_mode(app: AppHandle, state: tauri::State<'_, AppState>) {
    crate::exit_penetration_mode(&app, &state);
}

#[tauri::command]
pub fn toggle_penetration_mode(app: AppHandle, state: tauri::State<'_, AppState>) {
    crate::toggle_penetration_mode(&app, &state);
}

#[tauri::command]
pub fn set_whiteboard_mode(state: tauri::State<'_, AppState>, active: bool) {
    *lock_or_recover(&state.whiteboard_mode) = active;
}

#[tauri::command]
pub fn set_toolbar_visible(app: AppHandle, visible: bool) {
    crate::set_toolbar_window_visible(&app, visible);
}

#[tauri::command]
pub fn set_toolbar_popup(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    visible: bool,
    x: Option<f64>,
    y: Option<f64>,
) {
    crate::overlay::set_toolbar_popup(&app, &state, visible, x, y);
}

#[tauri::command]
pub fn suppress_penetration(state: tauri::State<'_, AppState>, duration_ms: Option<u64>) {
    crate::overlay::suppress_penetration_for(&state, duration_ms.unwrap_or(800));
}

#[tauri::command]
pub fn raise_toolbar(app: AppHandle) {
    crate::overlay::raise_toolbar_above_overlay(&app);
}

const ALLOWED_URL_PREFIXES: &[&str] = &["https://github.com/", "https://apps.microsoft.com/"];

#[tauri::command]
pub fn reveal_settings_window(app: AppHandle) {
    crate::reveal_settings_window(&app);
}

#[tauri::command]
pub fn toggle_screenshot(app: AppHandle) {
    crate::toggle_screenshot(&app);
}

#[tauri::command]
pub fn pin_screenshot(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    image: String,
) -> AppResult<()> {
    // Store the image as pending so PinnedImages.vue can pick it up on mount,
    // even if the overlay webview hasn't loaded its JavaScript context yet.
    lock_or_recover(&state.pending_pinned_images).push(image.clone());

    // Ensure the overlay window is visible and on top so pinned images are shown
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.show().ok();
        overlay.set_always_on_top(true).ok();
        overlay.set_ignore_cursor_events(true).ok();

        // Also emit the event for real-time delivery if the listener is already active
        let _ = app.emit_to(
            "overlay",
            "pin-image",
            serde_json::json!({ "image": image }),
        );
    } else {
        let _ = app.emit("pin-image", serde_json::json!({ "image": image }));
    }
    Ok(())
}

/// Called by PinnedImages.vue on mount to retrieve any pinned screenshots
/// that were stored before the overlay webview was ready.
#[tauri::command]
pub fn take_pending_pinned_images(state: tauri::State<'_, AppState>) -> Vec<String> {
    let mut pending = lock_or_recover(&state.pending_pinned_images);
    std::mem::take(&mut *pending)
}

#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> AppResult<()> {
    if !ALLOWED_URL_PREFIXES
        .iter()
        .any(|prefix| url.starts_with(prefix))
    {
        warn!("Blocked open_url for untrusted URL: {}", url);
        return Err(AppError::Other("URL not allowed".into()));
    }
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::default_shortcuts;

    #[test]
    fn duplicate_shortcut_errors_empty_for_defaults() {
        assert!(duplicate_shortcut_errors(&default_shortcuts()).is_empty());
    }

    #[test]
    fn duplicate_shortcut_errors_detects_collision() {
        let mut shortcuts = default_shortcuts();
        shortcuts.clear_drawing = shortcuts.toggle_drawing.clone();
        let errors = duplicate_shortcut_errors(&shortcuts);
        assert_eq!(errors.len(), 1);
        assert!(errors[0].contains("Duplicate shortcut"));
    }
}
