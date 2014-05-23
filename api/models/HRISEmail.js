/**
* HRISEmail
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
* @docs     :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    tableName:"hris_email",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',  // don't update the tables!


    connection: ['hris'],
    config:{
        pool:false
    },


    attributes: {

        /* e.g.
        nickname: 'string'
        */

        email_id    : 'INTEGER',


        email_guid  : 'STRING',


        ren_id  : 'INTEGER',


        email_issecure  : 'INTEGER',


        email_address   : 'STRING'
    }

};
