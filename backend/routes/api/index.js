const sessionRouter = require('./session.js');
const usersRouter = require('./users.js');
const spotsRouter = require('./spots.js');
const reviewsRouter = require('./reviews.js');
const bookingsRouter = require('./bookings.js')

const { restoreUser } = require("../../utils/auth.js");
// backend/routes/api/index.js
const router = require('express').Router();
router.post('/test', function (req, res) {
    res.json({ requestBody: req.body });
});
// GET /api/set-token-cookie
const { setTokenCookie } = require('../../utils/auth.js');
const { User } = require('../../db/models');
const { Review } = require('../../db/models');
router.get('/set-token-cookie', async (_req, res) => {
    const user = await User.findOne({
        where: {
            username: 'Demo-lition'
        }
    });
    setTokenCookie(res, user);
    return res.json({ user: user });
});

// GET /api/restore-user
router.use(restoreUser);

router.get(
    '/restore-user',
    (req, res) => {
        return res.json(req.user);
    }
);

// GET /api/require-auth
const { requireAuth } = require('../../utils/auth.js');
router.get(
    '/require-auth',
    requireAuth,
    (req, res) => {
        return res.json(req.user);
    }
);

// SPOTS router
router.use('/spots', spotsRouter)

// REVIEWS Router
router.use('/reviews', reviewsRouter);

// BOOKINGS Router
router.use('/bookings', bookingsRouter);

// *****************************************
//
//                  IMAGES
//
// *****************************************
const { SpotImage, ReviewImage } = require('../../db/models');

// Delete a Spot Image
router.delete('/spot-images/:imageId', requireAuth, async (req, res, next) => {
    const { imageId } = req.params;

    const deletedImage = await SpotImage.findByPk(imageId);

    if (!deletedImage) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot Image couldn't be found"
        })
    }
    const spot = await Spot.findOne({
        where: {
            spotId: deletedImage.spotId
        }
    })

    if (spot.ownerId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };


    await deletedImage.destroy();
    return res.json({
        "message": "Successfully deleted"
    });





});


// Delete a Review Image
router.delete('/review-images/:imageId', requireAuth, async (req, res, next) => {
    const { imageId } = req.params;
    const deletedImage = await ReviewImage.findByPk(imageId);
    if (!deletedImage) {
        res.statusCode = 404;
        return res.json({
            "message": "Spot Image couldn't be found"
        })
    }
    const review = await Review.findByPk(deletedImage.reviewId)

    if (review.userId !== req.user.id) {
        res.statusCode = 403;
        return res.json({
            "message": "Forbidden"
        })
    };

    await deletedImage.destroy();
    return res.json({
        "message": "Successfully deleted"
    })
})



router.use('/session', sessionRouter);

router.use('/users', usersRouter);

router.post('/test', (req, res) => {
    res.json({ requestBody: req.body });
});
module.exports = router;
