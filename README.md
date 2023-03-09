<span style="color:red;">The purpose of this repository is to showcase some of the projects that I have created at Xave. This is not the official Xave repository.</span>

# Staker
## Purpose
Stake synthetic tokens (sXVC) or wrapped tokens (wXVC) and get them swapped for XVC plus a 25% reward.
The wXVC and sXVC will be burned at staking time.

There is a 90 days waiting period, starting the day the stake is placed.
After that period, the total amount (staked + reward) will be sliced in three. One slice will be made available to be withdrawn every 30 days. That is: 1/3 after 120 days, 1/3 after 150 days, and last 1/3 after 180 days.


## Process
1. The reward token address is set at deployment time and cannot be changed.
2. The stakeable token addresses are set at deployment time, but can be changed later by the Staker's owner.
3. To add a new staking token use addStakingToken(address). To remove a staking token use removeStakingToken(address). This will only affect new stakes.
4. To fund Stake, simply send reward tokens to Stake.
5. To start staking the user must call the function stake(stake-token address, amount). 
6. At any time, the use can check its withdrawable amount by calling computeMyTokens().
7. To get the available amount the user calls withdrawMyTokens()


## Additional functionallity available only to the owner
1. withdraw(): withdraw all the funds not locked.
2. lockedRewardTokens(): check the locked funds.
3. getStakingData(address): check the staking info for a specific holder.
4. computeTokens(address): compute the available tokens for a specific holder.
