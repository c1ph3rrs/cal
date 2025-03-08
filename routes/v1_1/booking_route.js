const express = require("express");
const router = express.Router();
const { sql, connectToDatabase } = require('../../db_connection');

// router.get('/all/:uid', (req, res) => {
//     try {
//         const bookedSlots = require('../booked.json');
//         const { uid } = req.params;
//         const currentDate = new Date();

//         const userBookings = bookedSlots.filter(booking => {
//             return booking.user_id === uid && new Date(booking.date) >= currentDate;
//         });

//         res.status(200).json({
//             success: true,
//             data: userBookings
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "Error fetching bookings",
//             error: error.message
//         });
//     }

// })

// router.get('/show/bookings/:sid', (req, res) => {

//     try {
//         const { sid } = req.params;

//         const bookedSlots = require('../booked.json');
//         const currentDate = new Date();

//         // Filter bookings by service_uid and future dates
//         const upcomingBookings = bookedSlots.filter(booking => {
//             // Check if service_uid matches
//             if (booking.service_uid !== sid) {
//                 return false;
//             }

//             // Parse the date string into components
//             const [dayName, month, day, year] = booking.meeting_date.split(' ');
//             const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth();
            
//             // Create date object from components
//             const bookingDate = new Date(year, monthNum, parseInt(day.replace(',', '')));
            
//             // Set times to midnight for date comparison
//             bookingDate.setHours(0,0,0,0);
//             const compareDate = new Date(currentDate);
//             compareDate.setHours(0,0,0,0);

//             return bookingDate >= compareDate;
//         });

//         upcomingBookings.sort((a, b) => {
//             const [aDayName, aMonth, aDay, aYear] = a.meeting_date.split(' ');
//             const [bDayName, bMonth, bDay, bYear] = b.meeting_date.split(' ');
            
//             const aMonthNum = new Date(Date.parse(aMonth + " 1, 2000")).getMonth();
//             const bMonthNum = new Date(Date.parse(bMonth + " 1, 2000")).getMonth();

//             const aDate = new Date(aYear, aMonthNum, parseInt(aDay.replace(',', '')));
//             const bDate = new Date(bYear, bMonthNum, parseInt(bDay.replace(',', '')));

//             return aDate - bDate;
//         });

//         res.status(200).json({
//             success: true,
//             data: upcomingBookings
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "Error fetching bookings",
//             error: error.message
//         });
//     }

// })

router.post('/book/meeting', async (req, res) => {
    try {
        const { service_uid, date, duration, start_time, end_time, user, organizer, meeting_url, user_id, company_id } = req.body;

        // Validate required fields
        if (!service_uid || !date || !start_time || !end_time || !user || !user.email || !user.name || !organizer || !organizer.email || !organizer.name) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Parse date string into components
        const [dayName, month, day, year] = date.split(' ');
        const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth();
        const meetingDate = new Date(year, monthNum, parseInt(day.replace(',', '')));

        // Parse time strings and combine with date
        const [startTime, startPeriod] = start_time.split(' ');
        const [startHour, startMinute] = startTime.split(':');
        let startHour24 = parseInt(startHour);
        if (startPeriod === 'PM' && startHour24 !== 12) startHour24 += 12;
        if (startPeriod === 'AM' && startHour24 === 12) startHour24 = 0;
        
        const startDateTime = new Date(meetingDate);
        startDateTime.setHours(startHour24, parseInt(startMinute), 0, 0);

        const [endTime, endPeriod] = end_time.split(' ');
        const [endHour, endMinute] = endTime.split(':');
        let endHour24 = parseInt(endHour);
        if (endPeriod === 'PM' && endHour24 !== 12) endHour24 += 12;
        if (endPeriod === 'AM' && endHour24 === 12) endHour24 = 0;

        const endDateTime = new Date(meetingDate);
        endDateTime.setHours(endHour24, parseInt(endMinute), 0, 0);

        // Check if end time is after start time
        if (endDateTime <= startDateTime) {
            return res.status(400).json({
                success: false,
                message: "End time must be after start time"
            });
        }

        // Check for conflicts before inserting
        const pool = await connectToDatabase();
        const checkConflicts = await pool.request()
            .input('service_uid', sql.VarChar, service_uid)
            .input('date', sql.Date, meetingDate)
            .input('start_time', sql.DateTime, startDateTime)
            .input('end_time', sql.DateTime, endDateTime)
            .query(`
                SELECT COUNT(*) as count
                FROM [dbo].[Whisper_CalBookingMaster]
                WHERE service_master_uid = @service_uid
                AND CONVERT(date, meeting_datetime) = @date
                AND booking_status != 'cancelled'
                AND (
                    (@start_time >= meeting_datetime AND @start_time < DATEADD(minute, meeting_duration, meeting_datetime))
                    OR
                    (@end_time > meeting_datetime AND @end_time <= DATEADD(minute, meeting_duration, meeting_datetime))
                )
            `);

        if (checkConflicts.recordset[0].count > 0) {
            return res.status(409).json({
                success: false,
                message: "Time slot already booked"
            });
        }

        // Generate unique ID using timestamp + random string for better uniqueness
        const uid = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

        // Create SQL query to insert booking
        const sqlQuery = `
            INSERT INTO [dbo].[Whisper_CalBookingMaster]
            (
                [service_master_uid],
                [meeting_datetime],
                [meeting_duration],
                [meeting_slot],
                [meeting_attendee],
                [meeting_organizer],
                [booking_status],
                [meeting_status],
                [meeting_venue],
                [meeting_timezone],
                [meeting_url],
                [is_enabled],
                [user_id],
                [company_id],
                [created_on]
            )
            VALUES
            (
                @service_uid,
                @meeting_datetime,
                @duration,
                @meeting_slot,
                @attendee,
                @organizer,
                'booked',
                'pending',
                'Google Meet',
                'UTC',
                @meeting_url,
                1,
                @user_id,
                @company_id,
                GETDATE()
            )
        `;
        
        const result = await pool.request()
            .input('service_uid', sql.VarChar, service_uid)
            .input('meeting_datetime', sql.DateTime, startDateTime)
            .input('duration', sql.Int, duration)
            .input('meeting_slot', sql.NVarChar, JSON.stringify({
                start_time: start_time,
                end_time: end_time
            }))
            .input('attendee', sql.NVarChar, JSON.stringify({
                email: user.email,
                name: user.name,
                phone_no: user.phone_no || null,
                notes: user.notes || null
            }))
            .input('organizer', sql.NVarChar, JSON.stringify({
                email: organizer.email,
                name: organizer.name
            }))
            .input('meeting_url', sql.NVarChar, meeting_url)
            .input('user_id', sql.VarChar, user_id.toString()) // Convert user_id to string
            .input('company_id', sql.VarChar, company_id.toString()) // Convert company_id to string
            .query(sqlQuery);

        // Send response
        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: {
                uid: uid,
                service_uid,
                date,
                duration,
                start_time,
                end_time,
                user,
                organizer,
                meeting_url,
                company_id
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Error creating booking",
            error: error.message
        });
    }
})


module.exports = router; 