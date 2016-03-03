/**
 * StaffReportUSController
 *
 * @module		:: Controller
 * @description	:: Contains logic for handling requests.
 */
var fs = require('fs');
var path = require('path');
//var $ = require('jquery');

var async = require('async');
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
        
        var numEmails = 0;

        // Generate the Regional Report Data
        USParser.compileStaffData('sas_curr.csv', function(data) {
            
            var regionData = data.staffByRegion;
            if (data.missing) {
                regionData.missing = data.missing;
            }
            
            // Send reports for each region
            async.forEachOfLimit(regionData, 5, function(people, region, next) {
            
                // Convert `people` object into an array
                var list = [];
                for (var num in people) {
                    list.push(people[num]);
                }
                
                if (list.length == 0) return next();
                
                // Sort by account balance
                list.sort(function(a, b) {
                    var valueA = a.accountBal;
                    var valueB = b.accountBal;
                    if (typeof valueA == 'string') {
                        valueA = Number(valueA.replace(',', ''));
                    }
                    if (typeof valueB == 'string') {
                        valueB = Number(valueB.replace(',', ''));
                    }
                    return valueA - valueB;
                });
                
                EmailNotifications.trigger('mpdreport.us.region.'+(region.toLowerCase()), {
                    variables: {
                        people: list,
                        extra: extra
                    },
                    to: []
                })
                .fail(function(err){
                    Log('Error queueing US MPD email for region: ' + region);
                    Log(err);
                    
                    next();
                })
                .done(function(){
                    numEmails += 1;
                    Log('Queued US MPD email for region: ' + region);
                    next();
                });
    
            }, function(err) {
                if (err) {
                    res.AD.error(err, 500);
                }
                else {
                    res.AD.success({ emailsSent: numEmails });
                }
            });
            
        });
    },
    
    
    
    emailPreview: function(req, res) {
        
        var region = req.param('region') || 'missing';
        var memo = req.param('memo') || null;
        var extra = { memo: memo };

        // Generate the Regional Report Data
        USParser.compileStaffData('sas_curr.csv', function(data) {
            
            // Use only the requested region
            var people = {};
            if (region == 'missing') {
                people = data.missing;
            } else {
                people = data.staffByRegion[region];
            }
            
            // Convert `people` object into an array
            var list = [];
            for (var num in people) {
                list.push(people[num]);
            }
            
            // Sort by account balance
            list.sort(function(a, b) {
                var valueA = a.accountBal;
                var valueB = b.accountBal;
                if (typeof valueA == 'string') {
                    valueA = Number(valueA.replace(',', ''));
                }
                if (typeof valueB == 'string') {
                    valueB = Number(valueB.replace(',', ''));
                }
                return valueA - valueB;
            });
            
            EmailNotifications.previewTrigger('mpdreport.us.region.'+(region.toLowerCase()), {
                variables: {
                    people: list,
                    extra: extra
                },
                to: []
            })
            .fail(function(err){
                res.AD.error(err, 500);
            })
            .done(function(output){
                res.send(output);
            });
            
        });
    }

};


