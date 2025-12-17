use serde::Deserialize;
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct TlsConfig {
    pub cert_path: PathBuf,
    pub key_path: PathBuf,
}

impl TlsConfig {
    pub fn new(cert: PathBuf, key: PathBuf) -> Self {
        Self {
            cert_path: cert,
            key_path: key,
        }
    }
}
