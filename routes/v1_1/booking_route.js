const express = require("express");
const router = express.Router();

router.get('/all/:uid', (req, res) => {
    try {
        const bookedSlots = require('../booked.json');
        const { uid } = req.params;
        const currentDate = new Date();

        const userBookings = bookedSlots.filter(booking => {
            return booking.user_id === uid && new Date(booking.date) >= currentDate;
        });

        res.status(200).json({
            success: true,
            data: userBookings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching bookings",
            error: error.message
        });
    }

})

router.post('/book/meeting', (req, res) => {
    try {
        const { service_uid, date, duration, start_time, end_time, user, organizer, meeting_url } = req.body;

        // Validate required fields
        if (!service_uid || !date || !start_time || !end_time || !user || !user.email || !user.name) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Generate unique ID
        const uid = Math.random().toString(36).substring(2, 11);

        // Create new booking object matching existing schema
        const newBooking = {
            "uid": uid, 
            "created_at": new Date().toISOString(),
            "meeting_date": date,
            "duration": duration,
            "slot": {
                "start_time":  start_time,
                "end_time": end_time,
            },
            "user_id": user.email,
            "service_uid": service_uid,
            "attendee": {
                "email": user.email,
                "name": user.name,
                "phone_no": user.phone_no || "",
                "notes": user.notes || ""
            },
            "organizer": {
                "email": organizer.email,
                "name": organizer.name
            },
            "booking_status": [{"status": "booked", "datetime": new Date().toISOString()}],
            "booking_status_updated_at": new Date().toISOString(),
            "meeting_status": "pending",
            "meeting_venue": "Google Meet",
            "timezone": "UTC",
            "meeting_url": meeting_url
        };

        console.log("New booking", newBooking);

        // Read existing bookings
        const bookedSlots = require('../booked.json');
        
        // Check for conflicting bookings
        const conflictingBooking = bookedSlots.find(booking => 
            booking.date === date &&
            booking.service_uid === service_uid &&
            booking.booking_status[0] !== "cancelled" &&
            ((new Date(start_time) >= new Date(booking.start_time) && 
              new Date(start_time) < new Date(booking.end_time)) ||
             (new Date(end_time) > new Date(booking.start_time) && 
              new Date(end_time) <= new Date(booking.end_time)))
        );

        if (conflictingBooking) {
            return res.status(409).json({
                success: false,
                message: "Time slot already booked"
            });
        }

        // Add new booking
        const fs = require('fs');
        const path = require('path');
        bookedSlots.push(newBooking);
        fs.writeFileSync(path.join(__dirname, '../booked.json'), JSON.stringify(bookedSlots, null, 4));

        // Send response
        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: newBooking
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating booking",
            error: error.message
        });
    }
})


module.exports = router; 