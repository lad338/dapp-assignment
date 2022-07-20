# Assignment 1 additional task

## Question 1

If the API returns the temperature in a decimal form (like 27.5 C),
how to submit this decimal number to the smart contract while keeping its
precision?

Answer: 

We may use a fixed point decimal for this case. We may set a number say 6 as the agreed fixed point. i.e. For `27.5`, we may store as `27 500 000`. For a number stored as `37 452 000`, its actual value would be `37.452`

We may also use Q notation for this case to represent the decimal in fraction. Q notation keeps the denominator as in a power to 2. For example, we may represent the number in `Q8` format such that the denominator is `256`

## Question 2

How to store a negative temperature while keeping the current smart
contract interface unchanged?

Answer:

We may set the zero point of the number to a negative number. For instance, assuming we are using degree Celsius, -273 C would be 0 K which is the absolute zero. Setting -273 as the zero point would be a practical approach in this case. Supporting range would be from `-273` to `4294967022`

With it, `0` would be `-273 C`, `100` would be ` -173 C` and `298` would be `25 C`. From the other way round, `33 C` would be `306` and `-15 C` would be `258`

Another approach is that we may use two's complement to represent numbers. For `uint32`, it is a 32-bit number from `00000000 00000000 00000000 00000000` to `11111111 11111111 11111111 11111111`. The first bit indicates positive by 0 or negative by 1. Translating a positive number to a negative number and back is to flip all digits and add 1. Supporting range would be from `2147483646` to `-2147483647`


For example, `25` would be `00000000 00000000 00000000 00011001` which its uint32 is representing `25` and `-25` would be `11111111 11111111 11111111 11100111` which its uint32 is `4294967271`


