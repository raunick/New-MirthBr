use mlua::{Lua, Result, Table, Value};
use tracing::{info, warn, error, debug};

pub fn register_logging(lua: &Lua) -> Result<()> {
    let log_table = lua.create_table()?;

    log_table.set("info", lua.create_function(|_, msg: String| {
        info!("[LUA] {}", msg);
        Ok(())
    })?)?;

    log_table.set("warn", lua.create_function(|_, msg: String| {
        warn!("[LUA] {}", msg);
        Ok(())
    })?)?;

    log_table.set("error", lua.create_function(|_, msg: String| {
        error!("[LUA] {}", msg);
        Ok(())
    })?)?;
    
    log_table.set("debug", lua.create_function(|_, msg: String| {
        debug!("[LUA] {}", msg);
        Ok(())
    })?)?;

    // Allow log("msg") to work as log.info("msg")
    let meta = lua.create_table()?;
    meta.set("__call", lua.create_function(|_, (_table, msg): (mlua::Value, String)| {
        info!("[LUA] {}", msg);
        Ok(())
    })?)?;
    log_table.set_metatable(Some(meta));

    lua.globals().set("log", log_table)?;
    Ok(())
}
