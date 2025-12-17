use crate::engine::message::Message;
use crate::storage::models::Mapping;
use serde_json::Value;

pub struct MapperProcessor {
    mappings: Vec<Mapping>,
}

impl MapperProcessor {
    pub fn new(mappings: Vec<Mapping>) -> Self {
        Self { mappings }
    }

    pub fn process(&self, mut msg: Message) -> anyhow::Result<Message> {
        // Parse content as JSON
        let mut content_json: Value = match serde_json::from_str(&msg.content) {
            Ok(v) => v,
            Err(_) => {
                // If not JSON, we can't map. 
                // Return original message? Or error? 
                // For now, let's treat it as an error if mapping is expected but content isn't JSON.
                // Or maybe we treat empty object as source?
                // Let's assume input MUST be JSON for Mapper.
                return Err(anyhow::anyhow!("Mapper requires JSON input"));
            }
        };

        // Create a new target JSON object
        // NOTE: Mirth Connect often maps FROM source TO source (modifying in place) or TO a destination message.
        // Here we assume we are transforming the message content.
        // We'll start with a copy of the original or empty?
        // Usually mappers modify the message. Let's modify in place to allow partial updates?
        // Or should we create a clean output?
        // Let's support "source" -> "target".
        // If target exists, overwrite.
        
        for mapping in &self.mappings {
            let source_val = self.get_value_by_path(&content_json, &mapping.source);
            
            if let Some(val) = source_val {
                self.set_value_by_path(&mut content_json, &mapping.target, val)?;
            } else {
                 // Source path not found. Ignore?
                 tracing::debug!("Mapper: Source path '{}' not found in message", mapping.source);
            }
        }

        // Update message content
        msg.content = serde_json::to_string(&content_json)?;
        
        Ok(msg)
    }

    fn get_value_by_path(&self, json: &Value, path: &str) -> Option<Value> {
        // Handle root
        if path == "." || path.is_empty() {
             return Some(json.clone());
        }

        let parts: Vec<&str> = path.split('.').collect();
        let mut current = json;

        for part in parts {
            // Check for array index e.g. "items[0]"
            if part.contains('[') && part.ends_with(']') {
                let start_bracket = part.find('[')?;
                let key = &part[..start_bracket];
                let index_str = &part[start_bracket+1..part.len()-1];
                let index: usize = index_str.parse().ok()?;

                if !key.is_empty() {
                    current = current.get(key)?;
                }
                current = current.get(index)?;

            } else {
                current = current.get(part)?;
            }
        }

        Some(current.clone())
    }

    fn set_value_by_path(&self, json: &mut Value, path: &str, value: Value) -> anyhow::Result<()> {
         if path == "." || path.is_empty() {
            *json = value;
            return Ok(());
         }

         let parts: Vec<&str> = path.split('.').collect();
         if parts.is_empty() { return Ok(()); }
         
         let (last_key, parent_path) = parts.split_last().unwrap();
         let mut current = json;

         // Traverse to parent
         for part in parent_path {
             if !current.as_object().map(|m| m.contains_key(*part)).unwrap_or(false) {
                 if let Value::Object(map) = current {
                     map.insert(part.to_string(), Value::Object(serde_json::Map::new()));
                 } else {
                      return Err(anyhow::anyhow!("Cannot navigate path '{}': parent is not an object", path));
                 }
             }
             if let Value::Object(map) = current {
                 current = map.get_mut(*part).unwrap();
             }
         }

         // Set value at last key
         if let Value::Object(map) = current {
             map.insert(last_key.to_string(), value);
         } else {
             return Err(anyhow::anyhow!("Cannot set field '{}' on non-object at path '{}'", last_key, path));
         }

         Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_simple_mapping() {
        let mappings = vec![
            Mapping { source: "name".to_string(), target: "patientName".to_string() },
            Mapping { source: "age".to_string(), target: "patientAge".to_string() },
        ];
        let processor = MapperProcessor::new(mappings);

        let msg = Message::new(Uuid::new_v4(), r#"{"name": "John", "age": 30}"#.to_string(), "test".to_string());
        
        let result = processor.process(msg).expect("Processing failed");
        let json: Value = serde_json::from_str(&result.content).unwrap();

        assert_eq!(json["patientName"], "John");
        assert_eq!(json["patientAge"], 30);
        // Original fields remain because we modified in place
        assert_eq!(json["name"], "John"); 
    }

    #[test]
    fn test_nested_mapping() {
        let mappings = vec![
            Mapping { source: "patient.name".to_string(), target: "out.name".to_string() },
        ];
        let processor = MapperProcessor::new(mappings);

        let msg = Message::new(Uuid::new_v4(), r#"{"patient": {"name": "Alice"}}"#.to_string(), "test".to_string());
        
        let result = processor.process(msg).expect("Processing failed");
        let json: Value = serde_json::from_str(&result.content).unwrap();

        assert_eq!(json["out"]["name"], "Alice");
    }
}
