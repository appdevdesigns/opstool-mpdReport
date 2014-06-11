/**
 * NssCoreFiscalYear
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

    tableName:"nss_core_fiscalperiod",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['nss'],


    attributes: {

        /* e.g.
        nickname: 'string'
        */
        requestcutoff_id: 'INTEGER',

        requestcutoff_year: 'INTEGER',

        requestcutoff_period: 'INTEGER',

        requestcutoff_date: 'DATE',

        requestcutoff_isClosed: 'INTEGER'
    }

};
