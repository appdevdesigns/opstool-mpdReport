/**
 * StaffReportNSController
 *
 * @module      :: Controller
 * @description :: Contains logic for handling requests.
 */
var path = require('path');
var AD = require('ad-utils');

var Log = null;

module.exports = {

    data:  function(req,res){

        if (Log == null) Log = MPDReportGen.Log;

        NSStaffProcessor.compileStaffData(function(data){
            Log('<green><bold>NS:</bold></green>  data() complete.');
            res.send(data);
        });
    },

    emailSend: function(req, res) {

        if (Log == null) Log = MPDReportGen.Log;

        var logKey = '<green><bold>NS:Regional:</bold></green>';

        Log(logKey + ' ... emailSend()');

//console.log(sails.config);

        var templatesDir = MPDReportGen.pathTemplates(); //path.join(sails.config.appPath, 'data', 'templates_email');

        NSStaffProcessor.compileEmailData(function(regionData) {

            NSStaffProcessor.compileRenderedEmails(templatesDir, regionData, function(err, emails) {

                if (err) {
                    ADCore.comm.error(res, err, 500);
 //                   res.send('got an error?');
                    return;
                }
              
                // local sender ... waits for deferreds ...
                var sendIt = function(email, done) {

                    Log(logKey + ' ... sending email to:'+email.to+'    subj:'+email.subject);

                    Nodemailer.send(email)
                    .fail(function(err){
                        Log.error(logKey+' ... error sending email:', err);
                        MPDReportGen.emailDump(email);
                        done(err, null);
                    }).then(function(response){
                        done(null, response);
                    });
                };

                var numSent = 0;
                var numDone = 0;
                for (var emailAddr in emails) {

                    var emailData = emails[emailAddr];
//console.log('Controller:: sending to email:'+emailAddr);

                    numSent++;

                    sendIt(emailData, function(err, response) {
                        numDone++;

                        if (err) {
 //                           console.log(err);
                        } else {

                            // wait until all operations are complete
                            if (numDone >= numSent) {
                                Log(logKey+'<bold> ... sending complete! </bold>');
                                ADCore.comm.success(res, response);
 //                               res.send(response);
                            }
                        }
                    });
                }
            });
        });
    },

    emailSendIndividual: function(req, res) {
        
        if (Log == null) Log = MPDReportGen.Log;

        var logKey = '<green><bold>NS:Individual:</bold></green>';

        Log(logKey + ' ... emailSendIndividual()');
        
//Log(sails.config);

        var templatesDir = MPDReportGen.pathTemplates(); //path.join(sails.config.appPath, 'data', 'templates_email');

        NSStaffProcessor.compileStaffData(function(data){
            NSStaffProcessor.compileRenderedIndividualEmails(templatesDir,data, function(err, emails) {


                if (err) {
                    ADCore.comm.error(res, err, 500);
//                    res.send('got an error?');
                    return;
                }


                // local sender ... waits for deferreds ...
                var sendIt = function(email, done) {

                    Nodemailer.send(email)
                    .fail(function(err){
                        Log.error(logKey + ' ... sending email failed:', err);
                        MPDReportGen.emailDump(email);
                        done(err, null);
                    })
                    .then(function(response){
                        done(null, response);
                    });
                }


                var numSent = 0;
                var numDone = 0;
                for (var emailAddr in emails) {

                    var emailData = emails[emailAddr];
                    
                    Log(logKey + ' ... sending to email:'+emailAddr);

                    numSent++;

                    sendIt(emailData, function(err, response){

                        numDone++;

                        if (err) {
 //                           Log.error(err);
                        } else {

                            // wait until all operations are complete
                            if (numDone >= numSent) {

                                Log(logKey+'<bold> ... sending complete!</bold>');
                                ADCore.comm.success(res, response);
 //                               res.send(response);
                            }
                        }
                    })
                }

            });
        });
    }

};
