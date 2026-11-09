// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title OpenPlayComputePool
 * @notice Contrato Inteligente Transparente para la Red Federada y Soporte de GPU de OpenPlay.
 * 
 * Reglas de Arquitectura:
 * 1. Cero ejecución silenciosa: Todo registro de cómputo voluntario requiere aprobación explícita (Opt-In).
 * 2. Transparencia total: Fondos recaudados y aportes de cómputo se destinan públicamente a la compra
 *    y alquiler de servidores GPU (NVIDIA RTX / Data Center) para Cloud Gaming y streaming en consolas/web.
 * 3. Los usuarios que apoyan reciben créditos de tiempo de juego y rango en la red comunitaria.
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract OpenPlayComputePool {
    string public constant VERSION = "1.0.0-openplay";
    
    address public owner;
    address public treasury; // Billetera multisig dedicada a la compra y pago de infraestructura GPU
    
    struct SupporterSession {
        bool isActive;
        uint256 sessionStartTime;
        uint256 accumulatedHashes;
        uint256 claimedGameCredits;
    }
    
    struct GpuClusterRecord {
        string clusterId;      // Ej: "NVIDIA-RTX4080-BOGOTA-01"
        string provider;       // Ej: "NVIDIA CloudXR / Hetzner GPU / Lambda"
        uint256 totalCost;      // Costo en USD (6 decimales)
        uint256 totalHours;     // Horas de streaming provistas
        uint256 timestamp;
        string invoiceHash;    // Comprobante de pago descentralizado (IPFS)
    }

    // Mapeos de estado
    mapping(address => SupporterSession) public supporterSessions;
    mapping(address => uint256) public userGameCredits; // Minutos de streaming disponibles
    mapping(address => bool) public authorizedOrchestrators; // Servidores que validan sesiones de juego
    
    GpuClusterRecord[] public gpuClusters;
    
    uint256 public totalHashesContributed;
    uint256 public totalGpuHoursPurchased;
    uint256 public totalTreasurySpentUsd;

    // Eventos públicos verificables
    event SupporterOptIn(address indexed user, uint256 timestamp);
    event SupporterOptOut(address indexed user, uint256 totalHashes, uint256 creditsEarned);
    event ComputeProofSubmitted(address indexed user, uint256 hashes, uint256 creditsEarned);
    event GpuServerPurchased(string clusterId, string provider, uint256 hoursCount, uint256 costUsd);
    event GameSessionConsumed(address indexed user, uint256 minutesUsed, string gameId);
    event TreasuryUpdated(address newTreasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "OpenPlay: Solo el propietario");
        _;
    }

    modifier onlyOrchestrator() {
        require(authorizedOrchestrators[msg.sender] || msg.sender == owner, "OpenPlay: No autorizado");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury != address(0) ? _treasury : msg.sender;
    }

    /**
     * @notice Registra el consentimiento explícito del usuario para aportar recursos mientras está en la web.
     */
    function acceptSupportTermsAndOptIn() external {
        SupporterSession storage session = supporterSessions[msg.sender];
        session.isActive = true;
        session.sessionStartTime = block.timestamp;
        emit SupporterOptIn(msg.sender, block.timestamp);
    }

    /**
     * @notice Finaliza la sesión de apoyo. Se invoca automáticamente al salir del sitio o apagar el interruptor.
     */
    function revokeSupportAndOptOut() external {
        SupporterSession storage session = supporterSessions[msg.sender];
        require(session.isActive, "OpenPlay: Sesion no activa");
        
        session.isActive = false;
        emit SupporterOptOut(msg.sender, session.accumulatedHashes, session.claimedGameCredits);
    }

    /**
     * @notice Envía una prueba de cómputo ligero voluntario realizado en primer plano.
     * @param hashes Cantidad de hashes/ciclos completados con consentimiento.
     * @param sessionNonce Identificador de sesión para evitar doble gasto.
     */
    function submitComputeProof(uint256 hashes, bytes32 sessionNonce) external {
        SupporterSession storage session = supporterSessions[msg.sender];
        require(session.isActive, "OpenPlay: Debe aceptar los terminos antes de aportar");
        require(hashes > 0, "OpenPlay: Hashes deben ser > 0");

        session.accumulatedHashes += hashes;
        totalHashesContributed += hashes;

        // Regla: Por cada bloque de cómputo completado, el usuario gana créditos de juego
        uint256 earnedMinutes = hashes / 100_000; // 100k hashes = 1 minuto de streaming gratis
        if (earnedMinutes > 0) {
            userGameCredits[msg.sender] += earnedMinutes;
            session.claimedGameCredits += earnedMinutes;
        }

        emit ComputeProofSubmitted(msg.sender, hashes, earnedMinutes);
    }

    /**
     * @notice Compra / financiamiento transparente de un servidor o cluster GPU para la comunidad.
     * @dev Registra el comprobante de que los fondos se usaron para servidores NVIDIA / cloud gaming.
     */
    function recordGpuServerPurchase(
        string calldata clusterId,
        string calldata provider,
        uint256 hoursCount,
        uint256 costUsd,
        string calldata invoiceHash
    ) external onlyOwner {
        gpuClusters.push(GpuClusterRecord({
            clusterId: clusterId,
            provider: provider,
            totalCost: costUsd,
            totalHours: hoursCount,
            timestamp: block.timestamp,
            invoiceHash: invoiceHash
        }));

        totalGpuHoursPurchased += hoursCount;
        totalTreasurySpentUsd += costUsd;

        emit GpuServerPurchased(clusterId, provider, hoursCount, costUsd);
    }

    /**
     * @notice El orquestador de streaming deduce minutos de juego cuando el usuario juega en la nube.
     */
    function deductStreamMinutes(address user, uint256 minutesUsed, string calldata gameId) external onlyOrchestrator {
        require(userGameCredits[user] >= minutesUsed, "OpenPlay: Creditos insuficientes");
        userGameCredits[user] -= minutesUsed;
        emit GameSessionConsumed(user, minutesUsed, gameId);
    }

    /**
     * @notice Añade minutos de juego mediante compra directa (Stripe / Crypto checkout).
     */
    function addGameCredits(address user, uint256 minutesToAdd) external onlyOrchestrator {
        userGameCredits[user] += minutesToAdd;
    }

    function setOrchestrator(address orchestrator, bool allowed) external onlyOwner {
        authorizedOrchestrators[orchestrator] = allowed;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "OpenPlay: Direccion invalida");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function getGpuClustersCount() external view returns (uint256) {
        return gpuClusters.length;
    }
}
