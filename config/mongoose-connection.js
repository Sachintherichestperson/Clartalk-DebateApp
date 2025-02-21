const mongoose = require("mongoose");
const dbgr = require("debug")("development:mongoose");
const config = require("config");

mongoose
.connect(`${config.get("MONGODB_URI")}/debateapp`)
.then(function(){
    dbgr("Connected")
})
.catch(function(err){
    dbgr(err)
})

module.exports = mongoose.connection;