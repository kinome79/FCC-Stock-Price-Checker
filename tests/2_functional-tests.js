const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const apifuncs = require('../routes/api.js')

chai.use(chaiHttp);

suite('Functional Tests', function() {
    this.timeout(5000);
    let numberLikes = 0;

    suiteSetup ( function(done) {
        // Clear likes from local IP so like functionality can be tested
        apifuncs.clearLikes('GOOG','MSFT', '::ffff:127.0.0.1');
        done();
    });

    suite('Single Stock Tests', function() {
        
        test("Viewing one stock: GET request to /api/stock-prices/", function(done) {
            chai.request(server)
            .get('/api/stock-prices?stock=GOOG')
            .end( (err,res) => {
                assert.equal(res.status, 200, "Should receive a successful response");
                assert.exists(res.body.stockData, "Should contain a stockData object");
                assert.hasAllKeys(res.body.stockData, ["stock", "price", "likes"], "stockData should have stock, price, and likes values");
                assert.isString(res.body.stockData.stock, "stockData.stock should be a string");
                assert.equal(res.body.stockData.stock, "GOOG", "stockData.stock should be equal to search name");
                assert.isNumber(res.body.stockData.price, "stockData.price should be a number");
                assert.isNumber(res.body.stockData.likes, "stockData.likes should be a number");
                numberLikes = res.body.stockData.likes;
                done();
            });

        });

        test("Viewing one stock and liking it: GET request to /api/stock-prices/", function(done) {
            chai.request(server)
            .get('/api/stock-prices?stock=GOOG&like=true')
            .end((err,res) => {
                assert.equal(res.status, 200, "Should receive a successful response");
                assert.exists(res.body.stockData, "Should contain a stockData object");
                assert.hasAllKeys(res.body.stockData, ["stock", "price", "likes"], "stockData should have stock, price, and likes values");
                assert.isString(res.body.stockData.stock, "stockData.stock should be a string");
                assert.equal(res.body.stockData.stock, "GOOG", "stockData.stock should be equal to search name");
                assert.isNumber(res.body.stockData.price, "stockData.price should be a number");
                assert.isNumber(res.body.stockData.likes, "stockData.likes should be a number");
                assert.equal(res.body.stockData.likes - numberLikes, 1, "Likes on stock should have increased by 1");
                numberLikes = res.body.stockData.likes;
                done();
            });
        });

        test("Viewing the same stock and liking it again: GET request to /api/stock-prices/", function(done) {
            chai.request(server)
            .get('/api/stock-prices/?stock=GOOG&like=true')
            .end((err,res) => {
                assert.equal(res.status, 200, "Should receive a successful response");
                assert.exists(res.body.stockData, "Should contain a stockData object");
                assert.hasAllKeys(res.body.stockData, ["stock", "price", "likes"], "stockData should have stock, price, and likes values");
                assert.isString(res.body.stockData.stock, "stockData.stock should be a string");
                assert.equal(res.body.stockData.stock, "GOOG", "stockData.stock should be equal to search name");
                assert.isNumber(res.body.stockData.price, "stockData.price should be a number");
                assert.isNumber(res.body.stockData.likes, "stockData.likes should be a number");
                assert.equal(res.body.stockData.likes,numberLikes, "Likes on stock should not have changed from previously");
                numberLikes = res.body.stockData.likes;
                done();
            });
        });
    });

    suite('Two Stock Tests', function() {

        let numRelLikes = 0;
        test("Viewing two stocks: GET request to /api/stock-prices/", function(done) {
            chai.request(server)
            .get('/api/stock-prices?stock=GOOG&stock=MSFT')
            .end((err,res) => {
                assert.equal(res.status, 200, "Should receive a successful response");
                assert.exists(res.body.stockData, "Should contain a stockData object");
                assert.isArray(res.body.stockData, "stockData should be an array");
                assert.equal(res.body.stockData.length, 2, "stockData should be an array of length 2");
                res.body.stockData.forEach(data => {
                    assert.hasAllKeys(data, ["stock","price","rel_likes"], "stockData[0] should have stock, price, and rel_likes values");
                    assert.isString(data.stock, "stockData array data stock should be a string");
                    assert.isNumber(data.price, "stockData array data price should be a number");
                    assert.isNumber(data.rel_likes, "stockData array data rel_likes be a number");
                });
                assert.equal(res.body.stockData[0].stock, "GOOG", "stockData.stock should be equal to search name");
                assert.equal(res.body.stockData[1].stock, "MSFT", "stockData.stock should be equal to search name");
                assert.equal(res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 0, "Sum of rel_likes from both stocks should equal 0");
                numRelLikes = res.body.stockData[0].rel_likes;
                done();
            });
        });

        test("Viewing two stocks and liking them: GET request to /api/stock-prices/", function(done) {
            chai.request(server)
            .get('/api/stock-prices?stock=GOOG&stock=MSFT&like=true')
            .end((err,res) => {
                assert.equal(res.status, 200, "Should receive a successful response");
                assert.exists(res.body.stockData, "Should contain a stockData object");
                assert.isArray(res.body.stockData, "stockData should be an array");
                assert.equal(res.body.stockData.length, 2, "stockData should be an array of length 2");
                res.body.stockData.forEach(data => {
                    assert.hasAllKeys(data, ["stock","price","rel_likes"], "stockData[0] should have stock, price, and rel_likes values");
                    assert.isString(data.stock, "stockData array data stock should be a string");
                    assert.isNumber(data.price, "stockData array data price should be a number");
                    assert.isNumber(data.rel_likes, "stockData array data rel_likes be a number");
                });
                assert.equal(res.body.stockData[0].stock, "GOOG", "stockData.stock should be equal to search name");
                assert.equal(res.body.stockData[1].stock, "MSFT", "stockData.stock should be equal to search name");
                assert.equal(res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes, 0, "Sum of rel_likes from both stocks should equal 0");
                assert.equal(numRelLikes - res.body.stockData[0].rel_likes, 1, "Relative likes should have decreased by 1 as first was already liked");
                chai.request(server).get('/api/stock-prices?stock=MSFT').end((err2,res2) => {
                    assert.equal(res2.body.stockData.likes + numRelLikes - numberLikes, 1, "Likes on stock 2 should have increased by 1");
                    done();
                });
            });
        });
    });

    // Required to resolve a timeout on Replit resulting from a bug regarding the .end call
    after(function() {
        apifuncs.clearLikes('GOOG','MSFT', '::ffff:127.0.0.1');
        chai.request(server).get('/api')
    });
});
