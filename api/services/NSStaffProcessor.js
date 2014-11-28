var path = require('path');
var $ = require('jquery-deferred');
var AD = require('ad-utils');


//// Node-Email-Templates:
var emailTemplates = require('email-templates');

//// NOTE: at loading time, MPDReportGen might not be available yet.
////       so for now set to null and reassign before we use it.
var emailOptions = null;

var Log = null;
var LogKey = '<green><bold>NSStaffProcessor:</bold></green>';

var TESTING_GUID = '068F29E2-B3C7-085C-6E9D-08DD6E633F25';

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
         */

        testCompileStaffData:function() {
            var self = this;
            var dfd = AD.sal.Deferred();


            var oldData = null;
            var newData = null;

            async.series([

                // step 1: get old data
                function(next) {
AD.log('.... 1');
                    self.compileStaffDataOLD(function(err, data){

                        if (err) {
                            next(err);
                        } else {
                            oldData = data;
                            next();
                        }
                    })
                },

                // step 2: get new data
                function(next) {
AD.log('.... 2');
                    self.compileStaffData(function(err, data){

                        if (err) {
                            next(err);
                        } else {
                            newData = data;
                            next();
                        }
                    })
                },

                // step 3: check for major structure
                function(next) {
AD.log('.... 3');
                    AD.log();
                    AD.log();
                    AD.log();
                    AD.log('... comparing old and new data:');
                    if(!newData.staffByRegion) AD.log.error('... newData missing .staffByRegion!');
                    if(!newData.staff) AD.log.error('... newData missing .staff!');
                    next();
                },


                // step 4: check oldData and newData have all same regions
                function(next) {
AD.log('.... 4');
                    for (var r in oldData.staffByRegion) {
                        if (!newData.staffByRegion[r]) AD.log.error('... newData missing region:'+r);
                    }

                    for (var r in newData.staffByRegion) {
                        if (!oldData.staffByRegion[r]) AD.log.error('... newData has additional region:'+r);
                    }
                    next();

                },




                // step 5: check oldData and newData have same number of staff reported:
                function(next) {
AD.log('.... 5');
                    if (oldData.staff.length != newData.staff.length) {
                        if (oldData.staff.length > newData.staff.length) {
                            AD.log.error('... oldData has more staff reported!');
                        } else {
                            AD.log.error('... newData has more staff reported!');
                        }
                    }
                    next();

                },




                // step 6: check oldData and newData have same staff in each region:
                function(next) {
AD.log('.... 6');
                    for (var r in oldData.staffByRegion) {

                        for (var a in oldData.staffByRegion[r]) {

                            if (!newData.staffByRegion[r][a]) AD.log.error('... newData missing entry: '+r+'->'+a);
                        }


                        for (var a in newData.staffByRegion[r]) {

                            if (!oldData.staffByRegion[r][a]) AD.log.error('... newData has additional entry: '+r+'->'+a);
                        }
                        
                    }

                    next();

                },







                // step 7: scan individual values:
                function(next) {

                    var skipFields = ['hris_region', 'name', 'phone', 'monthsTilDeficit' ];
AD.log('.... 7');
                    for (var r in oldData.staffByRegion) {

                        for (var a in oldData.staffByRegion[r]) {

                            var errorFields = [];

                            for (var v in oldData.staffByRegion[r][a]) {


                                if (skipFields.indexOf(v) == -1) {
                                    var oValue = oldData.staffByRegion[r][a][v];
                                    var nValue = newData.staffByRegion[r][a][v];
                                    if (oValue != nValue) {

                                        errorFields.push('   '+v+': '+oValue+' <--> '+nValue );
                                    }
                                }
                            }


                            if (errorFields.length) {
                                        AD.log();
                                        AD.log.error('... differing values:');
                                        AD.log( errorFields.join('\n'));
                            }
                        }
                        
                    }

                    next();

                }



            ], function(err,results){
AD.log('.... FINAL');
                if (err) {
                    dfd.reject(err);
                }else {
                    dfd.resolve();
                }
            })

            return dfd;
        },



        compileStaffDataOLD:function(done) {
            var self = this;
            var dfd = AD.sal.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            var compiledData = {};
            compiledData.staffByRegion = {};
            compiledData.staff = [];

            var date = self.getFiscalPeriod();
            //var maxDate = self.getMinPeriod();
            

            //Wait until the date fields are retrieved before continuing
            $.when(date).then(function(twelveMonthsAgo){ 
              
              var fiscalDateInfo = twelveMonthsAgo.date;
              var periodDateInfo = twelveMonthsAgo.period;
              
              //Retrieve the regions
              NssCoreTerritory.find().sort('territory_desc asc')
              .fail(function(err) { 
done(err);
              })
              .then(function(territory){ 

                var swRenInfo, hrisRenInfo, payrollInfo, accountBalInfo, 
                    foreignContribInfo, localContribInfo, staffExpenditures = null;

                async.series([

                    // Step 1: load in all Stewardwise info:
                    function(next){

                        var allSWRens = self.getSWRenData();
                        var allPayroll = self.getPayrollRows(fiscalDateInfo);
                        var allAccountBal = self.getAccountBalRows();
                        var allForeignContrib = self.getForeignContribRows(periodDateInfo);
                        var allLocalContrib = self.getLocalContribRows(periodDateInfo);
                        var allStaffExpenditures = self.getStaffExpenditures(periodDateInfo);

                        //Wait until all the ren tables are retrieved from
                        $.when(
                            allSWRens, allPayroll, allAccountBal, 
                            allForeignContrib, allLocalContrib, allStaffExpenditures
                        )
                        .fail(function(err){
                            AD.log.error('<bold>NSStaffProcessor.compileStaffData():</bold> error gathering NSS info: ', err);
                            next(err);
                        })
                        .then(function(
                            currSwRenInfo,  currPayrollInfo, currAccountBalInfo, 
                            currForeignContribInfo, currLocalContribInfo, currStaffExpenditures
                        ) {

                            swRenInfo = currSwRenInfo;
                            payrollInfo = currPayrollInfo;
                            accountBalInfo = currAccountBalInfo;
                            foreignContribInfo = currForeignContribInfo;
                            localContribInfo = currLocalContribInfo;
                            staffExpenditures = currStaffExpenditures;
                            next();
                        })
                    },


                    // Step 2: load in related HRIS info:
                    function(next) {

                        // get relevant guids from swRenInfo:
                            // swRenInfo :  { territory_id: { ren_id : {rens} } };
                        var guids = [];
                        for (var tid in swRenInfo) {
                            var section = swRenInfo[tid];

                            for (var rid in section) {
                                var ren = section[rid];
                                guids.push(ren.ren_guid);
                            }
                        }

                        // get that HRIS ren info
                        self.getHRISRenData(guids)
                        .fail(function(err){
                            next(err);
                        })
                        .then(function(currHrisRenInfo) {

                            hrisRenInfo = currHrisRenInfo;
                            next();
                        })
                        
                    }, 


                    // step 3: put it all together
                    function(next){

                        //Process through each region
                        for (var t in territory){
                            var territoryId = territory[t].territory_id;

                            //Process through each ren in the region
                            for (var a in swRenInfo[territoryId]) {
                                var clone = {};

                                var renId = swRenInfo[territoryId][a].ren_id;
                                var nssRenId = swRenInfo[territoryId][a].nssren_id;
                                var renGUID = swRenInfo[territoryId][a].ren_guid;

                                if (typeof hrisRenInfo[renGUID] != 'undefined') {

                                    var staffAccount = hrisRenInfo[renGUID].staffAccount;

                                    //Retrieve all the accthistory rows for the staff account num
                                    var accountInfo = accountBalInfo[staffAccount];

                                    //Retrieve all the local gltran rows for the staff account num
                                    var localContrib = localContribInfo[staffAccount];

                                    //Retrieve all the foreign gltran rows for the staff account num
                                    var foreignContrib = foreignContribInfo[staffAccount];

                                    // Retrieve the monthly average expenditure for this staff
                                    var avgExpenditure = staffExpenditures[staffAccount];
                                    if (avgExpenditure) {
                                        clone.avgExpenditure = self.formatNumber(avgExpenditure);
                                    } else {
                                        clone.avgExpenditure = 0;
                                    }

                                    //Retrieve all the payroll rows for the nssren_id
                                    var payInfo = payrollInfo[nssRenId];

                                    //Save the period to be used for retrieving the avg account balance
                                    var period = swRenInfo[territoryId][a].nssren_balancePeriod;

                                    //Save the currentSalary to be used for percentage of contributions
                                    var currentSalary = swRenInfo[territoryId][a].nssren_salaryAmount;


                                    // saving the GUID to the clone data as well. -Johnny
                                    clone.guid = renGUID;

                                    clone.accountNum = staffAccount;
                                    clone.name = self.getName(hrisRenInfo[renGUID]);
                                    clone.baseSalary = currentSalary;

                                    //Pass the html entities for chinese name to get changed to chinese characters
                                    clone.chineseName = self.decodeHtmlEntity(hrisRenInfo[renGUID].ren_namecharacters);

                                    clone.accountBal = swRenInfo[territoryId][a].nssren_ytdBalance.toFixed(0);

                                    //Pass the payroll rows to getPayrollAvg to retrieve avgPayroll
                                    clone.avgPayroll = self.getPayrollAvg(payInfo);


                                    if (accountInfo) {

                                        //Pass the acct bal rows and the period to retrieve avgAccountBal
                                        clone.avgAccountBal = self.getAccountBalAvg(accountInfo, period, renGUID);
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

                                    //Pass the avg local contributions and avg expenditure to get the percentage
                                    clone.localPercent = self.getPercent(clone.avgLocalContrib, clone.avgExpenditure);

                                    //Pass the foreign contributions to get the avgForeignContrib
                                    clone.avgForeignContrib = self.getAvgContributions(foreignContrib);

                                    //Pass the avg foreign contributions and avg expenditure to get the percentage
                                    clone.foreignPercent = self.getPercent(clone.avgForeignContrib, clone.avgExpenditure);
                                    
                                    //Add the local and foreign avg contributions together for monthsTilDeficit
                                    var avgContributions = parseInt(clone.avgLocalContrib) + parseInt(clone.avgForeignContrib);

                                    //Pass the int value of avgPayroll, avgContributions, and accountBal
                                    clone.monthsTilDeficit = self.getMonthsTilDeficit(avgExpenditure, avgContributions, parseInt(clone.accountBal));

                                    clone.phone = hrisRenInfo[renGUID].ren_mobilephone + " (m)";
                                    clone.email = hrisRenInfo[renGUID].ren_secureemail;

                                    //Retrieve the first characters of the territory_desc to display as region
                                    clone.hris_region = territory[t].territory_desc.split('-',1);
                                    
                                    //format numbers with commas
                                    clone.avgForeignContrib = self.formatNumber(clone.avgForeignContrib);
                                    clone.avgLocalContrib = self.formatNumber(clone.avgLocalContrib);
                                    
                                    clone.avgPayroll = self.formatNumber(clone.avgPayroll);
                                    clone.accountBal = self.formatNumber(clone.accountBal);
                                    clone.baseSalary = self.formatNumber(clone.baseSalary);
// if( renGUID == TESTING_GUID) {
//     AD.log('... clone:', clone);
// }
                                    var sbr = compiledData.staffByRegion;

                                    if (!sbr[clone.hris_region]) {
                                        sbr[clone.hris_region] = {};
                                    }

                                    //Store the ren info in an object based off region and staff account num
                                    sbr[clone.hris_region][clone.accountNum] = clone;
                                    compiledData.staff.push(clone);

                                } else {
                                    Log.error(LogKey+' no hrisRenInfo['+renGUID+']  :', { renGUID:renGUID, renId:renId, nssRenId:nssRenId, a:a, territoryId:territoryId});

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

                        for (var region in compiledData.staffByRegion) {
                            compiledData.staffByRegion[region] = self.sortObj(compiledData.staffByRegion[region], 'value');
                        }

                        next();

                    }


                ], function(err,results){

                    if (err) {
                        if (done) done(err);
                        dfd.reject(err);
                    } else {

                        if (done) done(null, compiledData);
                        dfd.resolve(compiledData);
                    }

                }); // async

              });  // NssCoreTerritory.find()
                    
            });  // $.when().then()

            return dfd;
        },







        compileStaffData:function(done) {
            var self = this;
            var dfd = AD.sal.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            var compiledData = {};
            compiledData.staffByRegion = {};
            compiledData.staff = [];


            var staffGUIDs = [];
            var analysisResults = null;

            async.series([

                // step 1: first gather all the Staff GUIDs in our NSS system
                function(next) {
// Log('... gathering staff guids:');
                    //// NOTE: leaving off guids:[]  returns all of 'em'
                    LegacyStewardwise.peopleByGUID({ filter:{nssren_isActive: 1}})
                    .fail(function(err){
                        next(err);
                    })
                    .done(function(list){
                        list.forEach(function(entry){
                            staffGUIDs.push(entry.ren_guid);
                        })
// Log('... found '+staffGUIDs.length+' guids');

                        next();
                    })

                },


                // step 2: get account analysis for those staff
                function(next) {
// Log('... gathering Account Analysis entries:');
                    LegacyStewardwise.accountAnalysisByGUID({guids:staffGUIDs})
                    .fail(function(err){
                        next(err);
                    })
                    .done(function(list){
                        analysisResults = list;
// Log('... found '+list.length+' entries');
// Log('... that look like :', list[0]);
                        next();
                    })
                },


                // step 3: convert Analysis array to our result format:
                function(next) {

                    var sbr = compiledData.staffByRegion;

                    analysisResults.forEach(function(entry){

                        var region = entry.hris_region;
                        if (region.length) region = region[0];  // make sure not an array

                        if (!sbr[region]) {
                            sbr[region] = {};
                        }

                        //Store the ren info in an object based off region and staff account num
                        sbr[region][entry.accountNum] = entry;
                        compiledData.staff.push(entry);

                    })

                    next();

                },


                // step 4: sort these results:
                function(next) {

                    for (var region in compiledData.staffByRegion) {
                        compiledData.staffByRegion[region] = self.sortObj(compiledData.staffByRegion[region], 'value');
                    }
                    next();
                }
                

            ],function(err, results) {

                if (err) {
                    if (done) done(err);
                    dfd.reject(err);
                } else {

                    if (done) done(null, compiledData);
                    dfd.resolve(compiledData);
                }

            })

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

            // if number is not undefined
            if (number) {
                while (/(\d+)(\d{3})/.test(number.toString())){
                    number = number.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
                }
            }

            return number;
        },



        //Get the fiscal period from 12 months ago
        getFiscalPeriod: function(){
            /*
            Look up the fiscal period & fiscal year tables. Find the latest
            twelve closed periods, and take the earliest of them.

            If we were to do it purely in SQL:

            SELECT * FROM (
                SELECT
                    requestcutoff_date AS 'date',
                    CONCAT(fiscalyear_glprefix, LPAD(requestcutoff_period, 2, '0')) AS 'period'
                FROM
                    nss_core_fiscalperiod p
                    JOIN nss_core_fiscalyear y
                        ON p.requestcutoff_year = y.fiscalyear_id
                WHERE
                    requestcutoff_isClosed = 1
                ORDER BY
                    requestcutoff_id DESC
                LIMIT 12
            ) AS latest ORDER BY period ASC LIMIT 1;
            */


            var dfd = $.Deferred();

            NssCoreFiscalPeriod
            .find({requestcutoff_isClosed: 1})
            .sort("requestcutoff_id desc")
            .limit(12)
            .fail(function(err) {
                dfd.reject(err);
            })
            .then(function(period){

                //Retrieve the requestcutoff_date from 12 months ago and load into the Date() function
                var fiscalPeriod = new Date(period[11].requestcutoff_date);

                //Extract the year, month and day
                var year = fiscalPeriod.getFullYear();
                var month = fiscalPeriod.getMonth() + 1;
                var day = fiscalPeriod.getDate() + 1;

                //Format the endDate
                var realDate = year + "-" + month + "-" + day;
                
                // Query the fiscal year table
                NssCoreFiscalYear.find({fiscalyear_id: period[11].requestcutoff_year})
                .fail(function(err){
                    dfd.reject(err);
                })
                .done(function(fiscalYear){
                    
                    var glYear = fiscalYear[0].fiscalyear_glprefix;
                    var glPeriod = period[11].requestcutoff_period;
                    var glDate;
                    if (glPeriod < 10) {
                        glDate = glYear + '0' + glPeriod;
                    } else {
                        glDate = glYear + '' + glPeriod;
                    }
                    
                    dfd.resolve({
                        date: realDate,
                        period: glDate
                    });

                });

            });

            return dfd;
        },



        //Get the active ren from nss_core_ren rows
        getSWRenData: function(){
            var dfd = $.Deferred();

            var nssRenCoreData = {};

            NssRen.find({nssren_isActive: 1}).sort('nssren_ytdBalance asc')
            .fail(function(err){

                Log.error(LogKey+' failed to lookup NssRen(nssren_isActive:1):', err);
                dfd.reject(err);
            })
            .then(function(rens){
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
        getHRISRenData: function(listGUIDs){
            var dfd = AD.sal.Deferred();

            listGUIDs = listGUIDs || [];  // no value here will return them all!

            var hrisRenData = {};

            //// NOTE:
            //// should be able to :
            //// LHRISRen.find()
            //// .populate('family_id')
            //// .populate('emails', {email_issecure:1})
            //// .populate('phones')
            //// .populate('assignments')
            //// .then()...
            ////
            //// but at the moment v10.4 there is a bug and the {email_issecure:1} get's lost!
            //// so for now, leave it out and manually find it ourselves:
            LegacyHRIS.peopleByGUID({ guids:listGUIDs, populate:['family_id', {key:'emails', filter:{ email_issecure:1 }}, 'phones', 'assignments', 'staffAccounts'] })
            .fail(function(err){
                Log.error(LogKey+' failed to lookup LegacyHris.renByGUID():', err);
                dfd.reject(err);
            })
            .then(function(hrisRens){

                //// get listGuids
                //// LegacyHRIS.emailsByGUID()
                //// LegacyHRIS.phonesByGUID()
                //// hrisRens.forEach() {  merge in emailList and phoneList }

                hrisRens.forEach(function(ren){


                    //// NOTE:
                    //// on fields emails, phones
                    //// normally we should receive the info back on the association data:  emails, phones
                    //// but currently there is an issue with the associations across our different installations, so
                    //// we check for one of our manual merges and if provided use that instead: _emails, _phones


                    // add on secure email
                    ren.ren_secureemail = '??';
                    var eKey = ren._emails ? '_emails' : 'emails';
                    if (ren[eKey].length > 0) {
                        ren[eKey].forEach(function(email){
                            if (email.email_issecure == 1) {
                                ren.ren_secureemail = email.email_address;
                            }
                        })
                    }


                    // add on mobile phone:
                    ren.ren_mobilephone = '??';
                    var pKey = ren._phones ? '_phones' : 'phones';
                    if (ren[pKey].length > 0) {
                        ren[pKey].forEach(function(phone) {
                            if (phone.phonetype_id == 3) {
                                ren.ren_mobilephone = phone.phone_number;
                            }
                        })
                    }

                    // resolve staffAccount
                    ren.staffAccount = '??';
                    ren.staffAccounts = ren.staffAccounts || [];
                    ren.staffAccounts.forEach(function(account){
                        if (account.account_isprimary == 1) {
                            ren.staffAccount = account.account_number;
                        }
                    })


                    //Put all the ren in an object to retrieve based off of ren_id
                    hrisRenData[ren.ren_guid] = ren;
                })
                dfd.resolve(hrisRenData);
            });

            return dfd;
        },



        // //Get all the ren from hrdb ren table
        // getHRDBRenData: function(){
        //     var dfd = $.Deferred();

        //     var hrdbRenData = {};

        //     HRDBRen.find()
        //     .fail(function(err){
        //         Log.error(LogKey+' failed to lookup HRDBRen:', err);
        //         dfd.reject(err);
        //     })
        //     .then(function(hrdbrens){
        //         for (var a=0;a<hrdbrens.length;a++){

        //             //Put all the ren in an object to retrieve based off of ren_id
        //             hrdbRenData[hrdbrens[a].ren_id] = hrdbrens[a];

        //         }
        //         dfd.resolve(hrdbRenData);
        //     });

        //     return dfd;

        // },



        //Get all the nss_payroll_transaction rows that have been processed
        //and only rows from the last 12 months
        getPayrollRows: function(endDate){
            var dfd = $.Deferred();

            var payrollData = {
            /*
                <nssren_id>: {
                    <nsstransaction_id>: {
                        "nsstransation_id": int,
                        "nssren_id": int,
                        "nsstransaction_baseSalary": double,
                        "nsstransaction_allowance": double,
                        "nsstransaction_deduction": double,
                        "nsstransaction_totalSalary": double,
                        "nsstransaction_date": string,
                        "requestcutoff_id": int,
                        "nsstransaction_processedby": string,
                        "nsstransaction_territory_id": int,
                        "glbatch_id": int
                    },
                    <nsstransaction_id>: { ... },
                    ...
                },
                <nssren_id>: { ... },
                ...
            */
            };

            NssPayrollTransactions.find({glbatch_id:{'!': 0}})
            .where({nsstransaction_date:{'>': endDate}})
            .fail(function(err){ 
                Log.error(LogKey+' failed to lookup NssPayrollTransactions.find({glbatch_id:{!: 0}}):', err);
                dfd.reject(err);
            })
            .then(function(payrollRows){
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

            NssCoreAccountHistory.find()
            .fail(function(err){
                Log.error(' failed to lookup NssCoreAccountHistory:', err);
                dfd.reject(err);
            })
            .then(function(accountBalRows){
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
            .where({gltran_perpost: {'>': endPeriodDate}})
            .fail(function(err){
                Log.error(LogKey+' failed to lookup NssCoreGLTran:', err);
                dfd.reject(err);
            })
            .then(function(gltrans){

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
            .where({gltran_perpost: {'>': endPeriodDate}})
            .fail(function(err){
                Log.error(LogKey+' failed to lookup NssCoreGLTran:',err);
                dfd.reject(err);
            })
            .then(function(gltrans){
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



        // Retrieve average of all expenditures from the nss_core_gltran table
        // for the last 12 months
        getStaffExpenditures: function(endPeriodDate) {
            var dfd = $.Deferred();

            /*
                Basically, this is what we want to get:
                    SELECT
                        SUBSTR(gltran_subacctnum, 2) AS accountNum,
                        ROUND(SUM(gltran_dramt) / 12) AS avgExpense
                    FROM
                        nss_core_gltran
                    WHERE
                        gltran_subacctnum LIKE '10____'
                        AND gltran_dramt > 0
                        AND gltran_cramt = 0
                        AND gltran_perpost > $endPeriodDate
                    GROUP BY
                        gltran_subacctnum;
            */

            var expenseData = {
            /*
                <staffAccountNum>: <avgExpense>,
                ...
            */
            };
            
            NssCoreGLTran.find()
            .where(
                { 
                    // find only staff subaccounts
                    gltran_subacctnum: { 'like':  '10____' },

                    // find only debit transactions
                    gltran_dramt: { '>': 0 },
                    gltran_cramt: 0,

                    // limit by date
                    gltran_perpost: { '>': endPeriodDate } 
                }
            )
            .fail(function(err){
                Log.error(LogKey+' failed to lookup NssCoreGLTran:',err);
                dfd.reject(err);
            })
            .done(function(gltrans){
                if (gltrans) {
                    for (var g=0; g<gltrans.length; g++) {
                        //Cut the account number down to 4 digit to look up based off of hrdb.ren.ren_staffaccount
                        var accountNum = gltrans[g].gltran_subacctnum.slice(2,6);
                        // Sum the amounts that are deducted from the account
                        if (expenseData[accountNum]) {
                            expenseData[accountNum] += gltrans[g].gltran_dramt;
                        } else {
                            expenseData[accountNum] = gltrans[g].gltran_dramt;
                        }
                    }
                    // Average and round the final values
                    for (var accountNum in expenseData) {
                        expenseData[accountNum] = Math.round(
                            expenseData[accountNum] / 12
                        );
                    }
                }
                
                dfd.resolve(expenseData);
            });

            return dfd;
        },



        //Retrieve the most recent gltran_perpost date from the nss_core_gltran table
        //to get the minimum gltran_perpost from the last 12 months
        getMinPeriod: function(){
            var dfd = $.Deferred();
            var minPeriodDate = "";

            NssCoreGLTran.find().limit(1).sort("gltran_perpost desc")
            .fail(function(err){
                Log.error(LogKey+' failed to lookup NssCoreGLTran:',err);
                dfd.reject(err);
            })
            .then(function(gltran){

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
        getAccountBalAvg: function(accountBalRows, accountBalPeriod, guid){

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

// if( guid == TESTING_GUID) {
//     AD.log('... acctBalArray:', acctBalArray);
// }
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



        //Calculate the monthsTilDeficit using the averages of 
        // expenditure (including salary), contributions and the current 
        // account balance
        getMonthsTilDeficit: function(avgExpenditure, avgContributions, accountBalance){

            var monthsTilDeficit = 1;

            //the account is currently in deficit
            if (accountBalance < 0){
                return "1";
            }
            
            // Ed Graham's formula
            var accountTrend = avgContributions - avgExpenditure;
            if (accountTrend >= 0) {
                monthsTilDeficit = 'NA';
            } else {
                monthsTilDeficit = Math.ceil(accountBalance / (accountTrend * -1));
                if (monthsTilDeficit >= 13) {
                    monthsTilDeficit = 'NA';
                }
            }
            
            /*
            //the account will never be in deficit since avgContributions > payroll or they are equal
            if (avgContributions > payroll || avgContributions == avgPayroll) {
                monthsTilDeficit = "NA";
            } else {
                //Continue to add avgContributions and subtract payroll to accountBalance
                //until accountBalance is in deficit (negative)
                while (accountBalance > 0) {
                    accountBalance = accountBalance + avgContributions - payroll;
                    monthsTilDeficit++;
                }
            }
            */
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



        compileRegionData: function(done) {
            var dfd = $.Deferred();

            if (Log == null) Log = MPDReportGen.Log;

            NSStaffProcessor.compileStaffData(function(err, data) {

                if (err) {
                    if (done) done(err);
                    dfd.reject(err);
                } else {


                    // Data should be 'Region' : { accounts }
                    var regionData = {
                    /*
                        regionCode: { 
                            acct1: { ... }, 
                            acct2: { ... }, 
                            ... 
                        },
                        "AOA": { 
                            "0123": { ... },
                            "0200": { ... },
                            ...
                        },
                        ...
                    */
                    };


                    // for each region in staff data
                    var staffByRegion = data.staffByRegion;
                    for (var region in staffByRegion) {
                        //regionData[ emailDefs[region]] = staffByRegion[region];
                        var regionStaff = staffByRegion[region];
                        regionData[region] = regionStaff;
                    }

                    if (done) done(null, regionData);
                    dfd.resolve(regionData);

                }

            });

            return dfd;
        },



        // @param string templatesDir
        // @param object regionData
        //     Basic object containing staff data as generated 
        //     by compileRegionData().
        // @param function done
        //     Callback function.
        compileRenderedEmails: function(templatesDir, regionData, done) {
            var dfd = $.Deferred();

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
                                    Log.error(LogKey, 'No email address for region: [' + region + ']');
                                    continue;
                                }
                                
                                // NOTE: this is NOT asynchronous...
                                renderEmail({ people:regionData[region] }, templatesDir, function(err, html, text) {

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
                                                subject:'Current: ' + region + ' NS Staff Account Info ('+emailName+')',
                                                html:html,
                                                text:text
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
        // @param function done
        //     Callback function.
        compileRenderedIndividualEmails: function(templatesDir, staffData, done) {
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

                            //
                            for (var a=0;a<staffData.staff.length;a++) {

                                // NOTE: this is NOT asynchronous...
                                renderEmail({ person:staffData.staff[a] }, templatesDir, function(err, html, text) {

                                    if (err) {
                                        Log.error(LogKey+' error rendering email:', err);
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

}
