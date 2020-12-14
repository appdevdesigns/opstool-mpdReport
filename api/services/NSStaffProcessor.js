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
     *          staffByAccount: {
     *              'accountNum1': { staff data packet 1 },
     *              'accountNum2': { staff data packet 2 },
     *              ...
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
     *          mpdGoal         : The family MPD goal amount from HRIS
     *          monthsOfNeed    :
     *          percentOfNeed   :
     *      }
     *
     * @param string region
     *      Optional. Compile only staff from this region.
     *      If region is given in the format of C### then it will be understood as a
     *      territory GL code instead.
     *      If the region is given in the format of Q#-### then it will be understood
     *      as a 2020 territory description code instead.
     * @return Deferred
     */
    compileStaffData: function(region) {
        var self = this;
        var dfd = AD.sal.Deferred();
        var region = region || null;
        var usingTerritoryCode = false;
        var usingTerritoryDesc = false;
        
        // Is region actually a territory code?
        if (region && region.match(/^C\d\d\d$/)) {
            usingTerritoryCode = true;
        }
        else if (region && region.match(/^Q\w-\d\d\d/)) {
            usingTerritoryDesc = true;
        }
        
        // Final result. See documentation at the top.
        var compiledData = {
            staffByRegion: {},
            staffByAccount: {},
            staff: []
        };
        
        // Fiscal period from 12 months ago YYYYMM
        var fiscalPeriod;
        
        // Staff share the same account when they marry. So we keep track
        // of staff & accounts separately until the final grouping.
        var accounts = {};
        var staff = [];
        
        var combine = function(str1, str2) {
            str1 = str1 || '';
            str2 = str2 || '';
            if (str1 == str2) {
                return str1;
            }
            else if (str1.length && str2.length) {
                return str1 + ', ' + str2;
            } 
            else {
                // One of the strings was empty. Don't use the comma.
                return str1 + str2;
            }
        }
        
        
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
                var options = { regionCode: region };
                if (usingTerritoryCode) {
                    // Special case where we match against a territory instead of a region
                    options = { territoryCode: region };
                }
                else if (usingTerritoryDesc) {
                    options = { territoryDesc: region };
                }
                
                LNSSRen.staffInfo(options)
                .fail(next)
                .done(function(list) {
                    if (!list || !list.length) {
                        next(new Error('No Stewardwise staff found'));
                    }
                    else {
                        // Combine info of married couples who share the same
                        // account number.
                        for (var i=0; i<list.length; i++) {
                            // accounts{} is indexed by primary account number
                            var num = list[i].accountNum;
                            accounts[num] = accounts[num] || {};
                            
                            // Sum their base salaries
                            accounts[num].baseSalary = accounts[num].baseSalary || 0;
                            accounts[num].baseSalary += list[i].baseSalary;
                            
                            // Concatenate their names & contact info
                            var fields = ['name', 'chineseName', 'phone', 'email'];
                            fields.forEach(function(field) {
                                accounts[num][field] = accounts[num][field] || '';
                                if (list[i].isPOC) {
                                    // POC info goes in front
                                    accounts[num][field] = combine(list[i][field], accounts[num][field]);
                                } else {
                                    accounts[num][field] = combine(accounts[num][field], list[i][field]);
                                }
                            });
                            
                            // Use the earlier of the dates when they joined
                            accounts[num].periodJoined = accounts[num].periodJoined || '999999';
                            accounts[num].periodJoined = String(Math.min(
                                accounts[num].periodJoined, 
                                list[i].periodJoined
                            ));
                            
                            // Period offset for staff who have joined within
                            // the past 12 months.
                            accounts[num].months = 12;
                            if (accounts[num].periodJoined > fiscalPeriod) {
                                var offset = LNSSCoreGLTrans.periodDiff(
                                    accounts[num].periodJoined, fiscalPeriod
                                );
                                accounts[num].months = Math.max(1, 12 - offset);
                            }
                            
                            // Set of alt account numbers
                            accounts[num].altAccounts = accounts[num].altAccounts || [];
                            list[i].allAccountNums.forEach((altNum) => {
                                //if (altNum == num) return;
                                if (accounts[num].altAccounts.indexOf(altNum) < 0) {
                                    accounts[num].altAccounts.push(altNum);
                                }
                            });
                        }
                        
                        // Will be used in further calculations below
                        staff = list;
                        next();
                    }
                });
            },
            
            // Get current (not yet in GL) transaction totals
            function(next) {
                var start = new Date();
                async.forEachLimit(staff, 1, function(ren, ok) {
                    LNSSRen.currentTransactions({ nssrenID: ren.nssren_id })
                    .fail(next)
                    .done(function(transactions) {
                        var num = ren.accountNum;
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
                    /*
                    var end = new Date();
                    console.log(
                        'Time taken to get estimated balances' 
                        + ' (' + region + '): '
                        + (end - start) + 'ms'
                    );
                    */
                });
            },
            
            // Salary, income, expenses
            function(next) {
                LNSSCoreGLTrans.categorizedSumsByAccount(fiscalPeriod)
                .then((results) => {
                    for (var i in accounts) {
                        accounts[i].sumSalary = 0;
                        accounts[i].sumExpenditure = 0;
                        accounts[i].sumLocalIncome = 0;
                        accounts[i].sumForeignIncome = 0;
                        accounts[i].sumIncome = 0;
                        
                        // Include all alternate accounts also
                        accounts[i].altAccounts.forEach((accountNum) => {
                            accounts[i].sumSalary += (results.salary[accountNum] || 0);
                            accounts[i].sumExpenditure += (results.expenditure[accountNum] || 0);
                            accounts[i].sumLocalIncome += (results.localIncome[accountNum] || 0);
                            accounts[i].sumForeignIncome += (results.foreignIncome[accountNum] || 0);
                            accounts[i].sumIncome += (results.income[accountNum] || 0);
                        });
                        
                        // Averages
                        accounts[i].avgSalary = accounts[i].sumSalary / accounts[i].months;
                        accounts[i].avgExpenditure = accounts[i].sumExpenditure / accounts[i].months;
                        accounts[i].avgLocalContrib = accounts[i].sumLocalIncome / accounts[i].months;
                        accounts[i].avgForeignContrib = accounts[i].sumForeignIncome / accounts[i].months;
                        accounts[i].avgIncome = accounts[i].sumIncome / accounts[i].months;
                        
                        // Percentages
                        accounts[i].localPercent = accounts[i].avgLocalContrib / accounts[i].avgExpenditure * 100;
                        accounts[i].foreignPercent = accounts[i].avgForeignContrib / accounts[i].avgExpenditure * 100;
                    }
                    next();
                })
                .catch(next);
            },
            
            // Get short pay periods
            // (array of period numbers 1-12 where short pay was taken)
            function(next) {
                LNSSCoreGLTrans.shortPayPeriods(fiscalPeriod)
                .fail(next)
                .done(function(results) {
                    // Include all alternate accounts also
                    for (var i in accounts) {
                        accounts[i].shortPayPeriods = [];
                        accounts[i].altAccounts.forEach((accountNum) => {
                            if (results[accountNum]) {
                                accounts[i].shortPayPeriods = accounts[i].shortPayPeriods.concat(results[accountNum]);
                            }
                        });
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
                    for (var i in accounts) {
                        accounts[i].balanceHistory = {}; // merged balances
                        accounts[i].monthsInDeficit = 0;
                        accounts[i].deficits = {
                        /*
                            <period>: <balance>,
                            '201505': 12345,
                            ...
                        */
                        };
                        
                        // Merge balances from alternate accounts into the primary
                        accounts[i].altAccounts.forEach((accountNum) => {
                            if (results[accountNum]) {
                                let balancesForAccount = results[accountNum];
                                for (var period in balancesForAccount) {
                                    if (period < accounts[i].periodJoined) {
                                        continue;
                                    }
                                    accounts[i].balanceHistory[period] = accounts[i].balanceHistory[period] || 0;
                                    accounts[i].balanceHistory[period] += balancesForAccount[period];
                                }
                            }
                        });
                        
                        var shortPeriods = accounts[i].shortPayPeriods;
                        var periodCount = 0;
                        var total = 0;
                        
                        // Compute based on merged balances
                        for (var period in accounts[i].balanceHistory) {
                            var thisBalance = accounts[i].balanceHistory[period];
                            periodCount += 1;
                            total += thisBalance;
                            
                            //// Count number of months in defict
                            // Either balance is below 10
                            var isLowBalance = thisBalance < 10;
                            // Or balance is below 500 and short pay was taken
                            var isShortPay = (thisBalance < 500 && shortPeriods.indexOf(period) >= 0);
                            if (isLowBalance || isShortPay) {
                                accounts[i].monthsInDeficit += 1;
                                accounts[i].deficits[ period ] = thisBalance;
                            }
                        }
                        
                        // Compute average monthly balance
                        accounts[i].avgAccountBal = total / periodCount;
                    }
                    next();
                });
            },
            
            // Group staff by region & account num
            // (if multiple staff share the same account num, only the one
            // designated as family point of contact will be used)
            function(next) {
                for (var i=0; i<staff.length; i++) {
                    var entry = staff[i];
                    var num = entry.accountNum;
                    
                    if (accounts[num]) {
                        // Merge account GL info into staff entry
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
                        
                        // Months of Need: 
                        // ((account balance) / [Greater of ((Avg expenses) or (Base Salary))]
                        entry.monthsOfNeed = (
                            entry.estimatedBal / 
                            Math.max(entry.baseSalary, entry.avgExpenditure)
                        );
                        
                        // % of Need: 
                        // (12 month Avg income) / greater of ((avg expenses) or (salary) or (MPD Goal from HRIS))
                        entry.percentOfNeed = (
                            entry.avgIncome / Math.max(
                                entry.avgExpenditure,
                                entry.baseSalary,
                                entry.mpdGoal || 0
                            ) * 100
                        );
                    } else {
                        entry.monthsTilDeficit = 'NA';
                    }
                    
                    // Change numbers into formatted strings
                    formatEntryNumbers( entry );
                    
                    // Flat list of all staff
                    // (includes staff with overlapping account numbers)
                    compiledData.staff.push(entry);
                    
                    // Staff grouped by account number
                    // (only one staff per account number)
                    if (!compiledData.staffByAccount[num] || entry.isPOC) {
                        // family point of contact takes priority
                        compiledData.staffByAccount[num] = entry;
                    }
                    
                    // Staff grouped by region
                    // (only one staff per account number)
                    
                    if (usingTerritoryCode) {
                        // `region` from the function param is the territory code
                        compiledData.staffByRegion[region] = compiledData.staffByRegion[region] || {};
                        compiledData.staffByRegion[region][num] = entry;
                    } 
                    else {
                        var entryRegion;
                        
                        // 2020-12-11: Use beginning part of territory labels
                        // as the "Region".
                        if (usingTerritoryDesc) {
                            var entryRegion = entry.territory.match(/^\w\w-\d\d\d/);
                            if (entryRegion) {
                                    // Expected format Q#-###
                                    entryRegion = entryRegion[0];
                                }
                                else {
                                    // Fallback to full territory label if unexpected format
                                    entryRegion = entry.territory;
                            }
                        }
                        else {
                            entryRegion = entry.region;
                        }
                        
                        /*
                        var entryRegion = entry.region;
                        var isInternational = false;
                        if (entryRegion == "Int'l") {
                            // For international NS, use their HRIS sending region.
                            // LNSSRen looks for the sending region label in the
                            // 'mpd' language (not 'en' or 'zh-hans').
                            // This allows us to customize the region text to match
                            // Stewardwise without affecting their appearance in
                            // HRIS.
                            isInternational = true;
                            entryRegion = entry.region = entry.sendingRegion;
                        }
                        */
                        
                        compiledData.staffByRegion[entryRegion] = compiledData.staffByRegion[entryRegion] || {};
                        if (!compiledData.staffByRegion[entryRegion][num] || entry.isPOC) {
                            // family point of contact takes priority
                            compiledData.staffByRegion[entryRegion][num] = entry;
                        }
                        
                        /*
                        if (isInternational) {
                            // Also add entry into "Int'l" region for international staff
                            compiledData.staffByRegion["Int'l"] = compiledData.staffByRegion["Int'l"] || {};
                            if (!compiledData.staffByRegion["Int'l"][num] || entry.isPOC) {
                                compiledData.staffByRegion["Int'l"][num] = entry;
                            }
                        }
                        */
                    }
                    
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
        async.forEachOfLimit(regionData, MAX_CONCURRENT, function(people, region, next) {
            
            // `people` is a basic object indexed by account number. Convert it
            // to a flat array sorted by account balance.
            var sortedList = [];
            for (var num in people) {
                sortedList.push( people[num] );
            }
            sortedList.sort(function(a, b) {
                var numericA = Number(a.estimatedBal.replace(',', ''));
                var numericB = Number(b.estimatedBal.replace(',', ''));
                return numericA - numericB;
            });
            
            EmailNotifications.trigger('mpdreport.ns.region.'+(region.toLowerCase()), {
                variables: {
                    people: sortedList,
                    extra: extra
                },
                to: []
            })
            .fail(function(err){
                Log('Error queueing NS MPD email for region: ' + region);
                Log(err);
                
                next();
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
        
        var listObj = staffData.staffByAccount;
        
        async.forEachOfLimit(listObj, MAX_CONCURRENT, function(person, num, next) {
            
            EmailNotifications.trigger('mpdreport.ns.individual', {
                variables: {
                    person: person,
                    extra: extra
                },
                to: [ person.email ]
            })
            .fail(function(err){
                Log('Error queueing NS MPD individual email');
                Log(err);
                
                next();
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
        'foreignPercent': true,
        'percentOfNeed': true
    };
    
    var decimalPlaces = {
        'monthsOfNeed': 1
    };
    
    for (var field in entry) {
        var number = entry[field];
        if (typeof number == 'number' && !isNaN(number)) {
            // Round up decimal places
            number = number.toFixed(decimalPlaces[field] || 0);
            
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

