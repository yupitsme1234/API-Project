const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Booking, Spot } = require('../../db/models');


// Get all of the Current User's Bookings

router.get('/current', /*requireAuth,*/ async (req, res, next) => {
    const bookings = await Booking.findAll({
        where: {
            id: req.user.id
        }
    });
    return res.json(bookings)
});

// Edit a Booking
router.patch('/:bookingId', /*requireAuth,*/ async (req, res, next) => {
    const { bookingId } = req.params;
    const updatedBooking = await Booking.findByPk(bookingId);
    const currentDate = new Date();

    if (!booking) {
        res.statusCode = 404;
        return res.json({
            "message": "Booking couldn't be found"
        })

    };

    // Require proper authorization: Booking must belong to the current user
    if (booking.userId !== req.user.id) {
        throw new Error("Booking does not belong to user");
    }

    // Error response: Body validation errors
    if (startDate.toString() < currentDate.toString() || startDate.toString() > endDate.toString()) {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "startDate": "startDate cannot be in the past",
                "endDate": "endDate cannot be on or before startDate"
            }
        });
    }

    // Error response: Can't edit a booking that's past the end date
    if (endDate.toString() < currentDate.toString()) {
        res.statusCode = 403;
        return res.json({
            "message": "Past bookings can't be modified"
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


    updatedBooking.set(req.body);
    await updatedBooking.save();
    return res.json(updatedBooking);
});

// Delete a booking
router.delete('/:bookingId', /*requireAuth,*/ async (req, res, next) => {
    const { bookingId } = req.params;
    const booking = await Booking.findByPk(bookingId);
    const spot = await Spot.findByPk(booking.spotId);
    const currentDate = new Date();

    if (booking.userId !== req.user.id && spot.ownerId !== req.user.id) {
        throw new Error("Only Owners or Bookers can delete a booking")
    };

    if (!booking) {
        res.statusCode = 404;
        return res.json({
            "message": "Booking couldn't be found"
        })
    };

    if (booking.startDate.toString() < currentDate.toString()) {
        res.statusCode = 403;
        return res.json({
            "message": "Bookings that have been started can't be deleted"
        });
    }
})

module.exports = router;
