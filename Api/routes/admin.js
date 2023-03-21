const express = require("express");
const multer = require("multer");
const router = express.Router();
const product = require("../model/product");
const users = require("../model/users");
const admin = require("../model/admin");
const order = require("../model/order");
const category = require("../model/category");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv").config();

const crypto = require("crypto");

/////////////////////////admin register/////////////////////////
router.post("/register", async (req, res) => {
  try {
    let cipher = crypto.createCipher("aes-256-ctr", req.body.password);
    let crypted = cipher.update(req.body.password, "utf-8", "hex");
    crypted += cipher.final("hex");
    req.body.password = crypted;
    await admin.create(req.body, function (err, data) {
      if (err) {
        if (err.keyPattern["email"] == 1) {
          res.send({ massge: "This email is already exist" });
        }
      } else {
        res.send({ success: true });
      }
    });
  } catch (err) {
    res.send("Failed");
  }
});

/////////////////////////admin login/////////////////////////
router.post("/login", async (req, res) => {
  try {
    let decipher = crypto.createDecipher("aes-256-ctr", req.body.password);
    let decrypted = decipher.update(req.body.password, "utf-8", "hex");
    decrypted += decipher.final("hex");
    req.body.password = decrypted;
    let result = await admin.findOne({
      $and: [{ email: req.body.email }, { password: req.body.password }],
    });
    if (result) {
      let secret = process.env.TOKEN_SECRET;
      let token = jwt.sign(req.body.email, secret);
      // res.setHeader("authorization", token);
      res.send({ authorization: token, success: true });
    } else res.send({ massege: "not found this admin", success: false });
  } catch (err) {
    res.send("Failed");
  }
});

/////////////////////////admin add user/////////////////////////
router.post("/addUser", async (req, res) => {
  console.log("email: ", req.body.email);
  console.log("pass: ", req.body.password);
  console.log("username: ", req.body.userName);
  console.log("phoneNumber: ", req.body.phoneNumber);
  let cipher = crypto.createCipher("aes-256-ctr", req.body.password);
  let crypted = cipher.update(req.body.password, "utf-8", "hex");
  crypted += cipher.final("hex");
  let x = req.body;
  x.password = crypted;
  await users.create(x, function (err, data) {
    if (err) {
      console.log(err);
      res.json("failed");
    } else {
      let secret = process.env.TOKEN_SECRET;
      let token = jwt.sign(data.email, secret);
      res.setHeader("authorization", token);
      console.log(token);
      res.json("success");
    }
  });
});

/////////////////////////dashboard/////////////////////////////
router.get("/dashboard", async (req, res) => {
  try {
    // header (4 cards)
    let numOfUsers = await users.find({}).count();
    let numOfCategories = await category.find({}).count();
    let numOfPendingAds = await product.find({ status: "pending" }).count();
    let numOfProducts = await product.find({}).count();
    // let numOfDeliveredOrders = await order
    //   .find({ $and: [{ exchangable: false }, { status: "delivered" }] })
    //   .count();
    // /////////////////////////////////////////
    // numOfDeliveredOrders += await order
    //   .find({
    //     $and: [
    //       { exchangable: true },
    //       { status: "delivered" },
    //       { "exchangeProperties.status": "delivered" },
    //     ],
    //   })
    //   .count();
    // latest updates tables
    let newUsers = await users.find({}).sort({ time: -1 }).limit(5);
    let pendingAds = await product
      .find({ status: "pending" })
      .sort({ time: -1 })
      .limit(5);
    let newOrders = await order.find({}).sort({ time: -1 }).limit(5);
    let ordersDetails = [];
    for (let i = 0; i < newOrders.length; i++) {
      let orderProductDetails = await product.findOne(
        { _id: newOrders[i].productId },
        { title: 1, _id: 0, img: 1 }
      );
      let orderBuyerDetails = await users.findOne(
        { _id: newOrders[i].buyerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      let orderSellerDetails = await users.findOne(
        { _id: newOrders[i].sellerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      ordersDetails.push({
        orderProductDetails: orderProductDetails,
        orderBuyerDetails: orderBuyerDetails,
        orderSellerDetails: orderSellerDetails,
      });
    }
    let response = {
      numOfUsers: numOfUsers,
      numOfCategories: numOfCategories,
      numOfPendingAds: numOfPendingAds,
      numOfProducts: numOfProducts,
      newUsers: newUsers,
      pendingAds: pendingAds,
      newOrders: newOrders,
      ordersDetails: ordersDetails,
    };
    res.send(response);
  } catch (err) {
    res.send(err);
  }
});

/////////////////////////addCategory modal////////////////////////////
router.post("/addCategory", async (req, res) => {
  try {
    req.body["brands"] = req.body["brands"].split(",");
    req.body["firstFilter.options"] =
      req.body["firstFilter.options"].split(",");
    req.body["secondFilter.options"] =
      req.body["secondFilter.options"].split(",");
    req.body["thirdFilter.options"] =
      req.body["thirdFilter.options"].split(",");
    await category.create(req.body, function (err, data) {
      if (err) res.json("failed");
      else res.json("success");
    });
  } catch (err) {
    res.json("failed");
  }
});

//////////////////////////users////////////////////////////
//get users
router.get("/users", function (req, res) {
  users
    .find({})
    .then((data) => {
      res.send(data);
    })
    .catch((err) => {
      res.send(err);
    });
});

//delete user
router.delete("/deleteuser/:id", function (req, res) {
  users
    .deleteOne({ _id: req.params.id })
    .then(() => {
      product.deleteMany({ userId: req.params.id }).then(() => {
        res.send({ success: true });
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

///////////////////////////categories//////////////////////////
//get categories names
router.get("/categories", async (req, res) => {
  try {
    let categories = await category.find({});
    res.send(categories);
  } catch (err) {
    res.send(err);
  }
});
//////////////////////find user by id  for view product ////////////
router.get("/finduser/:id", async (req, res) => {
  try {
    let user = await users.findOne({ _id: req.params.id });
    res.send(user);
  } catch (err) {
    res.send(err);
  }
});

/////////////////////////get products////////////////
//todo
router.get("/categories/:categoryId", async (req, res) => {
  try {
    let products = await product.find({
      $and: [{ categoryId: req.params.categoryId }, { status: "active" }],
    });
    res.send(products);
  } catch (err) {
    res.send(err);
  }
});

///////////////////////////pending ads////////////////////////
// get pending ads
router.post("/pendingAds", async function (req, res) {
  let us = [];
  let obj = {};
  await product.find({ status: "pending" }).then(async (data) => {
    obj = {
      pro: data,
      us: us,
    };
    for (const i of data) {
      let x = await users.findOne({ _id: i.userId });
      us.push(x);
      // console.log(x)
    }
  });
  // console.log(us)
  res.send(obj);
});

// /////////////////update status of pending ads
router.post("/pendingAds/updatestatus/:id", function (req, res) {
  product
    .findOne({ _id: req.params.id })
    .then((data) => {
      data.status = "active";
      data.save();
      res.send({ success: true, Data: data });
    })
    .catch((err) => {
      res.send(err);
    });
});

///////////////////////////// delete ad
router.post("/pendingAds/deleteAd/:id", function (req, res) {
  product
    .findOne({ _id: req.params.id })
    .then((data) => {
      data.status = "canceled";
      data.save();
      res.send({ success: true, Data: data });
    })
    .catch((err) => {
      res.send(err);
    });
});

///////////////////details in pending add ///////////
router.get("/details/:categoryId", (req, res) => {
  category.findOne({ _id: req.params.categoryId }).then((data, err) => {
    if (err) {
      res.send(err);
    } else {
      res.send(data);
    }
  });
});

/////////////////////////////delivered buying orders///////////////////////////////
router.get("/deliveredBuyingOrders", async (req, res) => {
  try {
    let deliveredOrders = await order
      .find({ $and: [{ status: "delivered", exchangable: false }] })
      .sort({ time: -1 });
    let ordersDetails = [];
    for (let i = 0; i < deliveredOrders.length; i++) {
      let orderProductDetails = await product.findOne(
        { _id: deliveredOrders[i].productId },
        { title: 1, _id: 0, img: 1 }
      );
      let orderBuyerDetails = await users.findOne(
        { _id: deliveredOrders[i].buyerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      let orderSellerDetails = await users.findOne(
        { _id: deliveredOrders[i].sellerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      ordersDetails.push({
        orderProductDetails: orderProductDetails,
        orderBuyerDetails: orderBuyerDetails,
        orderSellerDetails: orderSellerDetails,
      });
    }
    res.send({
      deliveredOrders: deliveredOrders,
      ordersDetails: ordersDetails,
    });
  } catch (err) {
    res.send(err);
  }
});
/////////////////////////////delivered exchanging orders///////////////////////////////
router.get("/deliveredExchangingOrders", async (req, res) => {
  try {
    let deliveredOrders = await order
      .find({
        $and: [
          {
            status: "delivered",
            exchangable: true,
            "exchangeProperties.status": "delivered",
          },
        ],
      })
      .sort({ time: -1 });
    let ordersDetails = [];
    for (let i = 0; i < deliveredOrders.length; i++) {
      let orderProductDetails = await product.findOne(
        { _id: deliveredOrders[i].productId },
        { title: 1, _id: 0, img: 1 }
      );
      let orderBuyerDetails = await users.findOne(
        { _id: deliveredOrders[i].buyerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      let orderSellerDetails = await users.findOne(
        { _id: deliveredOrders[i].sellerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      ordersDetails.push({
        orderProductDetails: orderProductDetails,
        orderBuyerDetails: orderBuyerDetails,
        orderSellerDetails: orderSellerDetails,
      });
    }
    res.send({
      deliveredOrders: deliveredOrders,
      ordersDetails: ordersDetails,
    });
  } catch (err) {
    res.send(err);
  }
});
/////////////////////////////Pending orders////////////////////////////////
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
        .then(async (data) => {
          data.exchangeProperties.status = req.params.newStatus;
          console.log(data);
          if (req.params.newStatus == "canceled") {
            await product.updateOne(
              { _id: data.exchangeProperties.productId },
              { $set: { status: "active" } }
            );
          } else if (req.params.newStatus == "delivered") {
            await product.updateOne(
              { _id: data.exchangeProperties.productId },
              { $set: { status: "sold" } }
            );
          }
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
        .then(async (data) => {
          data.status = req.params.newStatus;
          console.log(data);
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
          data.save();
          res.json({ message: "success" });
        })
        .catch((err) => {
          res.send(err);
        });
    }
  }
);

// exchanging orders
router.get("/exchangingOrders", async (req, res) => {
  try {
    let exchangingOrders = await order.find({
      $and: [
        { exchangable: true },
        {
          $or: [
            {
              $and: [
                { status: { $in: ["delivered", "canceled"] } },
                {
                  "exchangeProperties.status": {
                    $nin: ["delivered", "canceled"],
                  },
                },
              ],
            },
            {
              $and: [
                { status: { $nin: ["delivered", "canceled"] } },
                {
                  "exchangeProperties.status": {
                    $in: ["delivered", "canceled"],
                  },
                },
              ],
            },
            { status: { $nin: ["delivered", "canceled"] } },
            {
              "exchangeProperties.status": {
                $nin: ["delivered", "canceled"],
              },
            },
          ],
        },
      ],
    });
    let ordersDetails = [];
    for (let i = 0; i < exchangingOrders.length; i++) {
      let  
      orderBuyerProductDetails = await product.findOne(
        { _id: exchangingOrders[i].productId },
        { title: 1, _id: 0, img: 1 }
      );
      let orderSellerProductDetails = await product.findOne(
        { _id: exchangingOrders[i].exchangeProperties.productId },
        { title: 1, _id: 0, img: 1 }
      );
      let orderBuyerDetails = await users.findOne(
        { _id: exchangingOrders[i].buyerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      let orderSellerDetails = await users.findOne(
        { _id: exchangingOrders[i].sellerId },
        { _id: 0, userName: 1, address: 1, phoneNumber: 1 }
      );
      ordersDetails.push({
        orderSellerProductDetails: orderSellerProductDetails,
        orderBuyerProductDetails: orderBuyerProductDetails,
        orderSellerDetails: orderSellerDetails,
        orderBuyerDetails: orderBuyerDetails,
      });
    }
    res.send({
      exchangingOrders: exchangingOrders,
      ordersDetails: ordersDetails,
    });
  } catch (err) {
    res.send(err);
  }
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/img");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + file.originalname);
  },
});
const multi_upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      const err = new Error("Only .png, .jpg and .jpeg format allowed!");
      err.name = "ExtensionError";
      return cb(err);
    }
  },
});

router.post(
  "/addProduct/:userEmail",
  multi_upload.array("img", 10),
  async (req, res) => {
    let imgarry = [];
    for (const a of req.files) {
      imgarry.push(a.path);
    }
    req.body.img = imgarry;
    let userId;
    let result = await users.findOne(
      { email: req.params.userEmail },
      { _id: 1 }
    );
    if (result == null) {
      res.json({ messge: "invalid user" });
    } else {
      userId = result._id;
    }
    req.body.userId = userId;
    product.create(req.body, function (err, data) {
      if (err) {
        res.json({ messge: "failed" });
      } else {
        users
          .updateOne({ _id: userId }, { $push: { ads: data._id } })
          .then((response) => res.json({ messge: "success" }))
          .catch((err) => res.json({ messge: "failed" }));
      }
    });
  }
);

module.exports = router;