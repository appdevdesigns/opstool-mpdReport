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



    /**
     * @function regions
     *
     * Package up a set of region values based upon the Territory
     * info in our LegacyStewardwise system.
     *
     * @return  [ 'RegionTxt1', 'RegionText2', ... 'RegionTextN'];
     */
    regions:  function(req,res){
        // return a list of Territoryies


        if (Log == null) Log = MPDReportGen.Log;

        LegacyStewardwise.regionsFromTerritories()
        .fail(function(err){

            res.AD.error(err, 500);

        })
        .done(function(list){

            // this is an [] of territories with a .region field
            // attached.

            // just get the unique region values out of them
            var regions = {};
            list.forEach(function(entry){
                regions[entry.region] = '.';
            })

            // now convert these to a simple array of regionTexts
            var regionsFinal = [];
            for (var r in regions) regionsFinal.push(r);

            // use our framework success response:
            res.AD.success(regionsFinal);

        })

    },


    /**
     * @function dataForRegion
     *
     * Return a set of account analysis for the Staff in the given
     * region.
     *
     * @return  [ { staff2Obj }, { staff2Obj }, ... ];
     */
    dataForRegion: function(req, res) {
        var region = req.param('region');
        
        NSStaffProcessor.compileStaffData(region)
        .fail(function(err) {
            res.AD.error(err);
        })
        .done(function(results) {
            if (results.staffByRegion[region]) {
                // Reformat into a flat array
                var finalResult = [];
                for (var account in results.staffByRegion[region]) {
                    finalResult.push( results.staffByRegion[region][account] );
                }
                res.AD.success(finalResult);
            } 
            else {
                res.AD.error(new Error('No matches for that region'));
            }
        });
    },
    
    
    emailSend: function(req, res) {

        if (Log == null) Log = MPDReportGen.Log;
        var logKey = '<green><bold>NS:Regional:</bold></green>';
        Log(logKey + ' ... emailSend()');
        
        // Optional memo note to be added to each email
        var memo = req.param('memo') || null;

        var templatesDir = MPDReportGen.pathTemplates();
        
        NSStaffProcessor.compileStaffData()
        .fail(function(err) {
            AD.log.error('... error compilingStaffData:', err);
            res.AD.error(err, 500);
        })
        .done(function(staffData) {

            var extra = { memo: memo };
            var regionData = staffData.staffByRegion;
            NSStaffProcessor.compileRenderedEmails(templatesDir, regionData, extra, function(err, emails) {

                if (err) {
                    res.AD.error(err, 500);
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

                if (emails.length == 0) {
                    res.AD.error(new Error('No reports were generated. Maybe the server config was wrong?'));
                    return;
                }
                
                var numSent = 0;
                var numDone = 0;
                for (var i=0; i<emails.length; i++) {

                    var emailData = emails[i];

                    numSent++;

                    sendIt(emailData, function(err, response) {
                        numDone++;

                        if (err) {
                            res.AD.error(err, 500);
                        } else {

                            // wait until all operations are complete
                            if (numDone >= numSent) {
                                Log(logKey+'<bold> ... sending complete! </bold>');
                                res.AD.success(response);
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
        
        // Optional memo note to be added to each email
        var memo = req.param('memo') || null;
        
        var templatesDir = MPDReportGen.pathTemplates();
        
        NSStaffProcessor.compileStaffData()
        .fail(function(err){
            res.AD.error(err, 500);
            return;
        })
        .done(function(data){            
            var extra = {
                memo: memo
            };
            NSStaffProcessor.compileRenderedIndividualEmails(templatesDir, data, extra, function(err, emails) {
            
                if (err) {
                    res.AD.error(err, 500);
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
                            res.AD.error(err, 500);
                        } else {
                            // wait until all operations are complete
                            if (numDone >= numSent) {
                                Log(logKey+'<bold> ... sending complete!</bold>');
                                res.AD.success(response);
                            }
                        }
                    });
                }
                    
            });

        });
    }

};
