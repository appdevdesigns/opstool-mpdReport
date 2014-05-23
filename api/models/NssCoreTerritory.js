/**
* NssCoreTerritory
*
* @module      :: Model
* @description :: A short summary of how this model works and what it represents.
*
*/

module.exports = {

    tableName:"nss_core_territory",
    autoCreatedAt:false,
    autoUpdatedAt:false,
    autoPK:false,
    migrate:'safe',


    connection: ['nss'],


    attributes: {

        /* e.g.
        nickname: 'string'
        */
        territory_id: 'INTEGER',

        territory_cola: 'FLOAT',

        territory_GLCode: 'STRING',

        territory_desc: 'STRING'
    }

};
