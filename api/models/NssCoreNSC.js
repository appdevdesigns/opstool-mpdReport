/**
* NssCoreNSC.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  tableName:"nss_core_nsc",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',  // don't update the tables!

  connection: ['nss'],


  attributes: {

    nsc_id : 'INTEGER',
    ren_id : 'INTEGER',
    ren_guid: 'STRING'

  }
};

