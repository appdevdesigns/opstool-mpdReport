/**
* HRISCountryData
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"hris_country_data",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['hris'],
    config:{
        pool:false
    },


    attributes: {

        /* e.g.
        nickname: 'string'
        */

        country_id  : 'INTEGER',


        country_code    : 'STRING',


        country_callingcode : 'STRING',


        country_weight  : 'INTEGER'
    }

};
