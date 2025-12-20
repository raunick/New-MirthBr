use mirthbr_backend::engine::channel_manager::ChannelManager;
use mirthbr_backend::engine::init::{ensure_default_channels, HELLO_WORLD_CHANNEL_ID};
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;

// NOTE: These tests need the backend to be exposed as a library.
// If `main.rs` contains all the modules and they are not public in `lib.rs` (or if `lib.rs` doesn't exist),
// we might need to adjust. Assuming a standard structure or that we can access modules.
//
// In this project `src/main.rs` seems to be the entry point. To make integration tests work nicely,
// ideally core logic should be in `lib.rs`.
// Checking `Cargo.toml` or file structure...
// If `lib.rs` is missing, we can't easily import modules in `tests/`.
// 
// For now, I will assume the modules are accessible or I will have to add a `src/lib.rs` to expose them.

#[tokio::test]
async fn test_default_channel_initialization_idempotency() {
    // 1. Setup temporary DB
    let params = "test_init.db";
    let db_url = format!("sqlite:{}", params);
    
    // Clean up previous run if any
    let _ = tokio::fs::remove_file(params).await;

    let db = mirthbr_backend::storage::db::Database::new(&db_url).await.expect("Failed to create test DB");
    
    let logs = Arc::new(Mutex::new(VecDeque::new()));
    // Pass the DB to ChannelManager
    let channel_manager = Arc::new(ChannelManager::new(Some(db), logs));

    // 2. Run initialization FIRST time
    ensure_default_channels(channel_manager.clone()).await;

    // 3. Verify channel exists
    // Now that we have a DB, get_channel_by_id should work
    let channel = channel_manager.get_channel_by_id(HELLO_WORLD_CHANNEL_ID).await.expect("Failed to get channel");
    assert!(channel.is_some(), "Default channel should exist after first init");
    
    let active_ids = channel_manager.get_active_channel_ids();
    assert_eq!(active_ids.len(), 1, "Should have exactly 1 active channel from start_channel");
    assert_eq!(active_ids[0], HELLO_WORLD_CHANNEL_ID, "Active channel ID should match fixed UUID");

    // 4. Run initialization SECOND time
    ensure_default_channels(channel_manager.clone()).await;

    // 5. Verify still only 1 channel (Idempotency)
    let active_ids_after = channel_manager.get_active_channel_ids();
    assert_eq!(active_ids_after.len(), 1, "Should still have exactly 1 active channel after re-init");
    
    // Cleanup
    let _ = tokio::fs::remove_file(params).await;
}
