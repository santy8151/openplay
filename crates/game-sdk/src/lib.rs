//! OpenPlay Rust SDK for `host-abi/0`.
//!
//! Provides:
//! - Safe wrappers around the `"host"` import module (`log`, `audio_play`, `storage_get`,
//!   `storage_set`, `net_send`, `mod_emit`).
//! - Deterministic `XorShift32` pseudo-random number generator (no host clock or OS entropy).
//! - Software RGBA8 `Canvas` framebuffer with fast geometric primitives (`clear`, `fill_rect`,
//!   `draw_circle`, `draw_line`).
//! - The `export_game!` macro that wires a `Game` trait implementation to the canonical
//!   `host-abi/0` WebAssembly exports.

#[cfg(target_arch = "wasm32")]
#[link(wasm_import_module = "host")]
extern "C" {
    fn log(ptr: u32, len: u32);
    fn audio_play(id: u32, vol_q8: u32);
    fn storage_get(kptr: u32, klen: u32, vptr: u32, vcap: u32) -> i32;
    fn storage_set(kptr: u32, klen: u32, vptr: u32, vlen: u32) -> i32;
    fn net_send(peer: u32, channel: u32, ptr: u32, len: u32) -> i32;
    fn mod_emit(ptr: u32, len: u32);
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn log(ptr: u32, len: u32) {}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn audio_play(id: u32, vol_q8: u32) {}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn storage_get(kptr: u32, klen: u32, vptr: u32, vcap: u32) -> i32 {
    0
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn storage_set(kptr: u32, klen: u32, vptr: u32, vlen: u32) -> i32 {
    0
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn net_send(peer: u32, channel: u32, ptr: u32, len: u32) -> i32 {
    0
}

#[cfg(not(target_arch = "wasm32"))]
#[allow(unused_variables)]
unsafe fn mod_emit(ptr: u32, len: u32) {}

/// Safe wrappers around the `host` WebAssembly import module.
pub mod host {
    use super::*;

    /// Reliable ordered P2P data channel (`0`).
    pub const CHANNEL_RELIABLE: u32 = 0;
    /// Unreliable unordered low-latency P2P data channel (`1`).
    pub const CHANNEL_UNRELIABLE: u32 = 1;

    /// Emits a UTF-8 diagnostic log string to the host console.
    pub fn log_str(msg: &str) {
        let bytes = msg.as_bytes();
        unsafe {
            log(bytes.as_ptr() as u32, bytes.len() as u32);
        }
    }

    /// Triggers a procedural/synthesized sound cue on the host (`vol_q8`: `256` = 100% volume).
    pub fn play_sound(id: u32, vol_q8: u32) {
        unsafe {
            audio_play(id, vol_q8);
        }
    }

    /// Reads a key from persistent per-game storage into `out_buf`. Returns number of bytes read or negative error.
    pub fn get_storage(key: &str, out_buf: &mut [u8]) -> i32 {
        let k = key.as_bytes();
        unsafe {
            storage_get(
                k.as_ptr() as u32,
                k.len() as u32,
                out_buf.as_mut_ptr() as u32,
                out_buf.len() as u32,
            )
        }
    }

    /// Writes a key-value pair to persistent per-game storage.
    pub fn set_storage(key: &str, val: &[u8]) -> i32 {
        let k = key.as_bytes();
        unsafe {
            storage_set(
                k.as_ptr() as u32,
                k.len() as u32,
                val.as_ptr() as u32,
                val.len() as u32,
            )
        }
    }

    /// Sends a P2P packet to `peer` (`0` = broadcast to all peers) over `channel` (`0` reliable, `1` unreliable).
    pub fn send_net(peer: u32, channel: u32, payload: &[u8]) -> i32 {
        unsafe {
            net_send(
                peer,
                channel,
                payload.as_ptr() as u32,
                payload.len() as u32,
            )
        }
    }

    /// Emits a JSON event payload to the opt-in Lua modding sandbox worker.
    pub fn emit_mod_event(json_event: &str) {
        let bytes = json_event.as_bytes();
        unsafe {
            mod_emit(bytes.as_ptr() as u32, bytes.len() as u32);
        }
    }
}

/// Deterministic 32-bit XorShift PRNG.
/// Never accesses system time or host entropy, guaranteeing lockstep/rollback determinism across peers.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct XorShift32 {
    state: u32,
}

impl XorShift32 {
    /// Initializes the PRNG from a seed. Zero seeds are mapped to a non-zero constant.
    pub const fn new(seed: u32) -> Self {
        let s = if seed == 0 { 0x9E37_79B9 } else { seed };
        Self { state: s }
    }

    /// Returns the internal state for deterministic snapshots.
    pub const fn state(&self) -> u32 {
        self.state
    }

    /// Restores the internal state from a snapshot.
    pub fn set_state(&mut self, state: u32) {
        self.state = if state == 0 { 0x9E37_79B9 } else { state };
    }

    /// Advances the generator and returns the next deterministic `u32`.
    pub fn next_u32(&mut self) -> u32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        x
    }

    /// Returns a deterministic integer in `[min, max]` inclusive.
    pub fn range_i32(&mut self, min: i32, max: i32) -> i32 {
        if max <= min {
            return min;
        }
        let span = (max - min + 1) as u32;
        min + (self.next_u32() % span) as i32
    }
}

/// RGBA8 color utility (`[R, G, B, A]`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Color(pub u8, pub u8, pub u8, pub u8);

impl Color {
    pub const fn rgba(r: u8, g: u8, b: u8, a: u8) -> Self {
        Self(r, g, b, a)
    }

    pub const fn rgb(r: u8, g: u8, b: u8) -> Self {
        Self(r, g, b, 255)
    }
}

/// Software RGBA8 framebuffer (`width * height * 4` bytes).
pub struct Canvas {
    width: u32,
    height: u32,
    pixels: Vec<u8>,
}

impl Canvas {
    /// Allocates a new RGBA8 framebuffer initialized to opaque black.
    pub fn new(width: u32, height: u32) -> Self {
        let w = width.max(1);
        let h = height.max(1);
        let len = (w as usize) * (h as usize) * 4;
        Self {
            width: w,
            height: h,
            pixels: vec![0; len],
        }
    }

    /// Resizes the framebuffer if dimensions changed.
    pub fn resize(&mut self, width: u32, height: u32) {
        let w = width.max(1);
        let h = height.max(1);
        self.width = w;
        self.height = h;
        self.pixels.resize((w as usize) * (h as usize) * 4, 0);
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    /// Returns a raw pointer to the RGBA8 buffer for `game_framebuffer()`.
    pub fn as_ptr(&self) -> *const u8 {
        self.pixels.as_ptr()
    }

    /// Returns the raw pixel slice.
    pub fn pixels(&self) -> &[u8] {
        &self.pixels
    }

    /// Fills the entire framebuffer with `color`.
    pub fn clear(&mut self, color: Color) {
        for chunk in self.pixels.chunks_exact_mut(4) {
            chunk[0] = color.0;
            chunk[1] = color.1;
            chunk[2] = color.2;
            chunk[3] = color.3;
        }
    }

    /// Sets a single pixel if `(x, y)` is within bounds.
    #[inline]
    pub fn set_pixel(&mut self, x: i32, y: i32, color: Color) {
        if x < 0 || y < 0 || (x as u32) >= self.width || (y as u32) >= self.height {
            return;
        }
        let idx = ((y as usize) * (self.width as usize) + (x as usize)) * 4;
        self.pixels[idx] = color.0;
        self.pixels[idx + 1] = color.1;
        self.pixels[idx + 2] = color.2;
        self.pixels[idx + 3] = color.3;
    }

    /// Fills an axis-aligned rectangle `[x, x + w) x [y, y + h)`.
    pub fn fill_rect(&mut self, x: i32, y: i32, w: i32, h: i32, color: Color) {
        if w <= 0 || h <= 0 {
            return;
        }
        let x0 = x.max(0);
        let y0 = y.max(0);
        let x1 = (x + w).min(self.width as i32);
        let y1 = (y + h).min(self.height as i32);
        for py in y0..y1 {
            let row_offset = (py as usize) * (self.width as usize);
            for px in x0..x1 {
                let idx = (row_offset + (px as usize)) * 4;
                self.pixels[idx] = color.0;
                self.pixels[idx + 1] = color.1;
                self.pixels[idx + 2] = color.2;
                self.pixels[idx + 3] = color.3;
            }
        }
    }

    /// Draws a filled circle centered at `(cx, cy)` with radius `r`.
    pub fn draw_circle(&mut self, cx: i32, cy: i32, r: i32, color: Color) {
        if r <= 0 {
            return;
        }
        let r2 = r * r;
        for dy in -r..=r {
            for dx in -r..=r {
                if dx * dx + dy * dy <= r2 {
                    self.set_pixel(cx + dx, cy + dy, color);
                }
            }
        }
    }

    /// Draws a 1px Bresenham line between `(x0, y0)` and `(x1, y1)`.
    pub fn draw_line(&mut self, mut x0: i32, mut y0: i32, x1: i32, y1: i32, color: Color) {
        let dx = (x1 - x0).abs();
        let sx = if x0 < x1 { 1 } else { -1 };
        let dy = -(y1 - y0).abs();
        let sy = if y0 < y1 { 1 } else { -1 };
        let mut err = dx + dy;

        loop {
            self.set_pixel(x0, y0, color);
            if x0 == x1 && y0 == y1 {
                break;
            }
            let e2 = 2 * err;
            if e2 >= dy {
                err += dy;
                x0 += sx;
            }
            if e2 <= dx {
                err += dx;
                y0 += sy;
            }
        }
    }
}

/// Trait implemented by every OpenPlay `host-abi/0` game.
pub trait Game: Default {
    /// Initializes or resets the deterministic simulation state.
    fn init(&mut self, seed: u32, width: u32, height: u32);
    /// Advances the simulation by a fixed timestep `dt_us` microseconds (`1_000_000 / tickrate`).
    fn tick(&mut self, dt_us: u32);
    /// Processes a player input event (`kind`: 0=digital button, 1=analog stick, 2=touch/pointer).
    fn input(&mut self, kind: u32, a: i32, b: i32, c: i32);
    /// Processes a raw P2P network packet received from `peer`.
    fn net_recv(&mut self, peer: u32, data: &[u8]);
    /// Returns a pointer to the RGBA8 framebuffer (`width * height * 4` bytes).
    fn framebuffer(&self) -> *const u8;
    /// Serializes the complete deterministic game state into `out` and returns the number of bytes written.
    fn snapshot(&self, out: &mut [u8]) -> usize;
    /// Restores the complete deterministic game state from `data`.
    fn restore(&mut self, data: &[u8]);
    /// Handles an optional JSON or key=value event emitted by a sandboxed Lua mod.
    fn mod_event(&mut self, event_bytes: &[u8]) {
        let _ = event_bytes;
    }
}

/// Exports all required `host-abi/0` C-ABI symbols for a `Game` implementation.
#[macro_export]
macro_rules! export_game {
    ($game_ty:ty) => {
        static mut __OPENPLAY_GAME_INSTANCE: Option<$game_ty> = None;

        #[inline]
        unsafe fn __openplay_game_mut() -> &'static mut $game_ty {
            if __OPENPLAY_GAME_INSTANCE.is_none() {
                __OPENPLAY_GAME_INSTANCE = Some(<$game_ty as Default>::default());
            }
            __OPENPLAY_GAME_INSTANCE.as_mut().unwrap()
        }

        #[no_mangle]
        pub extern "C" fn game_alloc(len: u32) -> u32 {
            let cap = (len as usize).max(1);
            let mut buf = Vec::<u8>::with_capacity(cap);
            let ptr = buf.as_mut_ptr();
            core::mem::forget(buf);
            ptr as usize as u32
        }

        #[no_mangle]
        pub extern "C" fn game_init(seed: u32, w: u32, h: u32) {
            unsafe {
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::init(g, seed, w, h);
            }
        }

        #[no_mangle]
        pub extern "C" fn game_tick(dt_us: u32) {
            unsafe {
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::tick(g, dt_us);
            }
        }

        #[no_mangle]
        pub extern "C" fn game_input(kind: u32, a: i32, b: i32, c: i32) {
            unsafe {
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::input(g, kind, a, b, c);
            }
        }

        #[no_mangle]
        pub extern "C" fn game_net_recv(peer: u32, ptr: u32, len: u32) {
            unsafe {
                let slice = core::slice::from_raw_parts(ptr as usize as *const u8, len as usize);
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::net_recv(g, peer, slice);
            }
        }

        #[no_mangle]
        pub extern "C" fn game_framebuffer() -> u32 {
            unsafe {
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::framebuffer(g) as usize as u32
            }
        }

        #[no_mangle]
        pub extern "C" fn game_snapshot(ptr: u32, cap: u32) -> u32 {
            unsafe {
                let out = core::slice::from_raw_parts_mut(ptr as usize as *mut u8, cap as usize);
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::snapshot(g, out) as u32
            }
        }

        #[no_mangle]
        pub extern "C" fn game_restore(ptr: u32, len: u32) {
            unsafe {
                let data = core::slice::from_raw_parts(ptr as usize as *const u8, len as usize);
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::restore(g, data);
            }
        }

        #[no_mangle]
        pub extern "C" fn game_mod_event(ptr: u32, len: u32) {
            unsafe {
                let data = core::slice::from_raw_parts(ptr as usize as *const u8, len as usize);
                let g = __openplay_game_mut();
                <$game_ty as $crate::Game>::mod_event(g, data);
            }
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xorshift32_is_deterministic() {
        let mut a = XorShift32::new(42);
        let mut b = XorShift32::new(42);
        for _ in 0..100 {
            assert_eq!(a.next_u32(), b.next_u32());
        }
    }

    #[test]
    fn canvas_primitives_stay_within_bounds() {
        let mut canvas = Canvas::new(64, 48);
        canvas.clear(Color::rgb(10, 14, 23));
        canvas.fill_rect(-10, -10, 30, 30, Color::rgb(0, 240, 255));
        canvas.draw_circle(32, 24, 12, Color::rgb(255, 42, 133));
        canvas.draw_line(0, 0, 63, 47, Color::rgb(0, 255, 157));
        assert_eq!(canvas.pixels().len(), 64 * 48 * 4);
    }
}
