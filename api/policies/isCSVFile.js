/**
 * isCSVFile
 *
 * @module      :: Policy
 * @description :: A policy that verifies a loaded file is a proper csv file
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
var fs = require('fs');

module.exports = function(req, res, next) {

    // The File Upload action will send a file named "file"
    // so look in req.files.file for it.

  if (req.files) {

      if (req.files.file) {

          fs.readFile( req.files.file.path, function(err, data) {

              if (err) {

                  res.send('error reading file', 500);

              } else {
                  data = data + '';
                  if ((data.indexOf(',PeopleSoft') != -1)
                      && (data.indexOf('EASIA2') != -1)) {

                      // this sure looks like a proper CSV file
                      next();

                  } else {
                      res.send('improper csv format', 400);
                  }
              }

          });

      } else {
          res.send('no file attached!', 400);
      }

  } else {
      res.send('no file attached!', 400);
  }
};
