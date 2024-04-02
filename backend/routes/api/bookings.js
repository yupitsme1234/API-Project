const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Booking, Spot, SpotImage } = require('../../db/models');


// Get all of the Current User's Bookings

router.get('/current', requireAuth, async (req, res, next) => {
    const userId = req.user.id
    const bookings = await Booking.findAll({
        where: {
            id: userId
        }
    });
    for (let booking of bookings) {
        const spot = await Spot.findOne({
            where: {
                id: booking.spotId
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        })

        const spotImage = await SpotImage.findOne({
            where: {
                spotId: spot.id,
                preview: true
            }
        })
        if (spotImage){
            spot.dataValues.previewImage = spotImage.url;
        } else{
            spot.dataValues.previewImage = null;
        }

        booking.dataValues.Spot = spot;
    }

    return res.json({
        "Bookings": [
            ...bookings]
    })
});


function bookingConflict(startDate, endDate, booking) {
    const bookingStart = booking.startDate;
    const bookingEnd = booking.endDate;
    const now = new Date();
    let statusCode = 403;
    let errors = {};

    // Start date conflicts with booking
    if (startDate >= bookingStart && startDate <= bookingEnd) {
        errors["startDate"] = "Start date conflicts with an existing booking"
    } if (endDate >= bookingStart && endDate <= bookingEnd) {
        errors["endDate"] = "End date conflicts with an existing booking"
    } if (startDate < bookingStart && endDate > bookingEnd) {
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

// Edit a Booking
router.put('/:bookingId', requireAuth, async (req, res, next) => {
    const { bookingId } = req.params;
    const { startDate, endDate } = req.body;
    const updatedBooking = await Booking.findByPk(bookingId);
    const currentDate = new Date();

    if (!updatedBooking) {
        res.statusCode = 404;
        return res.json({
            "message": "Booking couldn't be found"
        })

    };

    // Require proper authorization: Booking must belong to the current user
    if (updatedBooking.userId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        });
    }

     // Error response: Can't edit a booking that's past the end date
     if (Date.parse(endDate) < Date.parse(currentDate) && startDate < endDate) {
        res.statusCode = 403;
        return res.json({
            "message": "Past bookings can't be modified"
        })
    };

       // Error response: Booking conflict and body validation
    let bookings = await Booking.findAll({
        where: {
            spotId: updatedBooking.spotId
        }
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


    updatedBooking.set(req.body);
    await updatedBooking.save();
    return res.json(updatedBooking);
});

// Delete a booking
router.delete('/:bookingId', requireAuth, async (req, res, next) => {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId);

    const currentDate = new Date();
    if (!booking) {
        res.statusCode = 404;
        return res.json({
            "message": "Booking couldn't be found"
        })
    };
    const spot = await Spot.findByPk(booking.spotId);
    if (booking.userId !== req.user.id && spot.ownerId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };



    if (Date.parse(booking.startDate) < Date.parse(currentDate)) {
        res.statusCode = 403;
        return res.json({
            "message": "Bookings that have been started can't be deleted"
        });
    };
    await booking.destroy()
    return res.json({
        "message": "Successfully deleted"
    })
})

module.exports = router;
