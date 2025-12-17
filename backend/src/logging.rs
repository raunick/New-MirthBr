use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use tracing_subscriber::Layer;
use tracing::{Event, Subscriber};
use chrono::Utc;
use crate::storage::logs::LogEntry;

pub struct VecDequeLayer {
    pub logs: Arc<Mutex<VecDeque<LogEntry>>>,
}

impl<S> Layer<S> for VecDequeLayer
where
    S: Subscriber,
{
    fn on_event(&self, event: &Event<'_>, _ctx: tracing_subscriber::layer::Context<'_, S>) {
        let metadata = event.metadata();
        let level = metadata.level().to_string();
        
        // We only care about INFO and above for the UI to avoid noise
        if *metadata.level() > tracing::Level::INFO {
            return;
        }

        let mut visitor = MessageVisitor::new();
        event.record(&mut visitor);
        let message = visitor.message;

        if let Ok(mut logs) = self.logs.lock() {
            if logs.len() >= 100 {
                logs.pop_front();
            }
            logs.push_back(LogEntry {
                timestamp: Utc::now(),
                level,
                message,
                channel_id: None, // System log (no channel context usually)
            });
        }
    }
}

struct MessageVisitor {
    message: String,
}

impl MessageVisitor {
    fn new() -> Self {
        Self {
            message: String::new(),
        }
    }
}

impl tracing::field::Visit for MessageVisitor {
    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{:?}", value);
        }
    }
    
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_string();
        }
    }
}
