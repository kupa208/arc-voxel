// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

error Expired();
error RunAlreadyUsed();
error InvalidScore();
error BadSignature();
error AlreadyEntered();
error SeasonNotEnded();
error InvalidRank();
error PrizeAlreadyClaimed();
error UsdcTransferFailed();
error Paused_();
error NotPaused();
error NotGuardian();
error MaxLevel();
error InvalidLevel();
error InsufficientBalance();
error InsufficientAllowance();
error ZeroAddress();
error InvalidTier();
error NotApproved();
error WrongFrom();
error NonexistentToken();
error NotAuthorized();
error OnlyGame();
error ReceiverRejected();
error NoPoolToRoll();
error SeasonHasLeaderboard();
error AlreadyRolled();
error ReentrantCall();
error InvalidHero();
error InvalidSkin();
error SkinAlreadyOwned();
error SkinNotOwned();
error Soulbound();
error InvalidRoom();
error InvalidEntryFee();
error InvalidDuration();
error NotInRoom();
error RoomClosed();
error RoomNotEnded();
error RoomHasWinners();
error RefundAlreadyClaimed();
error HeroLocked();
error HeroAlreadyUnlocked();
error PassOwned();
error PassLevelLocked();
error PassNotPremium();
error PassRewardClaimed();

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @dev Shared metadata utilities; no external library linking or imports.
abstract contract ArcVoxelArt {
    function _image(string memory color, string memory label) internal pure returns (string memory) {
        bytes memory svg = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">',
            '<rect width="320" height="320" rx="24" fill="#101827"/>',
            '<path d="M160 35L265 95V215L160 280L55 215V95Z" fill="',
            color,
            '"/><text x="160" y="155" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#101827">ARC</text>',
            '<text x="160" y="195" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#101827">',
            label,
            '</text></svg>'
        );
        return string(abi.encodePacked("data:image/svg+xml;base64,", _base64(svg)));
    }

    /// @dev "#rrggbb" for entry `i` of a packed palette of 3-byte colours.
    function _color(bytes memory palette, uint256 i) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory out = new bytes(7);
        out[0] = "#";
        for (uint256 k = 0; k < 3; k++) {
            uint8 b = uint8(palette[i * 3 + k]);
            out[1 + k * 2] = hexChars[b >> 4];
            out[2 + k * 2] = hexChars[b & 15];
        }
        return string(out);
    }

    function _base64(bytes memory data) internal pure returns (string memory) {
        bytes memory alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        bytes memory result = new bytes(4 * ((data.length + 2) / 3));
        uint256 j;
        for (uint256 i = 0; i < data.length; i += 3) {
            uint256 word = uint256(uint8(data[i])) << 16;
            if (i + 1 < data.length) word |= uint256(uint8(data[i + 1])) << 8;
            if (i + 2 < data.length) word |= uint256(uint8(data[i + 2]));
            result[j++] = alphabet[(word >> 18) & 63];
            result[j++] = alphabet[(word >> 12) & 63];
            result[j++] = i + 1 < data.length ? alphabet[(word >> 6) & 63] : bytes1("=");
            result[j++] = i + 2 < data.length ? alphabet[word & 63] : bytes1("=");
        }
        return string(result);
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
 * @title ArcExplorerBadge (ERC-721)
 * @notice Achievement NFT minted and upgraded automatically by ArcVoxelGameFi.
 */
contract ArcExplorerBadge is ArcVoxelArt {
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
    event MetadataUpdate(uint256 tokenId);

    modifier onlyGame() {
        if (msg.sender != gameContract) revert OnlyGame();
        _;
    }

    constructor(address game) {
        if (game == address(0)) revert ZeroAddress();
        gameContract = game;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a5 // ERC165
            || interfaceId == 0x80ac58cd // ERC721
            || interfaceId == 0x5b5e139f // ERC721Metadata
            || interfaceId == 0x49064906; // EIP-4906
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonexistentToken();
        return owner;
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (!(msg.sender == owner || _operatorApprovals[owner][msg.sender])) revert NotAuthorized();
        if (to == owner) revert NotAuthorized(); // ERC-721: cannot approve the current owner
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        if (operator == msg.sender) revert NotAuthorized(); // ERC-721: cannot be your own operator
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        if (from != owner) revert WrongFrom();
        if (to == address(0)) revert ZeroAddress();
        if (!(msg.sender == owner || msg.sender == _tokenApprovals[tokenId] || _operatorApprovals[owner][msg.sender])) {
            revert NotApproved();
        }
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
        _checkOnERC721Received(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length == 0) return;
        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            if (retval != IERC721Receiver.onERC721Received.selector) revert ReceiverRejected();
        } catch {
            revert ReceiverRejected();
        }
    }

    function mintOrUpgrade(address player, uint8 newTier) external onlyGame returns (uint256 tokenId) {
        if (newTier < 1 || newTier > 13) revert InvalidTier();
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
        if (_owners[tokenId] == address(0)) revert NonexistentToken();
        uint8 tier = tierOf[tokenId];
        string memory tierLabel = "Newcomer";
        if (tier == 2) tierLabel = "Rookie";
        else if (tier == 3) tierLabel = "Cadet";
        else if (tier == 4) tierLabel = "Recruit";
        else if (tier == 5) tierLabel = "Scout";
        else if (tier == 6) tierLabel = "Vanguard";
        else if (tier == 7) tierLabel = "Striker";
        else if (tier == 8) tierLabel = "Sentinel";
        else if (tier == 9) tierLabel = "Warlord";
        else if (tier == 10) tierLabel = "Titan";
        else if (tier == 11) tierLabel = "Overlord";
        else if (tier == 12) tierLabel = "Arc Legend";
        else if (tier == 13) tierLabel = "Champion";
        bytes memory json = abi.encodePacked(
            '{"name":"Arc Explorer Badge #',
            _toString(tokenId),
            '","description":"On-chain achievement badge for Arc Voxel Quest on Arc L1","image":"',
            _badgeImage(tier, tierLabel),
            '","attributes":[{"trait_type":"Tier","value":"',
            tierLabel,
            '"}]}'
        );
        return string(abi.encodePacked("data:application/json;base64,", _base64(json)));
    }

    function _badgeImage(uint8 tier, string memory label) internal pure returns (string memory) {
        bytes memory palette = hex"8b7355a8a29e9aa5b17dd3fc3b82f622c55ef97316ef4444a855f7ec489906b6d4ffd700ff3df5";
        return _image(_color(palette, tier - 1), label);
    }
}

/// @notice Non-transferable cosmetics. Token IDs are sequential; skinOf identifies the item: skins 1..9, effects 10..12.
contract ArcVoxelSkins is ArcVoxelArt {
    string public constant name = "Arc Voxel Skin";
    string public constant symbol = "ARCS";
    address public immutable gameContract;
    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => uint8) public skinOf;
    mapping(address => mapping(uint8 => uint256)) public tokenOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor(address game) {
        if (game == address(0)) revert ZeroAddress();
        gameContract = game;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a5 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonexistentToken();
        return owner;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }
    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }

    function mint(address player, uint8 skinId) external returns (uint256 tokenId) {
        if (msg.sender != gameContract) revert OnlyGame();
        if (player == address(0)) revert ZeroAddress();
        if (skinId == 0 || skinId > 12) revert InvalidSkin();
        if (tokenOf[player][skinId] != 0) revert SkinAlreadyOwned();
        tokenId = _nextTokenId++;
        _owners[tokenId] = player;
        _balances[player] += 1;
        skinOf[tokenId] = skinId;
        tokenOf[player][skinId] = tokenId;
        emit Transfer(address(0), player, tokenId);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        uint8 id = skinOf[tokenId];
        string memory label = string(abi.encodePacked(id > 9 ? "Effect " : "Skin ", _toString(id)));
        string memory color = _color(hex"22c55e3b82f6ef4444a855f7f59e0b06b6d4166534e11d48fbbf24a3e63510b981f97316", id - 1);
        bytes memory json = abi.encodePacked(
            '{"name":"Arc Voxel ', label,
            '","description":"Soulbound Arc Voxel Quest cosmetic","image":"', _image(color, label),
            '","attributes":[{"trait_type":"Skin ID","value":', _toString(id), '}]}'
        );
        return string(abi.encodePacked("data:application/json;base64,", _base64(json)));
    }
}

/**
 * @title ArcVoxelGameFi
 * @notice v8: ERC-20 ARCQ rewards, relayed signed runs, quests, 13 badge tiers, a cosmetics shop, a 30-level
 *         battle pass, auto-rolling empty seasons, and USDC tournaments.
 * @dev On Arc Testnet deploy with usdc_ = 0x3600000000000000000000000000000000000000.
 *      ENTRY_FEE and all prize pools are denominated in 6-decimal ERC-20 USDC, not native value.
 */
contract ArcVoxelGameFi {
    string public constant name = "Arc Quest Shard";
    string public constant symbol = "ARCQ";
    uint8 public constant decimals = 18;

    uint256 public constant MAX_SCORE_PER_RUN = 50_000;
    uint256 public constant REWARD_PER_POINT = 5e16;
    // Milestone badges come first (tiers 1..4), then the original eight tiers shifted to 5..12.
    uint256 public constant MILESTONE_1 = 10;
    uint256 public constant MILESTONE_2 = 25;
    uint256 public constant MILESTONE_3 = 50;
    uint256 public constant MILESTONE_4 = 100;
    uint256 public constant TIER_1 = 300;
    uint256 public constant TIER_2 = 700;
    uint256 public constant TIER_3 = 1500;
    uint256 public constant TIER_4 = 3000;
    uint256 public constant TIER_5 = 6000;
    uint256 public constant TIER_6 = 12000;
    uint256 public constant TIER_7 = 25000;
    uint256 public constant TIER_8 = 40000;
    uint8 public constant CHAMPION_TIER = 13;
    uint256 public constant MAX_LEADERBOARD = 10;
    uint256 public constant DAILY_SCORE_CAP = 100_000;
    uint256 public constant SEASON_LENGTH = 1 days;
    uint256 public constant ENTRY_FEE = 1_000_000;
    uint256 public constant HERO_UNLOCK_COST = 800e18;
    uint256 public constant PASS_LENGTH = 30 days;
    uint256 public constant PASS_PRICE = 3_000_000; // 3 USDC, paid into the current season's prize pool
    uint32 public constant PASS_XP_PER_LEVEL = 100;
    uint8 public constant PASS_MAX_LEVEL = 30;
    uint8 public constant PASS_EXCLUSIVE_SKIN = 12; // premium level 30 reward

    ArcExplorerBadge public immutable badgeNft;
    ArcVoxelSkins public immutable skins;
    IERC20 public immutable usdc;
    uint256 public immutable startTime;
    address public signer;
    address public guardian;
    bool public paused;
    uint256 public totalSupply;
    bool private _entered;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    struct RunTicket {
        address player;
        uint256 score;
        uint256 gems;
        uint256 maxCombo;
        uint256 wave;
        uint8 hero;
        uint256 roomId;
        bytes32 runId;
        uint256 deadline;
    }

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

    struct Season {
        // Original distributable pool: claims do not shrink it, so claim order cannot affect payouts.
        uint256 pool;
        uint256 entrants;
        bool rolled;
    }

    struct QuestState {
        uint256 streak;
        uint256 lastActiveDay;
        uint256 runsToday;
        uint8 questMask;
    }

    struct PassState {
        uint32 xp;
        bool premium;
        uint32 freeClaimed;
        uint32 premiumClaimed;
    }

    struct WeekState {
        uint64 week;
        uint16 runs;
        uint32 points;
        uint8 mask;
    }

    struct Room {
        address creator;
        uint64 start;
        uint64 end;
        uint256 entryFee;
        // Original pool, retained after claims/refunds for stable accounting and views.
        uint256 pool;
        uint32 entrants;
        uint8 winnerCount;
    }

    mapping(address => PlayerProfile) public profiles;
    mapping(address => uint256) public rewardDay;
    mapping(address => uint256) public rewardedScoreToday;
    mapping(bytes32 => bool) public usedRun;
    mapping(uint256 => Season) public seasons;
    mapping(uint256 => mapping(address => bool)) public enteredSeason;
    mapping(uint256 => mapping(address => uint256)) public seasonBest;
    mapping(uint256 => LeaderboardEntry[]) private _seasonLeaderboards;
    mapping(uint256 => uint256) public claimedMask;
    mapping(address => uint8) public heroLevel;
    mapping(address => QuestState) private _quests;
    // Bit (id - 1) represents ownership for item IDs 1..12 (skins 1..9, effects 10..12).
    mapping(address => uint16) private _ownedSkins;
    mapping(address => uint8) private _equippedSkin;
    mapping(address => uint8) private _equippedFx;
    // Bit (hero - 8) is set once heroes 8..9 are unlocked with ARCQ. Heroes 0..7 are free.
    mapping(address => uint8) private _heroMask;
    mapping(uint256 => mapping(address => PassState)) private _pass;
    mapping(address => WeekState) private _weekly;
    uint256 public roomCount;
    mapping(uint256 => Room) private _rooms;
    mapping(uint256 => mapping(address => bool)) public roomEntered;
    mapping(uint256 => mapping(address => uint256)) public roomBest;
    mapping(uint256 => LeaderboardEntry[]) private _roomLeaderboards;
    mapping(uint256 => uint256) public roomClaimedMask;
    mapping(uint256 => mapping(address => bool)) public roomRefunded;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    /// @dev reward is the score-based reward; quest bonuses are reported separately.
    event RunSubmitted(
        address indexed player,
        uint256 indexed season,
        uint256 score,
        uint256 gems,
        uint256 maxCombo,
        uint256 wave,
        uint8 hero,
        uint256 reward,
        uint8 badgeTier,
        uint256 roomId
    );
    event SignerChanged(address indexed previousSigner, address indexed newSigner);
    event GuardianChanged(address indexed previousGuardian, address indexed newGuardian);
    event Paused(address account);
    event Unpaused(address account);
    event RunUsed(bytes32 indexed runId, address indexed player);
    event SeasonEntered(uint256 indexed season, address indexed player, uint256 fee);
    event SeasonBestUpdated(uint256 indexed season, address indexed player, uint256 score);
    event LeaderboardUpdated(uint256 indexed season, address indexed player, uint256 rank, uint256 score, uint8 tier);
    event PrizeClaimed(uint256 indexed season, uint256 indexed rank, address indexed player, uint256 amount);
    event SeasonRolledOver(uint256 indexed season, uint256 indexed destinationSeason, uint256 amount);
    event HeroUpgraded(address indexed player, uint8 level);
    event ChampionAwarded(uint256 indexed season, address indexed player);
    event QuestCompleted(address indexed player, uint256 indexed day, uint8 questId, uint256 amount);
    event SkinBought(address indexed player, uint8 indexed id, uint256 cost, uint256 tokenId);
    event SkinEquipped(address indexed player, uint8 id);
    event FxEquipped(address indexed player, uint8 id);
    event HeroUnlocked(address indexed player, uint8 hero);
    event PassBought(uint256 indexed passSeason, address indexed player, uint256 price);
    event PassRewardPaid(uint256 indexed passSeason, address indexed player, uint8 level, bool premium, uint256 amount);
    event RoomCreated(uint256 indexed roomId, address indexed creator, uint256 entryFee, uint64 end);
    event RoomJoined(uint256 indexed roomId, address indexed player, uint256 entryFee);
    event RoomBestUpdated(uint256 indexed roomId, address indexed player, uint256 score);
    event RoomLeaderboardUpdated(uint256 indexed roomId, address indexed player, uint256 rank, uint256 score);
    event RoomPrizeClaimed(uint256 indexed roomId, uint256 indexed rank, address indexed player, uint256 amount);
    event RoomRefundClaimed(uint256 indexed roomId, address indexed player, uint256 amount);

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused_();
        _;
    }

    modifier nonReentrant() {
        if (_entered) revert ReentrantCall();
        _entered = true;
        _;
        _entered = false;
    }

    constructor(address signer_, address guardian_, address usdc_) {
        if (signer_ == address(0)) revert ZeroAddress();
        if (guardian_ == address(0)) revert ZeroAddress();
        if (usdc_ == address(0)) revert ZeroAddress();
        signer = signer_;
        guardian = guardian_;
        usdc = IERC20(usdc_);
        startTime = block.timestamp;
        badgeNft = new ArcExplorerBadge(address(this));
        skins = new ArcVoxelSkins(address(this));
        emit SignerChanged(address(0), signer_);
        emit GuardianChanged(address(0), guardian_);
    }

    function pause() external onlyGuardian whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyGuardian {
        if (!paused) revert NotPaused();
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setSigner(address newSigner) external onlyGuardian {
        if (newSigner == address(0)) revert ZeroAddress();
        address previousSigner = signer;
        signer = newSigner;
        emit SignerChanged(previousSigner, newSigner);
    }

    function setGuardian(address newGuardian) external onlyGuardian {
        if (newGuardian == address(0)) revert ZeroAddress();
        address previousGuardian = guardian;
        guardian = newGuardian;
        emit GuardianChanged(previousGuardian, newGuardian);
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
            if (allowed < amount) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowed - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        if (balanceOf[from] < amount) revert InsufficientBalance();
        balanceOf[from] -= amount;
        totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function submitRun(RunTicket calldata r, bytes calldata signature) external whenNotPaused nonReentrant {
        if (block.timestamp > r.deadline) revert Expired();
        if (usedRun[r.runId]) revert RunAlreadyUsed();
        if (r.score == 0 || r.score > MAX_SCORE_PER_RUN) revert InvalidScore();
        if (r.hero >= 10) revert InvalidHero();
        if (!heroUnlocked(r.player, r.hero)) revert HeroLocked();
        if (r.player == address(0)) revert ZeroAddress();
        if (_recover(_runDigest(r), signature) != signer) revert BadSignature();
        if (r.roomId != 0) _validateRoomRun(r.roomId, r.player);
        usedRun[r.runId] = true;
        emit RunUsed(r.runId, r.player);
        _recordRun(r);
    }

    function _runDigest(RunTicket calldata r) internal view returns (bytes32) {
        // Twelve static ABI words encode identically to the requested twelve
        // separate arguments, without a large legacy-codegen stack.
        uint256[12] memory words;
        words[0] = block.chainid;
        words[1] = uint256(uint160(address(this)));
        words[2] = uint256(uint160(r.player));
        words[3] = currentSeason();
        words[4] = r.roomId;
        words[5] = uint256(r.runId);
        words[6] = r.score;
        words[7] = r.gems;
        words[8] = r.maxCombo;
        words[9] = r.wave;
        words[10] = uint256(r.hero);
        words[11] = r.deadline;
        return keccak256(abi.encode(words));
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address recovered) {
        if (signature.length != 65) revert BadSignature();
        bytes32 r = bytes32(signature[0:32]);
        bytes32 s = bytes32(signature[32:64]);
        uint8 v = uint8(signature[64]);
        if (v != 27 && v != 28) revert BadSignature();
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0) {
            revert BadSignature();
        }
        recovered = ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest)), v, r, s);
        if (recovered == address(0)) revert BadSignature();
    }

    function _recordRun(RunTicket calldata r) internal {
        uint256 reward = _consumeDailyReward(r.player, r.score) * REWARD_PER_POINT;
        PlayerProfile storage p = profiles[r.player];
        p.totalRuns += 1;
        p.totalGems += r.gems;
        if (r.maxCombo > p.maxCombo) p.maxCombo = r.maxCombo;
        if (r.score > p.bestScore) p.bestScore = r.score;
        p.lastPlayedAt = uint64(block.timestamp);

        if (reward > 0) {
            p.totalTokensEarned += reward;
            _mint(r.player, reward);
        }
        _completeQuests(r.player, r.score);
        _awardRunXp(r.player, r.score);

        uint8 newTier = _scoreTier(p.bestScore);
        bool tierUp = newTier > p.badgeTier;
        if (tierUp) p.badgeTier = newTier;
        // Always bring the held badge up to the earned tier: this re-issues a badge the player transferred away and
        // restores the earned tier if they now hold a lower one. The badge only ever upgrades, never downgrades.
        if (tierUp || p.badgeTier > 0) {
            badgeNft.mintOrUpgrade(r.player, p.badgeTier);
        }

        _recordSeasonScore(r.player, r.score, p.badgeTier);
        if (r.roomId != 0) _recordRoomScore(r.roomId, r.player, r.score);
        _emitRunSubmitted(r, reward, p.badgeTier);
    }

    function _scoreTier(uint256 bestScore) internal pure returns (uint8) {
        if (bestScore >= TIER_8) return 12;
        if (bestScore >= TIER_7) return 11;
        if (bestScore >= TIER_6) return 10;
        if (bestScore >= TIER_5) return 9;
        if (bestScore >= TIER_4) return 8;
        if (bestScore >= TIER_3) return 7;
        if (bestScore >= TIER_2) return 6;
        if (bestScore >= TIER_1) return 5;
        if (bestScore >= MILESTONE_4) return 4;
        if (bestScore >= MILESTONE_3) return 3;
        if (bestScore >= MILESTONE_2) return 2;
        if (bestScore >= MILESTONE_1) return 1;
        return 0;
    }

    function _emitRunSubmitted(RunTicket calldata r, uint256 reward, uint8 tier) private {
        emit RunSubmitted(
            r.player, currentSeason(), r.score, r.gems, r.maxCombo, r.wave, r.hero, reward, tier, r.roomId
        );
    }

    /// @dev Caps score-based ARCQ issuance only; quests and tournament scores are not capped.
    function _consumeDailyReward(address player, uint256 score) internal returns (uint256 credited) {
        uint256 today = block.timestamp / 1 days;
        if (rewardDay[player] != today) {
            rewardDay[player] = today;
            rewardedScoreToday[player] = 0;
        }
        uint256 used = rewardedScoreToday[player];
        uint256 room = used >= DAILY_SCORE_CAP ? 0 : DAILY_SCORE_CAP - used;
        credited = score < room ? score : room;
        rewardedScoreToday[player] = used + credited;
    }

    function _completeQuests(address player, uint256 score) private {
        uint256 today = block.timestamp / 1 days;
        QuestState storage q = _quests[player];
        // runsToday != 0 also distinguishes an uninitialized account on UTC day zero.
        if (q.runsToday == 0 || q.lastActiveDay != today) {
            q.streak = q.runsToday != 0 && q.lastActiveDay + 1 == today ? q.streak + 1 : 1;
            q.lastActiveDay = today;
            q.runsToday = 0;
            q.questMask = 0;
        }
        q.runsToday += 1;
        if (q.runsToday == 1) {
            _payQuest(player, today, 0, 5e18 * (q.streak < 7 ? q.streak : 7));
        }
        if (q.runsToday == 3) _payQuest(player, today, 1, 15e18);
        if (score >= 1000 && (q.questMask & 4) == 0) _payQuest(player, today, 2, 30e18);
    }

    function _payQuest(address player, uint256 day, uint8 questId, uint256 amount) private {
        _quests[player].questMask |= uint8(1 << questId);
        profiles[player].totalTokensEarned += amount;
        _mint(player, amount);
        emit QuestCompleted(player, day, questId, amount);
        _addPassXp(player, 25);
    }

    /// @notice Current UTC-day counters. Streak is zero after a missed day, until the next run resets it to one.
    function getQuestState(address player)
        external view returns (uint256 streak, uint256 runsToday, uint8 questMask, uint256 day)
    {
        day = block.timestamp / 1 days;
        QuestState storage q = _quests[player];
        if (q.runsToday == 0) return (0, 0, 0, day);
        streak = q.lastActiveDay == day || q.lastActiveDay + 1 == day ? q.streak : 0;
        if (q.lastActiveDay == day) {
            runsToday = q.runsToday;
            questMask = q.questMask;
        }
    }

    /// @dev Skins 1..9, effects 10..12. Item 12 is a pass reward and cannot be bought.
    function skinCost(uint8 id) public pure returns (uint256) {
        if (id == 1) return 1000e18;
        if (id == 2) return 2000e18;
        if (id == 3) return 3000e18;
        if (id == 4) return 5000e18;
        if (id == 5) return 8000e18;
        if (id == 6) return 12000e18;
        if (id == 7) return 4000e18;
        if (id == 8) return 6000e18;
        if (id == 9) return 10000e18;
        if (id == 10) return 2500e18;
        if (id == 11) return 6000e18;
        revert InvalidSkin();
    }

    function buySkin(uint8 id) external nonReentrant {
        uint256 cost = skinCost(id);
        _burn(msg.sender, cost);
        uint256 tokenId = _grantSkin(msg.sender, id);
        emit SkinBought(msg.sender, id, cost, tokenId);
    }

    function _grantSkin(address player, uint8 id) private returns (uint256 tokenId) {
        uint16 bit = uint16(1) << (id - 1);
        if ((_ownedSkins[player] & bit) != 0) revert SkinAlreadyOwned();
        _ownedSkins[player] |= bit;
        tokenId = skins.mint(player, id);
    }

    /// @notice Equip a skin (1..9, or 0 for none).
    function equipSkin(uint8 id) external {
        if (id > 9) revert InvalidSkin();
        if (id != 0 && (_ownedSkins[msg.sender] & (uint16(1) << (id - 1))) == 0) revert SkinNotOwned();
        _equippedSkin[msg.sender] = id;
        emit SkinEquipped(msg.sender, id);
    }

    /// @notice Equip an effect (10..12, or 0 for none).
    function equipFx(uint8 id) external {
        if (id != 0 && (id < 10 || id > 12)) revert InvalidSkin();
        if (id != 0 && (_ownedSkins[msg.sender] & (uint16(1) << (id - 1))) == 0) revert SkinNotOwned();
        _equippedFx[msg.sender] = id;
        emit FxEquipped(msg.sender, id);
    }

    function getSkins(address player) external view returns (uint16 ownedMask, uint8 equipped, uint8 equippedFx) {
        return (_ownedSkins[player], _equippedSkin[player], _equippedFx[player]);
    }

    /// @notice Heroes 8..9 are unlocked once with ARCQ. They are not stronger: the unlock only opens them for ranked runs.
    function unlockHero(uint8 hero) external nonReentrant {
        if (hero < 8 || hero > 9) revert InvalidHero();
        uint8 bit = uint8(1) << (hero - 8);
        if ((_heroMask[msg.sender] & bit) != 0) revert HeroAlreadyUnlocked();
        _burn(msg.sender, HERO_UNLOCK_COST);
        _heroMask[msg.sender] |= bit;
        emit HeroUnlocked(msg.sender, hero);
    }

    function heroUnlocked(address player, uint8 hero) public view returns (bool) {
        if (hero < 8) return true;
        return hero < 10 && ((_heroMask[player] >> (hero - 8)) & 1) == 1;
    }

    function getHeroMask(address player) external view returns (uint8) {
        return _heroMask[player];
    }

    // ---------------------------------------------------------------- battle pass

    function currentPass() public view returns (uint256) {
        return (block.timestamp - startTime) / PASS_LENGTH;
    }

    function passEndsAt(uint256 passSeason) public view returns (uint256) {
        return startTime + (passSeason + 1) * PASS_LENGTH;
    }

    function _addPassXp(address player, uint32 amount) private {
        PassState storage ps = _pass[currentPass()][player];
        uint32 cap = uint32(PASS_MAX_LEVEL) * PASS_XP_PER_LEVEL;
        uint32 next = ps.xp + amount;
        ps.xp = next > cap ? cap : next;
    }

    /// @dev Run XP: 10 base + up to 40 for score, plus three weekly quests worth 150 XP each.
    function _awardRunXp(address player, uint256 score) private {
        uint32 xp = 10 + uint32(score >= 400 ? 40 : score / 10);
        WeekState storage w = _weekly[player];
        uint64 week = uint64(block.timestamp / 7 days);
        if (w.week != week) {
            w.week = week;
            w.runs = 0;
            w.points = 0;
            w.mask = 0;
        }
        w.runs += 1;
        w.points += uint32(score);
        if (w.runs >= 10 && (w.mask & 1) == 0) { w.mask |= 1; xp += 150; }
        if (score >= 300 && (w.mask & 2) == 0) { w.mask |= 2; xp += 150; }
        if (w.points >= 1500 && (w.mask & 4) == 0) { w.mask |= 4; xp += 150; }
        _addPassXp(player, xp);
    }

    /// @notice Premium costs 3 USDC. It goes into the current season's prize pool, so it is paid back to players.
    function buyPass() external whenNotPaused nonReentrant {
        uint256 passSeason = currentPass();
        PassState storage ps = _pass[passSeason][msg.sender];
        if (ps.premium) revert PassOwned();
        ps.premium = true;
        uint256 season = currentSeason();
        _autoRoll(season);
        seasons[season].pool += PASS_PRICE;
        if (!usdc.transferFrom(msg.sender, address(this), PASS_PRICE)) revert UsdcTransferFailed();
        emit PassBought(passSeason, msg.sender, PASS_PRICE);
    }

    /// @notice Free track: 5 ARCQ x level. Premium track: 10 ARCQ x level, and an exclusive effect at level 30.
    function claimPassReward(uint256 passSeason, uint8 level, bool premium) external nonReentrant {
        if (level == 0 || level > PASS_MAX_LEVEL || passSeason > currentPass()) revert InvalidLevel();
        PassState storage ps = _pass[passSeason][msg.sender];
        if (ps.xp / PASS_XP_PER_LEVEL < level) revert PassLevelLocked();
        uint32 bit = uint32(1) << (level - 1);
        uint256 amount;
        if (premium) {
            if (!ps.premium) revert PassNotPremium();
            if ((ps.premiumClaimed & bit) != 0) revert PassRewardClaimed();
            ps.premiumClaimed |= bit;
            amount = uint256(level) * 10e18;
            if (level == PASS_MAX_LEVEL && (_ownedSkins[msg.sender] & (uint16(1) << (PASS_EXCLUSIVE_SKIN - 1))) == 0) {
                _grantSkin(msg.sender, PASS_EXCLUSIVE_SKIN);
            }
        } else {
            if ((ps.freeClaimed & bit) != 0) revert PassRewardClaimed();
            ps.freeClaimed |= bit;
            amount = uint256(level) * 5e18;
        }
        profiles[msg.sender].totalTokensEarned += amount;
        _mint(msg.sender, amount);
        emit PassRewardPaid(passSeason, msg.sender, level, premium, amount);
    }

    function getPass(address player, uint256 passSeason)
        external view returns (uint32 xp, bool premium, uint32 freeClaimed, uint32 premiumClaimed, uint256 endsAt)
    {
        PassState storage ps = _pass[passSeason][player];
        return (ps.xp, ps.premium, ps.freeClaimed, ps.premiumClaimed, passEndsAt(passSeason));
    }

    /// @notice This week's quests: 10 runs, a 300-point run, 1500 points in total. Each pays 150 pass XP.
    function getWeekly(address player) external view returns (uint16 runs, uint32 points, uint8 mask, uint256 endsAt) {
        uint64 week = uint64(block.timestamp / 7 days);
        WeekState storage w = _weekly[player];
        endsAt = (uint256(week) + 1) * 7 days;
        if (w.week == week) return (w.runs, w.points, w.mask, endsAt);
    }

    function currentSeason() public view returns (uint256) {
        return (block.timestamp - startTime) / SEASON_LENGTH;
    }

    function seasonEndsAt(uint256 season) public view returns (uint256) {
        return startTime + (season + 1) * SEASON_LENGTH;
    }

    function enterSeason() external whenNotPaused nonReentrant {
        uint256 season = currentSeason();
        if (enteredSeason[season][msg.sender]) revert AlreadyEntered();
        enteredSeason[season][msg.sender] = true;
        _autoRoll(season);
        seasons[season].pool += ENTRY_FEE;
        seasons[season].entrants += 1;
        if (!usdc.transferFrom(msg.sender, address(this), ENTRY_FEE)) revert UsdcTransferFailed();
        emit SeasonEntered(season, msg.sender, ENTRY_FEE);
    }

    /// @dev Prize pools of the previous 7 seasons that ended with nobody on the board move into the current season on their own.
    function _autoRoll(uint256 destination) private {
        for (uint256 k = 1; k <= 7 && k <= destination; k++) {
            uint256 src = destination - k;
            Season storage old = seasons[src];
            if (old.rolled || old.pool == 0 || _seasonLeaderboards[src].length != 0) continue;
            uint256 amount = old.pool;
            old.rolled = true;
            old.pool = 0;
            seasons[destination].pool += amount;
            emit SeasonRolledOver(src, destination, amount);
        }
    }

    /// @notice The public prize rules: entry fee, season length, how many places are paid and how far back empty pools roll.
    function seasonRules() external pure returns (uint256 fee, uint256 length, uint256 winnersPaid, uint256 rollDays) {
        return (ENTRY_FEE, SEASON_LENGTH, 3, 7);
    }

    /// @notice Share of the pool (in basis points) for a rank when `winners` places are filled.
    function prizeShareBps(uint256 winners, uint256 rank) external pure returns (uint256) {
        if (winners == 0 || winners > 3 || rank >= winners) revert InvalidRank();
        return _prizeAmount(10_000, winners, rank);
    }

    function _recordSeasonScore(address player, uint256 score, uint8 tier) internal {
        uint256 season = currentSeason();
        if (!enteredSeason[season][player]) return;
        if (score > seasonBest[season][player]) {
            seasonBest[season][player] = score;
            emit SeasonBestUpdated(season, player, score);
        }
        _updateLeaderboard(season, player, seasonBest[season][player], tier);
    }

    function _updateLeaderboard(uint256 season, address player, uint256 bestScore, uint8 tier) internal {
        (bool changed, uint256 rank) = _insertLeaderboard(
            _seasonLeaderboards[season], MAX_LEADERBOARD, player, bestScore, tier
        );
        if (changed) emit LeaderboardUpdated(season, player, rank, bestScore, tier);
    }

    // Shared bounded insertion. Only the changed entry bubbles upward; ties retain their existing order.
    function _insertLeaderboard(
        LeaderboardEntry[] storage board, uint256 limit, address player, uint256 bestScore, uint8 tier
    ) private returns (bool changed, uint256 index) {
        uint256 len = board.length;
        index = len;
        for (uint256 i = 0; i < len; i++) {
            if (board[i].player == player) {
                index = i;
                break;
            }
        }
        if (index == len) {
            if (len < limit) {
                board.push(LeaderboardEntry(player, bestScore, tier));
            } else {
                if (bestScore <= board[len - 1].bestScore) return (false, index);
                index = len - 1;
                board[index] = LeaderboardEntry(player, bestScore, tier);
            }
        } else {
            if (board[index].bestScore == bestScore && board[index].badgeTier == tier) return (false, index);
            board[index].bestScore = bestScore;
            board[index].badgeTier = tier;
        }
        LeaderboardEntry memory entry = board[index];
        while (index > 0 && board[index - 1].bestScore < bestScore) {
            board[index] = board[index - 1];
            index--;
        }
        board[index] = entry;
        return (true, index);
    }

    function claimPrize(uint256 season, uint256 rank) external nonReentrant {
        if (season >= currentSeason()) revert SeasonNotEnded();
        uint256 winners = _seasonLeaderboards[season].length;
        if (winners > 3) winners = 3;
        if (rank >= winners) revert InvalidRank();
        uint256 bit = uint256(1) << rank;
        if ((claimedMask[season] & bit) != 0) revert PrizeAlreadyClaimed();
        address player = _seasonLeaderboards[season][rank].player;
        uint256 amount = _prizeAmount(seasons[season].pool, winners, rank);
        claimedMask[season] |= bit;
        if (rank == 0) _awardChampion(season, player);
        if (!usdc.transfer(player, amount)) revert UsdcTransferFailed();
        emit PrizeClaimed(season, rank, player, amount);
    }

    // The last winner receives rounding dust so all USDC base units are distributable.
    function _prizeAmount(uint256 pool, uint256 winners, uint256 rank) internal pure returns (uint256) {
        if (winners == 1) return pool;
        if (winners == 2) {
            uint256 first = pool * 60 / 100;
            return rank == 0 ? first : pool - first;
        }
        if (rank == 0) return pool * 50 / 100;
        if (rank == 1) return pool * 30 / 100;
        return pool - (pool * 50 / 100) - (pool * 30 / 100);
    }

    function _awardChampion(uint256 season, address player) internal {
        if (profiles[player].badgeTier < CHAMPION_TIER) profiles[player].badgeTier = CHAMPION_TIER;
        badgeNft.mintOrUpgrade(player, CHAMPION_TIER);
        // Closed boards retain their season snapshot; refresh only an active ranked entry.
        uint256 activeSeason = currentSeason();
        uint256 best = seasonBest[activeSeason][player];
        if (best > 0) _updateLeaderboard(activeSeason, player, best, CHAMPION_TIER);
        emit ChampionAwarded(season, player);
    }

    function rolloverEmptySeason(uint256 season) external nonReentrant {
        uint256 destination = currentSeason();
        if (season >= destination) revert SeasonNotEnded();
        if (_seasonLeaderboards[season].length != 0) revert SeasonHasLeaderboard();
        Season storage source = seasons[season];
        if (source.rolled) revert AlreadyRolled();
        uint256 amount = source.pool;
        if (amount == 0) revert NoPoolToRoll();
        source.rolled = true;
        source.pool = 0;
        seasons[destination].pool += amount;
        emit SeasonRolledOver(season, destination, amount);
    }

    function createRoom(uint256 entryFee, uint32 durationSeconds)
        external whenNotPaused nonReentrant returns (uint256 roomId)
    {
        if (entryFee < 100_000 || entryFee > 100_000_000) revert InvalidEntryFee();
        if (durationSeconds < 1 hours || durationSeconds > 7 days) revert InvalidDuration();
        roomId = ++roomCount;
        Room storage room = _rooms[roomId];
        room.creator = msg.sender;
        room.start = uint64(block.timestamp);
        room.end = uint64(block.timestamp + durationSeconds);
        room.entryFee = entryFee;
        emit RoomCreated(roomId, msg.sender, entryFee, room.end);
    }

    function _room(uint256 roomId) private view returns (Room storage room) {
        if (roomId == 0 || roomId > roomCount) revert InvalidRoom();
        room = _rooms[roomId];
    }

    function joinRoom(uint256 roomId) external whenNotPaused nonReentrant {
        Room storage room = _room(roomId);
        if (block.timestamp >= room.end) revert RoomClosed();
        if (roomEntered[roomId][msg.sender]) revert AlreadyEntered();
        roomEntered[roomId][msg.sender] = true;
        room.entrants += 1;
        room.pool += room.entryFee;
        _roomUsdcCall(abi.encodeWithSelector(IERC20.transferFrom.selector, msg.sender, address(this), room.entryFee));
        emit RoomJoined(roomId, msg.sender, room.entryFee);
    }

    function _validateRoomRun(uint256 roomId, address player) private view {
        Room storage room = _room(roomId);
        if (!roomEntered[roomId][player]) revert NotInRoom();
        // Inclusive scoring endpoint as specified; settlement begins strictly after end.
        if (block.timestamp < room.start || block.timestamp > room.end) revert RoomClosed();
    }

    function _recordRoomScore(uint256 roomId, address player, uint256 score) private {
        if (score <= roomBest[roomId][player]) return;
        roomBest[roomId][player] = score;
        emit RoomBestUpdated(roomId, player, score);
        (bool changed, uint256 rank) = _insertLeaderboard(_roomLeaderboards[roomId], 3, player, score, 0);
        if (changed) {
            _rooms[roomId].winnerCount = uint8(_roomLeaderboards[roomId].length);
            emit RoomLeaderboardUpdated(roomId, player, rank, score);
        }
    }

    function claimRoomPrize(uint256 roomId, uint256 rank) external nonReentrant {
        Room storage room = _room(roomId);
        if (block.timestamp <= room.end) revert RoomNotEnded();
        if (rank >= room.winnerCount) revert InvalidRank();
        uint256 bit = uint256(1) << rank;
        if ((roomClaimedMask[roomId] & bit) != 0) revert PrizeAlreadyClaimed();
        address player = _roomLeaderboards[roomId][rank].player;
        uint256 amount = _prizeAmount(room.pool, room.winnerCount, rank);
        roomClaimedMask[roomId] |= bit;
        _roomUsdcCall(abi.encodeWithSelector(IERC20.transfer.selector, player, amount));
        emit RoomPrizeClaimed(roomId, rank, player, amount);
    }

    function claimRoomRefund(uint256 roomId) external nonReentrant {
        Room storage room = _room(roomId);
        if (block.timestamp <= room.end) revert RoomNotEnded();
        if (room.winnerCount != 0) revert RoomHasWinners();
        if (!roomEntered[roomId][msg.sender]) revert NotInRoom();
        if (roomRefunded[roomId][msg.sender]) revert RefundAlreadyClaimed();
        roomRefunded[roomId][msg.sender] = true;
        _roomUsdcCall(abi.encodeWithSelector(IERC20.transfer.selector, msg.sender, room.entryFee));
        emit RoomRefundClaimed(roomId, msg.sender, room.entryFee);
    }

    // Rooms normalize reverted, false, and malformed USDC responses to the requested custom error.
    // The configured USDC must implement IERC20 and return a boolean, as in v3.
    function _roomUsdcCall(bytes memory data) private {
        (bool ok, bytes memory result) = address(usdc).call(data);
        if (!ok || result.length != 32) revert UsdcTransferFailed();
        if (abi.decode(result, (uint256)) != 1) revert UsdcTransferFailed();
    }

    function getRoom(uint256 roomId) external view returns (
        address creator, uint64 start, uint64 end, uint256 entryFee, uint256 pool, uint32 entrants, bool ended
    ) {
        Room storage room = _room(roomId);
        return (room.creator, room.start, room.end, room.entryFee, room.pool, room.entrants, block.timestamp > room.end);
    }

    function getRoomLeaderboard(uint256 roomId)
        external view returns (address[] memory players, uint256[] memory scores)
    {
        _room(roomId);
        LeaderboardEntry[] storage board = _roomLeaderboards[roomId];
        uint256 len = board.length;
        players = new address[](len);
        scores = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            players[i] = board[i].player;
            scores[i] = board[i].bestScore;
        }
    }

    function upgradeCost(uint8 nextLevel) public pure returns (uint256) {
        if (nextLevel < 1 || nextLevel > 5) revert InvalidLevel();
        return uint256(500e18) << (nextLevel - 1);
    }

    function upgradeHero() external nonReentrant {
        uint8 level = heroLevel[msg.sender];
        if (level >= 5) revert MaxLevel();
        uint8 nextLevel = level + 1;
        uint256 cost = upgradeCost(nextLevel);
        _burn(msg.sender, cost);
        heroLevel[msg.sender] = nextLevel;
        emit HeroUpgraded(msg.sender, nextLevel);
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
        PlayerProfile storage p = profiles[player];
        bestScore = p.bestScore;
        totalRuns = p.totalRuns;
        totalGems = p.totalGems;
        maxCombo = p.maxCombo;
        totalTokensEarned = p.totalTokensEarned;
        badgeTier = p.badgeTier;
        arcqBalance = balanceOf[player];
        lastPlayedAt = p.lastPlayedAt;
    }

    function getSeasonInfo(uint256 season)
        external
        view
        returns (uint256 pool, uint256 entrants, uint256 endsAt, bool ended)
    {
        pool = seasons[season].pool;
        entrants = seasons[season].entrants;
        endsAt = seasonEndsAt(season);
        ended = season < currentSeason();
    }

    function getSeasonLeaderboard(uint256 season)
        public
        view
        returns (address[] memory players, uint256[] memory scores, uint8[] memory tiers)
    {
        LeaderboardEntry[] storage board = _seasonLeaderboards[season];
        uint256 len = board.length;
        players = new address[](len);
        scores = new uint256[](len);
        tiers = new uint8[](len);
        for (uint256 i = 0; i < len; i++) {
            players[i] = board[i].player;
            scores[i] = board[i].bestScore;
            tiers[i] = board[i].badgeTier;
        }
    }

    function getLeaderboard()
        external
        view
        returns (address[] memory players, uint256[] memory scores, uint8[] memory tiers)
    {
        return getSeasonLeaderboard(currentSeason());
    }

    function getPlayerState(address player)
        external
        view
        returns (
            bool enteredThisSeason,
            uint256 seasonBestScore,
            uint8 heroLevel_,
            uint256 nextUpgradeCost,
            uint256 rewardedScoreToday_
        )
    {
        uint256 season = currentSeason();
        enteredThisSeason = enteredSeason[season][player];
        seasonBestScore = seasonBest[season][player];
        heroLevel_ = heroLevel[player];
        nextUpgradeCost = heroLevel_ < 5 ? upgradeCost(heroLevel_ + 1) : 0;
        rewardedScoreToday_ = rewardDay[player] == block.timestamp / 1 days ? rewardedScoreToday[player] : 0;
    }
}
