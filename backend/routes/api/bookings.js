const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Booking } = require('../../db/models');


// Get all of the Current User's Bookings

router.get('/current', /*requireAuth,*/ async (req, res, next) => {
    const bookings = await Booking.findAll({
        where: {
            id: req.user.id
        }
    });
    return res.json(bookings)
});



module.exports = router;
