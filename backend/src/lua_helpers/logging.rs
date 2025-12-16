use mlua::{Lua, Result};
use tracing::{info, warn, error, debug};

/// Maximum log message length
const MAX_LOG_MESSAGE_LENGTH: usize = 2048;

/// Sanitize log messages to prevent log injection attacks
fn sanitize_log_message(msg: &str) -> String {
    msg.chars()
        // Remove control characters except tab
        .filter(|c| !c.is_control() || *c == '\t')
        .take(MAX_LOG_MESSAGE_LENGTH)
        .collect::<String>()
        // Escape newlines to prevent log forging
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

pub fn register_logging(lua: &Lua) -> Result<()> {
    let log_table = lua.create_table()?;

    log_table.set("info", lua.create_function(|_, msg: String| {
        let safe_msg = sanitize_log_message(&msg);
        info!("[LUA] {}", safe_msg);
        Ok(())
    })?)?;

    log_table.set("warn", lua.create_function(|_, msg: String| {
        let safe_msg = sanitize_log_message(&msg);
        warn!("[LUA] {}", safe_msg);
        Ok(())
    })?)?;

    log_table.set("error", lua.create_function(|_, msg: String| {
        let safe_msg = sanitize_log_message(&msg);
        error!("[LUA] {}", safe_msg);
        Ok(())
    })?)?;
    
    log_table.set("debug", lua.create_function(|_, msg: String| {
        let safe_msg = sanitize_log_message(&msg);
        debug!("[LUA] {}", safe_msg);
        Ok(())
    })?)?;

    // Allow log("msg") to work as log.info("msg")
    let meta = lua.create_table()?;
    meta.set("__call", lua.create_function(|_, (_table, msg): (mlua::Value, String)| {
        let safe_msg = sanitize_log_message(&msg);
        info!("[LUA] {}", safe_msg);
        Ok(())
    })?)?;
    log_table.set_metatable(Some(meta));

    lua.globals().set("log", log_table)?;
    Ok(())
}

