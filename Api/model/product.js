const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "users",
      required: true,
    },
    categoryId: {
      type: mongoose.Types.ObjectId,
      ref: "category",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    durationOfUse: {
      type: String,
      required: true,
    },
    time: {
      type: Date,
      default: Date.now,
      // required: true,
    },
    img: {
      type: Array,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
      // required: true,
    },
    ableToExchange: {
      type: String,
    },
    firstFilter: {
      type: String,
      required: true,
    },
    secondFilter: {
      type: String,
    },
    thirdFilter: {
      type: String,
    },
    location:{
      type: String,
    },
    offers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "product",
        required:true
      },
    ],
  },
  {
    versionKey: false,
    strict: false,
  }
);

module.exports = mongoose.model("productCollection", productSchema);
