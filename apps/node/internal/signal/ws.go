package signal

import (
	"bufio"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	// MaxPlayersPerRoom is the hard upper bound of peers in a single room.
	MaxPlayersPerRoom = 8
	// MaxPayloadBytes limits any incoming signaling frame to 16 KiB.
	MaxPayloadBytes = 16 * 1024
	// MaxMessagesPerSecond limits each peer connection to 30 messages/s.
	MaxMessagesPerSecond = 30
	// IdleTimeout disconnects peers that send no traffic or ping within 60 seconds.
	IdleTimeout = 60 * time.Second

	wsGUID     = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
	roomChars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	roomLength = 6
)

var (
	ErrRoomNotFound = errors.New("room not found")
	ErrRoomFull     = errors.New("room has reached maximum player capacity")
	ErrRateLimited  = errors.New("signaling rate limit exceeded (max 30 msg/s)")
	ErrFrameTooBig  = errors.New("signaling frame exceeds 16 KiB limit")
)

// Envelope is the wire format for all WebSocket signaling messages.
type Envelope struct {
	Type    string          `json:"type"`
	Room    string          `json:"room,omitempty"`
	GameID  string          `json:"game_id,omitempty"`
	From    string          `json:"from,omitempty"`
	To      string          `json:"to,omitempty"`
	Max     int             `json:"max,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Error   string          `json:"error,omitempty"`
	Peers   []string        `json:"peers,omitempty"`
	TS      int64           `json:"ts,omitempty"`
}

// RoomSummary represents public metadata about a signaling room.
type RoomSummary struct {
	Code        string    `json:"code"`
	GameID      string    `json:"game_id"`
	HostPeerID  string    `json:"host_peer_id"`
	PlayerCount int       `json:"player_count"`
	MaxPlayers  int       `json:"max_players"`
	Private     bool      `json:"private"`
	CreatedAt   time.Time `json:"created_at"`
}

type peerConn struct {
	id         string
	conn       net.Conn
	rw         *bufio.ReadWriter
	writeMu    sync.Mutex
	roomCode   string
	tokens     float64
	lastRefill time.Time
}

func (p *peerConn) allowMessage(now time.Time) bool {
	elapsed := now.Sub(p.lastRefill).Seconds()
	p.lastRefill = now
	p.tokens += elapsed * float64(MaxMessagesPerSecond)
	if p.tokens > float64(MaxMessagesPerSecond) {
		p.tokens = float64(MaxMessagesPerSecond)
	}
	if p.tokens < 1.0 {
		return false
	}
	p.tokens -= 1.0
	return true
}

func (p *peerConn) sendJSON(msg Envelope) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal signaling envelope: %w", err)
	}
	return p.writeFrame(0x1, data)
}

func (p *peerConn) writeFrame(opcode byte, payload []byte) error {
	p.writeMu.Lock()
	defer p.writeMu.Unlock()

	if p.conn == nil {
		return nil
	}
	_ = p.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))

	header := make([]byte, 0, 10)
	header = append(header, 0x80|opcode) // FIN + opcode
	length := len(payload)
	switch {
	case length <= 125:
		header = append(header, byte(length))
	case length <= 65535:
		header = append(header, 126, byte(length>>8), byte(length))
	default:
		header = append(header, 127)
		var ext [8]byte
		binary.BigEndian.PutUint64(ext[:], uint64(length))
		header = append(header, ext[:]...)
	}

	if _, err := p.rw.Write(header); err != nil {
		return fmt.Errorf("write ws frame header: %w", err)
	}
	if _, err := p.rw.Write(payload); err != nil {
		return fmt.Errorf("write ws frame payload: %w", err)
	}
	return p.rw.Flush()
}

type room struct {
	code       string
	gameID     string
	hostPeerID string
	maxPlayers int
	private    bool
	createdAt  time.Time
	peers      map[string]*peerConn
}

// Hub coordinates P2P rooms and WebRTC SDP/ICE signaling over WebSockets.
type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*room
}

// NewHub initializes an empty signaling Hub.
func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]*room),
	}
}

// CreateRoom provisions a new room via REST or WebSocket.
func (h *Hub) CreateRoom(gameID string, hostPeerID string, maxPlayers int, private bool) (RoomSummary, error) {
	if maxPlayers <= 0 || maxPlayers > MaxPlayersPerRoom {
		maxPlayers = MaxPlayersPerRoom
	}
	if strings.TrimSpace(gameID) == "" {
		return RoomSummary{}, errors.New("game_id is required")
	}
	if strings.TrimSpace(hostPeerID) == "" {
		hostPeerID = "host"
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	code, err := h.generateUniqueCodeLocked()
	if err != nil {
		return RoomSummary{}, fmt.Errorf("generate room code: %w", err)
	}

	r := &room{
		code:       code,
		gameID:     gameID,
		hostPeerID: hostPeerID,
		maxPlayers: maxPlayers,
		private:    private,
		createdAt:  time.Now().UTC(),
		peers:      make(map[string]*peerConn),
	}
	h.rooms[code] = r

	return RoomSummary{
		Code:        r.code,
		GameID:      r.gameID,
		HostPeerID:  r.hostPeerID,
		PlayerCount: 0,
		MaxPlayers:  r.maxPlayers,
		Private:     r.private,
		CreatedAt:   r.createdAt,
	}, nil
}

// ListPublicRooms returns active non-private rooms, optionally filtered by gameID.
func (h *Hub) ListPublicRooms(gameID string) []RoomSummary {
	h.mu.RLock()
	defer h.mu.RUnlock()

	out := make([]RoomSummary, 0, len(h.rooms))
	for _, r := range h.rooms {
		if r.private {
			continue
		}
		if gameID != "" && r.gameID != gameID {
			continue
		}
		out = append(out, RoomSummary{
			Code:        r.code,
			GameID:      r.gameID,
			HostPeerID:  r.hostPeerID,
			PlayerCount: len(r.peers),
			MaxPlayers:  r.maxPlayers,
			Private:     r.private,
			CreatedAt:   r.createdAt,
		})
	}
	return out
}

// DeleteRoom removes a room by code.
func (h *Hub) DeleteRoom(code string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	code = strings.ToUpper(strings.TrimSpace(code))
	if _, exists := h.rooms[code]; !exists {
		return false
	}
	delete(h.rooms, code)
	return true
}

// ActiveRoomCount returns the total number of rooms for Prometheus metrics.
func (h *Hub) ActiveRoomCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms)
}

func (h *Hub) generateUniqueCodeLocked() (string, error) {
	maxIdx := big.NewInt(int64(len(roomChars)))
	for attempt := 0; attempt < 32; attempt++ {
		var sb strings.Builder
		sb.Grow(roomLength)
		for i := 0; i < roomLength; i++ {
			n, err := rand.Int(rand.Reader, maxIdx)
			if err != nil {
				return "", err
			}
			sb.WriteByte(roomChars[n.Int64()])
		}
		code := sb.String()
		if _, exists := h.rooms[code]; !exists {
			return code, nil
		}
	}
	return "", errors.New("exhausted room code generation attempts")
}

// ServeHTTP upgrades an HTTP GET request to a RFC 6455 WebSocket signaling stream.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		http.Error(w, "websocket upgrade required", http.StatusUpgradeRequired)
		return
	}
	wsKey := strings.TrimSpace(r.Header.Get("Sec-WebSocket-Key"))
	if wsKey == "" {
		http.Error(w, "missing Sec-WebSocket-Key", http.StatusBadRequest)
		return
	}

	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "websocket hijacking unsupported", http.StatusInternalServerError)
		return
	}

	conn, rw, err := hijacker.Hijack()
	if err != nil {
		return
	}
	defer conn.Close()

	acceptHash := sha1.Sum([]byte(wsKey + wsGUID))
	acceptVal := base64.StdEncoding.EncodeToString(acceptHash[:])

	handshake := fmt.Sprintf(
		"HTTP/1.1 101 Switching Protocols\r\n"+
			"Upgrade: websocket\r\n"+
			"Connection: Upgrade\r\n"+
			"Sec-WebSocket-Accept: %s\r\n\r\n",
		acceptVal,
	)
	if _, err := rw.WriteString(handshake); err != nil {
		return
	}
	if err := rw.Flush(); err != nil {
		return
	}

	peerID := strings.TrimSpace(r.URL.Query().Get("peer_id"))
	if peerID == "" {
		peerID = randomPeerID()
	}

	peer := &peerConn{
		id:         peerID,
		conn:       conn,
		rw:         rw,
		tokens:     float64(MaxMessagesPerSecond),
		lastRefill: time.Now(),
	}
	defer h.removePeerFromRoom(peer)

	for {
		_ = conn.SetReadDeadline(time.Now().Add(IdleTimeout))
		opcode, payload, err := readFrame(rw.Reader)
		if err != nil {
			return
		}
		if opcode == 0x8 { // Close frame
			_ = peer.writeFrame(0x8, nil)
			return
		}
		if opcode == 0x9 { // Ping frame
			_ = peer.writeFrame(0xA, payload)
			continue
		}
		if opcode != 0x1 && opcode != 0x2 {
			continue
		}

		if !peer.allowMessage(time.Now()) {
			_ = peer.sendJSON(Envelope{
				Type:  "error",
				Error: ErrRateLimited.Error(),
			})
			return
		}

		var env Envelope
		if err := json.Unmarshal(payload, &env); err != nil {
			_ = peer.sendJSON(Envelope{
				Type:  "error",
				Error: "invalid json signaling envelope",
			})
			continue
		}

		if err := h.handleEnvelope(peer, env); err != nil {
			_ = peer.sendJSON(Envelope{
				Type:  "error",
				Error: err.Error(),
			})
		}
	}
}

func (h *Hub) handleEnvelope(peer *peerConn, env Envelope) error {
	switch env.Type {
	case "ping":
		return peer.sendJSON(Envelope{
			Type: "pong",
			From: peer.id,
			TS:   time.Now().UTC().UnixMilli(),
		})

	case "room.create":
		maxPlayers := env.Max
		if maxPlayers <= 0 || maxPlayers > MaxPlayersPerRoom {
			maxPlayers = MaxPlayersPerRoom
		}
		gameID := strings.TrimSpace(env.GameID)
		if gameID == "" {
			gameID = "dev.openplay.pong"
		}
		summary, err := h.CreateRoom(gameID, peer.id, maxPlayers, false)
		if err != nil {
			return fmt.Errorf("create room: %w", err)
		}
		return h.joinRoom(peer, summary.Code)

	case "room.join":
		code := strings.ToUpper(strings.TrimSpace(env.Room))
		if code == "" {
			return errors.New("room code is required")
		}
		return h.joinRoom(peer, code)

	case "room.leave":
		h.removePeerFromRoom(peer)
		return peer.sendJSON(Envelope{
			Type: "room.left",
			From: peer.id,
		})

	case "sig.offer", "sig.answer", "sig.ice":
		return h.relaySignaling(peer, env)

	default:
		return fmt.Errorf("unsupported signaling message type %q", env.Type)
	}
}

func (h *Hub) joinRoom(peer *peerConn, code string) error {
	h.removePeerFromRoom(peer)

	h.mu.Lock()
	r, exists := h.rooms[code]
	if !exists {
		h.mu.Unlock()
		return ErrRoomNotFound
	}
	if len(r.peers) >= r.maxPlayers {
		h.mu.Unlock()
		return ErrRoomFull
	}

	r.peers[peer.id] = peer
	peer.roomCode = code

	peerList := make([]string, 0, len(r.peers))
	otherPeers := make([]*peerConn, 0, len(r.peers))
	for id, p := range r.peers {
		peerList = append(peerList, id)
		if id != peer.id {
			otherPeers = append(otherPeers, p)
		}
	}
	gameID := r.gameID
	h.mu.Unlock()

	if err := peer.sendJSON(Envelope{
		Type:   "room.joined",
		Room:   code,
		GameID: gameID,
		From:   peer.id,
		Peers:  peerList,
	}); err != nil {
		return err
	}

	for _, other := range otherPeers {
		_ = other.sendJSON(Envelope{
			Type:  "peer.joined",
			Room:  code,
			From:  peer.id,
			Peers: peerList,
		})
	}
	return nil
}

func (h *Hub) relaySignaling(sender *peerConn, env Envelope) error {
	h.mu.RLock()
	code := sender.roomCode
	if code == "" {
		h.mu.RUnlock()
		return errors.New("peer has not joined a room")
	}
	r, exists := h.rooms[code]
	if !exists {
		h.mu.RUnlock()
		return ErrRoomNotFound
	}

	var targets []*peerConn
	if env.To != "" {
		if target, ok := r.peers[env.To]; ok {
			targets = append(targets, target)
		}
	} else {
		for id, p := range r.peers {
			if id != sender.id {
				targets = append(targets, p)
			}
		}
	}
	h.mu.RUnlock()

	outbound := Envelope{
		Type:    env.Type,
		Room:    code,
		From:    sender.id,
		To:      env.To,
		Payload: env.Payload,
		TS:      time.Now().UTC().UnixMilli(),
	}
	for _, t := range targets {
		_ = t.sendJSON(outbound)
	}
	return nil
}

func (h *Hub) removePeerFromRoom(peer *peerConn) {
	h.mu.Lock()
	code := peer.roomCode
	if code == "" {
		h.mu.Unlock()
		return
	}
	peer.roomCode = ""
	r, exists := h.rooms[code]
	if !exists {
		h.mu.Unlock()
		return
	}
	delete(r.peers, peer.id)

	remaining := make([]*peerConn, 0, len(r.peers))
	peerIDs := make([]string, 0, len(r.peers))
	for id, p := range r.peers {
		remaining = append(remaining, p)
		peerIDs = append(peerIDs, id)
	}
	if len(r.peers) == 0 {
		delete(h.rooms, code)
	}
	h.mu.Unlock()

	for _, p := range remaining {
		_ = p.sendJSON(Envelope{
			Type:  "peer.left",
			Room:  code,
			From:  peer.id,
			Peers: peerIDs,
		})
	}
}

func readFrame(r *bufio.Reader) (byte, []byte, error) {
	var head [2]byte
	if _, err := io.ReadFull(r, head[:]); err != nil {
		return 0, nil, err
	}
	opcode := head[0] & 0x0F
	masked := (head[1] & 0x80) != 0
	length := int64(head[1] & 0x7F)

	switch length {
	case 126:
		var ext [2]byte
		if _, err := io.ReadFull(r, ext[:]); err != nil {
			return 0, nil, err
		}
		length = int64(binary.BigEndian.Uint16(ext[:]))
	case 127:
		var ext [8]byte
		if _, err := io.ReadFull(r, ext[:]); err != nil {
			return 0, nil, err
		}
		length = int64(binary.BigEndian.Uint64(ext[:]))
	}

	if length > MaxPayloadBytes {
		return 0, nil, ErrFrameTooBig
	}

	var maskKey [4]byte
	if masked {
		if _, err := io.ReadFull(r, maskKey[:]); err != nil {
			return 0, nil, err
		}
	}

	payload := make([]byte, length)
	if _, err := io.ReadFull(r, payload); err != nil {
		return 0, nil, err
	}
	if masked {
		for i := range payload {
			payload[i] ^= maskKey[i%4]
		}
	}
	return opcode, payload, nil
}

func randomPeerID() string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("peer-%x", b[:])
}
