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

router.get('/slots/:uid/:date', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const { uid, date } = req.params;

        // Get service details
        const serviceResult = await pool.request()
            .input('uid', sql.VarChar, uid)
            .query(`
                SELECT [working_hours], [meeting_duration], [slot_break]
                FROM [dbo].[Whisper_CalServiceMaster]
                WHERE u_id = @uid
            `);

        if (serviceResult.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found"
            });
        }

        const service = serviceResult.recordset[0];
        const workingHours = JSON.parse(service.working_hours || '{}');

        // Parse and validate date
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({
                success: false, 
                message: "Invalid date format. Use YYYY-MM-DD format"
            });
        }

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[dateObj.getDay()];

        // Get working hours for that day
        const daySchedule = workingHours[dayOfWeek];

        if (!daySchedule || !daySchedule.enabled) {
            return res.json({
                success: true,
                data: []
            });
        }

        const startOfDay = new Date(dateObj.setHours(0,0,0,0));
        const endOfDay = new Date(dateObj.setHours(23,59,59,999));

        const bookedSlotsResult = await pool.request()
            .input('service_uid', sql.VarChar, uid)
            .input('start_date', sql.DateTime, startOfDay)
            .input('end_date', sql.DateTime, endOfDay)
            .query(`
                SELECT [meeting_slot]
                FROM [dbo].[Whisper_CalBookingMaster]
                WHERE service_master_uid = @service_uid
                AND meeting_datetime >= @start_date 
                AND meeting_datetime < @end_date
                AND booking_status = 'booked'
            `);

        const bookedSlots = bookedSlotsResult.recordset.map(record => 
            JSON.parse(record.meeting_slot)
        );

        // Generate available slots
        let availableSlots = [];
        const now = new Date();
        const isToday = now.toDateString() === dateObj.toDateString();
        const currentTime = now.toLocaleTimeString('en-US', { hour12: true });

        daySchedule.timeSlots.forEach(slot => {
            const isBooked = bookedSlots.some(bookedSlot =>
                bookedSlot.start_time === slot.start_time &&
                bookedSlot.end_time === slot.end_time
            );

            // Skip slots that are in the past if date is today
            if (isToday) {
                const slotTime = new Date(`${date} ${slot.start_time}`);
                if (slotTime < now) {
                    return; // Skip this slot
                }
            }

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