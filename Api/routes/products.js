const express = require('express');
const multer = require("multer");
const path = require('path');
const router = express.Router();
const product = require('../model/product');
const users = require('../model/users');
const category = require('../model/category')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + file.originalname)
    }
});
const multi_upload = multer({
    storage: storage,
   
});
//Get all products to mobile
router.get("/products", function (req, res) {
    product.find({ status: "active" }).then((data, err) => {
        if (err) res.send("failed");
        else res.send(data);
    });
});
// Get all products to home slider web
// router.get("/sliderproducts", function (req, res) {
//     product.find().then((data, err) => {
//         if (err)
//             res.send(err)
//         else
//             res.send(data)
//     })
// })
//Get product by id in web
router.get("/products/:pid", function (req, res) {
    product.find({ "_id": req.params.pid }, {}).then((data, err) => {
        if (err)
            res.send(err)
        else
            res.send(data)
    })
})

router.get("/productsofcategory/:catId", function (req, res) {
    product.find({$and:[{ "status": "active" }, { "categoryId": req.params.catId }]}, {}).then((data, err) => {
        if (err)
            res.send(err)
        else
            res.send(data)
    })
})

// router.get("/productsofcategory/:catId", function (req, res) {
//     product.find({ "categoryId": req.params.catId }, {}).then((data, err) => {
//         if (err) {
//             res.send(err)
//         }
//         else {
//             res.send(data)
//         }
//     })
// })

//get products by brand for slider in products details
router.get("/productsbrand/:brand", function (req, res) {
    product.find({$and:[{"status":"active"},{ "brand": req.params.brand }]}, {}).then((data, err) => {
        if (err) {
            res.send(err)
        }
        else {
            res.send(data)
        }

    })
})

router.get("/categories", async (req, res) => {
    try {
        let categories = await category.find({});
        res.send(categories);
    } catch (err) {
        res.send(err);
    }
});

router.get("/categories/:categoryId", async (req, res) => {
    try {
        let categories = await category.findOne({ "_id": req.params.categoryId });
        res.send(categories);
    } catch (err) {
        res.send(err);
    }
});

router.post("/add/:userId", multi_upload.array("img", 10), function (req, res) {
    let imgarry = [];
    for (const a of req.files) {
        imgarry.push(a.path);
    }
    req.body.img = imgarry;
    req.body.userId = req.params.userId;
    product.create(req.body, function (err, data) {
        if (err) {
            res.end();
        } else {
            users
                .updateOne({ _id: req.params.userId }, { $push: { ads: data._id } })
                .then((response) => res.send("success"))
                .catch((err) => res.send("failed"));
        }
    });
});

router.get("/getProduct/:productId", function (req, res) {
    let productData;
    product
        .findOne({ _id: req.params.productId })
        .then((data) => {
            productData = data;
            category
                .findOne(
                    { _id: data.categoryId },
                    {
                        _id: 0,
                        "firstFilter.title": 1,
                        "secondFilter.title": 1,
                        "thirdFilter.title": 1,
                    }
                )
                .then((data) => {
                    res.send({ data: productData, category: data });
                })
                .catch((err) => res.send(err));
        })
        .catch((err) => {
            res.send(err);
        });
});

//Append Offer
router.post("/sendoffer/:wanted/:offerd", async function (req, res) {
    await product.findOne({ "_id": req.params.wanted }, {}).then((data, err) => {
        if (!data.offers.includes(req.params.offerd)) {
            data.offers.push(req.params.offerd)
            data.save()
            res.send(data)
        }
        else {
            res.send(err)
        }
    })
})

//Get Products Offered for some product
router.get("/getoffers/:pid", async function (req, res) {
    let offer = []
    let dta = []
    await product.findOne({ "_id": req.params.pid }, {}).then((data, err) => {
        offer.push(data.offers)
    })
    await Promise.all(
        offer.map(async (item, index) => {
            await product.find({ "_id": item }, {}).then((data, err) => {
                dta = [...data]
            })
        })
    )
    res.send(dta)
})

router.get("/offers/:id", async (req, res) => {
    let prodList = [];
    product
        .findById(req.params.id)
        .then(async (prod) => {
            for (let i = 0; i < prod.offers.length; i++) {
                let p = await product.findOne({ _id: prod.offers[i] });
                prodList.push(p);
            }
            res.send(prodList);
        })
        .catch((err) => console.log("failed"));
});

router.get("/ads/:id", async (req, res) => {
    let prodList = [];
    users
        .findById(req.params.id)
        .then(async (user) => {
            for (let i = 0; i < user.ads.length; i++) {
                let p = await product.findOne({ _id: user.ads[i] });
                prodList.push(p);
            }
            res.send(prodList);
        })
        .catch((err) => console.log("failed"));
});

//payment for mobile
var paypal = require("paypal-rest-sdk");
paypal.configure({
  mode: "sandbox", //sandbox or live
  client_id:
    "AVYY-0QqCVo-c5AB3nFkdDQ_nTWzmxAcbQygvjHY63ar8JifLxFjjqBQ1JXBPDznMllOFXkumsq89X97",
  client_secret:
    "EM7rec8i6AU7ehxPaasYg25QpDTITxmZcd-BP3Mj_fRCOjJoX70COviCXyJnD_vzh9L9yDZmh-JGq1Zw",
});
var amount = 0;
router.post("/paypal", function (req, res) {
  amount = req.body.price;
  console.log("hgfghf");
  var create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: "http://10.171.240.21:4000/product/success",
      cancel_url: "http://cancel.url",
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: "item",
              sku: "item",
              price: amount,
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: "USD",
          total: amount,
        },
        description: "This is the payment description.",
      },
    ],
  };
  paypal.payment.create(create_payment_json, (error, payment) => {
    // console.log("create")
    if (error) {
      // console.log(error.response);
      throw error;
    } else {
      // console.log(payment)
      for (var index = 0; index < payment.links.length; index++) {
        //Redirect user to this endpoint for redirect url
        if (payment.links[index].rel === "approval_url") {
          res.redirect(payment.links[index].href);
        }
      }
      // console.log(payment);
    }
  });
});

router.get("/success", function (req, res) {
  console.log(req.query);
  var execute_payment_json = {
    payer_id: req.query.PayerID,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: amount,
        },
      },
    ],
  };
  var paymentId = req.query.paymentId;
  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        console.log("Get Payment Response");
        console.log(JSON.stringify(payment));
        res.send("success");
      }
    }
  );
});


module.exports = router;