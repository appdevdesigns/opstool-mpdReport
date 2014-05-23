/**
* NssCoreFiscalYear
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"nss_core_fiscalyear",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['nss'],


    attributes: {

        /* e.g.
        nickname: 'string'
        */
        fiscalyear_id: 'INTEGER',

        fiscalyear_start: 'DATE',

        fiscalyear_end: 'DATE',

        fiscalyear_glprefix: 'STRING'
    }

};
