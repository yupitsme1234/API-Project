const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Review, ReviewImage } = require('../../db/models');

// Get all reviews of current user
router.get('/current', requireAuth, async (req, res, next) => {
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

// Add an Image to a Review based on the Review's id
router.post('/:reviewId/images', /*requireAuth, */ async (req, res, next) => {
    const { reviewId } = req.params;
    const review = await Review.findByPk(reviewId);
    const { url } = req.body;

    if (!review) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    };

    const reviewImages = await ReviewImage.findAll({
        where: {
            reviewId
        }
    });

    if (Object.keys(reviewImages).length > 10) {
        res.statusCode = 403;
        return res.json({
            "message": "Maximum number of images for this resource was reached"
        });
    };

    const newImage = await ReviewImage.create({ reviewId, url })
    return res.json(newImage)

})

// Edit a Review

router.patch('./:reviewId',/*requireAuth, */ async (req, res, next) => {
    const { reviewId } = req.params;
    const updatedReview = await Review.findByPk(reviewId);

    // Couldn't find a Review with the specified id
    if (!updatedReview) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    }

    try {
        updatedReview.set(req.body);
        await updatedReview.save();
        return res.json(updatedReview)
    } catch {
        res.statusCode = 400;
        return res.json({
            "message": "Bad Request", // (or "Validation error" if generated by Sequelize),
            "errors": {
                "review": "Review text is required",
                "stars": "Stars must be an integer from 1 to 5",
            }
        })
    }


})
// Delete a Review
router.delete(':reviewId',/*requireAuth, */ async (req, res, next) => {
    const { reviewId } = req.params;
    const deletedReview = await Review.findByPk(reviewId);

    if (!deletedReview) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    };
    return res.json({
        "message": "Successfully deleted"
    })
})


module.exports = router;
