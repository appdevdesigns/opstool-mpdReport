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


module.exports= {


        staffForAccount:function( Accounts ) {
            var dfd = AD.sal.Deferred();


            if (Log == null) Log = MPDReportGen.Log;

            if (typeof Accounts == 'string') {
                Accounts = Accounts.split(',');
            }
            
Log('Accounts:', Accounts);
            // Lookup All Accounts
            HRISAccount.find({account_number:Accounts })
            .fail(function(err){
console.log('Error looking up HRISAccounts:');
console.log(err); 
                dfd.reject(err);
            })
            .then(function(allAccounts){

                if (allAccounts.length == 0) {
                    dfd.resolve([]);
                } else {


Log('allAccounts:', allAccounts);
                    var accountLookup = {};
                    var familyIDs = [];
                    allAccounts.forEach(function(account){
                        familyIDs.push(account.family_id);
                        accountLookup[account.family_id] = account;
                    });

                    HRISRen.find({family_id:familyIDs, ren_isfamilypoc:1 })
                    .fail(function(err){
    console.log('Error looking up Ren by familyIDs:');
    console.log(err);  
                        dfd.reject(err);
                    })
                    .then(function(hrisRenList){

                        // for each ren attach an 'account' field:
                        hrisRenList.forEach(function(ren){
                            ren.account = accountLookup[ren.family_id];
                        });

                        dfd.resolve(hrisRenList);

                    });

                }

            });

            return dfd;
        },



        staffForNSC:function( GUID ) {
            var dfd = AD.sal.Deferred();


            if (Log == null) Log = MPDReportGen.Log;

            // lookup nss_core_nsc  to get nscID
            NssCoreNSC.findOne({ ren_guid:GUID })
            .fail(function(err){

console.log('Error looking up NSS CORE Ren:');
console.log(err);
                dfd.reject(err);

            })
            .then(function(NSC) {

                // lookup all nss_core_nscterritory entries
                NssCoreNSCTerritory.find({ nsc_id:NSC.nsc_id })
                .fail(function(err){
console.log('Error looking up NSS CORE NSCTerritory:');
console.log(err);  
                    dfd.reject(err);
                })
                .then(function(nscTerritories){

                    // lookup all nss_core_ren with same territoryID

                    // 1) compile all the territory id's:
                    var territoryIDs = [];
                    nscTerritories.forEach(function(territory){
                        territoryIDs.push(territory.territory_id);
                    });

                    // 2) find ren with any of those id's
                    NssRen.find({territory_id:territoryIDs})
                    .fail(function(err){
console.log('Error looking up NSS CORE Ren by territoryIDs:');
console.log(err);  
                        dfd.reject(err);
                    })
                    .then(function(allRen){


                        // merge this all with the HRIS info:
                        // 1) compile all the ren_guids:
                        var renGUIDs = [];
                        allRen.forEach(function(ren){
                            if (ren.ren_guid) {
                                renGUIDs.push(ren.ren_guid);
                            }
                        })

                        HRISRen.find({ren_guid:renGUIDs})
                        .fail(function(err){
console.log('Error looking up NSS CORE Ren by territoryIDs:');
console.log(err);  
                            dfd.reject(err);
                        })
                        .then(function(hrisRenList){


                            // now setup a map Object to merge our final info:
                            var finalResults = {};

                            // find accounts for each of these people:
                            var renFamilyIDs = [];
                            hrisRenList.forEach(function(ren){
                                renFamilyIDs.push(ren.family_id);

                                ren.account = { account_number:'???' };
                                finalResults[ren.family_id] = ren;
                            })

                            // Lookup All Accounts
                            HRISAccount.find({family_id:renFamilyIDs, account_isprimary:1 })
                            .fail(function(err){
console.log('Error looking up HRISAccounts:');
console.log(err); 
                                dfd.reject(err);
                            })
                            .then(function(allAccounts){
//console.log('Found Accounts:');
//console.log(allAccounts);
//console.log('number of Accounts:');
//console.log(allAccounts.length);   
    
                                // now merge these accounts into the ren data:
                                allAccounts.forEach(function(account){
                                    finalResults[account.family_id].account = account;
                                })

                                // now return an array of these ren:
                                var results = [];
                                for (var fID in finalResults) {
                                    results.push(finalResults[fID]);
                                }

                                dfd.resolve(results);


                            })

                        })


                    })


                })
                    
            })

            return dfd;
        },


}
