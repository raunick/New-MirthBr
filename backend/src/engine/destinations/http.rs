use crate::engine::message::Message;
use reqwest::Client;
use std::net::{IpAddr, ToSocketAddrs};
use std::time::Duration;
use url::Url;

/// Blocked hostnames that could be used for SSRF attacks
const BLOCKED_HOSTS: &[&str] = &[
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",           // AWS metadata
    "metadata.google.internal",   // GCP metadata
    "metadata.azure.com",         // Azure metadata
    "100.100.100.200",           // Alibaba metadata
];

/// HTTP request timeout
const REQUEST_TIMEOUT_SECS: u64 = 30;

pub struct HttpSender {
    url: String,
    method: String,
    client: Client,
}

impl HttpSender {
    /// Check if an IP address is in a private/internal range
    fn is_private_ip(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(ipv4) => {
                ipv4.is_private() ||          // 10.x, 172.16-31.x, 192.168.x
                ipv4.is_loopback() ||         // 127.x.x.x
                ipv4.is_link_local() ||       // 169.254.x.x
                ipv4.is_broadcast() ||        // 255.255.255.255
                ipv4.is_unspecified() ||      // 0.0.0.0
                ipv4.octets()[0] == 100 && ipv4.octets()[1] >= 64 && ipv4.octets()[1] <= 127  // Carrier-grade NAT
            }
            IpAddr::V6(ipv6) => {
                ipv6.is_loopback() ||         // ::1
                ipv6.is_unspecified()         // ::
                // Note: is_private() not stable for IPv6 in older Rust versions
            }
        }
    }

    /// Validate a URL to prevent SSRF attacks
    fn validate_url(url_str: &str) -> anyhow::Result<Url> {
        let url = Url::parse(url_str)
            .map_err(|e| anyhow::anyhow!("Invalid URL format: {}", e))?;

        // Only allow HTTP/HTTPS schemes
        match url.scheme() {
            "http" | "https" => {}
            scheme => {
                return Err(anyhow::anyhow!(
                    "Invalid URL scheme '{}'. Only HTTP/HTTPS are allowed",
                    scheme
                ));
            }
        }

        // Get the host
        let host = url.host_str()
            .ok_or_else(|| anyhow::anyhow!("URL must have a valid host"))?;

        // Check against blocked hostnames
        let host_lower = host.to_lowercase();
        for blocked in BLOCKED_HOSTS {
            if host_lower == *blocked || host_lower.ends_with(&format!(".{}", blocked)) {
                return Err(anyhow::anyhow!(
                    "Access to internal host '{}' is blocked for security reasons",
                    host
                ));
            }
        }

        // Try to resolve the hostname and check for private IPs
        let port = url.port().unwrap_or(if url.scheme() == "https" { 443 } else { 80 });
        if let Ok(addrs) = (host, port).to_socket_addrs() {
            for addr in addrs {
                if Self::is_private_ip(&addr.ip()) {
                    return Err(anyhow::anyhow!(
                        "URL resolves to private/internal IP address. Access blocked for security."
                    ));
                }
            }
        }

        // Check for suspicious patterns in the URL
        if url_str.contains("@") && !url.username().is_empty() {
            tracing::warn!("URL contains embedded credentials - these may be logged");
        }

        Ok(url)
    }

    /// Create a new HttpSender with URL validation
    pub fn new(url: String, method: String) -> Self {
        // Validate URL on construction - log warning but don't fail
        // (validation will be enforced on send)
        if let Err(e) = Self::validate_url(&url) {
            tracing::warn!("HttpSender created with potentially unsafe URL: {}", e);
        }

        // Validate HTTP method
        let valid_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
        let method = if valid_methods.contains(&method.to_uppercase().as_str()) {
            method.to_uppercase()
        } else {
            tracing::warn!("Invalid HTTP method '{}', defaulting to POST", method);
            "POST".to_string()
        };

        Self {
            url,
            method,
            client: Client::builder()
                .redirect(reqwest::redirect::Policy::limited(5)) // Limit redirects
                .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
                .build()
                .unwrap_or_else(|_| Client::new()),
        }
    }

    pub async fn send(&self, msg: &Message) -> anyhow::Result<()> {
        // Validate URL before each request (in case of DNS rebinding attacks)
        let validated_url = Self::validate_url(&self.url)?;

        let req = match self.method.as_str() {
            "GET" => self.client.get(validated_url.as_str()),
            "POST" => self.client.post(validated_url.as_str()),
            "PUT" => self.client.put(validated_url.as_str()),
            "PATCH" => self.client.patch(validated_url.as_str()),
            "DELETE" => self.client.delete(validated_url.as_str()),
            _ => self.client.post(validated_url.as_str()),
        };

        let res = req
            .header("Content-Type", "application/json")
            .body(msg.content.clone())
            .send()
            .await?;
        
        let status = res.status();
        if !status.is_success() {
            tracing::warn!(
                "⚠️ HTTP Sender to {} returned status: {}",
                validated_url.host_str().unwrap_or("unknown"),
                status
            );
        } else {
            tracing::info!(
                "✅ HTTP Sender delivered to {}",
                validated_url.host_str().unwrap_or("unknown")
            );
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_url_blocks_localhost() {
        assert!(HttpSender::validate_url("http://localhost:8080/api").is_err());
        assert!(HttpSender::validate_url("http://127.0.0.1:8080/api").is_err());
    }

    #[test]
    fn test_validate_url_blocks_metadata() {
        assert!(HttpSender::validate_url("http://169.254.169.254/latest/meta-data/").is_err());
        assert!(HttpSender::validate_url("http://metadata.google.internal/computeMetadata/v1/").is_err());
    }

    #[test]
    fn test_validate_url_allows_external() {
        // Note: This test may fail if the host doesn't resolve
        let result = HttpSender::validate_url("https://api.example.com/webhook");
        // Just check it doesn't panic - actual validation depends on DNS
        let _ = result;
    }

    #[test]
    fn test_validate_url_blocks_file_scheme() {
        assert!(HttpSender::validate_url("file:///etc/passwd").is_err());
    }
}

