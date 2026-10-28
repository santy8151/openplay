//! Neon Grid Arena (`dev.openplay.arena`)
//!
//! Deterministic 2-4 player cyberpunk arena brawler built on `openplay-game-sdk` (`host-abi/0`).
//! Supports lockstep/rollback binary state serialization (`game_snapshot` / `game_restore`),
//! directional movement, kinetic dash cooldowns, plasma projectiles, and score tracking.

use openplay_game_sdk::{export_game, host, Canvas, Color, Game, XorShift32};

const MAX_PLAYERS: usize = 4;
const MAX_PROJECTILES: usize = 8;
const SNAPSHOT_SIZE: usize = 8 + (MAX_PLAYERS * 24) + (MAX_PROJECTILES * 16);

#[derive(Clone, Copy, Default)]
struct Pilot {
    x_q8: i32,
    y_q8: i32,
    vx_q8: i32,
    vy_q8: i32,
    dash_cd: i32,
    score: i32,
}

#[derive(Clone, Copy, Default)]
struct Projectile {
    active: i32,
    owner: i32,
    x_q8: i32,
    y_q8: i32,
}

pub struct ArenaGame {
    rng: XorShift32,
    canvas: Canvas,
    tick_count: u32,
    pilots: [Pilot; MAX_PLAYERS],
    projectiles: [Projectile; MAX_PROJECTILES],
}

impl Default for ArenaGame {
    fn default() -> Self {
        let mut g = Self {
            rng: XorShift32::new(0xA4E0_2099),
            canvas: Canvas::new(480, 320),
            tick_count: 0,
            pilots: [Pilot::default(); MAX_PLAYERS],
            projectiles: [Projectile::default(); MAX_PROJECTILES],
        };
        g.reset_positions();
        g.render();
        g
    }
}

impl ArenaGame {
    fn reset_positions(&mut self) {
        let spawns = [(80, 70), (400, 70), (80, 250), (400, 250)];
        for (i, p) in self.pilots.iter_mut().enumerate() {
            p.x_q8 = spawns[i].0 << 8;
            p.y_q8 = spawns[i].1 << 8;
            p.vx_q8 = 0;
            p.vy_q8 = 0;
            p.dash_cd = 0;
        }
        self.projectiles = [Projectile::default(); MAX_PROJECTILES];
    }

    fn spawn_projectile(&mut self, owner: usize, dir_x: i32, dir_y: i32) {
        for proj in self.projectiles.iter_mut() {
            if proj.active == 0 {
                proj.active = 60; // 1 second lifetime at 60Hz
                proj.owner = (owner as i32) | ((dir_x.signum() & 0xFF) << 8) | ((dir_y.signum() & 0xFF) << 16);
                proj.x_q8 = self.pilots[owner].x_q8;
                proj.y_q8 = self.pilots[owner].y_q8;
                host::play_sound(4, 210);
                break;
            }
        }
    }

    fn render(&mut self) {
        let w = self.canvas.width() as i32;
        let h = self.canvas.height() as i32;

        self.canvas.clear(Color::rgb(11, 15, 23));

        // Cyberpunk synth grid
        let mut gx = 0;
        while gx < w {
            self.canvas.draw_line(gx, 0, gx, h - 1, Color::rgb(18, 26, 40));
            gx += 32;
        }
        let mut gy = 0;
        while gy < h {
            self.canvas.draw_line(0, gy, w - 1, gy, Color::rgb(18, 26, 40));
            gy += 32;
        }

        // Arena border
        self.canvas.fill_rect(12, 12, w - 24, 2, Color::rgb(0, 240, 255));
        self.canvas.fill_rect(12, h - 14, w - 24, 2, Color::rgb(255, 42, 133));

        let palette = [
            Color::rgb(0, 240, 255),   // P1 Cyan
            Color::rgb(255, 42, 133),  // P2 Magenta
            Color::rgb(0, 255, 157),   // P3 Acid Green
            Color::rgb(255, 184, 0),   // P4 Amber
        ];

        for (i, p) in self.pilots.iter().enumerate() {
            let px = p.x_q8 >> 8;
            let py = p.y_q8 >> 8;
            let radius = if p.dash_cd > 30 { 11 } else { 8 };
            self.canvas.draw_circle(px, py, radius, palette[i]);

            // Score indicator bars
            for s in 0..p.score.min(8) {
                self.canvas.fill_rect(20 + (i as i32) * 110 + s * 8, 20, 5, 6, palette[i]);
            }
        }

        for proj in self.projectiles.iter() {
            if proj.active > 0 {
                let owner_idx = (proj.owner & 0x03) as usize;
                self.canvas.draw_circle(
                    proj.x_q8 >> 8,
                    proj.y_q8 >> 8,
                    3,
                    palette[owner_idx],
                );
            }
        }
    }
}

impl Game for ArenaGame {
    fn init(&mut self, seed: u32, width: u32, height: u32) {
        self.rng = XorShift32::new(seed);
        self.canvas.resize(width.max(160), height.max(120));
        self.tick_count = 0;
        for p in self.pilots.iter_mut() {
            p.score = 0;
        }
        self.reset_positions();
        self.render();
    }

    fn tick(&mut self, _dt_us: u32) {
        self.tick_count = self.tick_count.wrapping_add(1);
        let w = self.canvas.width() as i32;
        let h = self.canvas.height() as i32;

        // Deterministic bot patrol for idle slots 1..3
        for idx in 1..MAX_PLAYERS {
            if self.pilots[idx].vx_q8 == 0 && self.pilots[idx].vy_q8 == 0 && (self.tick_count % 45 == 0) {
                self.pilots[idx].vx_q8 = self.rng.range_i32(-2, 2) << 8;
                self.pilots[idx].vy_q8 = self.rng.range_i32(-2, 2) << 8;
            }
        }

        for p in self.pilots.iter_mut() {
            if p.dash_cd > 0 {
                p.dash_cd -= 1;
            }
            let boost = if p.dash_cd > 35 { 2 } else { 1 };
            p.x_q8 = (p.x_q8 + p.vx_q8 * boost).clamp(24 << 8, (w - 24) << 8);
            p.y_q8 = (p.y_q8 + p.vy_q8 * boost).clamp(24 << 8, (h - 24) << 8);
        }

        // Advance projectiles and check collisions
        for proj in self.projectiles.iter_mut() {
            if proj.active <= 0 {
                continue;
            }
            proj.active -= 1;
            let owner_idx = (proj.owner & 0x03) as usize;
            let dx = ((proj.owner >> 8) & 0xFF) as i8 as i32;
            let dy = ((proj.owner >> 16) & 0xFF) as i8 as i32;
            proj.x_q8 += dx * (6 << 8);
            proj.y_q8 += dy * (6 << 8);

            let px = proj.x_q8 >> 8;
            let py = proj.y_q8 >> 8;
            for target_idx in 0..MAX_PLAYERS {
                if target_idx == owner_idx {
                    continue;
                }
                let tx = self.pilots[target_idx].x_q8 >> 8;
                let ty = self.pilots[target_idx].y_q8 >> 8;
                let dist2 = (px - tx) * (px - tx) + (py - ty) * (py - ty);
                if dist2 <= 12 * 12 {
                    proj.active = 0;
                    self.pilots[owner_idx].score += 1;
                    self.pilots[target_idx].x_q8 = (w / 2) << 8;
                    self.pilots[target_idx].y_q8 = (h / 2) << 8;
                    host::play_sound(5, 250);
                    break;
                }
            }
        }

        self.render();
    }

    fn input(&mut self, kind: u32, a: i32, b: i32, c: i32) {
        let player = (a as usize).min(MAX_PLAYERS - 1);
        match kind {
            0 => {
                // Movement vector (b = dx, c = dy)
                self.pilots[player].vx_q8 = b.clamp(-1, 1) * (3 << 8);
                self.pilots[player].vy_q8 = c.clamp(-1, 1) * (3 << 8);
            }
            1 => {
                // Kinetic dash
                if self.pilots[player].dash_cd == 0 {
                    self.pilots[player].dash_cd = 50;
                    host::play_sound(2, 220);
                }
            }
            2 => {
                // Fire plasma projectile along (b, c)
                let dx = if b == 0 && c == 0 { 1 } else { b.clamp(-1, 1) };
                let dy = c.clamp(-1, 1);
                self.spawn_projectile(player, dx, dy);
            }
            _ => {}
        }
    }

    fn net_recv(&mut self, peer: u32, data: &[u8]) {
        if data.len() >= 12 {
            let kind = u32::from_le_bytes([data[0], data[1], data[2], data[3]]);
            let dx = i32::from_le_bytes([data[4], data[5], data[6], data[7]]);
            let dy = i32::from_le_bytes([data[8], data[9], data[10], data[11]]);
            self.input(kind, (peer as i32).clamp(0, 3), dx, dy);
        }
    }

    fn framebuffer(&self) -> *const u8 {
        self.canvas.as_ptr()
    }

    fn snapshot(&self, out: &mut [u8]) -> usize {
        if out.len() < SNAPSHOT_SIZE {
            return 0;
        }
        let mut offset = 0;
        let mut write_i32 = |val: i32| {
            out[offset..offset + 4].copy_from_slice(&val.to_le_bytes());
            offset += 4;
        };

        write_i32(self.rng.state() as i32);
        write_i32(self.tick_count as i32);

        for p in self.pilots.iter() {
            write_i32(p.x_q8);
            write_i32(p.y_q8);
            write_i32(p.vx_q8);
            write_i32(p.vy_q8);
            write_i32(p.dash_cd);
            write_i32(p.score);
        }
        for proj in self.projectiles.iter() {
            write_i32(proj.active);
            write_i32(proj.owner);
            write_i32(proj.x_q8);
            write_i32(proj.y_q8);
        }
        offset
    }

    fn restore(&mut self, data: &[u8]) {
        if data.len() < SNAPSHOT_SIZE {
            return;
        }
        let mut offset = 0;
        let mut read_i32 = || -> i32 {
            let v = i32::from_le_bytes([
                data[offset],
                data[offset + 1],
                data[offset + 2],
                data[offset + 3],
            ]);
            offset += 4;
            v
        };

        self.rng.set_state(read_i32() as u32);
        self.tick_count = read_i32() as u32;

        for p in self.pilots.iter_mut() {
            p.x_q8 = read_i32();
            p.y_q8 = read_i32();
            p.vx_q8 = read_i32();
            p.vy_q8 = read_i32();
            p.dash_cd = read_i32();
            p.score = read_i32();
        }
        for proj in self.projectiles.iter_mut() {
            proj.active = read_i32();
            proj.owner = read_i32();
            proj.x_q8 = read_i32();
            proj.y_q8 = read_i32();
        }
        self.render();
    }
}

export_game!(ArenaGame);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arena_rollback_snapshot_roundtrip() {
        let mut a = ArenaGame::default();
        a.init(2099, 480, 320);
        a.input(0, 0, 1, 1);
        a.input(2, 0, 1, 0);
        for _ in 0..30 {
            a.tick(16_666);
        }

        let mut buf = [0u8; SNAPSHOT_SIZE];
        assert_eq!(a.snapshot(&mut buf), SNAPSHOT_SIZE);

        let mut b = ArenaGame::default();
        b.init(1, 480, 320);
        b.restore(&buf);

        let mut buf2 = [0u8; SNAPSHOT_SIZE];
        assert_eq!(b.snapshot(&mut buf2), SNAPSHOT_SIZE);
        assert_eq!(buf, buf2);
    }
}
