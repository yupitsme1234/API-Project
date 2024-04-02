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
        if (spotImage) {
            spot.dataValues.previewImage = spotImage.url;
        } else {
            spot.dataValues.previewImage = null;
        }
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
            attributes: { exclude: ['username', 'createdAt', 'updatedAt'] }
        })
        review.dataValues.User = user;

        const reviewImages = await ReviewImage.findAll({
            where: {
                reviewId: review.id
            },
            attributes: { exclude: ['reviewId', 'createdAt', 'updatedAt'] }
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
    if (!review || !stars || Number(stars) < 0 || Number(stars) > 5 || !Number.isInteger(Number(stars))) {
        res.statusCode = 400;
        let errors = {};

        if (!review) {
            errors["review"] = "Review text is required"
        } if (!stars || Number(stars) < 0 || Number(stars) > 5 || !Number.isInteger(Number(stars))) {
            errors["stars"] = "Stars must be an integer from 1 to 5"
        }


        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": errors
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


    if (reviewCheck) {
        //Review from the current user already exists for the Spot
        res.statusCode = 500;
        return res.json({
            "message": "User already has a review for this spot"
        });
    }



    const newReview = await Review.create({ userId: req.user.id, spotId, review, stars, });
    res.statusCode = 201;
    return res.json(newReview)

})



//
//
//                          FROM BOOKINGS
//
//

function bookingConflict(startDate, endDate, booking) {
    const bookingStart = Date.parse(booking.startDate);
    const bookingEnd = Date.parse(booking.endDate);
    const now = new Date();
    let statusCode = 403;
    let errors = {};

    // Start date conflicts with booking
    if (Date.parse(startDate) >= bookingStart && Date.parse(startDate) <= bookingEnd) {
        errors["startDate"] = "Start date conflicts with an existing booking"
    } if (Date.parse(endDate) >= bookingStart && Date.parse(endDate) <= bookingEnd) {
        errors["endDate"] = "End date conflicts with an existing booking"
    } if (Date.parse(startDate) < bookingStart && Date.parse(endDate) > bookingEnd) {
        errors["startDate"] = "Start date conflicts with an existing booking"
        errors["endDate"] = "End date conflicts with an existing booking";
    }

    if (Date.parse(now) > Date.parse(startDate)) {
        errors["startDate"] = "startDate cannot be in the past";
        statusCode = 400
    } if (Date.parse(now) > Date.parse(endDate) || endDate <= startDate) {
        errors["endDate"] = "endDate cannot be on or before startDate";
        statusCode = 400
    }
    return { errors, statusCode }
}

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
    const currentDate = new Date();
    const spot = await Spot.findByPk(spotId);

    // Error response: Couldn't find a Spot with the specified id
    if (!spot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };
    if (spot.ownerId === req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    }

    if (Date.parse(startDate) < Date.parse(currentDate) && Date.parse(endDate) < Date.parse(currentDate)) {
        res.statusCode = 400;
        return res.json({
            "message": "Past bookings can't be modified"
        });
    };

    // Error response: Booking conflict
    let bookings = await Booking.findAll({
        where: {
            spotId,
        },
    });


    for (let booking of bookings) {
        let { errors, statusCode } = bookingConflict(startDate, endDate, booking);
        if (Object.keys(errors).length) {
            if (statusCode = 403) {
                res.statusCode = 403;
                return res.json({
                    "message": "Sorry, this spot is already booked for the specified dates",
                    "errors": errors
                })
            } else {
                res.statusCode = 400;
                return res.json({
                    "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
                    "errors": errors
                })
            }
        }
    }
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
    const numReviews = await Review.findAll({
        where: {
            spotId
        }
    })

    let avgStarRating = 0;

    for (let review of numReviews) {
        avgStarRating += Number(review.stars)
    }

    avgStarRating = avgStarRating / numReviews.length

    const response = {
        ...spot.toJSON(),
        "numReviews": numReviews.length,
        "avgStarRating": avgStarRating,
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
    if (!updatedSpot) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot couldn't be found"
        })
    };

    if (updatedSpot.ownerId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };

    let errors = {};
    const { address, city, state, country, lat, lng, name, description, price } = req.body;

    if (!address) errors["address"] = "Street address is required";
    if (!city) errors["city"] = "City is required";
    if (!state) errors["state"] = "State is required";
    if (!country) errors["country"] = "Country is required";
    if (!lat || isNaN(lat) || Number(lat) < -90 || Number(lat) > 90) errors["lat"] = "Latitude must be within -90 and 90";
    if (!lat || isNaN(lat) || Number(lng) < -180 || Number(lat) > 180) errors["lng"] = "Longitude must be within -180 and 180";
    if (name && name.toString().length > 50 || !name) errors["name"] = "Name must be less than 50 characters";
    if (!description) errors["description"] = "Description is required";
    if (Number(price) < 0 || !price) errors["price"] = "Price per day must be a positive number";

    if (Object.keys(errors).length) {
        res.statusCode = 400
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": errors
        })
    }

    updatedSpot.set(req.body);
    await updatedSpot.save();
    return res.json(updatedSpot);

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
        res.statusCode = 403;
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
    if (!spot) {
        res.statusCode = 404
        return res.json({
            "message": "Spot couldn't be found"
        })
    };
    if (spot.ownerId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };


    const newImage = await SpotImage.create({ spotId, ...req.body });
    const { id, url, preview } = newImage;
    return res.json({ id, url, preview })
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
        if (spotImage) {
            spot.dataValues.previewImage = spotImage.url;
        }
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
    let errors = {};

    if (!address) errors["address"] = "Street address is required";
    if (!city) errors["city"] = "City is required";
    if (!state) errors["state"] = "State is required";
    if (!country) errors["country"] = "Country is required";
    if (!lat || isNaN(lat) || Number(lat) < -90 || Number(lat) > 90) errors["lat"] = "Latitude must be within -90 and 90";
    if (!lat || isNaN(lat) || Number(lng) < -180 || Number(lat) > 180) errors["lng"] = "Longitude must be within -180 and 180";
    if (name && name.toString().length > 50 || !name) errors["name"] = "Name must be less than 50 characters";
    if (!description) errors["description"] = "Description is required";
    if (Number(price) < 0 || !price) errors["price"] = "Price per day must be a positive number";

    if (Object.keys(errors).length) {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": errors
        })
    }

    const newSpot = await Spot.create({ ownerId: req.user.id, address, city, state, country, lat, lng, name, description, price });
    res.statusCode = 201;
    return res.json(newSpot)

});


module.exports = router;
