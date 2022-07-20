# dapp-assignment

## Assignment 1

### Question 1

Your task is to read the BTC/USD price from this smart contract, and output the data
in a human readable way (e.g. output to stdout or print it on a blank webpage)

### Question 2

You are required to finish a program, which should contain the following
functionalities:

Step 1: Upon launch of the program, generate a batchId.
Step 2: Call the reportWeather() function to report the following weather
information of these 3 cities to the smart contract. To get the weather data,
use this API: https://goweather.herokuapp.com/weather/{CityName} . You should
fetch the weather info off-chain and send it to the chain.

-   Shanghai: https://goweather.herokuapp.com/weather/shanghai
-   Hong Kong: https://goweather.herokuapp.com/weather/hongkong
-   London: https://goweather.herokuapp.com/weather/london

The API will return the temperature in a form like "+27 °C" . Parse this to a
positive interger 27 and send to the smart contract.
Step 3: Read all the data from smart contract after you have submitted all
weather data using the function getWeather() providing the same batchId you
generated in step 1. These answers should be all equal to your submission in
step 2.

### Additional task

During the "Step 3" in the task, it will take 3 JSON-RPC calls to
read weather info for 3 cities from smart contract. Is it possbile to reduce
that to only one request to get all the data back? (Hint: Google search
"makerdao multicall")
