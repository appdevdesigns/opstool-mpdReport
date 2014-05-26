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


        req.file('csvFile').upload(function (err, files) {
            
            if (err) return res.serverError(err);
            
            //// Format of files:
            /*
            "files": [
                {
                    "size": 467448,
                    "type": "text/csv",
                    "filename": "SAS010_4849319.csv",
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

                    fs.readFile( path.join('.tmp', 'uploads', file.filename) , function(err, data) {
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

//     console.log(sails.config);
        Log(logKey + ' in emailSend()');

        var templatesDir = MPDReportGen.pathTemplates();

        // Generate the Regional Report Data
        USParser.compileEmailData('sas_curr.csv', function(regionData) {

            // Convert data into an array of generated emails
            USParser.compileRenderedEmails(templatesDir, regionData, function(err, emails) {


                if (err) {
               //   res.send('got an error?');
                    Log.error(logKey + ' error rendering emails.', err);
                    ADCore.comm.error(res, err, 500);
                    return;
                }

                AD.log();

                var numDone = 0;
                var isDone = false;   // make sure we only send 1x response
                emails.forEach(function(email){

                    Log(logKey + ' sending email to:'+email.to+'    subj:'+email.subject);

                    Nodemailer.send(email)
                    .fail(function(err){
                        // process error
                        Log.error(logKey + 'error sending email.', err);
                        MPDReportGen.emailDump(email);
                        if (!isDone) {
                            isDone = true;
 //                         res.send({ status:'error', data:err });
                            ADCore.comm.error(res, err, 500);
                        }
                    })
                    .then(function(response){

                        numDone++;
                        if(!isDone) {
                            if (numDone >= emails.length) {
 //                             res.send(response); 
                                Log(logKey + '<green><bold> ... sending emails complete!</bold></green>');
                                ADCore.comm.success(res, response);
                            }
                        }
                    });

                });

            });
        })
    }

};


