/**
* HRISAssignLocationTrans
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"hris_assign_location_trans",
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

        Trans_id    : 'INTEGER',


        location_id : 'INTEGER',


        language_code   : 'STRING',


        location_label  : 'STRING'
    }

};
