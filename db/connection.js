const mongoose = require('mongoose')

mongoose.connect(process.env.MONGODB_URI).then(()=>console.log("Db Connected")).catch((e)=> console.log("Error",e))

