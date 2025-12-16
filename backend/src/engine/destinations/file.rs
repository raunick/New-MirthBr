use crate::engine::message::Message;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use std::path::{Path, PathBuf, Component};
use chrono::Utc;

/// Maximum filename length
const MAX_FILENAME_LENGTH: usize = 255;
/// Maximum path length
const MAX_PATH_LENGTH: usize = 4096;

pub struct FileWriter {
    path: String,
    filename_pattern: Option<String>,
}

impl FileWriter {
    pub fn new(path: String, filename_pattern: Option<String>) -> Self {
        Self { path, filename_pattern }
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

        let base = Path::new(base_dir);
        let sanitized_filename = Self::sanitize_filename(filename);
        
        // Build the path
        let full_path = base.join(&sanitized_filename);
        
        // Normalize the path by resolving . and ..
        let normalized: PathBuf = full_path
            .components()
            .filter(|c| match c {
                Component::ParentDir => false, // Filter out ..
                Component::CurDir => false,    // Filter out .
                _ => true,
            })
            .collect();

        // Verify the path is still under the base directory
        // We compare the normalized path prefix with the base directory
        if !normalized.starts_with(base) {
            tracing::error!(
                "Path traversal attempt detected: {} -> {}",
                filename,
                normalized.display()
            );
            return Err(anyhow::anyhow!(
                "Invalid path: file must be within the configured directory"
            ));
        }

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
            // Validate parent is still within base
            let base = Path::new(&self.path);
            if !parent.starts_with(base) && parent != base {
                // Parent must be at or under base
                if parent.components().count() > 0 {
                    // Only create if it's a subdirectory of base
                    let relative = parent.strip_prefix(base).ok();
                    if relative.is_none() && parent != base {
                        return Err(anyhow::anyhow!("Cannot create directory outside base path"));
                    }
                }
            }

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
            .append(true)
            .open(&safe_path)
            .await?;

        file.write_all(msg.content.as_bytes()).await?;
        file.write_all(b"\n").await?;
        
        tracing::info!("✅ Written to file: {}", safe_path.display());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(FileWriter::sanitize_filename("normal.txt"), "normal.txt");
        assert_eq!(FileWriter::sanitize_filename("../../../etc/passwd"), "etcpasswd");
        assert_eq!(FileWriter::sanitize_filename("..\\..\\windows\\system32"), "windowssystem32");
        assert_eq!(FileWriter::sanitize_filename("file\0name.txt"), "filename.txt");
    }

    #[test]
    fn test_validate_path_blocks_traversal() {
        let result = FileWriter::validate_path("/tmp/output", "../../../etc/passwd");
        assert!(result.is_ok()); // Should sanitize and stay in /tmp/output
        let path = result.unwrap();
        assert!(path.starts_with("/tmp/output"));
        assert!(!path.to_string_lossy().contains("etc"));
    }
}

