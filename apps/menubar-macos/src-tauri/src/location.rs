#[cfg(target_os = "macos")]
use std::sync::{mpsc, Arc, Mutex};
#[cfg(target_os = "macos")]
use std::time::{Duration, Instant};

#[cfg(target_os = "macos")]
use objc2::rc::Retained;
#[cfg(target_os = "macos")]
use objc2::runtime::ProtocolObject;
#[cfg(target_os = "macos")]
use objc2::{define_class, msg_send, DefinedClass, MainThreadMarker, MainThreadOnly};
#[cfg(target_os = "macos")]
use objc2_core_location::{
    CLLocation, CLLocationManager, CLLocationManagerDelegate, CLAuthorizationStatus,
    kCLLocationAccuracyBest,
};
#[cfg(target_os = "macos")]
use objc2_foundation::{
    NSArray, NSDate, NSError, NSDefaultRunLoopMode, NSObject, NSObjectProtocol, NSRunLoop,
};
#[cfg(target_os = "macos")]
use serde::Serialize;
#[cfg(target_os = "macos")]
use tauri::{AppHandle, Runtime};

#[cfg(target_os = "macos")]
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentLocation {
    pub latitude: f64,
    pub longitude: f64,
}

#[cfg(target_os = "macos")]
type LocationResult = Result<CurrentLocation, String>;

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct LocationDelegateIvars {
    result: Arc<Mutex<Option<LocationResult>>>,
}

#[cfg(target_os = "macos")]
define_class!(
    #[unsafe(super = NSObject)]
    #[thread_kind = MainThreadOnly]
    #[ivars = LocationDelegateIvars]
    struct LocationDelegate;

    unsafe impl NSObjectProtocol for LocationDelegate {}

    unsafe impl CLLocationManagerDelegate for LocationDelegate {
        #[unsafe(method(locationManagerDidChangeAuthorization:))]
        fn location_manager_did_change_authorization(
            &self,
            manager: &CLLocationManager,
        ) {
            handle_authorization_status(manager, &self.ivars().result);
        }

        #[unsafe(method(locationManager:didUpdateLocations:))]
        fn location_manager_did_update_locations(
            &self,
            _manager: &CLLocationManager,
            locations: &NSArray<CLLocation>,
        ) {
            if let Some(location) = locations.lastObject() {
                let coordinate = unsafe { location.coordinate() };

                let result = if unsafe { coordinate.is_valid() } {
                    Ok(CurrentLocation {
                        latitude: coordinate.latitude,
                        longitude: coordinate.longitude,
                    })
                } else {
                    Err("Received an invalid location coordinate.".to_string())
                };

                set_result(&self.ivars().result, result);
            } else {
                set_result(
                    &self.ivars().result,
                    Err("No location was returned by macOS.".to_string()),
                );
            }
        }

        #[unsafe(method(locationManager:didFailWithError:))]
        fn location_manager_did_fail_with_error(
            &self,
            _manager: &CLLocationManager,
            error: &NSError,
        ) {
            if error.code() == 0 {
                return;
            }

            set_result(
                &self.ivars().result,
                Err(error.localizedDescription().to_string()),
            );
        }
    }
);

#[cfg(target_os = "macos")]
impl LocationDelegate {
    fn new(
        mtm: MainThreadMarker,
        result: Arc<Mutex<Option<LocationResult>>>,
    ) -> Retained<Self> {
        let this = Self::alloc(mtm).set_ivars(LocationDelegateIvars { result });
        unsafe { msg_send![super(this), init] }
    }
}

#[cfg(target_os = "macos")]
pub fn get_current_location<R: Runtime>(app: &AppHandle<R>) -> Result<CurrentLocation, String> {
    let (sender, receiver) = mpsc::sync_channel(1);
    let app_handle = app.clone();

    app_handle
        .run_on_main_thread(move || {
            let result = request_current_location_on_main_thread();
            let _ = sender.send(result);
        })
        .map_err(|error| error.to_string())?;

    receiver
        .recv_timeout(Duration::from_secs(20))
        .map_err(|_| "Timed out while determining your current location.".to_string())?
}

#[cfg(target_os = "macos")]
fn request_current_location_on_main_thread() -> LocationResult {
    let mtm = MainThreadMarker::new()
        .ok_or_else(|| "Current location must run on the main thread.".to_string())?;

    if !unsafe { CLLocationManager::locationServicesEnabled_class() } {
        return Err("Location services are disabled on this Mac.".to_string());
    }

    let result = Arc::new(Mutex::new(None));
    let delegate = LocationDelegate::new(mtm, result.clone());
    let manager = unsafe { CLLocationManager::new() };
    let run_loop = NSRunLoop::currentRunLoop();
    let deadline = Instant::now() + Duration::from_secs(15);

    unsafe {
        manager.setDelegate(Some(ProtocolObject::from_ref(&*delegate)));
        manager.setDesiredAccuracy(kCLLocationAccuracyBest);
    }

    handle_authorization_status(&manager, &result);

    while Instant::now() < deadline {
        if let Some(outcome) = take_result(&result) {
            unsafe {
                manager.setDelegate(None);
            }
            return outcome;
        }

        let tick = NSDate::dateWithTimeIntervalSinceNow(0.1);
        unsafe {
            run_loop.runMode_beforeDate(NSDefaultRunLoopMode, &tick);
        }
    }

    unsafe {
        manager.setDelegate(None);
    }

    Err("Timed out while determining your current location.".to_string())
}

#[cfg(target_os = "macos")]
fn handle_authorization_status(
    manager: &CLLocationManager,
    result: &Arc<Mutex<Option<LocationResult>>>,
) {
    match unsafe { manager.authorizationStatus() } {
        status
            if status == CLAuthorizationStatus::AuthorizedWhenInUse
                || status == CLAuthorizationStatus::AuthorizedAlways =>
        {
            unsafe {
                manager.requestLocation();
            }
        }
        status if status == CLAuthorizationStatus::NotDetermined => unsafe {
            manager.requestWhenInUseAuthorization();
        },
        status
            if status == CLAuthorizationStatus::Denied
                || status == CLAuthorizationStatus::Restricted =>
        {
            set_result(
                result,
                Err("Location permission was not granted.".to_string()),
            );
        }
        _ => {
            set_result(
                result,
                Err("Could not determine the location permission state.".to_string()),
            );
        }
    }
}

#[cfg(target_os = "macos")]
fn set_result(result: &Arc<Mutex<Option<LocationResult>>>, value: LocationResult) {
    let mut guard = result.lock().expect("location result mutex poisoned");
    if guard.is_none() {
        *guard = Some(value);
    }
}

#[cfg(target_os = "macos")]
fn take_result(result: &Arc<Mutex<Option<LocationResult>>>) -> Option<LocationResult> {
    result
        .lock()
        .expect("location result mutex poisoned")
        .take()
}

#[cfg(not(target_os = "macos"))]
use serde::Serialize;
#[cfg(not(target_os = "macos"))]
use tauri::{AppHandle, Runtime};

#[cfg(not(target_os = "macos"))]
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentLocation {
    pub latitude: f64,
    pub longitude: f64,
}

#[cfg(not(target_os = "macos"))]
pub fn get_current_location<R: Runtime>(_app: &AppHandle<R>) -> Result<CurrentLocation, String> {
    Err("Current location is only supported on macOS.".to_string())
}
