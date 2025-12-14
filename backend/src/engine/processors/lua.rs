use mlua::{Lua, Result};
use crate::engine::message::Message;
use crate::lua_helpers;

pub struct LuaProcessor {
    code: String,
}

impl LuaProcessor {
    pub fn new(code: String) -> Self {
        Self { code }
    }

    pub fn process(&self, msg: Message) -> anyhow::Result<Message> {
        let lua = Lua::new();
        
        // Sandbox: Clean environment (optional for now)
        // lua.sandbox(true)?;
        
        // Register helpers
        lua_helpers::logging::register_logging(&lua)?;
        lua_helpers::hl7::register_hl7(&lua)?;
        lua_helpers::json::register_json(&lua)?;

        // Pass message to Lua
        let globals = lua.globals();
        
        // Create a basic object for the message
        let msg_table = lua.create_table()?;
        msg_table.set("content", msg.content.clone())?;
        msg_table.set("id", msg.id.to_string())?;
        
        // Helper to update content
        msg_table.set("set_content", lua.create_function(|_, new_content: String| {
            // We can't easily mutate the outer scope struct here directly 
            // without return values, so we'll expect the script to return the content
            // or modify this table which we read back.
            Ok(new_content)
        })?)?;

        globals.set("msg", msg_table)?;

        // Execute user code
        // We expect the user code to be a function body or a script.
        // For simple MVP: expect script to return the new content or "msg" object.
        // Let's assume the script sets 'msg.content' or returns it.
        
        // Wrapping user code in a function to allow 'return'
        let script = format!(
            "local function run(msg)\n{}\nend\nreturn run(msg)", 
            self.code
        );

        let result_content: String = lua.load(&script).eval()?;

        // Construct new message with updated content
        let mut new_msg = msg;
        new_msg.content = result_content;
        
        Ok(new_msg)
    }
}
