use std::time::Instant;

const SB: u8 = 0x0B;
const EB: u8 = 0x1C;
const CR: u8 = 0x0D;

#[derive(Debug, PartialEq, Clone)]
pub enum MllpState {
    WaitingStart,
    Accumulating,
    Complete,
    Error(String),
}

pub struct MllpFrameAccumulator {
    state: MllpState,
    buffer: Vec<u8>,
    last_activity: Instant,
    timeout_ms: u64,
}

impl MllpFrameAccumulator {
    pub fn new(timeout_ms: u64) -> Self {
        Self {
            state: MllpState::WaitingStart,
            buffer: Vec::with_capacity(4096),
            last_activity: Instant::now(),
            timeout_ms,
        }
    }

    pub fn reset(&mut self) {
        self.state = MllpState::WaitingStart;
        self.buffer.clear();
        self.last_activity = Instant::now();
    }

    pub fn feed(&mut self, data: &[u8]) -> Vec<String> {
        self.last_activity = Instant::now();
        let mut messages = Vec::new();
        
        for &byte in data {
            match self.state {
                MllpState::WaitingStart => {
                    if byte == SB {
                        self.state = MllpState::Accumulating;
                        self.buffer.clear();
                    }
                }
                MllpState::Accumulating => {
                    if byte == SB {
                        // Restart
                        self.buffer.clear();
                    } else if byte == EB {
                         // End of content, expecting CR
                         self.state = MllpState::Complete; 
                    } else {
                        self.buffer.push(byte);
                    }
                }
                MllpState::Complete => { 
                    if byte == CR {
                        // Full frame
                        if let Ok(msg) = String::from_utf8(self.buffer.clone()) {
                            messages.push(msg);
                        }
                        self.state = MllpState::WaitingStart;
                        self.buffer.clear();
                    } else {
                        // Malformed
                        self.state = MllpState::WaitingStart;
                        self.buffer.clear();
                        if byte == SB {
                            self.state = MllpState::Accumulating;
                        }
                    }
                }
                 MllpState::Error(_) => {
                    if byte == SB {
                         self.state = MllpState::Accumulating;
                         self.buffer.clear();
                    }
                }
            }
        }
        
        messages
    }

    pub fn check_timeout(&mut self) -> bool {
        if self.state != MllpState::WaitingStart && self.last_activity.elapsed().as_millis() as u64 > self.timeout_ms {
            self.state = MllpState::Error("Timeout".to_string());
            self.buffer.clear();
            return true;
        }
        false
    }
}

pub fn generate_ack(hl7_msg: &str) -> String {
    // 1. Parse MSH
    // MSH|^~\&|SendingApp|SendingFac|ReceivingApp|ReceivingFac|Timestamp||MSG_TYPE|MSG_CTRL_ID|P|2.3
    
    let segments: Vec<&str> = hl7_msg.split('\r').collect();
    if segments.is_empty() {
        return "".to_string(); // Invalid
    }
    
    let msh_fields: Vec<&str> = segments[0].split('|').collect();
    if msh_fields.len() < 10 {
         // Fallback basic ACK
         let now = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
         return format!("\x0BMSA|AA|Unknown|{}\x1C\x0D", now);
    }
    
    // MSH-3 (SendingApp) -> becomes ReceivingApp
    let sending_app = msh_fields.get(2).unwrap_or(&"");
    let sending_fac = msh_fields.get(3).unwrap_or(&"");
    // MSH-5 (ReceivingApp) -> becomes SendingApp
    let receiving_app = msh_fields.get(4).unwrap_or(&"");
    let receiving_fac = msh_fields.get(5).unwrap_or(&"");
    
    let msg_control_id = msh_fields.get(9).unwrap_or(&"");
    //let _msg_type = msh_fields.get(8).unwrap_or(&""); 
    
    let now = chrono::Utc::now().format("%Y%m%d%H%M%S").to_string();
    
    // Construct ACK (MSA needed)
    // MSH|^~\&|{ReceivingApp}|{ReceivingFac}|{SendingApp}|{SendingFac}|{TIMESTAMP}||ACK|{NEW_ID}|P|2.3
    // MSA|AA|{MSG_CTRL_ID}
    
    let ack_msh = format!(
        "MSH|^~\\&|{}|{}|{}|{}|{}||ACK|{}|P|2.3",
        receiving_app, receiving_fac, sending_app, sending_fac, now,  uuid::Uuid::new_v4().to_string()
    );
    
    let ack_msa = format!("MSA|AA|{}", msg_control_id);
    
    format!("\x0B{}\r{}\x1C\x0D", ack_msh, ack_msa)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_perfect_frame() {
        let mut acc = MllpFrameAccumulator::new(1000);
        let msg = "MSH|^~\\&|APP|FAC|...\rPID|1|...";
        let input = format!("\x0B{}\x1C\x0D", msg);
        
        let msgs = acc.feed(input.as_bytes());
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0], msg);
    }
    
    #[test]
    fn test_fragmented_frame() {
        let mut acc = MllpFrameAccumulator::new(1000);
        let msg = "MSH|^~\\&|APP|FAC|...\rPID|1|...";
        
        // Part 1: <SB>MSH...
        let part1 = format!("\x0B{}", &msg[0..10]);
        let msgs1 = acc.feed(part1.as_bytes());
        assert_eq!(msgs1.len(), 0);
        assert_eq!(acc.state, MllpState::Accumulating);
        
        // Part 2: ...Rest<EB><CR>
        let part2 = format!("{}\x1C\x0D", &msg[10..]);
        let msgs2 = acc.feed(part2.as_bytes());
        assert_eq!(msgs2.len(), 1);
        assert_eq!(msgs2[0], msg);
    }

    #[test]
    fn test_multiple_messages() {
        let mut acc = MllpFrameAccumulator::new(1000);
        let msg1 = "MSG1";
        let msg2 = "MSG2";
        let input = format!("\x0B{}\x1C\x0D\x0B{}\x1C\x0D", msg1, msg2);
        
        let msgs = acc.feed(input.as_bytes());
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0], msg1);
        assert_eq!(msgs[1], msg2);
    }

    #[test]
    fn test_timeout() {
         let mut acc = MllpFrameAccumulator::new(10); // 10ms
         let part1 = "\x0BPartial";
         acc.feed(part1.as_bytes());
         
         std::thread::sleep(std::time::Duration::from_millis(20));
         
         assert!(acc.check_timeout());
         if let MllpState::Error(e) = acc.state {
             assert_eq!(e, "Timeout");
         } else {
             panic!("Should be error");
         }
    }
    
    #[test]
    fn test_ack_generation() {
        let input_hl7 = "MSH|^~\\&|HIS|Hospital|Mirth|System|20231010120000||ADT^A01|MSG12345|P|2.3\rPID|...";
        let ack = generate_ack(input_hl7);
        
        assert!(ack.starts_with("\x0BMSH"));
        assert!(ack.contains("|Mirth|System|HIS|Hospital|")); // Default swapped
        assert!(ack.contains("|ACK|"));
        assert!(ack.contains("MSA|AA|MSG12345"));
        assert!(ack.ends_with("\x1C\x0D"));
    }
}
