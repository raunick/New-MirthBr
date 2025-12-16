use mlua::{Lua, StdLib, LuaOptions};
use crate::engine::message::Message;
use crate::lua_helpers;

/// Maximum memory usage in bytes (10MB)
const MAX_MEMORY_BYTES: usize = 10 * 1024 * 1024;
/// Maximum code size in bytes (64KB)
const MAX_CODE_SIZE: usize = 64 * 1024;

pub struct LuaProcessor {
    code: String,
}

impl LuaProcessor {
    pub fn new(code: String) -> Self {
        Self { code }
    }

    /// Sanitize and validate Lua code before execution
    fn validate_code(&self) -> anyhow::Result<()> {
        if self.code.len() > MAX_CODE_SIZE {
            return Err(anyhow::anyhow!(
                "Lua code exceeds maximum size of {} bytes (got {} bytes)",
                MAX_CODE_SIZE,
                self.code.len()
            ));
        }

        // Check for potentially dangerous patterns and reject if found
        let dangerous_patterns = [
            ("loadstring", "Dynamic code loading is not allowed"),
            ("loadfile", "Loading files is not allowed"),
            ("dofile", "Executing files is not allowed"),
            ("load(", "Dynamic code loading is not allowed"),
            ("_G[", "Direct global table access is not allowed"),
            ("debug.", "Debug library is not allowed"),
            ("io.", "IO library is not allowed"),
            ("os.execute", "OS execution is not allowed"),
            ("os.remove", "File deletion is not allowed"),
            ("os.rename", "File renaming is not allowed"),
            ("os.exit", "Process termination is not allowed"),
        ];

        for (pattern, message) in dangerous_patterns {
            if self.code.contains(pattern) {
                tracing::warn!("Blocked dangerous Lua pattern: {} - {}", pattern, message);
                return Err(anyhow::anyhow!("Security violation: {}", message));
            }
        }

        Ok(())
    }

    pub fn process(&self, msg: Message) -> anyhow::Result<Message> {
        // Validate code first
        self.validate_code()?;

        // Create sandboxed Lua with only safe libraries
        // Excludes: os, io, debug, ffi
        // Note: Package is enabled to support 'require', but should be restricted if possible
        let lua = Lua::new_with(
            StdLib::STRING | StdLib::TABLE | StdLib::MATH | StdLib::UTF8 | StdLib::COROUTINE | StdLib::PACKAGE,
            LuaOptions::default()
        ).map_err(|e| anyhow::anyhow!("Lua init error: {}", e))?;

        // Set memory limit to prevent DoS
        lua.set_memory_limit(MAX_MEMORY_BYTES)?;

        // Remove/disable dangerous global functions that might still be accessible
        let globals = lua.globals();
        
        let functions_to_remove = [
            "collectgarbage", "dofile", "load", "loadfile", "loadstring",
            "rawequal", "rawget", "rawset", "rawlen",
            "getfenv", "setfenv", "getmetatable", "setmetatable",
            "print", // Redirect to our logger
        ];
        
        for func_name in functions_to_remove {
            let _ = globals.set(func_name, mlua::Nil);
        }

        // --- Safe OS Library Mock ---
        // We only allow date/time functions, mocking the 'os' table
        let os_table = lua.create_table()?;
        os_table.set("date", lua.create_function(|_, (format, time): (Option<String>, Option<i64>)| {
            let now = chrono::Utc::now();
            let ts = if let Some(t) = time {
                chrono::DateTime::from_timestamp(t, 0).unwrap_or(now)
            } else {
                now
            };
            
            let fmt = format.unwrap_or("%c".to_string());
            // chrono format is similar to strftime but likely sufficient for Lua scripts
            Ok(ts.format(&fmt).to_string())
        })?)?;
        
        os_table.set("time", lua.create_function(|_, table: Option<mlua::Table>| {
             // Basic time implementation (current timestamp)
             // Ignoring table arg for full compatibility for now, just returning current ts
             Ok(chrono::Utc::now().timestamp())
        })?)?;

        os_table.set("difftime", lua.create_function(|_, (t2, t1): (i64, i64)| {
            Ok(t2 - t1)
        })?)?;
        
        os_table.set("clock", lua.create_function(|_, ()| {
             Ok(0.0) // Mock
        })?)?;
        
        globals.set("os", os_table)?;

        // Register safe helpers
        lua_helpers::logging::register_logging(&lua)?;
        lua_helpers::hl7::register_hl7(&lua)?;
        lua_helpers::json::register_json(&lua)?;

        // Create a basic object for the message
        let msg_table = lua.create_table()?;
        msg_table.set("content", msg.content.clone())?;
        msg_table.set("id", msg.id.to_string())?;
        
        // Helper to update content
        msg_table.set("set_content", lua.create_function(|_, new_content: String| {
            Ok(new_content)
        })?)?;

        globals.set("msg", msg_table)?;

        // Wrapping user code in a function to allow 'return'
        let script = format!(
            "local function run(msg)\n{}\nend\nreturn run(msg)", 
            self.code
        );

        // Execute with error handling
        let result: Result<String, mlua::Error> = lua.load(&script).eval();

        match result {
            Ok(content) => {
                let mut new_msg = msg;
                new_msg.content = content;
                Ok(new_msg)
            }
            Err(e) => {
                Err(anyhow::anyhow!("Lua execution error: {}", e))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_simple_script() {
        let processor = LuaProcessor::new("return msg.content:upper()".to_string());
        let msg = Message {
            id: Uuid::new_v4(),
            channel_id: Uuid::new_v4(),
            content: "hello".to_string(),
        };
        let result = processor.process(msg).unwrap();
        assert_eq!(result.content, "HELLO");
    }

    #[test]
    fn test_code_size_limit() {
        let code = "a".repeat(MAX_CODE_SIZE + 1);
        let processor = LuaProcessor::new(code);
        let msg = Message {
            id: Uuid::new_v4(),
            channel_id: Uuid::new_v4(),
            content: "test".to_string(),
        };
        assert!(processor.process(msg).is_err());
    }
}

