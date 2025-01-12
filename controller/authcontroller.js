const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const User = require("../mongoose/user-mongo")

module.exports.userregister = async (req, res) => {
    try{
        const user = await User.findOne({email: req.body.email});
        if(user){
             req.flash("key", "user already registered")
            return res.redirect("/register")
        }

        const usernameId = await User.findOne({ username: req.body.username });
        if(usernameId){
            req.flash("key", "username not available");
           return res.redirect("/register")
       }
    let {username, email, password } = req.body;
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            if (err) {
                req.flash("key", "something went wrong")
                return res.send("error")
            } else {
                const user = await User.create({
                    username,
                    email,
                    password: hash,
                });
                let token = jwt.sign({ email: email}, process.env.JWT_KEY);
                res.cookie("user", token, {
                    httpOnly: true,
                    secure: process.env.Node_KEY === "production",
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                    sameSite: 'strict'
                })
                return res.redirect("/")
                   }
              })
         })
      }catch(err){
          console.log(err)
    }
}

module.exports.loginuser = async (req, res) => {
        let {email, password} = req.body;
        const user = await User.findOne({email: email});
        if(!user){
            req.flash("usernot", "user not found")
            return res.redirect("/login")
        }
        bcrypt.compare(password, user.password, function(err, result){
            if(result){
                let token = jwt.sign({ email: email}, process.env.JWT_KEY);
                res.cookie("user", token);
                return res.redirect("/")
            }else{
                res.send(err)
            }
        })
}

module.exports.logout = async (req, res) => {
        res.cookie("user", "");
        return res.redirect("/login")
}