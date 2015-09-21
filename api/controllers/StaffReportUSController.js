/**
 * StaffReportUSController
 *
 * @module		:: Controller
 * @description	:: Contains logic for handling requests.
 */
var fs = require('fs');
var path = require('path');
//var $ = require('jquery');

var AD = require('ad-utils');

var Log = null;


module.exports = {

    uploadFile: function (req, res) {

        if (Log == null) Log = MPDReportGen.Log;

        var logKey = '<green><bold>US:Regional:</bold></green>';
      
        Log(logKey+'... in uploadFile()');


        // using skipper for file uploads now:
        req.file('csvFile').upload(function (err, files) {
            
            if (err) return res.serverError(err);
            
            //// Format of files:
            /*
            "files": [
                {
                    "fd": "/full/path/to/root/.tmp/uploads/tempFilename.csv",
                    "size": 467496,
                    "type": "text/csv",
                    "filename": "sas_curr.csv",
                    "status": "bufferingOrWriting",
                    "field": "csvFile"
                }
            ]
            */

            // if no file uploaded:
            if (files.length == 0) {

                Log.error(logKey+' no file provided: ', files );
                var msg = new Error('no file provided!');
                ADCore.comm.error(res, msg, 400);

            } else {

                //// NOTE: we are really only expecting 1 .csv file to be uploaded.
                //// if > 1 file appears, we simply use the last one ...
                files.forEach(function(file) {
                    fs.readFile( file.fd , function(err, data) {
                        if (err) {

                            Log.error(logKey+' error reading uploaded file:', err );
                            ADCore.comm.error(res, err, 500);

                        } else {

                            var filePath = path.join(process.cwd(), 'data', 'opstool-mpdReport',  'sas_curr.csv');
                            fs.writeFile(filePath, data, function(err){
                                if (err) {

                                    Log.error(logKey+' error writing upload file to directory:'+filePath, err);
                                    ADCore.comm.error(res, err, 500);

                                } else {
                                    Log(logKey+' -> file successfully stored at: '+filePath);
                                    ADCore.comm.success(res, {ok:true});
                                }
                            })
                        }
                    })

                });

            } // end if file.length==0  - else



        });

    },



    data: function(req, res) {

        if (Log == null) Log = MPDReportGen.Log;  

        Log(' in data()');

        USParser.compileStaffData('sas_curr.csv', function(data) {
            res.send(data);
        })
    },



    emailSend: function(req, res) {

        if (Log == null) Log = MPDReportGen.Log;
        var logKey = '<green><bold>US:Regional:</bold></green>';

        var templatesDir = MPDReportGen.pathTemplates();
        var memo = req.param('memo') || null;
        var extra = { memo: memo };

        // Generate the Regional Report Data
        USParser.compileEmailData('sas_curr.csv', function(regionData) {
            
            // Convert data into an array of generated emails
            USParser.compileRenderedEmails(templatesDir, regionData, extra, function(err, emails) {

                if (err) {
                    Log.error(logKey + ' error rendering emails.', err);
                    res.AD.error(err, 500);
                    return;
                }

                AD.log(logKey + 'Sending ' + emails.length + ' emails...');
                
                // Process up to 5 emails concurrently
                async.eachLimit(emails, 5, function(email, next) {
                    Log(logKey + ' sending email to:'+email.to+'    subj:'+email.subject);

                    Nodemailer.send(email)
                    .fail(function(err){
                        Log.error(logKey + 'error sending email.', err);
                        MPDReportGen.emailDump(email);
                        next(err);
                    })
                    .then(function(response){
                        next();
                    });
                    
                }, function(err) {
                    if (err) {
                        res.AD.error(err, 500);
                    } else {
                        Log(logKey + '<green><bold> ... sending emails complete!</bold></green>');
                        res.AD.success({});
                    }
                });

            });
        })
    }

};


