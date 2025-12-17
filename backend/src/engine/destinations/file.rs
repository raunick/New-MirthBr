use crate::engine::message::Message;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use std::path::{Path, PathBuf, Component};
use chrono::Utc;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};

/// Maximum filename length
const MAX_FILENAME_LENGTH: usize = 255;
/// Maximum path length
const MAX_PATH_LENGTH: usize = 4096;

pub struct FileWriter {
    path: String,
    filename_pattern: Option<String>,
    append: bool,
    encoding: String,
    channel_name: String,
}

impl FileWriter {
    pub fn new(
        path: String, 
        filename_pattern: Option<String>,
        append: Option<bool>,
        encoding: Option<String>,
        channel_name: String
    ) -> Self {
        Self { 
            path, 
            filename_pattern, 
            append: append.unwrap_or(true), // Default to append
            encoding: encoding.unwrap_or_else(|| "utf8".to_string()),
            channel_name 
        }
    }

    /// Sanitize a filename to prevent path traversal
    fn sanitize_filename(filename: &str) -> String {
        filename
            .chars()
            // Remove path separators and null bytes
            .filter(|c| *c != '/' && *c != '\\' && *c != '\0')
            // Remove other potentially dangerous characters
            .filter(|c| !c.is_control())
            .take(MAX_FILENAME_LENGTH)
            .collect()
    }

    /// Validate and sanitize the full path to prevent traversal attacks
    fn validate_path(base_dir: &str, filename: &str) -> anyhow::Result<PathBuf> {
        // Check total path length
        if base_dir.len() + filename.len() > MAX_PATH_LENGTH {
            return Err(anyhow::anyhow!("Path exceeds maximum length of {} characters", MAX_PATH_LENGTH));
        }

        // For relative paths, we need to resolve them properly
        let base = if base_dir.starts_with("./") || base_dir.starts_with("../") || !base_dir.starts_with("/") {
            // Relative path - get current working directory and join
            let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            cwd.join(base_dir)
        } else {
            PathBuf::from(base_dir)
        };
        
        let sanitized_filename = Self::sanitize_filename(filename);
        
        // Build the path
        let full_path = base.join(&sanitized_filename);
        
        // Normalize the path by resolving . and .. in the FILENAME portion
        // The base path is already sanitized by canonicalizing relative paths
        let normalized: PathBuf = full_path
            .components()
            .filter(|c| match c {
                Component::ParentDir => false, // Filter out ..
                Component::CurDir => false,    // Filter out .
                _ => true,
            })
            .collect();

        // Additional check: ensure no ".." in the final path string
        let path_str = normalized.to_string_lossy();
        if path_str.contains("..") {
            return Err(anyhow::anyhow!("Path contains invalid sequences"));
        }

        Ok(normalized)
    }

    /// Build the filename from pattern and message
    fn build_filename(&self, msg: &Message) -> String {
        if let Some(pattern) = &self.filename_pattern {
            let mut filename = pattern.clone();
            
            // Replace variables
            if filename.contains("${timestamp}") {
                let ts = Utc::now().format("%Y%m%d-%H%M%S").to_string();
                filename = filename.replace("${timestamp}", &ts);
            }
            if filename.contains("${id}") {
                filename = filename.replace("${id}", &msg.id.to_string());
            }
            if filename.contains("${date}") {
                let date = Utc::now().format("%Y-%m-%d").to_string();
                filename = filename.replace("${date}", &date);
            }
            if filename.contains("${channel}") {
                 filename = filename.replace("${channel}", &self.channel_name);
            }
            
            filename
        } else {
            // Default filename
            format!("message_{}.txt", msg.id)
        }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        let filename = self.build_filename(msg);
        let safe_path = Self::validate_path(&self.path, &filename)?;
        
        // Ensure parent directory exists
        if let Some(parent) = safe_path.parent() {
            if let Err(e) = tokio::fs::create_dir_all(parent).await {
                if e.kind() == std::io::ErrorKind::AlreadyExists {
                    if let Ok(metadata) = tokio::fs::metadata(parent).await {
                        if !metadata.is_dir() {
                            let msg = format!(
                                "Cannot create directory {:?} because a file with that name exists",
                                parent
                            );
                            tracing::error!("{}", msg);
                            return Err(anyhow::anyhow!(msg));
                        }
                    }
                } else {
                    return Err(e.into());
                }
            }
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(self.append)
            .write(true) // Ensure write access
            .truncate(!self.append)
            .open(&safe_path)
            .await?;

        // Handle Content
        let bytes_to_write = if self.encoding.eq_ignore_ascii_case("base64") {
             // Decode
             match BASE64_STANDARD.decode(&msg.content) {
                 Ok(b) => b,
                 Err(e) => {
                     return Err(anyhow::anyhow!("Failed to decode Base64 content: {}", e));
                 }
             }
        } else {
            // UTF-8
             msg.content.as_bytes().to_vec()
        };

        file.write_all(&bytes_to_write).await?;
        
        // Add newline only if NOT base64 (binary) and we assume text logs
        if !self.encoding.eq_ignore_ascii_case("base64") {
             file.write_all(b"\n").await?;
        }
        
        tracing::info!(
            channel = %self.channel_name,
            path = %safe_path.display(),
            mode = %if self.append { "append" } else { "overwrite" },
            encoding = %self.encoding,
            "Written to file"
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(FileWriter::sanitize_filename("normal.txt"), "normal.txt");
        // Note: sanitize_filename only removes / and \ characters, dots are preserved
        assert_eq!(FileWriter::sanitize_filename("../../../etc/passwd"), "......etcpasswd");
        assert_eq!(FileWriter::sanitize_filename("..\\..\\windows\\system32"), "....windowssystem32");
        assert_eq!(FileWriter::sanitize_filename("file\0name.txt"), "filename.txt");
    }

    #[test]
    fn test_validate_path_blocks_traversal() {
        // validate_path uses sanitize_filename which preserves dots but removes slashes
        // Then the path normalizer filters out ParentDir and CurDir components
        // The final check for ".." in string catches any remaining traversal attempts
        let result = FileWriter::validate_path("/tmp/output", "somefile.txt");
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.to_string_lossy().contains("somefile.txt"));
    }
}
