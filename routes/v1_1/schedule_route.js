const express = require("express");
const router = express.Router();




router.get('/all', (req, res) => {
    try {
        const data = require('../data.json');
        const schedules = Object.values(data);
        
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


router.post('/add_schedule', (req, res) => {
    try {
        const scheduleData = req.body;
        const processedSchedules = {};

        for (const [key, schedule] of Object.entries(scheduleData)) {
            const uid = Math.random().toString(36).substring(2, 15);
            
            const processedSchedule = {
                uid,
                name: schedule.name,
                email: schedule.email,
                description: schedule.description,
                duration: schedule.duration,
                active: schedule.active,
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
                        
                        while (startTime < endTime) {
                            const currentStartTime = startTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });

                            startTime.setMinutes(startTime.getMinutes() + duration);
                            
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
                        }
                    });
                }
            }

            processedSchedules[key] = processedSchedule;
        }

        // Write processed schedules to data.json
        const fs = require('fs');
        const path = require('path');
        const dataFilePath = path.join(__dirname, '..', 'data.json');
        
        fs.writeFileSync(dataFilePath, JSON.stringify(processedSchedules, null, 4), 'utf8');

        res.status(200).json({
            success: true,
            message: "Schedule added successfully",
            data: processedSchedules
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding schedule",
            error: error.message
        });
    }
})


module.exports = router; 