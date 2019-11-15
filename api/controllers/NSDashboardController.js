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
     * GET /opstool-mpdReport/NSDashboard/thirteenMonthIandE
     *
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
                    account = String(account).replace(/\D/g, '');
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
        
    }

};
