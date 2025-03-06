const express = require("express");
const router = express.Router();

const { sql, connectToDatabase } = require('../../db_connection');


router.get('/all', async (req, res) => {

    try {

        const pool = await connectToDatabase();

        const result = await pool.request().query(
            `
            SELECT [u_id]
                    ,[service_name]
                    ,[email_address]
                    ,[service_description]
                    ,[meeting_duration]
                    FROM [dbo].[Whisper_CalServiceMaster]
            `
        );

        const services = result.recordset.map(service => ({
            uid: service.u_id,
            name: service.service_name,
            email: service.email_address,
            description: service.service_description,
            duration: service.meeting_duration
        }));

        res.status(200).json(services);

    }catch (error){
        res.status(500).json({
            success: false,
            message: "Error fetching services",
            error: error.message
        });
    }

})

router.get('/:uid', async (req, res) => {
    try {
        const { uid } = req.params;

        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('uid', sql.VarChar, uid)
            .query(
                `
                SELECT [id]
                    ,[u_id]
                    ,[service_code]
                    ,[service_name]
                    ,[service_description]
                    ,[slot_break]
                    ,[email_address]
                    ,[working_hours]
                    ,[meeting_duration]
                    ,[is_enabled]
                    ,[user_id]
                    ,[company_id]
                    ,[created_on]
                FROM [dbo].[Whisper_CalServiceMaster] 
                WHERE u_id = @uid
                `
            );

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        const service = result.recordset[0];
        const workingHours = JSON.parse(service.working_hours || '{}');
        
        // Extract only enabled status from working hours
        const simplifiedWorkingHours = {};
        for (const day in workingHours) {
            simplifiedWorkingHours[day] = {
                enabled: workingHours[day]?.enabled || false
            };
        }
        
        res.status(200).json({
            success: true,
            data: {
                uid: service.u_id,
                code: service.service_code,
                name: service.service_name,
                email: service.email_address,
                description: service.service_description,
                duration: service.meeting_duration,
                slotBreak: service.slot_break,
                active: service.is_enabled,
                workingHours: simplifiedWorkingHours
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching service",
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