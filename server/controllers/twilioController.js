const twilio = require('twilio');
const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = process.env;

const client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET);

exports.generateToken = (req, res) => {
    const { userId, room } = req.body; // Expecting userId and room (consultationId)
    const token = new twilio.jwt.AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET);
    
    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
        room: room,
    });
    
    token.addGrant(videoGrant);
    token.identity = userId;

    res.send({ token: token.toJwt() });
};
