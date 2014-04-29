/**
 * HRISAccount
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"hris_account",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',


  adapter:"hris",
  config:{
//      database:'test_hris',
      pool:false
    },



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/

    account_id	: 'INTEGER',


    account_guid	: 'STRING',


    family_id	: 'INTEGER',


    account_number	: 'STRING',


    country_id	: 'INTEGER',


    account_isprimary	: '?TINYINT?'
  }

};
