const mongoose = require("mongoose");
mongoose.connect('mongodb://localhost:27017/kasrZero').then((x)=>
{
    console.log("connection is open");
})
