use mlua::{Lua, Result, Table};

pub fn register_hl7(lua: &Lua) -> Result<()> {
    let hl7_table = lua.create_table()?;

    // Function: parse(hl7_string) -> Table
    // Returns a table where keys are segment names (e.g., "MSH") and values are arrays of segments 
    // (since segments can repeat). Each segment is an array of fields.
    hl7_table.set("parse", lua.create_function(|lua, content: String| {
        let parsed = lua.create_table()?;
        
        let segments: Vec<&str> = content.split('\r').collect();
        for segment in segments {
            if segment.trim().is_empty() { continue; }
            
            let fields: Vec<&str> = segment.split('|').collect();
            let segment_name = fields[0]; // e.g., MSH, PID
            
            // Create a table for this segment's fields
            let segment_data = lua.create_table()?;
            for (i, field) in fields.iter().enumerate() {
                // Handle repetition/components if needed, for MVP just raw strings
                segment_data.set(i + 1, *field)?;
            }

            // Check if we already have this segment type (e.g. multiple NTEs or OBXs)
            // Simplified: We'll overwrite for single segments, or append for multi?
            // For MVP: Let's store 'MSH': { fields... } 
            
            // Actually, HL7 is ordered. For true utility, we might want:
            // hl7[1] = { name="MSH", fields={...} }
            // But usually accessing by name is easier: msg["PID"][1][4]
            
            // Let's implement: table[SegmentName] = { fields... } (Last wins for simplicity in MVP)
            parsed.set(segment_name, segment_data)?;
        }
        
        Ok(parsed)
    })?)?;

    // Function: to_json(hl7_string) -> String (JSON)
    hl7_table.set("to_json", lua.create_function(|_, content: String| {
        // Very basic conversion: 
        // { "MSH": ["|", "^~\\&", ...], "PID": [...] }
        use std::collections::HashMap;
        let mut map: HashMap<String, Vec<String>> = HashMap::new();
        
        let segments: Vec<&str> = content.split('\r').collect();
        for segment in segments {
            if segment.trim().is_empty() { continue; }
            let fields: Vec<&str> = segment.split('|').collect();
            let segment_name = fields[0].to_string();
            let field_values: Vec<String> = fields.iter().map(|s| s.to_string()).collect();
            
            map.insert(segment_name, field_values);
        }
        
        let json = serde_json::to_string(&map).unwrap_or("{}".to_string());
        Ok(json)
    })?)?;

    // Register as global 'hl7'
    lua.globals().set("hl7", hl7_table.clone())?;

    // Also register in package.loaded['hl7'] to make require('hl7') work
    let package: Table = lua.globals().get("package")?;
    let loaded: Table = package.get("loaded")?;
    loaded.set("hl7", hl7_table)?;

    Ok(())
}
