# Assignment 1 additional task

## Question 3

Try to find out any security loopholes in the above design and propose an
improved solution.

Answer:

In the crypto world, one can have more than one address, even the host. So the host may "pretend" to be a player at the same time. Thus, the host-player can alaways submit the correct guess to "scam" other true players by always winning.

A solution of it is to have the number being randomly created upon revealing. However, contracts are known to be deterministic thus there is no true randomness. A Verifiable Random Function should be used.
