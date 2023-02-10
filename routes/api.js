'use strict';
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const XMLHttpRequest = require('xhr2');
const API_URL = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/"


// Configure mongoose schema and model to store stock likes to mongodb
const {Schema} = mongoose;
const stockSchema = new Schema ({
  stock: {type: String, required: true},
  likes: [String]
})
const Stock = mongoose.model("Stock", stockSchema);

// Connect to MongoDB for storing stock likes
mongoose.connect(process.env.DB, {useNewUrlParser: true, useUnifiedTopology: true});

// hashIP function - used to hide public IP address for saving(same salt should result in same hash for each IP)
const hashIP = (ip) => {
  const salt = "$2b$04$QhABBJmDzxdeTxTtgMJABe";
  return bcrypt.hashSync(ip, salt); 
}

function getStockData(item) {
  return new Promise( function (res,rej) {
    const stockreq = new XMLHttpRequest();
    stockreq.open('GET',`${API_URL}${item}/quote`, true);
    stockreq.onload = function () {
      if (stockreq.status >= 200 && stockreq.status < 300) {
        res(JSON.parse(stockreq.responseText));
      } else {
        res(stockreq.status + " - API didn't respond.");
      }
    }
    stockreq.send()
  });
}

  // Function to clear likes from two stocks - meant to clean values before tests are run, but not implemented
async function clearLikes(stock1, stock2, ip) {
  const hash = hashIP(ip);
  console.log("\nClearing likes from test stocks for local IP...\n");

  //get stocks like database entry if exists
  const stockLikes1 = await Stock.findOne({stock: stock1});
  const stockLikes2 = await Stock.findOne({stock: stock2});

  if (stockLikes1 && stockLikes2) {
    stockLikes1.likes = stockLikes1.likes.filter( item => item != hash );
    stockLikes2.likes = stockLikes2.likes.filter( item => item != hash );
    await stockLikes1.save();
    await stockLikes2.save();
  }

}

// Export function for api routing -------------------------------------------------
module.exports = {routes: function (app) {
  
  // Handle get requests, async callback function to respond with desired data
  app.route('/api/stock-prices')
    .get( async function (req, res) {

      // Get supplied query variables
      let {stock, like} = req.query;
      // If stock is supplied, generate response
      if (stock) {
        let results = [];  // for storing api results before replying

        // If single stock supplied, convert it to an array, if more than two, respond with error
        if (typeof(stock) == "string") {
          stock = [stock];
        } else if (stock.length > 2) { 
          return res.json({error: "Maximum of two stocks can be accepted"})
        }
        
        try {

          // For each stock, get their price from API, and their likes from database, push to results
          for await (const item of stock) {
                      
            //fetch API price for stock
            const apiData = await getStockData(item);
            //Originally attempted fetch, but wasn't implemented in NodeJS without switching to modulejs
            //const apiData = await fetch(`${API_URL}${item}/quote`).then(res => res.json());
            //const apiData = await apiDataRes.json();
            
            //build response object for stock
            let mystock = {stock: apiData.symbol, price: apiData.latestPrice};

            if (mystock.stock) {
              //get stocks like database entry if exists
              let stockLikes = await Stock.findOne({stock: mystock.stock});

              //if database entry doesn't exist, create it
              if (!stockLikes) {
                stockLikes = new Stock({stock: mystock.stock, likes: []});
                stockLikes = await stockLikes.save();
              }

              //if 'like=true' was specified, push hashed IP to database
              if (like) {
                // hash the ip address with particular salt
                const myIP = hashIP(req.ip)
                
                // if IP isn't already in database entry, push it and save document
                if (!stockLikes.likes.includes(myIP)) {
                  stockLikes.likes.push(myIP);
                  stockLikes.save();
                }
              }

              // add 'likes' to the result stock object and push to array
              mystock['likes'] = stockLikes.likes.length;
            } else {
              mystock = {stock: item, price: "Not Found", likes: 0}
            }
            
            results.push(mystock)
          }
        } catch (error) {
          console.log("Error: " + error);
        }

        // if more than one stock, calculate rel_likes and return results array
        if (results.length > 1) {
          // calculate rel_likes for each stock, and delete 'likes' from objects
          results[0]['rel_likes'] = results[0].likes - results[1].likes;
          results[1]['rel_likes'] = -results[0].rel_likes;
          for (let x in results) {delete results[x]["likes"]}

          // return json response with results array
          return res.json({stockData: results})

        // if only one stock, return json result with just stock object (not array)  
        } else {
          return res.json({stockData: results[0]})
        }

      // if no stock query variable supplied, return error response  
      } else {
        return res.json({error: "You must supply at least one stock for retrieval."})
      }

      // catch all return
      return res.json({error: "Unknown error occurred"})
    });
}, clearLikes};
