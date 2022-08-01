# Fibonacci Estimate Gas

## Fibonacci method selected reason

It is allowed that cost for deploying contract can be higher but the furture transaction cost should be kept low. Therefore, a method of calculating Fibonacci numbers in the constructor for storage and accessing them with constant cost/time in the furture is used.

When calculating fibonacci from 0 to 300 in constructor, using the bottom up method has lower deployment gas cost than using Binet's Formula.

When accessing Fibonacci numbers, accessing mapping has lower cost than array. For cost of calculation in constructor, mapping has slightly higher than array.

Nonetheless, it is worth mentioning that using binet's formula on the fly also have a relative low gas cost that is close to array access. It also have a smaller deployment cost than calculating values in constructor.

Example contracts can be found in `./fruitStandReferences/`

---

## Setup
- >`ganache-cli --gasLimit 10000000`
- >`truffle console`

---

## Original FruitStand

### Deploy:

> `FruitStand.new.estimateGas('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`
-  666775

### Methods Setup
> `const fruitStandInstance = await FruitStand.new('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`

### Fib:
> `fruitStandInstance.fib.estimateGas(3)`
- 23454

> `fruitStandInstance.fib.estimateGas(5)`
- 27388

> `fruitStandInstance.fib.estimateGas(9)`
- 64386

> `fruitStandInstance.fib.estimateGas(50)`
- Waited too long


---

## Binet Formula FruitStand (Calculate on the fly)

### Deploy:

> `FruitStand.new.estimateGas('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`
- 720165

### Methods Setup
> `const fruitStandInstance = await FruitStand.new('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`

### Fib:
> `fruitStandInstance.fib.estimateGas(3)`
- 23568

> `fruitStandInstance.fib.estimateGas(5)`
- 24952

> `fruitStandInstance.fib.estimateGas(9)`
- 26336

> `fruitStandInstance.fib.estimateGas(50)`
- 29120

> `fruitStandInstance.fib.estimateGas(300)`
- 33300

---

## Bottom up Fibonacci (Calculate on constructor)

### Deploy:

> `FruitStand.new.estimateGas('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`
- 7791786

### Methods Setup
> `const fruitStandInstance = await FruitStand.new('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`

### Fib:
> `fruitStandInstance.fib.estimateGas(3)`
- 26108

> `fruitStandInstance.fib.estimateGas(5)`
- 26108

> `fruitStandInstance.fib.estimateGas(9)`
- 26108

> `fruitStandInstance.fib.estimateGas(50)`
- 26108

> `fruitStandInstance.fib.estimateGas(300)`
- 26120

---

## Binet Formula Fibonacci (Calculate on constructor)

### Deploy:

> `FruitStand.new.estimateGas('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`
- 10324627

### Methods Setup
> `const fruitStandInstance = await FruitStand.new('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`

### Fib:
> `fruitStandInstance.fib.estimateGas(3)`
- 26130

> `fruitStandInstance.fib.estimateGas(5)`
- 26130

> `fruitStandInstance.fib.estimateGas(9)`
- 26130

> `fruitStandInstance.fib.estimateGas(50)`
- 26130

> `fruitStandInstance.fib.estimateGas(300)`
- 26142

---

## Bottom up Fibonacci (Calculate on constructor) (Using mapping)
> `FruitStand.new.estimateGas('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`
- 7625634

### Methods Setup
> `const fruitStandInstance = await FruitStand.new('0xc0ffee254729296a45a3885639AC7E10F9d54979', '0xc0ffee254729296a45a3885639AC7E10F9d54979')`

### Fib:
> `fruitStandInstance.fib.estimateGas(3)`
- 24006

> `fruitStandInstance.fib.estimateGas(5)`
- 24006

> `fruitStandInstance.fib.estimateGas(9)`
- 24006

> `fruitStandInstance.fib.estimateGas(50)`
- 24006

> `fruitStandInstance.fib.estimateGas(300)`
- 24018
