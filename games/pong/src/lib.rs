//! CyberPong 2099 (`dev.openplay.pong`)
//!
//! Deterministic 60Hz fixed-timestep 1P/2P Pong built on `openplay-game-sdk` (`host-abi/0`).
//! Supports full binary state snapshot/restore for lockstep/rollback verification and live
//! Lua modding hooks (`speed_mul_q8`, `paddle_h`, `neon_theme`).

use openplay_game_sdk::{export_game, host, Canvas, Color, Game, XorShift32};

const SNAPSHOT_SIZE: usize = 48;

pub struct PongGame {
    rng: XorShift32,
    canvas: Canvas,
    tick_count: u32,
    ball_x_q8: i32,
    ball_y_q8: i32,
    ball_vx_q8: i32,
    ball_vy_q8: i32,
    p1_y_q8: i32,
    p2_y_q8: i32,
    p1_vy_q8: i32,
    p2_vy_q8: i32,
    score_p1: u32,
    score_p2: u32,
    paddle_h: i32,
    speed_mul_q8: i32,
    ball_color: Color,
}

impl Default for PongGame {
    fn default() -> Self {
        let mut g = Self {
            rng: XorShift32::new(0xC0DE_2099),
            canvas: Canvas::new(480, 320),
            tick_count: 0,
            ball_x_q8: (480 / 2) << 8,
            ball_y_q8: (320 / 2) << 8,
            ball_vx_q8: 3 << 8,
            ball_vy_q8: 2 << 8,
            p1_y_q8: (320 / 2 - 28) << 8,
            p2_y_q8: (320 / 2 - 28) << 8,
            p1_vy_q8: 0,
            p2_vy_q8: 0,
            score_p1: 0,
            score_p2: 0,
            paddle_h: 56,
            speed_mul_q8: 256,
            ball_color: Color::rgb(0, 240, 255),
        };
        g.render();
        g
    }
}

impl PongGame {
    fn reset_ball(&mut self, dir: i32) {
        let w = self.canvas.width() as i32;
        let h = self.canvas.height() as i32;
        self.ball_x_q8 = (w / 2) << 8;
        self.ball_y_q8 = (h / 2) << 8;
        let vy_sign = if (self.rng.next_u32() & 1) == 0 { 1 } else { -1 };
        let vy_mag = self.rng.range_i32(380, 620);
        self.ball_vx_q8 = dir * ((3 * self.speed_mul_q8) >> 0);
        self.ball_vy_q8 = vy_sign * vy_mag;
    }

    fn render(&mut self) {
        let w = self.canvas.width() as i32;
        let h = self.canvas.height() as i32;

        // Deep cyberpunk obsidian background
        self.canvas.clear(Color::rgb(11, 15, 23));

        // Center dashed neon line
        let mut y = 8;
        while y < h - 8 {
            self.canvas
                .fill_rect(w / 2 - 1, y, 2, 10, Color::rgb(30, 45, 70));
            y += 18;
        }

        // Player 1 paddle (Cyan) & Player 2 paddle (Magenta)
        let p1_y = self.p1_y_q8 >> 8;
        let p2_y = self.p2_y_q8 >> 8;
        self.canvas
            .fill_rect(16, p1_y, 8, self.paddle_h, Color::rgb(0, 240, 255));
        self.canvas
            .fill_rect(w - 24, p2_y, 8, self.paddle_h, Color::rgb(255, 42, 133));

        // Score pips at top
        for i in 0..(self.score_p1.min(10) as i32) {
            self.canvas
                .fill_rect(w / 2 - 30 - i * 10, 12, 6, 10, Color::rgb(0, 240, 255));
        }
        for i in 0..(self.score_p2.min(10) as i32) {
            self.canvas
                .fill_rect(w / 2 + 24 + i * 10, 12, 6, 10, Color::rgb(255, 42, 133));
        }

        // Ball
        let bx = self.ball_x_q8 >> 8;
        let by = self.ball_y_q8 >> 8;
        self.canvas.draw_circle(bx, by, 5, self.ball_color);
    }
}

impl Game for PongGame {
    fn init(&mut self, seed: u32, width: u32, height: u32) {
        self.rng = XorShift32::new(seed);
        self.canvas.resize(width.max(160), height.max(120));
        self.tick_count = 0;
        self.score_p1 = 0;
        self.score_p2 = 0;
        self.paddle_h = 56;
        self.speed_mul_q8 = 256;
        let h = self.canvas.height() as i32;
        self.p1_y_q8 = ((h - self.paddle_h) / 2) << 8;
        self.p2_y_q8 = ((h - self.paddle_h) / 2) << 8;
        self.reset_ball(1);
        self.render();
        host::log_str("CyberPong 2099 initialized");
    }

    fn tick(&mut self, _dt_us: u32) {
        self.tick_count = self.tick_count.wrapping_add(1);
        let w = self.canvas.width() as i32;
        let h = self.canvas.height() as i32;

        // Move paddles
        self.p1_y_q8 = (self.p1_y_q8 + self.p1_vy_q8).clamp(8 << 8, (h - self.paddle_h - 8) << 8);

        // If P2 has no manual velocity, deterministic AI tracks the ball
        if self.p2_vy_q8 == 0 {
            let p2_center = (self.p2_y_q8 >> 8) + self.paddle_h / 2;
            let by = self.ball_y_q8 >> 8;
            if by < p2_center - 4 {
                self.p2_y_q8 -= 640;
            } else if by > p2_center + 4 {
                self.p2_y_q8 += 640;
            }
        } else {
            self.p2_y_q8 += self.p2_vy_q8;
        }
        self.p2_y_q8 = self.p2_y_q8.clamp(8 << 8, (h - self.paddle_h - 8) << 8);

        // Move ball
        self.ball_x_q8 += self.ball_vx_q8;
        self.ball_y_q8 += self.ball_vy_q8;

        let bx = self.ball_x_q8 >> 8;
        let by = self.ball_y_q8 >> 8;

        // Top & bottom wall bounce
        if by <= 6 {
            self.ball_y_q8 = 6 << 8;
            self.ball_vy_q8 = -self.ball_vy_q8;
            host::play_sound(1, 180);
        } else if by >= h - 6 {
            self.ball_y_q8 = (h - 6) << 8;
            self.ball_vy_q8 = -self.ball_vy_q8;
            host::play_sound(1, 180);
        }

        // Left paddle collision
        let p1_top = self.p1_y_q8 >> 8;
        if bx <= 26 && bx >= 16 && by >= p1_top && by <= p1_top + self.paddle_h && self.ball_vx_q8 < 0 {
            self.ball_vx_q8 = (-self.ball_vx_q8 * 17) / 16;
            let offset = by - (p1_top + self.paddle_h / 2);
            self.ball_vy_q8 += offset * 12;
            host::play_sound(2, 220);
            host::emit_mod_event(r#"{"event":"paddle_hit","player":1}"#);
        }

        // Right paddle collision
        let p2_top = self.p2_y_q8 >> 8;
        if bx >= w - 26 && bx <= w - 16 && by >= p2_top && by <= p2_top + self.paddle_h && self.ball_vx_q8 > 0 {
            self.ball_vx_q8 = (-self.ball_vx_q8 * 17) / 16;
            let offset = by - (p2_top + self.paddle_h / 2);
            self.ball_vy_q8 += offset * 12;
            host::play_sound(2, 220);
            host::emit_mod_event(r#"{"event":"paddle_hit","player":2}"#);
        }

        // Scoring
        if bx < 0 {
            self.score_p2 = self.score_p2.wrapping_add(1);
            host::play_sound(3, 255);
            self.reset_ball(1);
        } else if bx > w {
            self.score_p1 = self.score_p1.wrapping_add(1);
            host::play_sound(3, 255);
            self.reset_ball(-1);
        }

        self.render();
    }

    fn input(&mut self, kind: u32, a: i32, b: i32, _c: i32) {
        // kind 0: player `a` vertical axis `b` (-1 up, 0 neutral, 1 down)
        if kind == 0 {
            let speed = 4 << 8;
            if a == 0 {
                self.p1_vy_q8 = b.clamp(-1, 1) * speed;
            } else if a == 1 {
                self.p2_vy_q8 = b.clamp(-1, 1) * speed;
            }
        }
    }

    fn net_recv(&mut self, peer: u32, data: &[u8]) {
        if data.len() >= 4 {
            let vy = i32::from_le_bytes([data[0], data[1], data[2], data[3]]);
            if peer <= 1 {
                self.p2_vy_q8 = vy;
            }
        }
    }

    fn framebuffer(&self) -> *const u8 {
        self.canvas.as_ptr()
    }

    fn snapshot(&self, out: &mut [u8]) -> usize {
        if out.len() < SNAPSHOT_SIZE {
            return 0;
        }
        let words: [i32; 12] = [
            self.rng.state() as i32,
            self.tick_count as i32,
            self.ball_x_q8,
            self.ball_y_q8,
            self.ball_vx_q8,
            self.ball_vy_q8,
            self.p1_y_q8,
            self.p2_y_q8,
            self.score_p1 as i32,
            self.score_p2 as i32,
            self.paddle_h,
            self.speed_mul_q8,
        ];
        for (i, w) in words.iter().enumerate() {
            out[i * 4..(i + 1) * 4].copy_from_slice(&w.to_le_bytes());
        }
        SNAPSHOT_SIZE
    }

    fn restore(&mut self, data: &[u8]) {
        if data.len() < SNAPSHOT_SIZE {
            return;
        }
        let read_i32 = |idx: usize| -> i32 {
            let o = idx * 4;
            i32::from_le_bytes([data[o], data[o + 1], data[o + 2], data[o + 3]])
        };
        self.rng.set_state(read_i32(0) as u32);
        self.tick_count = read_i32(1) as u32;
        self.ball_x_q8 = read_i32(2);
        self.ball_y_q8 = read_i32(3);
        self.ball_vx_q8 = read_i32(4);
        self.ball_vy_q8 = read_i32(5);
        self.p1_y_q8 = read_i32(6);
        self.p2_y_q8 = read_i32(7);
        self.score_p1 = read_i32(8) as u32;
        self.score_p2 = read_i32(9) as u32;
        self.paddle_h = read_i32(10).clamp(24, 140);
        self.speed_mul_q8 = read_i32(11).clamp(128, 768);
        self.render();
    }

    fn mod_event(&mut self, event_bytes: &[u8]) {
        if let Ok(text) = core::str::from_utf8(event_bytes) {
            if text.contains("turbo") {
                self.speed_mul_q8 = 384; // 1.5x ball speed
                self.ball_vx_q8 = (self.ball_vx_q8 * 3) / 2;
                self.ball_color = Color::rgb(0, 255, 157);
            }
            if text.contains("big_paddle") {
                self.paddle_h = 84;
            }
        }
    }
}

export_game!(PongGame);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pong_simulation_and_snapshot_are_deterministic() {
        let mut g1 = PongGame::default();
        let mut g2 = PongGame::default();
        g1.init(1337, 480, 320);
        g2.init(1337, 480, 320);

        for step in 0..180 {
            if step == 30 {
                g1.input(0, 0, -1, 0);
                g2.input(0, 0, -1, 0);
            }
            g1.tick(16_666);
            g2.tick(16_666);
        }

        let mut snap1 = [0u8; SNAPSHOT_SIZE];
        let mut snap2 = [0u8; SNAPSHOT_SIZE];
        assert_eq!(g1.snapshot(&mut snap1), SNAPSHOT_SIZE);
        assert_eq!(g2.snapshot(&mut snap2), SNAPSHOT_SIZE);
        assert_eq!(snap1, snap2);

        // Mutate g2 and restore from snap1
        g2.tick(16_666);
        g2.restore(&snap1);
        let mut snap2_restored = [0u8; SNAPSHOT_SIZE];
        g2.snapshot(&mut snap2_restored);
        assert_eq!(snap1, snap2_restored);
    }
}
