/**
 * NSDashboardController
 *
 * @module      :: Controller
 * @description :: Contains logic for handling requests.
 */
var path = require('path');
var AD = require('ad-utils');

module.exports = {

    
    /**
     * Same as below, except user must be CAS authenticated on the OpsPortal
     * site. Requested account number is specified through an HTTP header.
     *
     * GET /opstool-mpdReport/NSDashboard/adminThirteenMonthIandE
     */
    adminThirteenMonthIandE: function(req, res) {
        req.stewardwise = {
            nssren: {
                account_number: req.headers.account
            }
        };
        
        return this.thirteenMonthIandE(req, res);
    },
    
    /**
     * GET /opstool-mpdReport/NSDashboard/thirteenMonthIandE
     *
     * User is authenticated via a unique token generated from Stewardwise.
     * Delivers a basic object with arrays of values:
     * { 
     *     period: [<string>, ...],
     *     localIncome: [<integer>, ...],
     *     foreignIncome: [<integer>, ...],
     *     expenditure: [<integer>, ...],
     *     trend: [<integer, ...]>
     * }
     */
    thirteenMonthIandE: function(req, res) {
        
        var results = {
            periods: [],
            foreignIncome: [],
            localIncome: [],
            expenses: [],
            trend: []
        };
        var period; // fiscal period from 13 months ago
        var account = req.stewardwise.nssren.account_number;
        var periodLookup = {};
        res.set('Access-Control-Allow-Origin', '*');
        
        
        async.series([
            
            (next) => {
                if (!account) {
                    res.notFound('Staff account number not found');
                    // END
                }
                else {
                    //account = String(account).replace(/\D/g, '');
                    next();
                }
            },
            
            (next) => {
                // Find the starting fiscal period
                LNSSCoreGLTrans.getPastPeriod(13)
                .fail(next)
                .done((data) => {
                    period = data;
                    next();
                });
            },
            
            (next) => {
                LNSSCoreGLTrans.incomeExpensesGroupedByPeriod(period, account)
                .then((data) => {
                    for (var period in data) {
                        // Format dates
                        results.periods.push(period.substr(0, 4) + '年' + period.substr(4, 2) + '月');
 
                        // Round up numbers
                        results.foreignIncome.push(Math.round(data[period].foreignIncome));
                        results.localIncome.push(Math.round(data[period].localIncome));
                        results.expenses.push(Math.round(data[period].expenses) * -1);
                        
                        // Calculate trend
                        results.trend.push(Math.round(data[period].localIncome - data[period].expenses));
                    }
                    next();
                })
                .catch(next)
            }
        
        ], (err) => {
            if (err) {
                res.serverError(err);
            } else {
                res.send(results);
            }
        });
        
    },
    
    
    /**
     * GET /opstool-mpdReport/NSDashboard/dataReport
     *
     * 
     */
    dataReport: function(req, res) {
        var results = {};
        var startingPeriod, staffList;
        
        async.series([
            // Get period from 13 months ago
            (next) => {
                LNSSCoreGLTrans.getPastPeriod(13)
                .done((period) => {
                    startingPeriod = period;
                    next();
                })
                .fail(next);
            },
            
            // Get list of active staff
            (next) => {
                LNSSRen.staffInfo()
                .done((list) => {
                    staffList = list;
                    next();
                })
                .fail(next);
            },
            
            // Get cached estimated account balances
            (next) => {
                LNSSRen.cachedEstimatedBalances()
                .then((data) => {
                    staffList.forEach((staff) => {
                        var nssRenID = staff.nssren_id;
                        if (data[nssRenID]) {
                            staff.estimatedAccountBalance = data[nssRenID];
                        }
                    });
                    next();
                })
                .catch(next);
            },
            
            // Get I&E for each staff
            (next) => {
                async.eachSeries(
                    staffList, 
                    (staff, nextStaff) => {
                        LNSSCoreGLTrans.incomeExpensesGroupedByPeriod(startingPeriod, staff.accountNum)
                        .then((data) => {
                            results[staff.accountNum] = data;
                            nextStaff();
                        })
                        .catch(nextStaff);
                    },
                    (err) => {
                        if (err) next(err);
                        else next();
                    }
                );
            },
            
        ], (err) => {
            if (err) res.serverError(err);
            else {
                // Get list of calendar periods
                var periods = [];
                var periodLabels = [];
                for (var period in results[staffList[0].accountNum]) {
                    periods.push(period);
                    periodLabels.push(period.substr(0, 4) + '年' + period.substr(4, 2) + '月');
                }
                
                // Tidy up results
                periods.forEach((period) => {
                    staffList.forEach((staff) => {
                        let account = staff.accountNum;
                        results[account] = results[account] || {};
                        results[account][period] = results[account][period] || {};
                        results[account][period].localIncome = Math.round(results[account][period].localIncome) || 0;
                        results[account][period].foreignIncome = Math.round(results[account][period].foreignIncome) || 0;
                        results[account][period].expenses = Math.round(results[account][period].expenses) || 0;
                    });
                });
                
                res.view(
                    'opstool-mpdReport/nsdashboard/datareport',
                    {
                        periods: periods, 
                        periodLabels: periodLabels,
                        staffList: staffList,
                        data: results,
                        pageTitle: 'NS MPD Dashboard Data',
                        layout: false
                    }
                );
            }
        });
    }
        

};
