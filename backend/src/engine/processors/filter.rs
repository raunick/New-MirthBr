use crate::engine::message::Message;
use mlua::prelude::*;
use std::sync::{Arc, Mutex};

pub struct FilterProcessor {
    condition: String,
}

impl FilterProcessor {
    pub fn new(condition: String) -> Self {
        Self { condition }
    }

    pub fn process(&self, msg: Message) -> anyhow::Result<bool> {
        let lua = Lua::new();
        let globals = lua.globals();

        // 1. Create 'msg' table
        let msg_table = lua.create_table()?;
        msg_table.set("id", msg.id.to_string())?;
        msg_table.set("content", msg.content.clone())?;
        msg_table.set("origin", msg.origin.clone())?;

        globals.set("msg", msg_table)?;

        // 2. Wrap condition in a function to return value
        // The condition is likely just an expression like `msg.content == 'foo'`
        // Or a full script `if ... then return true else return false end`
        // Let's assume it's valid Lua code that returns a boolean.
        // If it's a simple expression, we might need to prepend 'return '.
        // But for flexibility, let's assume the user writes `return ...` or we wrap it?
        // In Mirth Connect, filter scripts usually 'return true' to pass, 'return false' to filter.
        // Let's execute it as a chunk.
        
        let chunk = lua.load(&self.condition);
        let result: LuaValue = chunk.eval()?;
        
        match result {
            LuaValue::Boolean(b) => Ok(b),
            LuaValue::Nil => Ok(false), // treat nil as false/drop? Or strict?
            _ => {
                // Try truthiness? Lua treats everything except false and nil as true.
                // But explicit return expected.
                tracing::warn!("Filter returned non-boolean value. Treating as true (Pass).");
                Ok(true) 
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_filter_pass() {
        let processor = FilterProcessor::new("return msg.content == 'KEEP'".to_string());
        let msg = Message::new(Uuid::new_v4(), "KEEP".to_string(), "test".to_string());
        assert_eq!(processor.process(msg).unwrap(), true);
    }

    #[test]
    fn test_filter_drop() {
        let processor = FilterProcessor::new("return msg.content == 'KEEP'".to_string());
        let msg = Message::new(Uuid::new_v4(), "DROP".to_string(), "test".to_string());
        assert_eq!(processor.process(msg).unwrap(), false);
    }
}
