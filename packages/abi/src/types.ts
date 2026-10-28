/**
 * OpenPlay Host ABI v0 (`host-abi/0`) Type Definitions & Constants
 */

export const HOST_ABI_VERSION = 'host-abi/0' as const;

export const REQUIRED_GAME_EXPORTS = [
  'memory',
  'game_alloc',
  'game_init',
  'game_tick',
  'game_input',
  'game_net_recv',
  'game_framebuffer',
  'game_snapshot',
  'game_restore'
] as const;

export const OPTIONAL_GAME_EXPORTS = ['game_mod_event'] as const;

export const ALLOWED_HOST_IMPORTS = [
  'log',
  'audio_play',
  'storage_get',
  'storage_set',
  'net_send',
  'mod_emit',
  'kernel_init',
  'kernel_tick',
  'kernel_input',
  'kernel_net_recv',
  'kernel_snapshot',
  'kernel_restore',
  'kernel_mod_event'
] as const;

export enum InputKind {
  KeyDown = 1,
  KeyUp = 2,
  GamepadAxis = 3,
  TouchButton = 4,
  PointerMove = 5
}

export enum KeyCode {
  Up = 1,
  Down = 2,
  Left = 3,
  Right = 4,
  ActionA = 5, // Fire / Boost / Serve
  ActionB = 6, // Dash / Special
  Player2Up = 7,
  Player2Down = 8,
  Player2Left = 9,
  Player2Right = 10,
  Player2ActionA = 11
}

export enum NetChannel {
  ReliableOrdered = 0,
  UnreliableUnordered = 1
}

export interface GameWasmExports {
  memory: WebAssembly.Memory;
  game_alloc: (len: number) => number;
  game_init: (seed: number, width: number, height: number) => void;
  game_tick: (dtUs: number) => void;
  game_input: (kind: number, a: number, b: number, c: number) => void;
  game_net_recv: (peer: number, ptr: number, len: number) => void;
  game_framebuffer: () => number;
  game_snapshot: (ptr: number, cap: number) => number;
  game_restore: (ptr: number, len: number) => void;
  game_mod_event?: (ptr: number, len: number) => void;
}

export interface HostCallbacks {
  onLog?: (message: string) => void;
  onAudioPlay?: (soundId: number, volumeQ8: number) => void;
  onStorageGet?: (key: string) => Uint8Array | null;
  onStorageSet?: (key: string, value: Uint8Array) => boolean;
  onNetSend?: (peer: number, channel: NetChannel, payload: Uint8Array) => number;
  onModEmit?: (eventJson: string) => void;
}

export interface AbiValidationResult {
  valid: boolean;
  errors: string[];
  exportsFound: string[];
  importsFound: Array<{ module: string; name: string; kind: string }>;
}
