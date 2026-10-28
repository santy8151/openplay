-- @name: Turbo Neon Overdrive
-- @version: 1.0.0
-- @license: MIT
-- @author: OpenPlay Modding Collective
-- @description: Boosts ball velocity by 50%, widens paddles for high-speed rallies, and shifts ball trail to acid green.

local rally_counter = 0

function on_init()
  emit_game_event("turbo:big_paddle")
end

function on_tick(tick)
  if tick % 300 == 0 then
    emit_game_event("pulse_neon")
  end
end

function on_event(ev)
  rally_counter = rally_counter + 1
  if rally_counter % 5 == 0 then
    emit_game_event("turbo")
  end
end
