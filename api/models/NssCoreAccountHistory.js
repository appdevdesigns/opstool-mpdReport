/**
 * NssCoreAccountHistory
 *
 * @module      :: Model
 * @description :: A short summary of how this model works and what it represents.
 *
 */

module.exports = {

  tableName:"nss_core_accounthistory",
  autoCreatedAt:false,
  autoUpdatedAt:false,
  autoPK:false,
  migrate:'safe',


  adapter:"nss",



  attributes: {

  	/* e.g.
  	nickname: 'string'
  	*/

    accounthistory_id: 'INTEGER',

    subaccounts_accountNum: 'STRING',

	accounthistory_fiscalyear: 'INTEGER',

	accounthistory_ytdbal00: 'FLOAT',

	accounthistory_ytdbal01: 'FLOAT',

	accounthistory_ytdbal02: 'FLOAT',

	accounthistory_ytdbal03: 'FLOAT',

	accounthistory_ytdbal04: 'FLOAT',

	accounthistory_ytdbal05: 'FLOAT',

	accounthistory_ytdbal06: 'FLOAT',

	accounthistory_ytdbal07: 'FLOAT',

	accounthistory_ytdbal08: 'FLOAT',

	accounthistory_ytdbal09: 'FLOAT',

	accounthistory_ytdbal10: 'FLOAT',

	accounthistory_ytdbal11: 'FLOAT',

	accounthistory_ytdbal12: 'FLOAT'

  }

};
