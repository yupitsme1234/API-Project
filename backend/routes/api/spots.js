const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Spot, SpotImage, Review, Booking, User, ReviewImage } = require('../../db/models');




// GET '/api/spots/current'
router.get('/current', requireAuth, async (req, res, next) => {


    const spots = await Spot.findAll({
        where: {
            ownerId: req.user.id
        }
    });
    for (let spot of spots) {
        const spotImage = await SpotImage.findOne({
            where: {
                spotId: spot.id
            }
        })
        spot.dataValues.previewImage = spotImage.url;

        const reviews = await Review.findAll({
            where: {
                spotId: spot.id
            }
        })
        const avgRating = reviews.reduce((acc, curr) => acc + curr.stars, 0) / reviews.length;

        spot.dataValues.avgRating = avgRating;
    }

    return res.json({
        "Spots": spots
    })
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
    });

    for (let review of reviews) {
        const user = await User.findOne({
            where: {
                id: review.userId
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        })
        review.dataValues.User = user;

        const reviewImages = await ReviewImage.findAll({
            where: {
                reviewId: review.id
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        });
        review.dataValues.ReviewImages = reviewImages
    }
    return res.json({
        "Reviews": [
            ...reviews,
        ]
    })
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

    const spot = await Spot.findByPk(spotId);

    // Couldn't find spot by id
    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };

    const reviewCheck = await Review.findOne({
        where: {
            spotId: spot.id,
            userId: req.user.id
        }
    })


    if (!reviewCheck) {
        const newReview = await Review.create({ userId: req.user.id, spotId, review, stars, });
        res.statusCode = 201;
        return res.json(newReview)
    }

    //Review from the current user already exists for the Spot
    res.statusCode = 500;
    return res.json({
        "message": "User already has a review for this spot"
    })

        ;

})



//
//
//                          FROM BOOKINGS
//
//

// Get all Bookings for a Spot based on the Spot's id
router.get('/:spotId/bookings', requireAuth, async (req, res, next) => {
    const { spotId } = req.params;
    const userId = 1; //req.user.id
    const spot = await Spot.findOne({
        where: { id: spotId }
    });

    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }

    if (spot.ownerId !== userId) {
        const bookings = await Booking.findAll({
            where: { spotId },
            attributes: { exclude: ['createdAt', 'updatedAt', 'id', 'userId'] }
        })
        for (let booking of bookings) {
            booking.dataValues.startDate = booking.startDate.toJSON().slice(0, 10);
            booking.dataValues.endDate = booking.endDate.toJSON().slice(0, 10)
        }
        return res.json({
            "Bookings": [
                ...bookings]
        })
    }

    const bookings = await Booking.findAll({
        where: { spotId }
    });
    const user = await User.findOne({
        where: { id: userId },
        attributes: { exclude: ['createdAt', 'updatedAt', 'username'] }

    });

    for (let booking of bookings) {
        booking.dataValues.User = user
    }

    return res.json({
        "Bookings": [
            ...bookings
        ]
    })
});

router.post('/:spotId/bookings', requireAuth, async (req, res, next) => {
    const { spotId } = req.params;
    const { startDate, endDate } = req.body
    const currentDate = new Date().toString();
    const spot = await Spot.findByPk(spotId);

    // Error response: Couldn't find a Spot with the specified id
    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };

    // Error response: Booking conflict
    let bookings = await Booking.findAll({
        where: {
            spotId
        }
    });

    bookings = bookings.filter((booking) => booking.startDate.toString() < endDate.toString());
    bookings = bookings.filter((booking) => booking.endDate.toString() > startDate.toString());
    if (bookings.length) {
        res.statusCode = 403;
        return res.json({
            "message": "Sorry, this spot is already booked for the specified dates",
            "errors": {
                "startDate": "Start date conflicts with an existing booking",
                "endDate": "End date conflicts with an existing booking"
            }
        })
    }

    // Error response: Body validation errors
    if (Date.parse(startDate) < Date.parse(currentDate) || Date.parse(startDate) > Date.parse(endDate)) {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "startDate": "startDate cannot be in the past",
                "endDate": "endDate cannot be on or before startDate"
            }
        });
    };

    console.log("twas hit")
    const newBooking = await Booking.create({ userId: req.user.id, spotId, ...req.body });
    return res.json(newBooking)


});


// GET '/api/spots/:spotId'
router.get('/:spotId', async (req, res, next) => {
    const { spotId } = req.params;
    const spot = await Spot.findByPk(spotId)

    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    const spotImages = await SpotImage.findAll({
        where: { spotId },
        attributes: {
            exclude: ['updatedAt', 'spotId', 'createdAt']
        }
    });

    const owner = await User.findOne({
        where: {
            id: spot.ownerId
        },
        attributes: {
            exclude: ['username']
        }
    })

    const response = {
        ...spot.toJSON(),
        "SpotImages": spotImages,
        "Owner": owner

    }
    return res.json(
        response)
})

// Edit a Spot
router.put('/:spotId', requireAuth, async (req, res, next) => {
    const { spotId } = req.params;
    const updatedSpot = await Spot.findByPk(spotId);

    if (updatedSpot.ownerId !== req.user.id) {
        res.statusCode = 404;
        return res.json({
            "message": "Forbidden"
        })
    };

    if (!updatedSpot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };


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
router.delete('/:spotId', requireAuth, async (req, res, next) => {
    const { spotId } = req.params;
    const deletedSpot = await Spot.findByPk(spotId);
    if (!deletedSpot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };

    if (deletedSpot.ownerId !== req.user.id) {
        res.statusCode = 404;
        return res.json({
            "message": "Forbidden"
        })
    };
    await deletedSpot.destroy();
    return res.json({
        "message": "Successfully deleted"
    })
})

// Add an Image to a Spot based on the Spot's id
router.post('/:spotId/images', requireAuth, async (req, res, next) => {
    const { spotId } = req.params;
    const spot = await Spot.findByPk(spotId);

    if (spot.ownerId !== req.user.id) {
        res.statusCode = 404;
        return res.json({
            "message": "Forbidden"
        })
    };

    if (!spot) {
        res.statusCode = 404
        return res.json({
            "message": "Spot couldn't be found"
        })
    }
    const newImage = await SpotImage.create({ spotId, ...req.body });
    const { id, spodId, url, preview } = newImage;
    return res.json({ id, spodId, url, preview })
})


// GET '/api/spots' Get all Spots
router.get('/', async (req, res, next) => {
    const spots = await Spot.findAll();
    let { page, size, minLat, maxLat, minLng, maxLng, minPrice, maxPrice } = req.query;
    const errorMessage = {
        "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
        "errors": {
            "page": "Page must be greater than or equal to 1",
            "size": "Size must be greater than or equal to 1",
            "maxLat": "Maximum latitude is invalid",
            "minLat": "Minimum latitude is invalid",
            "minLng": "Maximum longitude is invalid",
            "maxLng": "Minimum longitude is invalid",
            "minPrice": "Minimum price must be greater than or equal to 0",
            "maxPrice": "Maximum price must be greater than or equal to 0"
        }
    }

    if (!page) page = 1;
    if (!size) size = 20;
    if (req.query) {
        if (Number(page) < 1 || Number(page) > 11 || isNaN(page)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (Number(size) < 1 || Number(size) > 20 || isNaN(size)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (minLat && isNaN(minLat)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (maxLat && isNaN(maxLat)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (minLng && isNaN(minLng)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (maxLng && isNaN(maxLng)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (minPrice && (isNan(minPrice) || minPrice < 0)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
        if (maxPrice && (isNaN(maxPrice) || maxPrice < 0)) {
            res.statusCode = 400;
            return res.json(errorMessage)
        };
    }

    for (let spot of spots) {
        const spotImage = await SpotImage.findOne({
            where: {
                spotId: spot.id
            }
        })
        spot.dataValues.previewImage = spotImage.url;

        const reviews = await Review.findAll({
            where: {
                spotId: spot.id
            }
        })
        const avgRating = reviews.reduce((acc, curr) => acc + curr.stars, 0) / reviews.length;

        spot.dataValues.avgRating = avgRating;
    }

    return res.json({
        "Spots": [...spots],
        page,
        size
    })
})

// Create a spot
router.post('/', requireAuth, async (req, res, next) => {
    const { address, city, state, country, lat, lng, name, description, price } = req.body;
    const newSpot = await Spot.create({ ownerId: req.user.id, address, city, state, country, lat, lng, name, description, price });



    if (newSpot) {
        res.statusCode = 201;
        return res.json(newSpot)
    }
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


});

router.use('/?', async (req, res, next) => {

    return res.json()
})

module.exports = router;
