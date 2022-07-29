# Estimate Gas

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