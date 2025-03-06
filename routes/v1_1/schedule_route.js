const express = require("express");
const router = express.Router();

const { sql, connectToDatabase } = require('../../db_connection');




router.get('/all', async (req, res) => {
    try {
        const pool = await connectToDatabase();

        const result = await pool.request()
            .query(`
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
            `);

        const schedules = result.recordset.map(record => ({
            uid: record.u_id,
            code: record.service_code,
            name: record.service_name,
            email: record.email_address,
            description: record.service_description,
            duration: record.meeting_duration,
            slotBreak: record.slot_break,
            active: record.is_enabled,
            companyID: record.company_id,
            userID: record.user_id,
            workingHours: JSON.parse(record.working_hours || '{}'),
            createdOn: record.created_on
        }));

        res.status(200).json({
            success: true,
            data: schedules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching schedules",
            error: error.message
        });
    }
});


router.post('/add_schedule', async (req, res) => {
    try {
        const schedules = req.body;
        const processedSchedules = {};
        

        // Get database connection
        const pool = await connectToDatabase();

        for (let i = 0; i < schedules.length; i++) {
            const schedule = schedules[i];
            const uid = Math.random().toString(36).substring(2, 15);
            const serviceCode = schedule.code || Math.random().toString(36).substring(2, 10);
            
            const processedSchedule = {
                uid,
                code: serviceCode,
                name: schedule.name,
                email: schedule.email,
                description: schedule.description,
                duration: schedule.duration,
                slotBreak: schedule.slotBreak,
                active: schedule.active,
                companyID: schedule.companyID,
                userID: schedule.userID,
                workingHours: {}
            };

            // Process working hours for each day
            for (const [day, hours] of Object.entries(schedule.workingHours)) {
                processedSchedule.workingHours[day] = {
                    enabled: hours.enabled,
                    timeSlots: []
                };

                if (hours.enabled && hours.timeSlots.length > 0) {
                    hours.timeSlots.forEach(slot => {
                        const startTime = new Date(`2000-01-01 ${slot.start}`);
                        const endTime = new Date(`2000-01-01 ${slot.end}`);
                        const duration = parseInt(schedule.duration);
                        const slotBreak = parseInt(slot.slotBreak || schedule.slotBreak || 0);
                        
                        while (startTime < endTime) {
                            const currentStartTime = startTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });

                            startTime.setMinutes(startTime.getMinutes() + duration);
                            
                            if (startTime <= endTime) {
                                const currentEndTime = startTime.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit', 
                                    hour12: true
                                });

                                processedSchedule.workingHours[day].timeSlots.push({
                                    start_time: currentStartTime,
                                    end_time: currentEndTime,
                                    status: "available"
                                });

                                // Add break time
                                startTime.setMinutes(startTime.getMinutes() + slotBreak);
                            }
                        }
                    });
                }
            }

            processedSchedules[i + 1] = processedSchedule;

            // Insert into database
            await pool.request()
                .input('u_id', sql.VarChar, processedSchedule.uid)
                .input('service_code', sql.VarChar, processedSchedule.code)
                .input('service_name', sql.VarChar, processedSchedule.name)
                .input('service_description', sql.VarChar, processedSchedule.description)
                .input('slot_break', sql.Int, processedSchedule.slotBreak)
                .input('email_address', sql.VarChar, processedSchedule.email)
                .input('working_hours', sql.NVarChar, JSON.stringify(processedSchedule.workingHours))
                .input('meeting_duration', sql.Int, processedSchedule.duration)
                .input('is_enabled', sql.Bit, processedSchedule.active)
                .input('user_id', sql.Int, processedSchedule.uid)
                .input('company_id', sql.Int, processedSchedule.companyID)
                .query(`
                    INSERT INTO Whisper_CalServiceMaster 
                    (u_id, service_code, service_name, service_description, slot_break, 
                    email_address, working_hours, meeting_duration, is_enabled, user_id, company_id)
                    VALUES 
                    (@u_id, @service_code, @service_name, @service_description, @slot_break,
                    @email_address, @working_hours, @meeting_duration, @is_enabled, @user_id, @company_id)
                `);
        }

        // Write processed schedules to data.json
        // const fs = require('fs');
        // const path = require('path');
        // const dataFilePath = path.join(__dirname, '..', 'data.json');
        
        // fs.writeFileSync(dataFilePath, JSON.stringify(processedSchedules, null, 4), 'utf8');

        res.status(200).json({
            success: true,
            message: "Schedules added successfully to database",
            data: processedSchedules
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding schedules",
            error: error.message
        });
    }
});


module.exports = router; 