const express = require('express');
const multer = require("multer");
const router = express.Router();
const orders = require('../model/order');
const crypto = require("crypto")
const jwt = require('jsonwebtoken');
const { json } = require('express');
const dotenv = require("dotenv").config();
const users = require('../model/users');
const product = require('../model/product');

//Get sellers from buyer cart
router.get("/sellersfromcart/:id", async function (req, res) {
    let prods = []
    let sellrs = []
    await users.findOne({ "_id": req.params.id }, {}).then((data, err) => {
        prods = [...data.cart]
    })
    await Promise.all(
        prods.map(async function (item, index) {
            await product.find({ "_id": item }, {}).then((dta, err) => {
                sellrs.push(dta[0].userId)
            })
        })
    )
    res.send(sellrs)
})


// create selling order and update orders in user collection
router.post("/createorder/:id", async (req, res) => {
    let cart = req.body.cart;
    console.log(req.body.addressto)
    let sellerid = ""
    let price = "";
    addressfrm = {}
    await Promise.all(
        cart.map(async (item, index) => {
            await product.findOne({ "_id": item }, {}).then((dt, err) => {
                sellerid = dt.userId
                price = dt.price
            })
            await users.findOne({ "_id": sellerid }, {}).then((dt, err) => {
                addressfrm = dt.address
            })
            let body = {
                buyerId: req.body.buyerId,
                sellerId: sellerid,
                productId: item,
                productPrice: price,
                profit: price / 20,
                shipping: req.body.shipping,
                addressfrom: addressfrm,
                addressto: req.body.addressto,
                paymentmethod: req.body.paymentmethod,
            };
            await orders.create(body, (error, data) => {
                if (error) {
                    console.log(error)
                    res.send("Failed")
                }
                else {
                    users.findOne({ "_id": req.params.id }, {}).then((dta, err) => {
                        dta.orders.push(data._id)
                        dta.cart.remove(item)
                        dta.save()
                    })
                    users.findOne({ "_id": sellerid }, {}).then((dta, err) => {
                        for (let i = 0; i < cart.length; i++) {
                            if (dta.ads.includes(cart[i])) {
                                dta.ads.status = "ordered"
                                dta.save()
                            }
                        }
                    })
                    cart.map((item, index) => {
                        product.findOne({ "_id": item }).then((dt, er) => {
                            dt.status = "ordered"
                            dt.save()
                        })
                    })
                }
            })
        })
    )
    res.send("Success")
})

//Create buying order in mobile 
router.post("/mobileCreateBuyingOrder", async (req, res) => {
    console.log(req.body);
    let addressto = {
        blockNumber: Number(req.body.addresstoBlockNumber),
        st: req.body.addresstoSt,
        area: req.body.addresstoArea,
        city: req.body.addresstoCity,
    };
    let addressfrom = await users.findOne(
        { _id: req.body.sellerId },
        { address: 1, _id: 0 }
    );

    var body = {
        buyerId: req.body.buyerId,
        sellerId: req.body.sellerId,
        productId: req.body.productId,
        productPrice: Number(req.body.productPrice),
        profit: Number(req.body.profit),
        shipping: Number(req.body.shipping),
        addressfrom: addressfrom.address,
        addressto: addressto,
        paymentmethod: req.body.paymentmethod,
    };
    console.log(addressfrom.address);
    orders.create(body, async (err, data) => {
        if (err) {
            console.log(err);
            res.send("failed");
        } else {
            let buyer = await users.findOne({ _id: body.buyerId });
            buyer.orders.push(data._id);
            const index = buyer.cart.indexOf(body.productId);
            if (index > -1) buyer.cart.splice(index, 1);
            buyer.save();

            product
                .updateOne({ _id: body.productId }, { $set: { status: "ordered" } })
                .then((_) => {
                    console.log("success");
                    res.send("success");
                })
                .catch((_) => {
                    console.log("failed to update product status");
                    res.send("failed");
                });
        }
    });
});

//create exchange order from mob
router.post("/mobileCreateExchangingOrder", async (req, res) => {
    let addressto = {
        blockNumber: Number(req.body.addresstoBlockNumber),
        st: req.body.addresstoSt,
        area: req.body.addresstoArea,
        city: req.body.addresstoCity,
    };
    let addressfrom = await users.findOne(
        { _id: req.body.sellerId },
        { address: 1, _id: 0 }
    );

    var body = {
        buyerId: req.body.buyerId,
        sellerId: req.body.sellerId,
        productId: req.body.productId,
        productPrice: Number(req.body.productPrice),
        profit: Number(req.body.profit),
        shipping: Number(req.body.shipping),
        addressfrom: addressfrom.address,
        addressto: addressto,
        paymentmethod: req.body.paymentmethod,
        exchangable: true,
        exchangeProperties: {
            productId: req.body.exchangeProp_productId,
            productPrice: Number(req.body.exchangeProp_productPrice),
            profit: Number(req.body.exchangeProp_profit),
            shipping: Number(req.body.exchangeProp_shipping),
            paymentmethod: req.body.exchangeProp_paymentmethhod,
        },
    };
    console.log("body -->");
    console.log(body);
    orders.create(body, async (err, data) => {
        if (err) {
            console.log(err);
            res.send("failed");
        } else {
            let buyer = await users.findOne({ _id: body.buyerId });
            buyer.orders.push(data._id);
            const index = buyer.cart.indexOf(body.productId);
            if (index > -1) buyer.cart.splice(index, 1);
            buyer.save();

            let seller = await users.findOne({ _id: body.sellerId });
            seller.orders.push(data._id);
            const iindex = seller.cart.indexOf(body.exchangeProperties.productId);
            if (iindex > -1) seller.cart.splice(iindex, 1);
            seller.save();

            product
                .updateMany(
                    {
                        $or: [
                            { _id: body.productId },
                            { _id: body.exchangeProperties.productId },
                        ],
                    },
                    { $set: { status: "ordered" } }
                )
                .then((_) => {
                    console.log("success");
                    res.send("success");
                })
                .catch((_) => {
                    console.log("failed to update product status");
                    res.send("failed");
                });
        }
    });
});



//create exchange order from web
router.post("/exchangecreateorder/:fid/:sid", async (req, res) => {
    console.log(req.body)
    console.log(req.body.exchangeProperties.productId)
    await orders.create(req.body, (error, data) => {
        if (error) {
            console.log(error)
            res.send("Failed")
        } else {
            users.findOne({ "_id": req.params.fid }, {}).then((dta, err) => {
                dta.orders.push(data._id)
                dta.ads.remove(data.firstProductId)
                dta.save()
            })
            users.findOne({ "_id": req.params.sid }, {}).then((dta, err) => {
                dta.orders.push(data._id)
                dta.ads.remove(data.secondProductId)
                dta.save()
            })
            // product.findOne({"_id":data.firstProductId},{}).then((dta,err)=>{
            //     dta.offers.splice(0,dta.offers.length)
            //     dta.save()
            // })
            product.findOne({ "_id": req.body.productId }).then((dt, er) => {
                dt.status = "ordered"
                dt.save()
            })
            product.findOne({ "_id": req.body.exchangeProperties.productId }).then((dt, er) => {
                dt.status = "ordered"
                dt.save()
            })
            res.send("Success")
        }
    })
})


router.get("/mobileGetOrders/:id", async (req, res) => {
    let ordersList = [];
    let result = [];
    users
        .findById(req.params.id)
        .then(async (user) => {
            for (let i = 0; i < user.orders.length; i++) {
                let o = await orders.findOne({ _id: user.orders[i] });
                // console.log(p);
                ordersList.push(o);
            }
            // console.log(ordersList);
            for (let order of ordersList) {
                let p = await product.findOne(
                    { _id: order.productId },
                    { _id: 0, title: 1, price: 1 }
                );
                if (order.exchangable === true) {
                    let p2 = await product.findOne(
                        { _id: order.exchangeProperties.productId },
                        { _id: 0, title: 1, price: 1 }
                    );
                    console.log(p);
                    console.log(p2);
                    console.log(order.status);
                    console.log(order.exchangeProperties.status);
                    result.push({
                        id: order.id,
                        buyerProduct: p,
                        sellerProduct: p2,
                        buyerStatus: order.status,
                        sellerStatus: order.exchangeProperties.status,
                    });
                } else {
                    console.log("llllll");
                    result.push({
                        id: order.id,
                        product: p,
                        status: order.status,
                    });
                    console.log(result);
                }
            }
            console.log(result);
            res.send(result);
        })
        .catch((err) => res.send("failed"));
});


// buying orders
router.get("/buyingOrders", async (req, res) => {
    try {
      let buyingOrders = await order
        .find({
          $and: [
            { exchangable: false },
            { $or: [{ status: "on the way" }, { status: "waiting" }] },
          ],
        })
        .sort({ time: -1 });
      let ordersDetails = [];
      for (let i = 0; i < buyingOrders.length; i++) {
        let orderProductDetails = await product.findOne(
          { _id: buyingOrders[i].productId },
          { title: 1, _id: 0, img: 1 }
        );
        let orderBuyerDetails = await users.findOne(
          { _id: buyingOrders[i].buyerId },
          { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
        );
        let orderSellerDetails = await users.findOne(
          { _id: buyingOrders[i].sellerId },
          { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
        );
        ordersDetails.push({
          orderProductDetails: orderProductDetails,
          orderBuyerDetails: orderBuyerDetails,
          orderSellerDetails: orderSellerDetails,
        });
      }
      res.send({ buyingOrders: buyingOrders, ordersDetails: ordersDetails });
    } catch (err) {
      res.send(err);
    }
  });
  // update status of buyingOrders
  router.post("/buyingOrders/:id/updatestatus/:newStatus", function (req, res) {
    order
      .findOne({ _id: req.params.id })
      .then(async (data) => {
        data.status = req.params.newStatus;
        if (req.params.newStatus == "canceled") {
          await product.updateOne(
            { _id: data.productId },
            { $set: { status: "active" } }
          );
        } else if (req.params.newStatus == "delivered") {
          await product.updateOne(
            { _id: data.productId },
            { $set: { status: "sold" } }
          );
        }
        console.log(data);
        data.save();
        res.json({ message: "success" });
      })
      .catch((err) => {
        res.send(err);
      });
  });
  
  // update status of exchangingOrders
  router.post(
    "/exchangingOrders/:id/updatestatus/:personCase/:newStatus",
    function (req, res) {
      console.log("ok");
      console.log(req.params.personCase);
  
      if (req.params.personCase == "seller") {
        console.log(req.params.personCase);
        order
          .findOne({ _id: req.params.id })
          .then((data) => {
            data.exchangeProperties.status = req.params.newStatus;
            console.log(data);
            data.save();
            res.json({ message: "success" });
          })
          .catch((err) => {
            res.send(err);
          });
      } else if (req.params.personCase == "buyer") {
        console.log(req.params.personCase);
        order
          .findOne({ _id: req.params.id })
          .then((data) => {
            data.status = req.params.newStatus;
            console.log(data);
            data.save();
            res.json({ message: "success" });
          })
          .catch((err) => {
            res.send(err);
          });
      }
    }
  );
module.exports = router;