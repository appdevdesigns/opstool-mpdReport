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

        LegacyStewardwise.regionsFromTerritories({ 
            territory_subaccount: { 
                not: '' 
            }
        })
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
            regionsFinal.sort();
            
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
     * If the region is given in the format of C### then it will be 
     * treated as a territory code instead.
     *
     * @return  [ { staff2Obj }, { staff2Obj }, ... ];
     */
    dataForRegion: function(req, res) {
        var region = req.param('region') || null;
        
        NSStaffProcessor.compileStaffData(region)
        .fail(function(err) {
            res.AD.error(err);
        })
        .done(function(results) {
            var list;
            if (region) {
                // Filter by region
                list = results.staffByRegion[region] || {};
            } else {
                // No region requested, so return all staff
                list = results.staffByAccount || {};
            }
            
            // Reformat into a flat array
            var finalResult = [];
            for (var account in list) {
                // Exclude staff with a special designated recipient for their report
                if (!list[account].mpdReportRecipient) {
                    finalResult.push( list[account] );
                }
            }
            res.AD.success(finalResult);
        });
    },
    
    
    
    /**
     * View the output of a regional report without actually sending
     */
    emailPreview: function(req, res) {
        
        var region = req.param('region') || 'all';
        
        if (Log == null) Log = MPDReportGen.Log;
        var logKey = '<green><bold>NS:Regional (' + region + '):</bold></green>';
        Log(logKey + ' ... emailPreview()');
        
        // Optional memo note to be added to the email
        var memo = req.param('memo') || null;

        NSStaffProcessor.compileStaffData(region)
        .fail(function(err) {
            AD.log.error('... error compilingStaffData:', err);
            res.AD.error(err, 500);
        })
        .done(function(staffData) {
            
            var extra = { memo: memo };
            var staff = staffData.staff;
            
            // Exclude staff with a special designated recipient for their report
            for (var i=staff.length-1; i>=0; i--) {
                if (staff[i].mpdReportRecipient) {
                    staff.splice(i, 1);
                }
            }
            // sort by account balance.
            staff.sort(function(a, b) {
                var numericA = Number(a.estimatedBal.replace(',', ''));
                var numericB = Number(b.estimatedBal.replace(',', ''));
                return numericA - numericB;
            });
            
            EmailNotifications.previewTrigger('mpdreport.ns.region.'+(region.toLowerCase()), {
                variables: {
                    people: staff,
                    region: region,
                    extra: extra
                }
            })
            .fail(function(err) {
                res.AD.error(err, 500);
            })
            .done(function(output) {
                Log(logKey+'<bold> ... preview complete! </bold>');
                // Send HTML output
                res.send(output);
            });

        });
    },
    
    
    
    emailSend: function(req, res) {

        if (Log == null) Log = MPDReportGen.Log;
        var logKey = '<green><bold>NS:Regional:</bold></green>';
        Log(logKey + ' ... emailSend()');
        
        // Optional memo note to be added to each email
        var memo = req.param('memo') || null;
        
        // Can optionally limit to just one specified region
        var regionFilter = req.param('region') || null;
        
        NSStaffProcessor.compileStaffData()
        .fail(function(err) {
            AD.log.error('... error compilingStaffData:', err);
            res.AD.error(err, 500);
        })
        .done(function(staffData) {
            
            var extra = { memo: memo };
            // Staff grouped by region
            var regionData = staffData.staffByRegion;
            // plus an additional group with all staff
            regionData['all'] = staffData.staffByAccount;
            
            // If a specific region was requested, drop all the others
            if (regionFilter) {
                for (var r in regionData) {
                    if (r != regionFilter) {
                        delete regionData[r];
                    }
                }
            }
            
            NSStaffProcessor.compileRenderedEmails(regionData, extra)
            .fail(function(err) {
                res.AD.error(err, 500);
            })
            .done(function(numEmails) {
                if (numEmails == 0) {
                    res.AD.error(new Error('No reports were generated. Maybe the server config was wrong?'));
                    return;
                }
                Log(logKey+'<bold> ... sending complete! </bold>');
                res.AD.success({});
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
            NSStaffProcessor.compileRenderedIndividualEmails(data, extra)
            .fail(function(err) {
                res.AD.error(err, 500);
            })
            .done(function(numEmails) {
                Log(logKey+'<bold> ... sending complete!</bold>');
                res.AD.success({});
            });

        });
    },
    
    
    /**
     * GET /opstool-mpdReport/StaffReportNS/incomeAndExpenditure?account=:account
     */
    incomeAndExpenditure: function(req, res) {
        
        var results = [];
        var period; // fiscal period from 12 months ago
        var account = req.param('account') || '';
        
        async.series([
            function(next) {
                // Find the starting fiscal period
                LNSSCoreGLTrans.getPastPeriod(12)
                .fail(next)
                .done(function(data) {
                    period = data;
                    next();
                });
            },
            
            function(next) {
                LNSSCoreGLTrans.monthlyIncomeExpenditure(period, account)
                .fail(next)
                .done(function(data) {
                    results = data;
                    next();
                });
            }
        
        ], function(err) {
            if (err) {
                res.AD.error(err);
            } else {
                res.AD.success(results);
            }
        });
        
    }

};
