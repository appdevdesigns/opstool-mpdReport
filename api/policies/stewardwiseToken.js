var AD = require('ad-utils');

module.exports = function(req, res, next) {
    
    // Stewardwise token passed in through querystring
    var token = req.param('token');
    
    Promise.resolve()
    .then(() => {
        return LNSSRen.findByToken(token);
    })
    .then((result) => {
        if (result && result[0]) {
            req.stewardwise = req.stewardwise || {};
            req.stewardwise.nssren = result[0];
            next();
        }
        else res.forbidden();
    })
    .catch((err) => {
        res.serverError(err);
    });
};