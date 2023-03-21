const jwt = require('jsonwebtoken');
const dotenv = require("dotenv").config();

exports.middle = function (req, res, next)
{
    if (!req.headers.authorization)
    {
        console.log(req.headers.authorization)
        return next(res.status(401).send({ message: "Unauthorized access" }))
    } else
    {
        let tokn = req.headers.authorization;
        console.log(tokn)
        let secret = process.env.TOKEN_SECRET;
        let detoken = jwt.verify(tokn, secret)
        if (detoken == req.body.email)
        {
            next()
        } else
        {
            res.status(401).send({ message: 'Invlaid Access Token' })
        }
    }
}