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
    return res.json(reviews)

})

module.exports = router;
