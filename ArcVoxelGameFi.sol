// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArcExplorerBadge (ERC-721)
 * @notice Achievement NFT minted and upgraded automatically by ArcVoxelGameFi.
 */
contract ArcExplorerBadge {
    string public constant name = "Arc Explorer Badge";
    string public constant symbol = "ARCB";
    address public immutable gameContract;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(address => uint256) public tokenOf;
    mapping(uint256 => uint8) public tierOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MetadataUpdate(uint256 indexed tokenId);

    modifier onlyGame() {
        require(msg.sender == gameContract, "Only game contract");
        _;
    }

    constructor(address game) {
        require(game != address(0), "Zero game");
        gameContract = game;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a5 // ERC165
            || interfaceId == 0x80ac58cd // ERC721
            || interfaceId == 0x5b5e139f // ERC721Metadata
            || interfaceId == 0x49064906; // EIP-4906
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "Zero address");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "Nonexistent token");
        return owner;
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "Not authorized");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(from == owner, "Wrong from");
        require(to != address(0), "Zero to");
        require(
            msg.sender == owner || msg.sender == _tokenApprovals[tokenId] || _operatorApprovals[owner][msg.sender],
            "Not approved"
        );
        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        if (tokenOf[from] == tokenId) tokenOf[from] = 0;
        if (tokenOf[to] == 0) tokenOf[to] = tokenId;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function mintOrUpgrade(address player, uint8 newTier) external onlyGame returns (uint256 tokenId) {
        require(newTier >= 1 && newTier <= 3, "Invalid tier");
        tokenId = tokenOf[player];
        if (tokenId == 0) {
            tokenId = _nextTokenId++;
            _owners[tokenId] = player;
            _balances[player] += 1;
            tokenOf[player] = tokenId;
            tierOf[tokenId] = newTier;
            emit Transfer(address(0), player, tokenId);
        } else if (newTier > tierOf[tokenId]) {
            tierOf[tokenId] = newTier;
            emit MetadataUpdate(tokenId);
        }
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "Nonexistent token");
        uint8 tier = tierOf[tokenId];
        string memory tierLabel = tier == 3 ? "Gold" : (tier == 2 ? "Silver" : "Bronze");
        return string(
            abi.encodePacked(
                'data:application/json;utf8,{"name":"Arc Explorer Badge #',
                _toString(tokenId),
                '","description":"On-chain achievement badge for Arc Voxel Quest on Arc L1","attributes":[{"trait_type":"Tier","value":"',
                tierLabel,
                '"}]}'
            )
        );
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

/**
 * @title ArcVoxelGameFi
 * @notice ERC-20 ARCQ reward token, on-chain leaderboard, and achievement NFT minter for Arc Voxel Quest.
 */
contract ArcVoxelGameFi {
    string public constant name = "Arc Quest Shard";
    string public constant symbol = "ARCQ";
    uint8 public constant decimals = 18;

    uint256 public constant MAX_SCORE_PER_RUN = 50_000;
    uint256 public constant REWARD_PER_POINT = 1e18;
    uint256 public constant TIER_BRONZE = 100;
    uint256 public constant TIER_SILVER = 250;
    uint256 public constant TIER_GOLD = 500;
    uint256 public constant MAX_LEADERBOARD = 10;

    ArcExplorerBadge public immutable badgeNft;
    address public owner;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    struct PlayerProfile {
        uint256 bestScore;
        uint256 totalRuns;
        uint256 totalGems;
        uint256 maxCombo;
        uint256 totalTokensEarned;
        uint8 badgeTier;
        uint64 lastPlayedAt;
    }

    struct LeaderboardEntry {
        address player;
        uint256 bestScore;
        uint8 badgeTier;
    }

    mapping(address => PlayerProfile) public profiles;
    LeaderboardEntry[] private _leaderboard;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event RunSubmitted(
        address indexed player,
        uint256 score,
        uint256 gems,
        uint256 maxCombo,
        uint256 rewardMinted,
        uint8 badgeTier
    );

    constructor() {
        owner = msg.sender;
        badgeNft = new ArcExplorerBadge(address(this));
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "Insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "Zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function submitRun(uint256 score, uint256 gems, uint256 maxCombo) external {
        require(score > 0 && score <= MAX_SCORE_PER_RUN, "Invalid score");
        PlayerProfile storage p = profiles[msg.sender];
        p.totalRuns += 1;
        p.totalGems += gems;
        if (maxCombo > p.maxCombo) p.maxCombo = maxCombo;
        if (score > p.bestScore) p.bestScore = score;
        p.lastPlayedAt = uint64(block.timestamp);

        uint256 reward = score * REWARD_PER_POINT;
        p.totalTokensEarned += reward;
        _mint(msg.sender, reward);

        uint8 newTier = p.bestScore >= TIER_GOLD ? 3 : (p.bestScore >= TIER_SILVER ? 2 : (p.bestScore >= TIER_BRONZE ? 1 : 0));
        if (newTier > p.badgeTier) {
            p.badgeTier = newTier;
            badgeNft.mintOrUpgrade(msg.sender, newTier);
        }

        _updateLeaderboard(msg.sender, p.bestScore, p.badgeTier);
        emit RunSubmitted(msg.sender, score, gems, maxCombo, reward, p.badgeTier);
    }

    function _updateLeaderboard(address player, uint256 bestScore, uint8 tier) internal {
        uint256 len = _leaderboard.length;
        for (uint256 i = 0; i < len; i++) {
            if (_leaderboard[i].player == player) {
                _leaderboard[i].bestScore = bestScore;
                _leaderboard[i].badgeTier = tier;
                _sortLeaderboard();
                return;
            }
        }
        if (len < MAX_LEADERBOARD) {
            _leaderboard.push(LeaderboardEntry({player: player, bestScore: bestScore, badgeTier: tier}));
            _sortLeaderboard();
            return;
        }
        if (bestScore > _leaderboard[len - 1].bestScore) {
            _leaderboard[len - 1] = LeaderboardEntry({player: player, bestScore: bestScore, badgeTier: tier});
            _sortLeaderboard();
        }
    }

    function _sortLeaderboard() internal {
        uint256 len = _leaderboard.length;
        for (uint256 i = 1; i < len; i++) {
            LeaderboardEntry memory key = _leaderboard[i];
            uint256 j = i;
            while (j > 0 && _leaderboard[j - 1].bestScore < key.bestScore) {
                _leaderboard[j] = _leaderboard[j - 1];
                j--;
            }
            _leaderboard[j] = key;
        }
    }

    function getPlayerProfile(address player)
        external
        view
        returns (
            uint256 bestScore,
            uint256 totalRuns,
            uint256 totalGems,
            uint256 maxCombo,
            uint256 totalTokensEarned,
            uint8 badgeTier,
            uint256 arcqBalance,
            uint64 lastPlayedAt
        )
    {
        PlayerProfile memory p = profiles[player];
        return (
            p.bestScore,
            p.totalRuns,
            p.totalGems,
            p.maxCombo,
            p.totalTokensEarned,
            p.badgeTier,
            balanceOf[player],
            p.lastPlayedAt
        );
    }

    function getLeaderboard()
        external
        view
        returns (address[] memory players, uint256[] memory scores, uint8[] memory tiers)
    {
        uint256 len = _leaderboard.length;
        players = new address[](len);
        scores = new uint256[](len);
        tiers = new uint8[](len);
        for (uint256 i = 0; i < len; i++) {
            players[i] = _leaderboard[i].player;
            scores[i] = _leaderboard[i].bestScore;
            tiers[i] = _leaderboard[i].badgeTier;
        }
    }
}
