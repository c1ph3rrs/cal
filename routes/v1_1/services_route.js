const express = require("express");
const router = express.Router();


router.get('/all', (req, res) => {

    const data = require('../data.json');
    
    const services = Object.values(data).map(service => ({
        uid: service.uid,
        name: service.name,
        email: service.email,
        description: service.description,
        duration: service.duration
    }));

    res.json(services);

})

router.get('/:uid', (req, res) => {
    try {
        const data = require('../data.json');
        const { uid } = req.params;

        // Find service by matching uid
        const serviceId = Object.keys(data).find(key => data[key].uid === uid);
        const service = serviceId ? data[serviceId] : null;

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        // Create simplified working hours without time slots
        const simplifiedWorkingHours = {};
        Object.keys(service.workingHours).forEach(day => {
            simplifiedWorkingHours[day] = {
                enabled: service.workingHours[day].enabled
            };
        });

        // Create simplified service object
        const simplifiedService = {
            ...service,
            workingHours: simplifiedWorkingHours
        };

        res.status(200).json({
            success: true,
            data: simplifiedService
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            message: "Error fetching schedule",
            error: error.message
        });
    }
});

router.get('/slots/:uid/:date', (req, res) => {
    try {
        const data = require('../data.json');
        const bookedData = require('../booked.json');
        const { uid, date } = req.params;

        // Find service by matching uid
        const serviceId = Object.keys(data).find(key => data[key].uid === uid);
        const service = serviceId ? data[serviceId] : null;

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        // Parse the date parameter
        const dateObj = new Date(date);
        
        // Validate date format
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format. Use YYYY-MM-DD format"
            });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getDay()];

        // Get working hours for that day
        const daySchedule = service.workingHours[dayOfWeek];

        if (!daySchedule || !daySchedule.enabled) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Format date to match booked.json format
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Get booked slots for this service and date
        const bookedSlots = bookedData.filter(booking => {
            // Parse the meeting_date from booked.json to compare with requested date
            const bookedDate = new Date(booking.meeting_date);
            const requestedDate = new Date(date);
            
            return booking.service_uid === uid && 
                   bookedDate.getDate() === requestedDate.getDate() &&
                   bookedDate.getMonth() === requestedDate.getMonth() &&
                   bookedDate.getFullYear() === requestedDate.getFullYear();
        }).map(booking => booking.slot);

        // Generate available time slots based on service duration
        const duration = parseInt(service.duration);
        let availableSlots = [];

        daySchedule.timeSlots.forEach(slot => {
            // Check if slot overlaps with any booked slot
            const isBooked = bookedSlots.some(bookedSlot => 
                bookedSlot.start_time === slot.start_time &&
                bookedSlot.end_time === slot.end_time
            );

            if (!isBooked && slot.status === 'available') {
                availableSlots.push({
                    start_time: slot.start_time,
                    end_time: slot.end_time
                });
            }
        });

        res.json({
            success: true,
            data: availableSlots
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching slots",
            error: error.message
        });
    }
});



module.exports = router; 