var path = require('path');
var $ = require('jquery-deferred');


//// Node-Email-Templates:
var emailTemplates = require('email-templates');

//////
// CONFIG
//
/*
var emailOptions = {
    from: 'jhausman@dodomail.net',
    to: 'jchan@zteam.biz',
    // to: 'Ed Graham <egraham@zonemail.net>',
    cc: undefined,
    bcc: undefined
};
*/
//// NOTE: at loading time, MPDReportGen might not be available yet.
////       so for now set to null and reassign before we use it.
var emailOptions = null;

var Log = null;
var LogKey = '<green><bold>NSStaffProcessor:</bold></green>';


module.exports= {


        compileStaffData:function(done) {
            var self = this;

            if (Log == null) Log = MPDReportGen.Log;

            var compiledData = {};
            compiledData.staffByRegion = {};
            compiledData.staff = [];

            date = self.getFiscalPeriod();
            maxDate = self.getMinPeriod();

            //Wait until the date fields are retrieved before continuing
            $.when(date,maxDate).then(function(fiscalDateInfo,periodDateInfo){
//console.log('- both getFiscalPeriod() & getMinPeriod() done.');

              //Retrieve the regions
              NssCoreTerritory.find().sort('territory_desc asc').done(function(err,territory){

                //Process through all the ren tables
                var allSWRens = self.getSWRenData();
                var allHRDBRens = self.getHRDBRenData();
                var allPayroll = self.getPayrollRows(fiscalDateInfo);
                var allAccountBal = self.getAccountBalRows();
                var allForeignContrib = self.getForeignContribRows(periodDateInfo);
                var allLocalContrib = self.getLocalContribRows(periodDateInfo);

                //Wait until all the ren tables are retrieved from
                $.when(allSWRens,allHRDBRens,allPayroll,allAccountBal,allForeignContrib,allLocalContrib).then(function(swRenInfo,hrdbRenInfo,payrollInfo,accountBalInfo,foreignContribInfo,localContribInfo){

                    //Process through each region
                    for (var t in territory){
                        var territoryId = territory[t].territory_id;

                        //Process through each ren in the region
                        for (var a in swRenInfo[territoryId]) {
                            var clone = {};

                            var renId = swRenInfo[territoryId][a].ren_id;
                            var nssRenId = swRenInfo[territoryId][a].nssren_id;

                            if (typeof hrdbRenInfo[renId] != 'undefined') {


                                //Retrieve all the accthistory rows for the staff account num
                                var accountInfo = accountBalInfo[hrdbRenInfo[renId].ren_staffaccount];

                                //Retrieve all the local gltran rows for the staff account num
                                var localContrib = localContribInfo[hrdbRenInfo[renId].ren_staffaccount];

                                //Retrieve all the foreign gltran rows for the staff account num
                                var foreignContrib = foreignContribInfo[hrdbRenInfo[renId].ren_staffaccount];

                                //Retrieve all the payroll rows for the nssren_id
                                var payInfo = payrollInfo[nssRenId];

                                //Save the period to be used for retrieving the avg account balance
                                var period = swRenInfo[territoryId][a].nssren_balancePeriod;

                                //Save the currentSalary to be used for percentage of contributions
                                var currentSalary = swRenInfo[territoryId][a].nssren_salaryAmount;

                                clone.accountNum = hrdbRenInfo[renId].ren_staffaccount;
                                clone.name = self.getName(hrdbRenInfo[renId]);
                                clone.baseSalary = currentSalary;

                                //Pass the html entities for chinese name to get changed to chinese characters
                                clone.chineseName = self.decodeHtmlEntity(hrdbRenInfo[renId].ren_namecharacters);

                                clone.accountBal = swRenInfo[territoryId][a].nssren_ytdBalance.toFixed(0);

                                //Pass the payroll rows to getPayrollAvg to retrieve avgPayroll
                                clone.avgPayroll = self.getPayrollAvg(payInfo);


                                if (accountInfo) {

                                    //Pass the acct bal rows and the period to retrieve avgAccountBal
                                    clone.avgAccountBal = self.getAccountBalAvg(accountInfo, period);
                                    clone.avgAccountBal = self.formatNumber(clone.avgAccountBal);

                                    //Pass the acct bal rows and the period to retrieve monthsInDeficit
                                    clone.monthsInDeficit = self.getMonthsInDeficit(accountInfo, period);

                                } else {

                                    Log(LogKey+'<yellow><bold>warn:</bold> accountInfo undefined for :</yellow>', clone);
                                    clone.avgAccountBal = '???';
                                    clone.monthsInDeficit = '???';
                                }

                                //Pass the local contributions to get the avgLocalContrib
                                clone.avgLocalContrib = self.getAvgContributions(localContrib);

                                //Pass the avg local contributions and current salary to get the percentage
                                clone.localPercent = self.getPercent(clone.avgLocalContrib,currentSalary);

                                //Pass the foreign contributions to get the avgForeignContrib
                                clone.avgForeignContrib = self.getAvgContributions(foreignContrib);

                                //Pass the avg foreign contributions and current salary to get the percentage
                                clone.foreignPercent = self.getPercent(clone.avgForeignContrib,currentSalary);

                                //Add the local and foreign avg contributions together for monthsTilDeficit
                                var avgContributions = parseInt(clone.avgLocalContrib) + parseInt(clone.avgForeignContrib);

                                //Pass the int value of avgPayroll, avgContributions, and accountBal
                                clone.monthsTilDeficit = self.getMonthsTilDeficit(parseInt(clone.avgPayroll), avgContributions, parseInt(clone.accountBal));

                                clone.phone = hrdbRenInfo[renId].ren_mobilephone + " (m)";
                                clone.email = hrdbRenInfo[renId].ren_secureemail;

                                //Retrieve the first characters of the territory_desc to display as region
                                clone.hris_region = territory[t].territory_desc.split('-',1);

                                //format numbers with commas
                                clone.avgForeignContrib = self.formatNumber(clone.avgForeignContrib);
                                clone.avgLocalContrib = self.formatNumber(clone.avgLocalContrib);
                                
                                clone.avgPayroll = self.formatNumber(clone.avgPayroll);
                                clone.accountBal = self.formatNumber(clone.accountBal);
                                clone.baseSalary = self.formatNumber(clone.baseSalary);

                                var sbr = compiledData.staffByRegion;

                                if (!sbr[clone.hris_region]) {
                                    sbr[clone.hris_region] = {};
                                }

                                //Store the ren info in an object based off region and staff account num
                                sbr[clone.hris_region][clone.accountNum] = clone;
                                compiledData.staff.push(clone);

                            } else {
                                Log.error(LogKey+' no hrdbRenInfo for renid['+renId+'] :', { renId:renId, nssRenId:nssRenId, a:a, territoryId:territoryId});

//                               console.log();
//                               console.log('*** Warn: no hrdbRenInfo for renid['+renId+'] ');
//                               console.log('    nssRenId:'+nssRenId);
//                               console.log('    a:'+a);
//                               console.log('    territoryId:'+territoryId);
//                              console.log(swRenInfo[territoryId]);
//                                console.log();
                            }
                        }
                    }

                    if(done){
                        for (var region in compiledData.staffByRegion) {
                            compiledData.staffByRegion[region] = self.sortObj(compiledData.staffByRegion[region], 'value');
                        }
                        done(compiledData);
                    }
                });
              });
            });
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
//                console.log("sorting by value");
                temp_array.sort(function(a,b) {
                    var accountBalA = parseFloat(obj[a].accountBal.replace(/\,/g,''));
                    var accountBalB = parseFloat(obj[b].accountBal.replace(/\,/g,''));
                    var deficitA = obj[a].monthsTilDeficit;
                    var deficitB = obj[b].monthsTilDeficit;
                    if (obj[a].monthsTilDeficit.toString().indexOf("NA") != -1){
                        deficitA = obj[a].monthsTilDeficit.replace(/\NA/g,'9999999999999999999999');
                    }
                    if (obj[b].monthsTilDeficit.toString().indexOf("NA") != -1){
                        deficitB = obj[b].monthsTilDeficit.replace(/\NA/g,'9999999999999999999999');
                    }
//console.log("accountBalA ="+accountBalA);
//console.log("accountBalB ="+accountBalB);
//console.log("deficitA ="+deficitA);
//console.log("deficitB ="+deficitB);
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



        //Change HTML Entities to Chinese characters
        decodeHtmlEntity: function(str) {

            if (str == null) str = '';

            return str.replace(/&#(\d+);/g, function(match, dec) {
                    return String.fromCharCode(dec);
            });

        },



        //Add a comma to the number where it is needed
        formatNumber: function(number){

            while (/(\d+)(\d{3})/.test(number.toString())){
                number = number.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
            }

            return number;
        },



        //Get the fiscal period from 12 months ago
        getFiscalPeriod: function(){
            var dfd = $.Deferred();
//console.log('- in getFiscalPeriod() ');
            var endDate = "";

            NssCoreFiscalPeriod.find({requestcutoff_isClosed: 1}).sort("requestcutoff_id desc").done(function(error,period){
//console.log('  -  fiscalPeriods found ... ');

                //Retrieve the requestcutoff_date from 12 months ago and load into the Date() function
                var fiscalPeriod = new Date(period[11].requestcutoff_date);

                //Extract the year, month and day
                year = fiscalPeriod.getFullYear();
                month = fiscalPeriod.getMonth() + 1;
                day = fiscalPeriod.getDate() + 1;

                //Format the endDate
                endDate = year + "-" + month + "-" + day;

                dfd.resolve(endDate);
            });

            return dfd;
        },



        //Get the active ren from nss_core_ren rows
        getSWRenData: function(){
            var dfd = $.Deferred();

            var nssRenCoreData = {};

            NssRen.find({nssren_isActive: 1}).sort('nssren_ytdBalance asc').done(function(error,rens){
                for (var b=0;b<rens.length;b++){

                    if (!nssRenCoreData[rens[b].territory_id]){
                        nssRenCoreData[rens[b].territory_id] = {};
                    }
                    //Store rens in an object to retrieve based off territory_id
                    nssRenCoreData[rens[b].territory_id][rens[b].ren_id] = rens[b];
//console.log("rens[b].nssren_ytdBalance = "+rens[b].nssren_ytdBalance);
                }
                dfd.resolve(nssRenCoreData);
            });
            return dfd;
        },



        //Get all the ren from hrdb ren table
        getHRDBRenData: function(){
            var dfd = $.Deferred();

            var hrdbRenData = {};

            HRDBRen.find().done(function(err,hrdbrens){
                for (var a=0;a<hrdbrens.length;a++){

                    //Put all the ren in an object to retrieve based off of ren_id
                    hrdbRenData[hrdbrens[a].ren_id] = hrdbrens[a];

                }
                dfd.resolve(hrdbRenData);
            });

            return dfd;

        },



        //Get all the nss_payroll_transaction rows that have been processed
        //and only rows from the last 12 months
        getPayrollRows: function(endDate){
            var dfd = $.Deferred();

            var payrollData = {};

            NssPayrollTransactions.find({glbatch_id:{'!': 0}})
                .where({nsstransaction_date:{'>': endDate}}).done(function(err,payrollRows){
                    for (var d=0;d<payrollRows.length;d++){

                        var nssRenId = payrollRows[d].nssren_id;

                        var transactionId = payrollRows[d].nsstransaction_id;

                        if (!payrollData[nssRenId]){
                            payrollData[nssRenId] = {};
                        }

                        //Put the payroll rows to retrieve based off nssrenId
                        payrollData[nssRenId][transactionId] = payrollRows[d];
                    }
                    dfd.resolve(payrollData);
            });

            return dfd;
        },



        //Retrieve all the rows from nss_core_accounthistory
        getAccountBalRows: function(){
            var dfd = $.Deferred();

            var accountBalData = {};

            NssCoreAccountHistory.find().done(function(err,accountBalRows){
                for (var a=0;a<accountBalRows.length;a++){
                    //Cut the account number down to 4 digit to look up based off of hrdb.ren.ren_staffaccount
                    var accountNum = accountBalRows[a].subaccounts_accountNum.slice(2,6);

                    var fiscalYear = accountBalRows[a].accounthistory_fiscalyear;

                    if (!accountBalData[accountNum]){
                        accountBalData[accountNum] = {};
                    }

                    //Store acct balance info in an object to retrieve based off of accountNum and fiscalYear
                    accountBalData[accountNum][fiscalYear] = accountBalRows[a];
                }
                dfd.resolve(accountBalData);
            });

            return dfd;
        },



        //Retrieve all rows for foreign transactions (gltran_acctnum === 5000) from nss_core_gltran
        //for the last 12 months
        getForeignContribRows: function(endPeriodDate){
            var dfd = $.Deferred();

            var glTransData = {};

            NssCoreGLTran.find({gltran_acctnum: 5000})
            .where({gltran_perpost: {'>': endPeriodDate}}).done(function(err,gltrans){

                for (var g=0;g<gltrans.length;g++){
                    //Cut the account number down to 4 digit to look up based off of hrdb.ren.ren_staffaccount
                    var accountNum = gltrans[g].gltran_subacctnum.slice(2,6);

                    var transId = gltrans[g].gltran_id;

                    if (!glTransData[accountNum]){
                        glTransData[accountNum] = {};
                    }

                    //Store the foreign transaction in an object to retrieve based off accountNum
                    glTransData[accountNum][transId] = gltrans[g];
                }
                dfd.resolve(glTransData);
            });

            return dfd;
        },



        //Retrieve local transactions (gltran_acctnum == 4000 or 4010) from nss_core_gltran table
        //for the last 12 months
        getLocalContribRows: function(endPeriodDate){
            var dfd = $.Deferred();

            var glTransData = {};

            NssCoreGLTran.find({or: [
                                {gltran_acctnum: 4000},
                                {gltran_acctnum: 4010}
                                ]})
            .where({gltran_perpost: {'>': endPeriodDate}}).done(function(err,gltrans){
                for (var g=0;g<gltrans.length;g++){
                    //Cut the account number down to 4 digit to look up based off of hrdb.ren.ren_staffaccount
                    var accountNum = gltrans[g].gltran_subacctnum.slice(2,6);

                    var transId = gltrans[g].gltran_id;

                    if (!glTransData[accountNum]){
                        glTransData[accountNum] = {};
                    }
                    //Store transaction in an object to retrieve based off of accountNum
                    glTransData[accountNum][transId] = gltrans[g];
                }
                dfd.resolve(glTransData);
            });

            return dfd;
        },



        //Retrieve the most recent gltran_perpost date from the nss_core_gltran table
        //to get the minimum gltran_perpost from the last 12 months
        getMinPeriod: function(){
            var dfd = $.Deferred();
//console.log('  - in getMinPeriod() ');
            var minPeriodDate = "";

            NssCoreGLTran.find().limit(1).sort("gltran_perpost desc").done(function(err,gltran){
//console.log('    - NssCoreGLTran.find()  returned');
//console.log(gltran);

                var period = gltran[0].gltran_perpost + "";

                //Manipulate period to extract the month ex. 201304
                var month = period.slice(4,7);

                //Manipulate period to extract the year ex. 201304
                var year = period.slice(0,4);

                //Load the year and month into the Date function
                var date = new Date(year,month,01);

                //Build the min gltran_perpost from the last 12 months
                minPeriodDate = date.getFullYear() - 1 + "" + month;

                dfd.resolve(minPeriodDate);
            });

            return dfd;
        },



        //Format the name from hrdb
        getName:function(hrdbRow){
            var name = "";

            if (hrdbRow.ren_preferedname) {
                name = hrdbRow.ren_surname + ", " + hrdbRow.ren_givenname + " (" + hrdbRow.ren_preferedname + ")";
            } else {
                name = hrdbRow.ren_surname + ", " + hrdbRow.ren_givenname;
            }

            return name;
        },



        //Calculate the avgPayroll based off the payroll rows for the renId
        getPayrollAvg: function(payrollRows){

            var totalSalarySum = 0;

            var totalMonths = 12;

            //no payroll rows for the renId
            if (!payrollRows){
                return "0";
            }

            //total the totalSalary field
            for (var p in payrollRows){
                totalSalarySum = payrollRows[p].nsstransaction_totalSalary + totalSalarySum;
            }

            //divide the totalSalary by the amount of months added together and round to 2 decimal places
            var avgPayroll = (totalSalarySum / totalMonths).toFixed(0);

            return avgPayroll;
        },



        //Calculate the avgAccountBal using the accountBal rows based off of staff account num
        //and the current account bal period from nss_core_ren table
        getAccountBalAvg: function(accountBalRows, accountBalPeriod){

            var avgAccountBal = 0;
            var totalAccountBalance = 0;
            var totalMonths = 12;
            var start = 0;
            var stop = 0;

            //the field nss_core_ren.nssren_balancePeriod is blank
            if (accountBalPeriod == ""){
                return "0";
            }

            //Take the rows and build an array of account balance values
            var acctBalArray = this.buildAcctBalArray(accountBalRows,accountBalPeriod);

            var year = accountBalPeriod.split("-")[0];
            var month = accountBalPeriod.split("-")[1];

            if (acctBalArray.length == 12){
                start = 0;
                stop = month;
            }else{
                stop = parseInt(totalMonths) + parseInt(month);
                start = stop - totalMonths;
            }

            while (stop > start){
                totalAccountBalance = totalAccountBalance + acctBalArray[start];
                start++;
            }

            avgAccountBal = (totalAccountBalance / totalMonths).toFixed(0);

            return avgAccountBal;
        },



        //Build an array using the last year and this year account balance rows
        buildAcctBalArray: function(rows,period){
            var array = [];

            var year = period.split("-")[0];
            var month = period.split("-")[1];

            thisYearRow = rows[year];
            lastYearRow = rows[year - 1];

            if (lastYearRow) {
                array = this.buildArray(lastYearRow, array);
            }
            array = this.buildArray(thisYearRow,array);

            return array;
        },



        //Put the acccounthistory_ytdbalXX values in an array
        buildArray: function(row,array){

            $.each(row, function(i, n){
                if (i.indexOf("accounthistory_ytdbal") != -1) {
                    if (i.indexOf("accounthistory_ytdbal00") == -1) {
                        array.push(n);
                    }
                }
            });

            return array;
        },



        //Calculate monthsInDeficit using the accountBal rows based off of staff account num
        //and the current account bal period from nss_core_ren table
        getMonthsInDeficit:function(accountBalRows,accountBalPeriod){
            var monthsInDeficit = 0;
            var stop = 0;
            var start = 0;

            //the field nss_core_ren.nssren_balancePeriod is blank
            if (accountBalPeriod == ""){
                return "0";
            }

            var month = accountBalPeriod.split("-")[1];

            var acctBalArray = this.buildAcctBalArray(accountBalRows,accountBalPeriod);

            if (acctBalArray.length == 12){
                start = 0;
                stop = month;
            }else{
                stop = 12 + parseInt(month);
                start = stop - 12;
            }

            while (stop > start){
                if(acctBalArray[start] < 0){
                    monthsInDeficit++;
                }
                start++;
            }

            return monthsInDeficit;
        },



        //Calculate the monthsTilDeficit using the averages of payroll, contributions
        //and the current account balance
        getMonthsTilDeficit: function(avgPayroll, avgContributions, accountBalance){

            var monthsTilDeficit = 1;

            //the account is currently in deficit
            if (accountBalance < 0){
                return "1";
            }

            //the account will never be in deficit since avgContributions > avgPayroll or they are equal
            if (avgContributions > avgPayroll || avgContributions == avgPayroll) {
                monthsTilDeficit = "NA";
            } else {
                //Continue to add avgContributions and subtract avgPayroll to accountBalance
                //until accountBalance is in deficit (negative)
                while (accountBalance > 0) {
                    accountBalance = accountBalance + avgContributions - avgPayroll;
                    monthsTilDeficit++;
                }
            }

            return monthsTilDeficit;
        },



        //Calculate the avgContributions using the rows from nss_core_gltran
        //from the last 12 months
        getAvgContributions:function(transRows){
            var avgContributions = 0;
            var totalContributions = 0;
            var totalMonths = 12;

            //No local contributios for the ren
            if (!transRows){
                return "0";
            }

            //Loop through the nss_core_gltran rows adding and subtracting
            for(t in transRows){
                if (transRows[t].gltran_cramt > 0){
                    totalContributions = totalContributions + transRows[t].gltran_cramt;
                }else{
                    totalContributions = totalContributions - transRows[t].gltran_dramt;
                }
            }

            avgContributions = (totalContributions / totalMonths).toFixed(0);

            return avgContributions;
        },



        //Calculate the contributions percentage using the contributions and the salary
        getPercent: function(contributions,salary){
            var percentage = 0;

            //Calculation won't work if salary is zero
            if (salary === 0){
                return "0%";
            }

            percentage = (contributions / salary) * 100;

            return percentage.toFixed(0) + "%";
        },



        compileEmailData: function(done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            NSStaffProcessor.compileStaffData(function(data) {

                // Data should be 'Region' : { accounts }
                var emailData = {};

                // load emailDefs
                var emailDefs = sails.config.opstool_mpdReport.ns.emails;


//// TODO: both, AOA and Intl have the same value, wont this overwrite each other below?

                // for each region in staff data
                var foundData = data.staffByRegion;
                for (var region in foundData){
                    emailData[ emailDefs[region]] = foundData[region];
                }


                if (done) done(emailData);
                dfd.resolve(emailData);

            });

            return dfd;
        },



        compileRenderedEmails: function(templatesDir, emailData, done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            var renderedEmails = {};

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

//console.log();
//console.log('Email Data:');
//console.log(emailData);

                            // for each regional email address:
                            for (var emailAddr in emailData) {

                                // NOTE: this is NOT asynchronous...
                                renderEmail({ people:emailData[emailAddr] }, templatesDir, function(err, html, text) {

                                    if (err) {
                                        Log.error(LogKey+' error rendering email:', err);
                                        if (done) done(err, null);
                                        dfd.reject(err);
                                        return;

                                    } else {

                                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsNS };

                                        var email = {
                                                from: emailOptions.From(),
                                                to: emailOptions.To(emailAddr),
                                                cc: emailOptions.CC(),
                                                bcc: emailOptions.BCC(),
                                                subject:'Current: NS Staff Account Info ('+emailAddr+')',
                                                html:html,
                                                text:text
                                        };
                                        renderedEmails[emailAddr] = email;
                                    }
                                });

                            } // next region

//console.log('rendered emails:');
//console.log(renderedEmails);

                            if (done) done(null, renderedEmails);
                            dfd.resolve(renderedEmails);

                        } // end if err
                    });
                } // end if err
            });

            return dfd;
        },



        compileRenderedIndividualEmails: function(templatesDir, emailData, done) {
            var dfd = $.Deferred();

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

//console.log();
//console.log('Email Data:');
//console.log(emailData);

                            //
                            for (var a=0;a<emailData.staff.length;a++) {

                                // NOTE: this is NOT asynchronous...
                                renderEmail({ person:emailData.staff[a] }, templatesDir, function(err, html, text) {

                                    if (err) {
                                        Log.error(LogKey+' error rendering email:', err);
                                        if (done) done(err, null);
                                        dfd.reject(err);
                                        return;

                                    } else {

                                        if (emailOptions == null) { emailOptions = MPDReportGen.emailOptionsNS };

                                        var email = {
                                                from: emailOptions.From(),
                                                to: emailOptions.To(emailData.staff[a].email),
                                                cc: emailOptions.CC(),
                                                bcc: emailOptions.BCC(),
                                                subject:'NS Staff Account Info ('+emailData.staff[a].email+')',
                                                html:html,
                                                text:text
                                        };
                                        renderedEmails[a] = email;
                                    }
                                });


                            } // next region

//console.log('rendered emails:');
//console.log(renderedEmails);

                            if (done) done(null, renderedEmails);
                            dfd.resolve(renderedEmails);

                        } // end if err
                    })
                } // end if err
            })

            return dfd;
        }

}
