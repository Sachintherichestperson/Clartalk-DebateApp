const jwt = require("jsonwebtoken");
const User = require("../mongoose/user-mongo");

module.exports = async function (req, res, next) {
    if (!req.cookies.user) {
        console.log("No token found in cookies.");
        return res.redirect("/register");  
    }

    try {
        // Verify the JWT token
        let decoded = jwt.verify(req.cookies.user, process.env.JWT_KEY);
        
        // Find the user based on decoded token data
        let user = await User.findOne({ email: decoded.email }).select("-password");
        
        // Attach the user to the request object
        req.user = user;
        next();
    } catch (error) {
        console.error("Token verification failed:", error.message);
        res.redirect("/register"); // Redirect to login on token verification failure
    }
};
