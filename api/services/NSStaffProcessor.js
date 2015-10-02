var path = require('path');
var AD = require('ad-utils');


//// Node-Email-Templates:
var emailTemplates = require('email-templates');

//// NOTE: at loading time, MPDReportGen might not be available yet.
////       so for now set to null and reassign before we use it.
var emailOptions = null;

var Log = null;
var LogKey = '<green><bold>NSStaffProcessor:</bold></green>';

module.exports= {


        /**
         *  @function compileStaffData
         *
         *  We are compiling all the relevant information for our MPD reports for 
         *  each of our NSS staff.
         *
         *  When we are done we should have this data in the following format:
         *
         *      compiledData : {
         *          staffByRegion: {
         *              'RegionCode 1' : {
         *                  'accountNum1' : { staff data packet 1 },
         *                  'accountNum2' : { staff data packet 2 },
         *                  ...
         *                  'accountNumN' : { staff data packet N }
         *              },
         *              'RegionCode 2' : {
         *                  'accountNum1' : { staff data packet 1 },
         *                  'accountNum2' : { staff data packet 2 },
         *                  ...
         *                  'accountNumN' : { staff data packet N }
         *              },
         *              ....
         *              'RegionCode M' : {
         *                  'accountNum1' : { staff data packet 1 },
         *                  'accountNum2' : { staff data packet 2 },
         *                  ...
         *                  'accountNumN' : { staff data packet N }
         *              }
         *          },
         *          staff:[
         *              { staff data packet 1 },
         *              { staff data packet 1 },
         *              ...
         *              { staff data packet N*M }
         *          ]
         *      }
         *
         *  Each staff data packet should contain the following information:
         *      {
         *          guid            : The unique global id of this staff,
         *          accountNum      : This staff's account number,
         *          name            : The staff's name =>  "surname, givenname (preferredName)",
         *          baseSalary      : The staff's base monthly salary,
         *          chineseName     : The staff's chinese name
         *          accountBal      : The staff's current account balance 
         *          avgPayroll      : The average of staff's last 12 payroll salaries paid
         *          avgAccountBal   : The average of staff's last 12 account balances
         *          monthsInDeficit : The # months in last 12 months that account balance < 0
         *          avgLocalContrib : The net average change in account (+ or -) from local sources
         *          localPercent    : The % that avgLocalContrib makes up of avg expenditure
         *          avgForeignContrib : The net average change in account (+ or -) from foreign sources
         *          foreignPercent  : The % that avgForeignContrib makes up of avg expenditure
         *          monthsTilDeficit: estimate of how many more months until an account goes negative                       
         *          phone           : The staff's current phone (mobile)
         *          email           : The staff's current secure email address
         *          hris_region     : The staff's region info
         *          avgExpenditure  : The average amount leaving their account over the past 12 months, 
         *      }
         *
         * @param string region
         *      Optional. Compile only staff from this region.
         * @return Deferred
         */
        compileStaffData: function(region) {
            var self = this;
            var region = region || null;
            var dfd = AD.sal.Deferred();
            
            // Final result. See documentation at the top.
            var compiledData = {
                staffByRegion: {},
                staff: []
            };
            
            // Fiscal period from 12 months ago.
            var fiscalPeriod = {/*
                date: "YYYY-MM-DD",
                period: "YYYYMM"
            */};
            
            // Staff share the same account when they marry. So we keep track
            // of staff & accounts separately until the final grouping.
            var accounts = {};
            var staff = [];
            
            
            async.series([
                // Fiscal period from 12 months ago
                function(next) {
                    LegacyStewardwise.fiscalPeriod()
                    .fail(next)
                    .done(function(result) {
                        fiscalPeriod = result;
                        next();
                    });
                },
                
                // Get NS with HRIS info
                function(next) {
                    LNSSRen.staffInfo(region)
                    .fail(next)
                    .done(function(list) {
                        if (!list || !list.length) {
                            next(new Error('No Stewardwise staff found'));
                        }
                        else {
                            staff = list;
                            next();
                        }
                    });
                },
                
                // Get GL average salary info
                function(next) {
                    LNSSCoreGLTrans.avgSalary(fiscalPeriod.period)
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            accounts[num] = accounts[num] || {};
                            accounts[num].avgSalary = results[accountNum];
                        }
                        next();
                    });
                },
                
                // Get GL expenditure info
                function(next) {
                    LNSSCoreGLTrans.avgMonthlyExpenditure(fiscalPeriod.period)
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            accounts[num] = accounts[num] || {};
                            accounts[num].avgExpenditure = results[accountNum];
                        }
                        next();
                    });
                },
                
                // Get GL contribution info
                function(next) {
                    LNSSCoreGLTrans.avgLocalContrib(fiscalPeriod.period)
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            accounts[num] = accounts[num] || {};
                            accounts[num].avgLocalContrib = results[accountNum];
                            accounts[num].localPercent = results[accountNum] / accounts[num].avgExpenditure * 100;
                        }
                        next();
                    });
                },
                function(next) {
                    LNSSCoreGLTrans.avgForeignContrib(fiscalPeriod.period)
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            accounts[num] = accounts[num] || {};
                            accounts[num].avgForeignContrib = results[accountNum];
                            accounts[num].foreignPercent = results[accountNum] / accounts[num].avgExpenditure * 100;
                        }
                        next();
                    });
                },
                
                // Get short pay periods
                // (array of period numbers 1-12 where short pay was taken)
                function(next) {
                    LNSSCoreGLTrans.shortPayPeriods(fiscalPeriod.period)
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            accounts[num].shortPayPeriods = results[accountNum];
                        }
                        next();
                    });
                },
                
                // Get GL account history info.
                // Calculate months in deficit.
                function(next) {
                    LNSSCoreAccountHistory.recent12Balances()
                    .fail(next)
                    .done(function(results) {
                        for (var accountNum in results) {
                            var num = parseInt(accountNum);
                            var balances = results[accountNum];
                            var total = 0;
                            accounts[num] = accounts[num] || {};
                            accounts[num].monthsInDeficit = 0;
                            
                            var deficitPeriods = [];
                            for (var i=0; i<12; i++) {
                                total += balances[i];
                                
                                // Count number of months in defict
                                if (balances[i] < 10) {
                                    deficitPeriods.push( i );
                                    accounts[num].monthsInDeficit += 1;
                                }
                            }
                            
                            // TODO: correlate the deficitPeriods with
                            // the account's shortPayPeriods

                            // Compute average monthly balance
                            accounts[num].avgAccountBal = total / 12;
                        }
                        next();
                    });
                },
                
                // Group staff by region & account num
                // (some staff will be left out due to married couples with 
                // overlapping accounts)
                function(next) {
                    for (var i=0; i<staff.length; i++) {
                        var entry = staff[i];
                        var num = parseInt(entry.accountNum);
                        // Merge account GL info into staff entry
                        if (accounts[num]) {
                            for (var field in accounts[num]) {
                                entry[field] = accounts[num][field];
                            }
                            // Calculate months until deficit
                            entry.monthsTilDeficit = LegacyStewardwise.getMonthsTilDeficit({
                                avgContributions: entry.avgLocalContrib + entry.avgForeignContrib,
                                avgExpenditures: entry.avgExpenditure,
                                accountBalance: entry.accountBal
                            });
                        } else {
                            entry.monthsTilDeficit = 'NA';
                        }
                        
                        // Change numbers into formatted strings
                        formatEntryNumbers( entry );
                        
                        // Flat list of all staff
                        compiledData.staff.push(entry);
                        
                        // Group by region
                        var region = entry.region;
                        compiledData.staffByRegion[region] = compiledData.staffByRegion[region] || {};
                        if (!compiledData.staffByRegion[region][num] || entry.poc) {
                            // Add person if account num is not shared or
                            // if person is family point of contact.
                            compiledData.staffByRegion[region][num] = entry;
                        }
                    }
                    
                    // Sort
                    // (does this have any effect? javascript basic objects do 
                    //  not preserve the order of their elements, especially
                    //  after being transmitted from server to client)
                    for (var region in compiledData.staffByRegion) {
                        compiledData.staffByRegion[region] = self.sortObj(compiledData.staffByRegion[region], 'value');
                    }
                    next();
                }
            
            ], function(err) {
                if (err) {
                    dfd.reject(err);
                } else {
                    dfd.resolve(compiledData);
                }
            });
            
            return dfd;
        },




        sortObj: function(obj, type) {
            var temp_array = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    temp_array.push(key);
                }
            }
            if (typeof type === 'function') {
                temp_array.sort(type);
            } else if (type === 'value') {
                temp_array.sort(function(a,b) {
                    var accountBalA = parseFloat(String(obj[a].accountBal).replace(/\,/g,''));
                    var accountBalB = parseFloat(String(obj[b].accountBal).replace(/\,/g,''));
                    var deficitA = obj[a].monthsTilDeficit;
                    var deficitB = obj[b].monthsTilDeficit;
                    if (obj[a].monthsTilDeficit.toString().indexOf("NA") != -1){
                        deficitA = obj[a].monthsTilDeficit.replace(/\NA/g,'9999999999999999999999');
                    }
                    if (obj[b].monthsTilDeficit.toString().indexOf("NA") != -1){
                        deficitB = obj[b].monthsTilDeficit.replace(/\NA/g,'9999999999999999999999');
                    }
                    //return accountBalA - accountBalB || parseInt(deficitA) - parseInt(deficitB);
                    return parseInt(deficitA) - parseInt(deficitB) || accountBalA - accountBalB;
                });
            } else {
                temp_array.sort();
            }
            var temp_obj = {};
            for (var i=0; i<temp_array.length; i++) {
                temp_obj[temp_array[i]] = obj[temp_array[i]];
            }
            return temp_obj;
        },


        
        // @param string templatesDir
        // @param object regionData
        //     Basic object containing staff data grouped by region
        //     See compileStaffData() .staffByRegion
        // @param object extra
        //     Basic object containing any extra data to be added to the email
        // @param function done
        //     Callback function.
        compileRenderedEmails: function(templatesDir, regionData, extra, done) {
            var dfd = AD.sal.Deferred();

            // load regional email addresses
            var emailDefs = sails.config.opstool_mpdReport.ns.emails;

            if (Log == null) Log = MPDReportGen.Log;

            var renderedEmails = [];

            emailTemplates(templatesDir, function(err, template) {

                if (err) {
                    Log.error(LogKey+' error getting template: ', err);
                    if (done) done(err, null);
                    dfd.reject(err);

                } else {

                    template('nsstaffAccount', true, function(err, renderEmail){

                        if (err) {

                            Log.error(LogKey+' error getting renderer: ', err);
                            if (done) done(err, null);
                            dfd.reject(err);

                        } else {

                            for (var region in regionData) {
                                
                                var emailAddr = emailDefs[region];
                                if (!emailAddr) {
                                    //Log.error(LogKey, 'No email address for region: [' + region + ']');
                                    console.log('No email address for region: [' + region + ']');
                                    continue;
                                }
                                
                                // NOTE: this is NOT asynchronous...
                                var data = {
                                    people: regionData[region],
                                    extra: extra
                                };
                                renderEmail(data, templatesDir, function(err, html, text) {

                                    if (err) {
                                        Log.error(LogKey+' error rendering email:', err);
                                        if (done) done(err, null);
                                        dfd.reject(err);
                                        return;

                                    } else {

                                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsNS };
                                        
                                        // Find the name of the email distribution list to be used in the subject line
                                        var emailName = MPDReportGen.parseAddressForName(emailAddr);

                                        var email = {
                                                from: emailOptions.From(),
                                                to: emailOptions.To(emailAddr),
                                                cc: emailOptions.CC(),
                                                bcc: emailOptions.BCC(),
                                                subject: 'Current: ' + region + ' NS Staff Account Info ('+emailName+')',
                                                html: html,
                                                text: text
                                        };
                                        renderedEmails.push( email );
                                    }
                                });

                            } // next region

                            if (done) done(null, renderedEmails);
                            dfd.resolve(renderedEmails);

                        } // end if err
                    });
                } // end if err
            });

            return dfd;
        },


        // @param string templatesDir
        // @param object staffData
        //     Basic object containing staff data as generated 
        //     by compileStaffData().
        // @param object extra
        //     Basic object containing any extra data to add to the email
        // @param function done
        //     Callback function.
        compileRenderedIndividualEmails: function(templatesDir, staffData, extra, done) {
            var dfd = AD.sal.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            var renderedEmails = {};

            emailTemplates(templatesDir, function(err, template) {

                if (err) {
                    Log.error(LogKey+' error getting template :', err);
                    if (done) done(err, null);
                    dfd.reject(err);

                } else {

                    template('nsstaffIndAccount', true, function(err, renderEmail){

                        if (err) {

                            Log.error(LogKey+' error getting renderer: ', err);
                            if (done) done(err, null);
                            dfd.reject(err);

                        } else {

                            //
                            for (var a=0;a<staffData.staff.length;a++) {
                                
                                // NOTE: this is NOT asynchronous...
                                var data = {
                                    person: staffData.staff[a],
                                    extra: extra
                                };
                                renderEmail(data, templatesDir, function(err, html, text) {

                                    if (err) {
                                        console.log(err);
                                        //Log.error(LogKey+' error rendering email:', err);
                                        if (done) done(err, null);
                                        dfd.reject(err);
                                        return;

                                    } else {

                                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsNS };
                                        
                                        var email = {
                                                from: emailOptions.From(),
                                                to: emailOptions.To(staffData.staff[a].email),
                                                /*
                                                // No copies for individual reports
                                                cc: emailOptions.CC(),
                                                bcc: emailOptions.BCC(),
                                                */
                                                subject:'NS Staff Account Info ('+staffData.staff[a].name+')',
                                                html:html,
                                                text:text
                                        };
                                        renderedEmails[a] = email;
                                    }
                                });


                            } // next region

                            if (done) done(null, renderedEmails);
                            dfd.resolve(renderedEmails);

                        } // end if err
                    })
                } // end if err
            })

            return dfd;
        }

};



/**
 * Convert all the numeric fields in a staff's data entry into formatted 
 * strings.
 * 
 * Conversions are done in place by reference. Nothing is returned.
 *
 * @param object entry
 */
var formatEntryNumbers = function(entry) {
    var percentageFields = {
        'localPercent': true,
        'foreignPercent': true
    };
    
    for (var field in entry) {
        var number = entry[field];
        if (typeof number == 'number' && !isNaN(number)) {
            // Round up to 0 decimal places
            number = number.toFixed(0);
            
            // Add commas
            while (/(\d+)(\d{3})/.test(number.toString())){
                number = number.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
            }
            
            // Add percentage sign
            if (percentageFields[field]) {
                number += '%';
            }
        } 
        else if (typeof number != 'string') {
            // null, undefined, and NaN
            number = '-';
        }
        entry[field] = number;
    }
};
