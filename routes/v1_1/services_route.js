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

        res.status(200).json({
            success: true,
            data: service
        });

    } catch (error) {
        res.status(500).json({
            success: false, 
            message: "Error fetching schedule",
            error: error.message
        });
    }
});


module.exports = router; 