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

            ADCore.comm.error(res, err, 500);

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
            ADCore.comm.success(res, regionsFinal);

        })

    },


    /**
     * @function dataForRegion
     *
     * Return a set of account analysis for the Staff in the given
     * region.
     *
     * @return  [ 'RegionTxt1', 'RegionText2', ... 'RegionTextN'];
     */
    dataForRegion: function(req,res){

        var desiredRegion = req.param('region');
        
        
        AD.log('<green>StaffReportNSController.dataForRegion()</green>: region:', desiredRegion);

        var territoryIDs = [];
        var peopleGUIDs = [];

        var analysisResults = null;
        
        async.series([

            // step 1: first find the Territories and get the one(s) that match the given region
            function(next) {

                LegacyStewardwise.regionsFromTerritories()
                .fail(function(err){

                    AD.log.error('... error retrieving regionsFromTerritories(): ',err);
                    next(err);
                })
                .done(function(list){

                    // this is an [] of territories with a .region field
                    // attached.

                    // add each territory_id from entries that match our desired region
                    list.forEach(function(entry){
                        if (desiredRegion == entry.region) {
                            territoryIDs.push(entry.territory_id);
                        }
                    })
                    
                    if (territoryIDs.length > 0) {
                        next();
                    } else {
                        next(new Error('No matches in that region'));
                    }

                })

            },


            // step 2: find all the NSSRen in these territories and gather their guids
            function(next) {
                
                LegacyStewardwise.peopleByGUID({ filter:{territory_id: territoryIDs }})
                .fail(function(err){
                    next(err);
                })
                .done(function(list){

                    list.forEach(function(entry){
                        peopleGUIDs.push(entry.ren_guid);
                    });
                    next();
                })
            },

            // step 3: now call the analysis with these people's guids:
            function(next) {
                
                LegacyStewardwise.accountAnalysisByGUID({ guids: peopleGUIDs })
                .fail(function(err){
                    next(err);
                })
                .done(function(list){
                    analysisResults = list;
                    next();
                })

            }

        ], function(err, results){
            

            if (err) {
                ADCore.comm.error(res, err, 500);
            } else {
                ADCore.comm.success(res, analysisResults);
            }

        })





    },



    ////
    //// OLD Stuff Here:
    ////

    data:  function(req,res){

        if (Log == null) Log = MPDReportGen.Log;

        NSStaffProcessor.compileStaffData(function(err, data){
            if (err) {

                AD.log.error('... error compilingStaffData:', err);
                ADCore.comm.error(res, err, 500);

            } else {
                Log('<green><bold>NS:</bold></green>  data() complete.');
                res.send(data);
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
        
        NSStaffProcessor.compileRegionData(function(err, regionData) {

            if (err) {

                AD.log.error('... error compilingRegionData:', err);
                ADCore.comm.error(res, err, 500);
                return;

            } else {

                var extra = { memo: memo };
                NSStaffProcessor.compileRenderedEmails(templatesDir, regionData, extra, function(err, emails) {

                    if (err) {
                        ADCore.comm.error(res, err, 500);
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
                                    ADCore.comm.success(res, response);
                                }
                            }
                        });
                    }
                });

            } // end if err
        });
    },

    emailSendIndividual: function(req, res) {
        
        if (Log == null) Log = MPDReportGen.Log;
        var logKey = '<green><bold>NS:Individual:</bold></green>';
        Log(logKey + ' ... emailSendIndividual()');
        
        // Optional memo note to be added to each email
        var memo = req.param('memo') || null;
        
        var templatesDir = MPDReportGen.pathTemplates();
        
        NSStaffProcessor.compileStaffData(function(err, data){
        
            if (err) {
                ADCore.comm.error(res, err, 500);
                return;
            
            } else {
                
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
                        })
                    }
                    
                });

            }
        });
    }

};
