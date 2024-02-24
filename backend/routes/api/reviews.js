const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Review } = require('../../db/models');

// Get all reviews of current user
router.get('/current', async (req, res, next) => {
    const reviews = await Review.findAll({
        where: {
            userId: req.user.id
        }
    })

    if (!reviews.length) {
        res.statusCode = 404;
        return res.json({
            "message": "User has no spots"
        })
    }
    return res.json(reviews)

});

// Get all Reviews by a Spot's id -- found in spots.js
// Create a Review for a Spot based on the Spot's id -- found in spots.js



module.exports = router;
