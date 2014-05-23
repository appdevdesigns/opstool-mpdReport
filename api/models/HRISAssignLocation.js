/**
 * HRISAssignLocation
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

    tableName:"hris_assign_location_data",
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

        location_id   : 'INTEGER',


        location_guid : 'STRING',


        locationtype_id   : 'INTEGER',


        parent_id : 'INTEGER'
    }

};
