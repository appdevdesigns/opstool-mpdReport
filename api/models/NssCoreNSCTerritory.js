/**
* NssCoreNSCTerritory.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    tableName:"nss_core_nscterritory",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',  // don't update the tables!

    connection: ['nss'],

    attributes: {

        coverage_id : 'INTEGER',
        nsc_id: 'INTEGER',
        territory_id:'INTEGER'
    }
};

