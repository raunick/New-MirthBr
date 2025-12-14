use mlua::{Lua, Result, Value, LuaSerdeExt};

pub fn register_json(lua: &Lua) -> Result<()> {
    let json_table = lua.create_table()?;

    // json.encode(val)
    json_table.set("encode", lua.create_function(|lua, val: Value| {
        let json_val: serde_json::Value = lua.from_value(val)?;
        let s = serde_json::to_string(&json_val).map_err(mlua::Error::external)?;
        Ok(s)
    })?)?;

    // json.decode(str)
    json_table.set("decode", lua.create_function(|lua, s: String| {
        let json_val: serde_json::Value = serde_json::from_str(&s).map_err(mlua::Error::external)?;
        let lua_val = lua.to_value(&json_val)?;
        Ok(lua_val)
    })?)?;

    // Create package.loaded if not exists (to mimic require behavior if needed, 
    // but globally setting 'json' is usually enough for simple scripts)
    // However, if the user does 'local json = require("json")', we should support that.
    // Ideally we inject into package.loaded.
    
    let globals = lua.globals();
    globals.set("json", json_table.clone())?; // Global access

    let package: mlua::Table = globals.get("package")?;
    let loaded: mlua::Table = package.get("loaded")?;
    loaded.set("json", json_table)?;

    Ok(())
}
