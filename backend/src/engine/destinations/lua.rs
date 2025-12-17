use crate::engine::message::Message;
use mlua::{Lua, StdLib, LuaOptions};
use crate::lua_helpers;

pub struct LuaDestination {
    code: String,
}

impl LuaDestination {
    pub fn new(code: String) -> Self {
        Self { code }
    }

    pub fn send(&self, msg: &Message) -> anyhow::Result<()> {
        // Similar to LuaProcessor, but for side-effects (sending)
        
        let lua = Lua::new_with(
            StdLib::STRING | StdLib::TABLE | StdLib::MATH | StdLib::UTF8 | StdLib::COROUTINE | StdLib::PACKAGE,
            LuaOptions::default()
        ).map_err(|e| anyhow::anyhow!("Lua init error: {}", e))?;

        // Helpers
        lua_helpers::logging::register_logging(&lua)?;
        lua_helpers::hl7::register_hl7(&lua)?;
        lua_helpers::json::register_json(&lua)?;
        
        // Mock OS table for date/time (safe) - Reuse from LuaProcessor logic ideally, or duplicate for now
        let globals = lua.globals();

        // Msg object
        let msg_table = lua.create_table()?;
        msg_table.set("id", msg.id.to_string())?;
        msg_table.set("content", msg.content.clone())?;
        msg_table.set("origin", msg.origin.clone())?;
        globals.set("msg", msg_table)?;

        // Execute
        // Wrapped in a function same as processor
        let script = format!(
            "local function run(msg)\n{}\nend\nreturn run(msg)", 
            self.code
        );

        let _: () = lua.load(&script).eval()?; // Expect no return or verify success?
        
        Ok(())
    }
}
