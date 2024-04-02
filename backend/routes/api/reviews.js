const express = require('express');
const bcrypt = require('bcryptjs');

const router = require('express').Router();

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { Review, ReviewImage, User, Spot, SpotImage } = require('../../db/models');

// Get all reviews of current user
router.get('/current', requireAuth, async (req, res, next) => {
    const userId = req.user.id;
    const reviews = await Review.findAll({
        where: {
            userId
        }
    });
    if (!reviews.length) {
        res.statusCode = 404;
        return res.json({
            "message": "User has no spots"
        })
    }


    const user = await User.findByPk(userId);
    for (let review of reviews) {
        review.dataValues.User = user;

        const spot = await Spot.findOne({
            where: {
                id: review.spotId
            },
            attributes: { exclude: ['description','createdAt', 'updatedAt'] }
        });

        const spotImage = await SpotImage.findOne({
            where: {
                spotId: spot.id,
                preview: true
            }
        })
        if (spotImage){
            spot.previewImage = spotImage.url;
        } else{
            spot.previewImage = null;
        }

        review.dataValues.Spot = spot;

        const reviewImages = await ReviewImage.findAll({
            where: {
                reviewId: review.id
            },
            attributes: { exclude: ['reviewId', 'createdAt', 'updatedAt'] }
        });

        review.dataValues.ReviewImages = reviewImages

    };


    return res.json({
        "Reviews": [
            ...reviews,
        ]
    })

});

// Get all Reviews by a Spot's id -- found in spots.js
// Create a Review for a Spot based on the Spot's id -- found in spots.js

// Add an Image to a Review based on the Review's id
router.post('/:reviewId/images', requireAuth, async (req, res, next) => {
    const { reviewId } = req.params;
    const review = await Review.findByPk(reviewId);
    const { url } = req.body;

    if (!review) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    };

    if (review.userId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
            ;
    }

    const reviewImages = await ReviewImage.findAll({
        where: {
            reviewId
        }
    });

    if (Object.keys(reviewImages).length > 9) {
        res.statusCode = 403;
        return res.json({
            "message": "Maximum number of images for this resource was reached"
        });
    };

    const newImage = await ReviewImage.create({ reviewId, url })

    return res.json({
        "id": newImage.id,
        url
    })

})

// Edit a Review

router.put('/:reviewId', requireAuth, async (req, res, next) => {
    const { reviewId } = req.params;
    const updatedReview = await Review.findByPk(Number(reviewId));

    // Couldn't find a Review with the specified id
    if (!updatedReview) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    }

    if (updatedReview.userId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };
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
router.delete('/:reviewId', requireAuth, async (req, res, next) => {
    const { reviewId } = req.params;
    const deletedReview = await Review.findByPk(reviewId);

    if (!deletedReview) {
        res.statusCode = 404;
        return res.json({
            "message": "Review couldn't be found"
        })
    };
    if (deletedReview.userId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };
    await deletedReview.destroy()
    return res.json({
        "message": "Successfully deleted"
    })
})


module.exports = router;
