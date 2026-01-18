use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};

fn default_true() -> bool {
    true
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum InputMessage {
    #[serde(rename = "init")]
    Init,
    #[serde(rename = "terminal_output")]
    TerminalOutput {
        content: String,
        account: AccountInfo,
    },
}

#[derive(Debug, Deserialize, Clone)]
struct AccountInfo {
    name: String,
    code: String,
    #[serde(rename = "targetServer")]
    target_server: String,
    #[serde(default = "default_true", rename = "server_toggle")]
    server_toggle: bool,
}

#[derive(Debug, Serialize)]
#[serde(tag = "action")]
enum OutputCommand {
    #[serde(rename = "ready")]
    Ready { message: String },
    #[serde(rename = "send_text")]
    SendText { payload: String },
    #[serde(rename = "close_terminal")]
    CloseTerminal { reason: String },
    #[serde(rename = "restart_terminal")]
    RestartTerminal { reason: String },
    #[serde(rename = "defer_account")]
    DeferAccount { reason: String },
    #[serde(rename = "wait")]
    Wait,
}

#[derive(Debug, Clone, PartialEq)]
enum BotState {
    Initial,
    WaitingForCodePrompt,
    WaitingForServerList,
    WaitingForManaPrompt,
    WaitingForEventList,
    InEventLoop,
    ManaRefillFlow(ManaRefillStep),
    AlternateEventFlow,
    Finished,
}

#[derive(Debug, Clone, PartialEq)]
enum ManaRefillStep {
    WaitingForYes,
    WaitingForPotionSelection,
    WaitingForAmount,
}

struct BotSession {
    state: BotState,
    account: Option<AccountInfo>,
    auto_sent: bool,
    history: String,
}

impl BotSession {
    fn new() -> Self {
        BotSession {
            state: BotState::Initial,
            account: None,
            auto_sent: false,
            history: String::new(),
        }
    }

    fn reset(&mut self) {
        self.state = BotState::Initial;
        self.auto_sent = false;
        self.history.clear();
    }

    fn process(&mut self, content: &str, account: &AccountInfo) -> OutputCommand {
        if self.account.is_none() {
            self.account = Some(account.clone());
        }

        // Build history
        self.history.push_str(content);
        if self.history.len() > 15000 {
            let drain_len = self.history.len() - 10000;
            let mut safe_drain = drain_len;
            while !self.history.is_char_boundary(safe_drain) && safe_drain > 0 {
                safe_drain -= 1;
            }
            if safe_drain > 0 {
                self.history.drain(..safe_drain);
            }
        }

        let current = content;
        let history = &self.history;

        // === ERROR HANDLING (Priority) ===
        
        // Error 1: Invalid Command
        if current.contains("Invalid Command") && current.contains("Exiting Now") {
            return OutputCommand::RestartTerminal {
                reason: "Invalid Command error".to_string(),
            };
        }

        // Error 2: Zigza Error
        if current.contains("Either Zigza error or Incorrect Restore Code") {
            return OutputCommand::DeferAccount {
                reason: "Zigza error - will retry later".to_string(),
            };
        }

        // Error (ignored): Out of bounds - server selection wrong (shouldn't happen)
        // Error (ignored): Process ended return code -9 (normal terminal close)

        // Server Full
        if current.contains("Server reached maximum limit") {
            return OutputCommand::RestartTerminal {
                reason: "Server full".to_string(),
            };
        }

        // === STATE MACHINE ===
        
        match &self.state {
            BotState::Initial => {
                if current.contains("Enter Command to use") {
                    self.state = BotState::WaitingForCodePrompt;
                    OutputCommand::SendText {
                        payload: "d".to_string(),
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::WaitingForCodePrompt => {
                if current.contains("Enter Restore code") {
                    if account.server_toggle {
                        self.state = BotState::WaitingForServerList;
                    } else {
                        // Skip server selection scanning
                        self.state = BotState::WaitingForManaPrompt;
                    }

                    OutputCommand::SendText {
                        payload: account.code.clone(),
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::WaitingForServerList => {
                // Check for server selection prompt
                if current.contains("Which acc u want to Login") {
                    self.state = BotState::WaitingForManaPrompt;
                    
                    // Find server index from HISTORY
                    if let Some(index) = self.find_server_index(history, &account.target_server) {
                        OutputCommand::SendText {
                            payload: index.to_string(),
                        }
                    } else {
                        // Default to 1 if not found
                        OutputCommand::SendText {
                            payload: "1".to_string(),
                        }
                    }
                } else if current.contains("spend mana on event stages") || 
                          current.contains("performing dailies") ||
                          current.contains("Press y to spend mana") {
                    // Single server - skip to mana prompt
                    self.state = BotState::WaitingForManaPrompt;
                    self.process(content, account)
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::WaitingForManaPrompt => {
                if current.contains("Press y to spend mana on event stages") ||
                   current.contains("spend mana on event stages") {
                    self.state = BotState::WaitingForEventList;
                    OutputCommand::SendText {
                        payload: "y".to_string(),
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::WaitingForEventList => {
                if current.contains("next: Go to the next event") {
                    if !self.auto_sent {
                        // FIRST TIME - send "auto"
                        self.auto_sent = true;
                        self.state = BotState::InEventLoop;
                        OutputCommand::SendText {
                            payload: "auto".to_string(),
                        }
                    } else {
                        // SECOND TIME - send "exit"
                        self.state = BotState::AlternateEventFlow;
                        OutputCommand::SendText {
                            payload: "exit".to_string(),
                        }
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::InEventLoop => {
                // Mana refill flow
                if current.contains("DO U WANT TO REFILL MANA") ||
                   current.contains("press y to refill") {
                    self.state = BotState::ManaRefillFlow(ManaRefillStep::WaitingForYes);
                    OutputCommand::SendText {
                        payload: "y".to_string(),
                    }
                }
                // More events prompt
                else if current.contains("Press y to do more events") {
                    self.state = BotState::WaitingForEventList;
                    OutputCommand::SendText {
                        payload: "y".to_string(),
                    }
                }
                // Session complete
                else if current.contains("Press y to perform more commands") {
                    self.state = BotState::Finished;
                    OutputCommand::CloseTerminal {
                        reason: "Session complete".to_string(),
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::ManaRefillFlow(step) => {
                match step {
                    ManaRefillStep::WaitingForYes => {
                        if current.contains("select potion") || 
                           current.contains("Enter 1, 2 or 3") {
                            self.state = BotState::ManaRefillFlow(ManaRefillStep::WaitingForPotionSelection);
                            OutputCommand::SendText {
                                payload: "3".to_string(),
                            }
                        } else {
                            OutputCommand::Wait
                        }
                    }
                    ManaRefillStep::WaitingForPotionSelection => {
                        if current.contains("number of stam100 potions") ||
                           current.contains("Enter the number") {
                            self.state = BotState::ManaRefillFlow(ManaRefillStep::WaitingForAmount);
                            OutputCommand::SendText {
                                payload: "1".to_string(),
                            }
                        } else {
                            OutputCommand::Wait
                        }
                    }
                    ManaRefillStep::WaitingForAmount => {
                        // Wait for actual output after sending amount
                        // Look for next prompt to determine state
                        if current.contains("DO U WANT TO REFILL MANA") ||
                           current.contains("Press y to do more events") ||
                           current.contains("next: Go to the next event") {
                            // Back to event loop
                            self.state = BotState::InEventLoop;
                            // Re-process this content in new state
                            self.process(content, account)
                        } else {
                            // Still waiting for next prompt
                            OutputCommand::Wait
                        }
                    }
                }
            }

            BotState::AlternateEventFlow => {
                if current.contains("Press y to perform more commands") {
                    self.state = BotState::Finished;
                    OutputCommand::CloseTerminal {
                        reason: "Session complete (alternate flow)".to_string(),
                    }
                } else {
                    OutputCommand::Wait
                }
            }

            BotState::Finished => {
                OutputCommand::Wait
            }
        }
    }

            fn find_server_index(&self, content: &str, target_server: &str) -> Option<usize> {
        let target = target_server.trim();
        if target.to_lowercase() == "all" {
            for line in content.lines() {
                if line.contains("All of them") {
                    if let Some(index_str) = line.split("-->").next() {
                        if let Ok(index) = index_str.trim().parse::<usize>() {
                            return Some(index);
                        }
                    }
                }
            }
            return None;
        }

        for line in content.lines() {
            if let Some(start_paren) = line.find('(') {
                if let Some(end_paren) = line.find(')') {
                    if end_paren > start_paren {
                        let code_in_parens = &line[start_paren+1..end_paren];
                        let is_match = if target.starts_with("E-") || target.starts_with("EA-") {
                             code_in_parens == target
                        } else {
                             let suffix = format!("-{}", target);
                             code_in_parens.ends_with(&suffix)
                        };

                        if is_match {
                            if let Some(index_str) = line.split("-->").next() {
                                if let Ok(index) = index_str.trim().parse::<usize>() {
                                    return Some(index);
                                }
                            }
                        }
                    }
                }
            }
        }
        None
    }
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let mut session = BotSession::new();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        let input: InputMessage = match serde_json::from_str(&line) {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("[Rust Brain] Failed to parse input: {}", e);
                continue;
            }
        };

        let response = match input {
            InputMessage::Init => {
                session.reset();
                OutputCommand::Ready {
                    message: "Rust brain initialized".to_string(),
                }
            }
            InputMessage::TerminalOutput { content, account } => {
                session.process(&content, &account)
            }
        };

        let json = serde_json::to_string(&response).unwrap();
        writeln!(stdout, "{}", json).unwrap();
        stdout.flush().unwrap();
    }
}


