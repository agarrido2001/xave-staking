// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Staker is Ownable {
    using SafeERC20 for IERC20;

    // --- Structs ---
    struct StakingData {
        uint256 amtTotal;
        uint256 amtWithdrawn;
        uint256 started;
    }

    // --- State ----
    uint256 public constant rate = 25;
    uint256 public constant minStakingAmount = 50 * 1e18;
    uint256 public constant waitPeriodSecconds = 90 * (60 * 60 * 24);
    uint256 public constant slicePeriodSeconds = 30 * (60 * 60 * 24);
    uint256 public constant totalSlices = 3;
    IERC20 public immutable rewardToken;
    uint256 private _lockedRewardTokens;
    // List of accepted token addreses
    mapping(address => bool) public validStakingTokens;
    // holder => data
    mapping(address => StakingData[]) private _stakings;


    constructor(address _rewardToken, address[] memory _stakingTokens) {
        require(_rewardToken != address(0x0), "Invalid rewardToken");
        require(_stakingTokens.length > 0, "_stakingTokens cannot be empty");
        for (uint256 i = 0; i < _stakingTokens.length; i++) {
            require(
                _stakingTokens[i] != address(0x0),
                "Invalid item in _stakingTokens"
            );
            validStakingTokens[_stakingTokens[i]] = true;
        }

        rewardToken = IERC20(_rewardToken);
    }

    // --- External ---

    function stake(address stakingToken, uint256 amount) external {
        require(validStakingTokens[stakingToken], "stakingToken not listed");
        require(amount >= minStakingAmount, "Invalid staking amount");

        address sender = msg.sender;
        require(
            IERC20(stakingToken).allowance(sender, address(this)) >= amount,
            "Need more allowance of stakingToken"
        );

        uint256 amtTotal = amount + ((((amount * 1e18) / 100) * rate) / 1e18);
        require(
            (rewardToken.balanceOf(address(this)) - _lockedRewardTokens) >=
                amtTotal,
            "Not enough supply of rewarding token"
        );

        _lockedRewardTokens += amtTotal;
        _stakings[sender].push(StakingData(amtTotal, 0, block.timestamp));
        ERC20Burnable(stakingToken).burnFrom(sender, amount);
    }

    function withdraw() external {
        uint256 amount;
        uint256 totAmount;
        address holder = msg.sender;

        for (uint256 i = 0; i < _stakings[holder].length; i++) {
            amount = _computeAmt(_stakings[holder][i]);
            _stakings[holder][i].amtWithdrawn += amount;
            totAmount += amount;
        }

        require(totAmount > 0, "No tokens available to withdraw");

        _lockedRewardTokens -= totAmount;
        rewardToken.safeTransfer(holder, totAmount);
    }

    // --- External View ---

    function computeMyTokens() external view returns (uint256) {
        return _computeAllWithdrawableAmt(msg.sender);
    }

    function getMyStakingData() external view returns (StakingData[] memory) {
        return _stakings[msg.sender];
    }

    // --- External onlyOwner ---

    function withdrawBalance() external onlyOwner {
        uint256 amount = rewardToken.balanceOf(address(this)) -
            _lockedRewardTokens;
        require(amount > 0, "No available tokens to withdraw");
        rewardToken.safeTransfer(owner(), amount);
    }

    function addStakingToken(address token) external onlyOwner {
        require(token != address(0x0), "Invalid token address");
        require(!validStakingTokens[token], "Token already listed");
        validStakingTokens[token] = true;
    }

    function removeStakingToken(address token) external onlyOwner {
        require(token != address(0x0), "Invalid token address");
        require(validStakingTokens[token], "Token not listed");
        validStakingTokens[token] = false;
    }

    // --- External onlyOwner view ---

    function lockedRewardTokens() external view onlyOwner returns (uint256) {
        return _lockedRewardTokens;
    }

    function getStakingData(address holder)
        external
        view
        onlyOwner
        returns (StakingData[] memory)
    {
        require(holder != address(0x0), "Invalid holder address");
        return _stakings[holder];
    }

    function computeTokens(address holder)
        external
        view
        onlyOwner
        returns (uint256)
    {
        return _computeAllWithdrawableAmt(holder);
    }

    // --- Private ---

    function _computeAllWithdrawableAmt(address holder)
        private
        view
        returns (uint256)
    {
        uint256 amount;
        address _holder = holder;
        for (uint256 i = 0; i < _stakings[_holder].length; i++) {
            amount += _computeAmt(_stakings[_holder][i]);
        }
        return amount;
    }

    function _computeAmt(StakingData storage stakingData)
        private
        view
        returns (uint256)
    {
        uint256 amount;
        uint256 currentTime = block.timestamp;

        if (
            stakingData.amtWithdrawn < stakingData.amtTotal &&
            currentTime >= (waitPeriodSecconds + stakingData.started)
        ) {
            uint256 slices = (currentTime -
                (stakingData.started + waitPeriodSecconds)) /
                slicePeriodSeconds;
            if (slices == 0) {
                return 0;
            }

            uint256 amtPerSlice = ((stakingData.amtTotal * 1e18) /
                totalSlices) / 1e18;

            uint256 amtCalc = (amtPerSlice * slices) - stakingData.amtWithdrawn;

            uint256 availableTokens = stakingData.amtTotal -
                stakingData.amtWithdrawn;

            amount = (amtCalc > availableTokens ? availableTokens : amtCalc);

            // If the availale leftover amount would be less than 1% of the total staking,
            // (due to rounding), then let the holder withdraw all.
            uint256 leftover = stakingData.amtTotal -
                (amount + stakingData.amtWithdrawn);
            if (leftover > 0 && ((leftover * 100) / stakingData.amtTotal) < 1) {
                amount = stakingData.amtTotal;
            }
        }

        return amount;
    }
}
