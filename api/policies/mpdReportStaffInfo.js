var AD = require('ad-utils');

module.exports = function(req, res, next) {
    
    // viewerGUID from CAS auth
    var guid = req.user.GUID();
    
    Promise.resolve()
    .then(() => {
        return LNSSRen.findByViewerGUID({ viewerGUID: guid });
    })
    .then((result) => {
        if (result && result[0]) {
            req.stewardwise = req.stewardwise || {};
            req.stewardwise.nssren = result[0];
            next();
        }
        else {
            res.status(404);
            res.send('Staff data not found');
        }
    })
    .catch((err) => {
        res.serverError(err);
    });
    
};