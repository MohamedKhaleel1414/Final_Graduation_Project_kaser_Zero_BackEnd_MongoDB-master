const express = require('express');
const app = express();
const port= process.env.port||4000;
const cors = require('cors');
const os=require("os");
const fs=require("fs");
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json();
const { middle } = require('./Api/middleware/middleware');
const mongo = require("./config/mongoose");
const productsroute = require("./Api/routes/products")
const usersroute = require("./Api/routes/users")
const adminroute = require("./Api/routes/admin");
const orderroute = require('./Api/routes/order');

//////////////////////////////////////////////////
app.use(cors());
app.use(express.urlencoded());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/product',productsroute);
app.use('/user',usersroute);
app.use('/dashboard',adminroute);
app.use('/order',orderroute);
app.use('/public',express.static('./public'));
///////////////////////////////////////////////
app.listen(port,function(){console.log("I'm listening!")});
module.exports = app;