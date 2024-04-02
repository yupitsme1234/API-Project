const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Booking, Spot } = require('../../db/models');


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
        booking.dataValues.Spot = spot;
        const spotImage = await SpotImage.findOne({
            where: {
                spotId: spot.id,
                preview: true
            }
        })
        if (spotImage){
            booking.dataValues.Spot.previewImage = spotImage.url;
        } else{
            booking.dataValues.Spot.previewImage = null;
        }
    }

    return res.json({
        "Bookings": [
            ...bookings]
    })
});

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
     if (Date.parse(endDate) < Date.parse(currentDate)) {
        res.statusCode = 403;
        return res.json({
            "message": "Past bookings can't be modified"
        })
    };

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
    }



    // Error response: Booking conflict
    let bookings = await Booking.findAll({
        where: {
            spotId: updatedBooking.spotId
        }
    });
    let error = false;

    if (startDate === endDate) error = true;
    for (let booking of bookings) {
        if (Number(booking.id) === Number(bookingId)) continue
        if (Date.parse(booking.endDate) >= Date.parse(endDate) && Date.parse(booking.startDate) <= Date.parse(startDate)) {
            error = true;
        } else if (Date.parse(startDate) <= Date.parse(booking.startDate) && Date.parse(booking.startDate) <= Date.parse(endDate)) {
            error = true
        } else if (Date.parse(startDate) <= Date.parse(booking.endDate) && Date.parse(booking.endDate) <= Date.parse(endDate)) {
            error = true;
        } else if (Date.parse(startDate) === Date.parse(booking.startDate)) error = true
    }
    if (error) {
        res.statusCode = 403;
        return res.json({
            "message": "Sorry, this spot is already booked for the specified dates",
            "errors": {
                "startDate": "Start date conflicts with an existing booking",
                "endDate": "End date conflicts with an existing booking"
            }
        })
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
