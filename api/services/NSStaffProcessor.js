var path = require('path');
var AD = require('ad-utils');
var async = require('async');

//// NOTE: at loading time, MPDReportGen might not be available yet.
////       so for now set to null and reassign before we use it.
var emailOptions = null;

// How many emails to queue at the same time.
var MAX_CONCURRENT = 5;

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
     *          estimatedBal    : The staff's estimated account balance after current transactions
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
     *          avgExpenditure  : The average amount leaving their account over the past 12 months
     *          avgIncome       : The average amount entering their account over the past 12 months
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
        
        // Fiscal period from 12 months ago YYYYMM
        var fiscalPeriod;
        
        // Staff share the same account when they marry. So we keep track
        // of staff & accounts separately until the final grouping.
        var accounts = {};
        var staff = [];
        
        
        async.series([
            // Fiscal period from 12 months ago
            function(next) {
                LNSSCoreGLTrans.getPastPeriod(12)
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
                        // Combine the base salaries of married couples who 
                        // share the same account number.
                        for (var i=0; i<list.length; i++) {
                            var num = parseInt(list[i].accountNum);
                            accounts[num] = accounts[num] || {};
                            accounts[num].baseSalary = accounts[num].baseSalary || 0;
                            accounts[num].baseSalary += list[i].baseSalary;
                        }
                        
                        // Will be used in further calculations below
                        staff = list;
                        next();
                    }
                });
            },
            
            // Get current transaction totals
            function(next) {
                async.forEachLimit(staff, 1, function(ren, ok) {
                    LNSSRen.currentTransactions({ nssrenID: ren.nssren_id })
                    .fail(next)
                    .done(function(transactions) {
                        var num = parseInt(ren.accountNum);
                        accounts[num] = accounts[num] || {};
                        accounts[num].currentDebit = accounts[num].currentDebit || 0;
                        accounts[num].currentCredit = accounts[num].currentCredit || 0;
                        
                        for (var type in transactions) {
                            for (var i=0; i<transactions[type].length; i++) {
                                accounts[num].currentDebit += transactions[type][i].debit;
                                accounts[num].currentCredit += transactions[type][i].credit;
                            }
                        }
                        ok();
                    });
                }, function(err) {
                    if (err) next(err);
                    else next();
                });
            },
            
            // Get GL average salary info
            function(next) {
                LNSSCoreGLTrans.avgSalary(fiscalPeriod)
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
                LNSSCoreGLTrans.avgMonthlyExpenditure(fiscalPeriod)
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
            
            // Get GL income info
            function(next) {
                LNSSCoreGLTrans.avgMonthlyIncome(fiscalPeriod)
                .fail(next)
                .done(function(results) {
                    for (var accountNum in results) {
                        var num = parseInt(accountNum);
                        accounts[num] = accounts[num] || {};
                        accounts[num].avgIncome = results[accountNum];
                    }
                    next();
                });
            },
            
            // Get GL contribution info
            function(next) {
                LNSSCoreGLTrans.avgLocalContrib(fiscalPeriod)
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
                LNSSCoreGLTrans.avgForeignContrib(fiscalPeriod)
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
                LNSSCoreGLTrans.shortPayPeriods(fiscalPeriod)
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
                // Make an array of the recent 12 periods.
                // Start with the fiscal period from 12 months ago
                var p = String(fiscalPeriod);
                var periods = [];
                // Add on the 12 periods after that
                while (periods.length < 12) {
                    var year = parseInt(p.slice(0, 4));
                    var month = parseInt(p.slice(4, 6));
                    month += 1;
                    if (month > 12) {
                        // Month rollover to 01
                        periods.push( String(year+1) + '01' );
                    } else if (month < 10) {
                        // Single digit month
                        periods.push( String(year) + '0' + String(month) );
                    } else {
                        // Double digit month
                        periods.push( String(year) + String(month) );
                    }
                    p = periods[ periods.length-1 ];
                }
                
                LNSSCoreAccountHistory.balanceForPeriods(periods)
                .fail(next)
                .done(function(results) {
                    for (var accountNum in results) {
                        var num = parseInt(accountNum);
                        var balances = results[accountNum];
                        accounts[num] = accounts[num] || {};
                        accounts[num].monthsInDeficit = 0;
                        
                        accounts[num].deficits = {
                        /*
                            <period>: <balance>,
                            '201505': 12345,
                            ...
                        */
                        };
                        
                        var shortPeriods = accounts[num].shortPayPeriods || [];
                        var periodCount = 0;
                        var total = 0;
                        
                        for (var period in balances) {
                            var thisBalance = balances[period];
                            periodCount += 1;
                            total += thisBalance;
                            
                            // Count number of months in defict
                            var isLowBalance = thisBalance < 10;
                            var isShortPay = shortPeriods.indexOf(period) >= 0;
                            if (isLowBalance || isShortPay) {
                                accounts[num].monthsInDeficit += 1;
                                accounts[num].deficits[ period ] = thisBalance;
                            }
                        }
                        

                        // Compute average monthly balance
                        accounts[num].avgAccountBal = total / periodCount;
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
                            avgIncome: entry.avgIncome,
                            avgExpenditure: entry.avgExpenditure,
                            accountBalance: entry.accountBal
                        });
                        // Calculate estimated current account balance
                        entry.estimatedBal = entry.accountBal
                            + entry.currentCredit
                            - entry.currentDebit;
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
                    if (!compiledData.staffByRegion[region][num] || entry.isPOC) {
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


    
    // @param object regionData
    //     Basic object containing staff data grouped by region
    //     See compileStaffData() .staffByRegion
    // @param object extra
    //     Basic object containing any extra data to be added to the email
    // @return Deferred
    compileRenderedEmails: function(regionData, extra) {
        var dfd = AD.sal.Deferred();
        if (Log == null) Log = MPDReportGen.Log;
        var numEmails = 0;
        
        // Iterate over each region
        // region == regionData[region]
        async.forEachOf(regionData, function(people, region, next) {
            
            EmailNotifications.trigger('mpdreport.ns.region.'+(region.toLowerCase()), {
                variables: {
                    people: people,
                    extra: extra
                },
                to: []
            })
            .fail(function(err){
                Log('Error queueing NS MPD email for region: ' + region);
                next(err);
            })
            .done(function(){
                numEmails += 1;
                Log('Queued NS MPD email for region: ' + region);
                next();
            });

        }, function(err) {
            if (err) dfd.reject(err);
            else dfd.resolve(numEmails);
        });

        return dfd;
    },


    // @param string templatesDir
    // @param object staffData
    //     Basic object containing staff data as generated 
    //     by compileStaffData().
    // @param object extra
    //     Basic object containing any extra data to add to the email
    compileRenderedIndividualEmails: function(staffData, extra) {
        var dfd = AD.sal.Deferred();
        var numEmails = 0;
        if (Log == null) Log = MPDReportGen.Log;
        
        async.eachLimit(staffData.staff, MAX_CONCURRENT, function(person, next) {
            
            EmailNotifications.trigger('mpdreport.ns.individual', {
                variables: {
                    person: person,
                    extra: extra
                },
                to: [ person.email ]
            })
            .fail(function(err){
                //Log('Error queueing NS MPD individual email');
                next(err);
            })
            .done(function(){
                //Log('Queued NS MPD individual email:', person.name);
                numEmails += 1;
                next();
            });
            
        }, function(err) {
            Log('Queued ' + numEmails + ' emails');
            if (err) dfd.reject(err);
            else dfd.resolve(numEmails);
        });

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
        else {
            switch (typeof number) {
                case 'string':
                case 'object':
                    break;
                default:
                    // null, undefined, and NaN
                    number = '-';
                    break;
            }
        }
        entry[field] = number;
    }
};
