const mongoose = require("mongoose");

const NotificationSchema = mongoose.Schema({
    userId: String,
    symbol: String,
    price: Number,
    high: Boolean
})

module.exports = mongoose.model("Notification", NotificationSchema);