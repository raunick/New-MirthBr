# MirthBR Backend

## Security & TLS

### Generating Self-Signed Certificates
For testing purposes, you can generate self-signed certificates using OpenSSL:

```bash
# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate
openssl req -new -x509 -key key.pem -out cert.pem -days 365
```

### Configuring TLS
You can enable HTTPS for the Admin API by setting environment variables in `.env` (or shell):
- `TLS_CERT_PATH`: Absolute path to `cert.pem`
- `TLS_KEY_PATH`: Absolute path to `key.pem`

Example `.env`:
```
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
```

For individual channels (`http_listener`, `tcp_listener`), you can specify `cert_path` and `key_path` in the channel configuration.
