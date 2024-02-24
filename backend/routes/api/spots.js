const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Spot, SpotImage, Review } = require('../../db/models');




// GET '/api/user/current'
router.get('/current', async (req, res, next) => {
    const spots = await Spot.findAll({
        where: {
            ownerId: req.user.id
        }
    });
    return res.json(spots)
})





//                              FROM REVIEWS

// Get all Reviews by a Spot's id
router.get('/:spotId/reviews', async (req, res, next) => {
    const { spotId } = req.params;
    const spot = await Spot.findByPk(spotId);

    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }

    const reviews = await Review.findAll({
        where: { spotId }
    })
    return res.json(reviews)

})

// Create a Review for a Spot based on the Spot's id
router.post('/:spotId/reviews', requireAuth, async (req, res, next) => {
    const { review, stars } = req.body;
    const { spotId } = req.params;

    // Body validation errors
    if (!review || !stars) {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "review": "Review text is required",
                "stars": "Stars must be an integer from 1 to 5",
            }
        })
    };

    const spot = Spot.findByPk(spotId);

    // Couldn't find spot by id
    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };

    try {
        const newReview = await Review.create({ userId: req.user.id, spotId, review, stars, });
        res.statusCode = 201;
        return res.json(newReview)

    } catch {
        //Review from the current user already exists for the Spot
        res.statusCode = 500;
        return res.json({
            "message": "User already has a review for this spot"
        })

    };

})




// GET '/api/spots/:spotId'
router.get('/:spotId', async (req, res, next) => {
    const { spotId } = req.params;
    const spots = await Spot.findByPk(spotId)

    if (!spots) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    return res.json(spots)
})

// Edit a Spot
router.patch('/:spotId', /** requireAuth, */ async (req, res, next) => {
    const { spotId } = req.params;
    const updatedSpot = await Spot.findByPk(spotId);
    if (!updatedSpot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    try {
        updatedSpot.set(req.body);
        await updatedSpot.save();
        return res.json(updatedSpot);
    } catch { //Error Response: Body validation errors
        res.statusCode = 400
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "address": "Street address is required",
                "city": "City is required",
                "state": "State is required",
                "country": "Country is required",
                "lat": "Latitude must be within -90 and 90",
                "lng": "Longitude must be within -180 and 180",
                "name": "Name must be less than 50 characters",
                "description": "Description is required",
                "price": "Price per day must be a positive number"
            }
        })
    }
})

// Delete a spot
router.delete('/:spotId', async (req, res, next) => {
    const { spotId } = req.params;
    const deletedSpot = await Spot.findByPk(spotId);
    if (!deletedSpot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    await deletedSpot.destroy();
    return res.json({
        "message": "Successfully deleted"
    })
})

// Add an Image to a Spot based on the Spot's id
router.post('/:spotId/images', /*requireAuth,*/ async (req, res, next) => {
    const { spotId } = req.params;
    const spot = await Spot.findByPk(spotId);

    if (!spot) {
        res.statusCode = 404
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    const newImage = await SpotImage.create({ spotId, ...req.body });
    return res.json(newImage)
})


// GET '/api/spots'
router.get('/', async (req, res, next) => {
    const spots = await Spot.findAll();
    return res.json(spots)
})

// Create a spot
router.post('/', /*requireAuth,*/ async (req, res, next) => {
    const { address, city, state, country, lat, lng, name, description, price } = req.body;

    try {
        const newSpot = await Spot.create({ ownerId: 1, address, city, state, country, lat, lng, name, description, price });
        res.statusCode = 201;
        return res.json(newSpot)
    } catch {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "address": "Street address is required",
                "city": "City is required",
                "state": "State is required",
                "country": "Country is required",
                "lat": "Latitude must be within -90 and 90",
                "lng": "Longitude must be within -180 and 180",
                "name": "Name must be less than 50 characters",
                "description": "Description is required",
                "price": "Price per day must be a positive number"
            }
        })
    }

})

module.exports = router;