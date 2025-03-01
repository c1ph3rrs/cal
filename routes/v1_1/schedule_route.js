const express = require("express");
const router = express.Router();

router.get('/schedule', (req, res) => {

    res.json({
        "schedule": [
            {
                "date": "2025-02-25",
                "appointments": [
                    { "time": "10:30 AM", "status": "available" },
                    { "time": "11:00 AM", "status": "booked" },
                    { "time": "12:00 PM", "status": "available" },
                    { "time": "02:00 PM", "status": "available" },
                    { "time": "03:00 PM", "status": "available" },
                    { "time": "03:30 PM", "status": "available" }
                ]
            },
            {
                "date": "2025-02-26", 
                "appointments": [
                    { "time": "02:00 PM", "status": "available" },
                    { "time": "11:00 AM", "status": "available" },
                    { "time": "12:00 PM", "status": "available" }
                ]
            },
            {
                "date": "2025-03-01",
                "appointments": [
                    { "time": "10:30 AM", "status": "available" },
                    { "time": "11:00 AM", "status": "booked" },
                    { "time": "12:00 PM", "status": "available" },
                    { "time": "02:00 PM", "status": "available" },
                    { "time": "03:00 PM", "status": "available" },
                    { "time": "03:30 PM", "status": "available" }
                ]
            },
            {
                "date": "2025-03-02", 
                "appointments": [
                    { "time": "02:00 PM", "status": "available" },
                    { "time": "11:00 AM", "status": "available" },
                    { "time": "12:00 PM", "status": "available" }
                ]
            }
        ]
    });

});


module.exports = router; 